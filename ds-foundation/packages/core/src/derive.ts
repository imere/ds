/**
 * 令牌派生：Seed -> Algorithm[] -> Map
 * -------------------------------------------------------------
 * ds 原本只有「覆盖链」：theme.tokens -> accent.tokens -> overrides，后者盖前者。
 * 这意味着改一个 color-brand，brandHover / brandActive 不会跟着动 ——
 * 想让整套派生跟着变，只能逐个手写。
 *
 * 这一层补上「派生链」（对标 Ant Design 的 Seed -> Map）：
 *   seed（稀疏的设计意图） -> algorithm[]（一个或多个派生函数） -> map（完整令牌）
 *
 * 算法的关键约定：**入参与出参形状相同**，都是嵌套令牌树。
 * 所以能像管道一样用数组串联，前一个的输出是后一个的输入：
 *   algorithm: [defaultAlgorithm, darkAlgorithm, compactAlgorithm]
 *
 * 内置三个算法的分工：
 *   defaultAlgorithm  稀疏 seed -> 完整 map（中性色阶、圆角/字号/动效档位）
 *   darkAlgorithm     颜色整体翻暗（底与前景互换后重算中性派生），已经是暗底则不重复翻
 *   compactAlgorithm  收紧尺度（圆角 ×0.75、字号 -1px、动效 ×0.8），再按同样的档位规则重算
 *
 * 派生不是万能的：官方那套令牌用的是手工挑过的色值（接近 Tailwind slate 色阶，
 * 在 @ds/tokens），线性插值得不到一模一样的结果 —— 所以两套东西并存，
 * 手工的求观感确定，派生的求新主题起稿快。
 *
 * **这一层没有默认色值。** 种子少一项就抛错，不补库里的颜色 ——
 * 补出来的令牌看着齐整，实际是别人的设计混进了你的主题，而且看不出哪几个是补的。
 *
 * **长度单位跟着种子走。** 内部一律在 px 空间做算术（档位差 base-2 的 2 是 2px），
 * 输出时才按种子自带的单位落成字符串：给 px 种子出 px，给 rem 种子出 rem，
 * 差值会一起折过去（2px = 0.125rem）。要把 px 种子整棵换成 rem 种子用 unit.ts 的
 * remifyTree，不要在写明单位的种子上再套一层换算。
 */

import { get, isPlainObject, assign } from './util'
import type { Dict } from './util'
import { mix, toRgba, luminance, parseColor } from './color'
import { toPx, unitOf, length, DEFAULT_ROOT_FONT_SIZE } from './unit'
import type { UnitId, UnitSpace } from './unit'
import type { TokenTree } from './token'
import type { ThemeMode } from './theme'

/** 派生算法：吃当前令牌树，吐新的令牌树 */
export type Algorithm = (tokens: TokenTree, ctx: DeriveContext) => TokenTree

export interface DeriveContext {
  mode: ThemeMode
  /** 管道开跑前的原始种子，供后处理算法回看「用户最初的意图」 */
  input: TokenTree
  /** rem 与 px 互折的根字号。等价于 space.rootFontSize，留着是因为大多数算法只需要它 */
  rootFontSize: number
  /** 完整的换算上下文：根字号 + 依赖运行环境的单位系数（vw / cqw …） */
  space: UnitSpace
}

/**
 * seed 的形状契约：这些路径必须有值，否则 deriveTokens 拒绝跑。
 *
 * 这个清单是**封闭**的 —— 它由下面几个 paint* 函数实际读什么决定，
 * 不会因为又出了新 API 而增长，所以它适合手写；
 * 而「哪些 API 在 IE10 上不存在」是增长的，那种清单不能手写（见 eslint.config.js）。
 * 判据和边界见 README。
 *
 * 起一份完整种子最省事的办法是拿 @ds/tokens 的 defaultSeed 照抄再改。
 */
const SEED_REQUIRED = [
  'color.brand',
  'color.bg',
  'color.fg',
  'color.success',
  'color.warning',
  'color.danger',
  'color.info',
  'radius.md',
  'font.family',
  'font.sizeMd',
  'motion.base',
]

/**
 * 取路径上的字符串，没有就是空串。
 *
 * 数字也收（'4px' 会被 get 原样取出；裸数字 4 转成 '4'）：
 * 种子里同一项有人写数字有人写字符串，卡死类型只会逼调用方多做一次转换。
 * 取不到返回空串而不是 null —— 缺项的判定统一交给 assertSeed 在入口做一次。
 *
 * @param {unknown} src 令牌树或其子组
 * @param {string} path 点分路径，如 'color.brand'
 * @returns {string} 字符串值；不是字符串也没有数字就是空串
 */
function seedStr(src: unknown, path: string): string {
  const v = get(src, path)
  if (typeof v === 'number') return String(v)
  return typeof v === 'string' ? v : ''
}

/**
 * 取路径上的数字。'4px' / '200ms' 这类带单位的值也能认。
 * 不判 NaN / 空串：缺项在入口就被 assertSeed 拦下了，这里拿到的必然有值。
 *
 * @param {unknown} src 令牌树或其子组
 * @param {string} path 点分路径
 * @returns {number} 数值；解析不了就是 0
 */
function seedNum(src: unknown, path: string): number {
  const v = get(src, path)
  if (typeof v === 'number') return v
  return parseFloat(String(v)) || 0
}

/**
 * 取一个子组，取不到给空对象。
 *
 * 这样算法面对残缺输入也能跑完：管道中间的某个算法完全可能不写某一组，
 * 后面的算法不该因为读了个 undefined 就整个挂掉 —— 空组会被 paint* 补成默认值。
 *
 * @param {unknown} src 令牌树
 * @param {string} path 点分路径，如 'color'
 * @returns {Dict} 子组；不是对象就是空对象
 */
function group(src: unknown, path: string): Dict {
  const v = get(src, path)
  return isPlainObject(v) ? (v as Dict) : {}
}

/**
 * 混色 / 转 rgba 时可能因为色值写法不认识而返回 null。
 * 派生出来的值不允许是 null —— 宁可退回种子值，也不能把令牌写成空的。
 * 一个空令牌会一路 Silent 地传到 CSS 变量里，报错比留空好查得多。
 *
 * @param {string} a 基色
 * @param {string} b 混入色
 * @param {number} weight 混入比例，0~1
 * @param {string} fallback 解析失败时的兜底值，通常就是基色
 * @returns {string} 混色结果或兜底值
 */
function mixOr(a: string, b: string, weight: number, fallback: string): string {
  const out = mix(a, b, weight)
  return out === null ? fallback : out
}

/**
 * 同 mixOr，只是作用在 toRgba 上：不认识的色值写法退回兜底。
 *
 * 跟 mixOr 分开写而不是合成一个 `or(mix|toRgba)`，是因为两者的失败语义不同：
 * 混色失败要退回**基色**，透明化失败要退回**原色**，合成一个反而要传两个兜底。
 *
 * @param {string} value 原色值
 * @param {number} alpha 透明度，0~1
 * @param {string} fallback 解析失败时的兜底值
 * @returns {string} rgba 字符串或兜底值
 */
function rgbaOr(value: string, alpha: number, fallback: string): string {
  const out = toRgba(value, alpha)
  return out === null ? fallback : out
}

/**
 * '#4f46e5' -> '79, 70, 229'。逗号语法，IE10 也认；空格语法 IE10 不认。
 *
 * 阴影与 focus 环要的是「一个色带上不同透明度的同一色」，
 * 所以这里只出通道、不出完整色值 —— 透明度由调用方拼进 rgba()。
 *
 * @param {string} value 任意色值写法
 * @returns {string} 'r, g, b'；解析不了就是空串
 */
function channels(value: string): string {
  const c = parseColor(value)
  if (!c) return ''
  return `${c.r}, ${c.g}, ${c.b}`
}

/**
 * 取路径上的长度，统一折成可换算的量纲（通常是 px）——
 * 内部算术只认一个量纲，才不会有「14px 减 2px」算成「1rem 减 2」的错。
 *
 * 换算不了的单位（vw 之类没给系数的）返回数字部分本身，
 * 出口 length() 会把原单位再带回去，见 unit.ts 文件头。
 *
 * @param {unknown} src 令牌树
 * @param {string} path 点分路径
 * @param {UnitSpace} space 换算上下文
 * @returns {number} 折到同一量纲后的数字
 */
function seedPx(src: unknown, path: string, space: UnitSpace): number {
  return toPx(get(src, path), space)
}

/**
 * 这一族该用什么单位：种子写什么我们就输出什么。
 *
 * 认不出单位（空、裸数字）一律当 px —— 库历史上只产 px，这样改不破坏老种子。
 * 这里刻意拿泛化的 UnitId：种子写 '8pt' / '0.5em' / '2cqw' 都原样继承，
 * 不需要等库认识那个单位。
 *
 * @param {unknown} src 令牌树
 * @param {string} path 点分路径
 * @returns {UnitId} 单位符号；认不出就是 'px'
 */
function seedUnit(src: unknown, path: string): UnitId {
  return unitOf(get(src, path)) || 'px'
}

/**
 * 数字落成 ms 字符串，负数夹到 0。
 *
 * 夹 0 是因为动效时长为负没有意义：compact 把 base ×0.8，
 * 种子本来就写 0 或极小时不该算出 '-2ms' 这种值。
 *
 * @param {number} n 毫秒数
 * @returns {string} '200ms' 这样的字符串
 */
function ms(n: number): string {
  return `${Math.max(0, Math.round(n))}ms`
}

/**
 * 种子合不合规，一次验完再进管道。
 *
 * 在入口一次性验完而不是让每个 paint* 各自判空：
 * 缺项报错要带上「缺的是哪一项」，散在各处就只能报「值不对」，
 * 而设计同学拿到「缺 color.brand」才知道该补什么。
 *
 * @param {unknown} seed 种子令牌树
 * @returns {void} 无返回值；缺项直接抛 Error
 */
function assertSeed(seed: unknown): void {
  for (let i = 0; i < SEED_REQUIRED.length; i++) {
    const path = SEED_REQUIRED[i]
    if (!seedStr(seed, path)) {
      throw new Error(
        `[ds/core] 种子缺 ${path}：派生不提供默认色值，可用 @ds/tokens 的 defaultSeed 起步`
      )
    }
  }
}

/**
 * 品牌色一族：给一个主色推出 hover / active / subtle / border / 环 / 前景。
 * makeAccent 与 defaultAlgorithm 共用这段，避免两边各写一份越写越偏 ——
 * 强调色与主题派生的品牌色必须同口径，否则换个强调色 hover 色就跳了。
 *
 * hover / active 是往主色里掺黑而不是掺白：掺白在浅色主题上会掉饱和度，
 * 而压深一档在任何底色上都认得出是「按下去了」。
 *
 * @param {string} brand 品牌主色
 * @param {string} fg 前景色，主色偏亮时用作 onBrand
 * @param {string} bg 背景色，主色偏暗时用作 onBrand
 * @returns {Dict} 品牌色一族
 */
export function brandTokens(brand: string, fg: string, bg: string): Dict {
  return {
    brand,
    brandHover: mixOr(brand, '#000000', 0.12, brand),
    brandActive: mixOr(brand, '#000000', 0.24, brand),
    brandSubtle: rgbaOr(brand, 0.12, brand),
    brandBorder: rgbaOr(brand, 0.4, brand),
    onBrand: luminance(brand) > 0.45 ? fg : bg,
    ring: rgbaOr(brand, 0.35, brand),
    borderFocus: brand,
  }
}

/**
 * 中性底色 + 边框 + 语义色的完整派生。src 里已有的同名键会被派生值覆盖。
 *
 * 所有中性色都由 bg / fg 两个色插值出来，而不是列一张色阶表 ——
 * 换底色时整套中性色跟着走，不需要为暗色主题再维护一份灰阶。
 * 派生值盖掉种子里的同名键：这是「算法说了算」，与 theme.ts 里
 * 「手写 tokens 盖掉算法」的方向相反，因为那里盖的是用户明写的意图。
 *
 * @param {Dict} src tokens.color 那一组
 * @returns {Dict} 补全后的 color 组
 */
function paintColor(src: Dict): Dict {
  const brand = seedStr(src, 'brand')
  const bg = seedStr(src, 'bg')
  const fg = seedStr(src, 'fg')
  const success = seedStr(src, 'success')
  const warning = seedStr(src, 'warning')
  const danger = seedStr(src, 'danger')
  const info = seedStr(src, 'info')

  const out = assign({} as Dict, src, {
    success,
    warning,
    danger,
    info,
    bgSubtle: mixOr(bg, fg, 0.04, bg),
    bgInset: mixOr(bg, fg, 0.08, bg),
    bgOverlay: rgbaOr(fg, 0.45, bg),
    fgMuted: mixOr(fg, bg, 0.35, fg),
    fgSubtle: mixOr(fg, bg, 0.55, fg),
    fgDisabled: mixOr(fg, bg, 0.72, fg),
    fgOnFill: luminance(brand) > 0.45 ? fg : bg,
    border: mixOr(bg, fg, 0.12, fg),
    borderStrong: mixOr(bg, fg, 0.24, fg),
    successSubtle: rgbaOr(success, 0.12, success),
    warningSubtle: rgbaOr(warning, 0.12, warning),
    dangerSubtle: rgbaOr(danger, 0.12, danger),
    infoSubtle: rgbaOr(info, 0.12, info),
  })

  return assign(out, brandTokens(brand, fg, bg))
}

/**
 * 圆角一族：md 是基数，sm / lg 按倍数推出。
 * @param {Dict} src tokens.radius 那一组
 * @param {UnitSpace} space 换算上下文
 * @returns {Dict} 补全后的 radius 组
 */
function paintRadius(src: Dict, space: UnitSpace): Dict {
  const unit = seedUnit(src, 'md')
  const base = seedPx(src, 'md', space)
  return assign({} as Dict, src, {
    sm: length(base * 0.5, unit, space),
    md: length(base, unit, space),
    lg: length(base * 2, unit, space),
    // 哨兵值不是尺度：rem 下会被折成 624.9375rem 这种没意义的数
    full: '9999px',
  })
}

/**
 * 字号一族：sizeMd 是基数，sizeSm / sizeLg 按 ±2px 推出；行高是无单位比值。
 * @param {Dict} src tokens.font 那一组
 * @param {UnitSpace} space 换算上下文
 * @returns {Dict} 补全后的 font 组
 */
function paintFont(src: Dict, space: UnitSpace): Dict {
  const unit = seedUnit(src, 'sizeMd')
  const base = seedPx(src, 'sizeMd', space)
  return assign({} as Dict, src, {
    family: seedStr(src, 'family'),
    sizeSm: length(base - 2, unit, space),
    sizeMd: length(base, unit, space),
    sizeLg: length(base + 2, unit, space),
    // 行高用无单位比值，本来就是响应式的
    lineTight: '1.25',
    lineNormal: '1.5',
  })
}

/**
 * 动效一族：base 是基数，fast / slow 按倍数推出。时间是 ms，跟长度单位无关。
 * @param {Dict} src tokens.motion 那一组
 * @returns {Dict} 补全后的 motion 组
 */
function paintMotion(src: Dict): Dict {
  const base = seedNum(src, 'base')
  return assign({} as Dict, src, {
    fast: ms(base * 0.6),
    base: ms(base),
    slow: ms(base * 1.6),
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  })
}

/**
 * 阴影基色：给了就用，解析不了就退回前景色的通道 ——
 * 官方种子里两者本来就是同一个色（'15 23 42' 与 '#0f172a'），所以退回无损。
 *
 * @param {Dict} src tokens.shadow 那一组（含从 color.shadow 搬过来的 shadow 键）
 * @param {string} brand 品牌主色，focus 环用它
 * @param {string} fg 前景色，阴影基色解析不了时退回它
 * @returns {Dict} 补全后的 shadow 组
 */
function paintShadow(src: Dict, brand: string, fg: string): Dict {
  const ch = channels(seedStr(src, 'shadow')) || channels(fg)
  const brandCh = channels(brand)
  return assign({} as Dict, src, {
    none: 'none',
    sm: `0 1px 2px rgba(${ch}, 0.06)`,
    md: `0 2px 8px rgba(${ch}, 0.08)`,
    lg: `0 8px 24px rgba(${ch}, 0.12)`,
    focus: `0 0 0 3px rgba(${brandCh}, 0.25)`,
  })
}

/**
 * 暗色下的阴影不能用浅色叠加，得换成更重的纯黑。
 *
 * 暗底上再叠一层半透明浅色只会「提亮」，看起来像发光而不是投影 ——
 * 阴影在暗色主题里只能靠加深，所以这里不复用 paintShadow 那套色值。
 *
 * @param {Dict} src tokens.shadow 那一组
 * @param {string} brand 品牌主色，focus 环用它
 * @returns {Dict} 补全后的 shadow 组
 */
function paintDarkShadow(src: Dict, brand: string): Dict {
  const brandCh = channels(brand)
  return assign({} as Dict, src, {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 2px 8px rgba(0, 0, 0, 0.45)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.55)',
    focus: `0 0 0 3px rgba(${brandCh}, 0.35)`,
  })
}

/**
 * 稀疏种子补全成完整令牌表 —— 管道的起点，也是不给 algorithm 时的默认值。
 *
 * 逐组调 paint* 而不是一次算出整棵树：每组只认自己那几个种子键，
 * 加一组新令牌（比如 zIndex）就是加一个 paint，不用动别的地方。
 *
 * @param {TokenTree} tokens 当前令牌树（管道里就是上游的输出）
 * @param {DeriveContext} ctx 派生上下文，这里只取 space
 * @returns {TokenTree} 补全后的令牌树
 */
export const defaultAlgorithm: Algorithm = (tokens, ctx) => {
  const { space } = ctx
  const color = group(tokens, 'color')
  const brand = seedStr(color, 'brand')
  const fg = seedStr(color, 'fg')
  // 种子的阴影基色写在 color.shadow 下，而阴影那组是 tokens.shadow ——
  // 两边不是一个地方，不搬过去的话种子里这一项永远读不到。
  const shadowIn = assign({} as Dict, group(tokens, 'shadow'), {
    shadow: seedStr(color, 'shadow'),
  })
  return assign({} as Dict, tokens, {
    color: paintColor(color),
    radius: paintRadius(group(tokens, 'radius'), space),
    font: paintFont(group(tokens, 'font'), space),
    motion: paintMotion(group(tokens, 'motion')),
    shadow: paintShadow(shadowIn, brand, fg),
  })
}

/**
 * 把颜色翻成暗色：底与前景互换，再重新做一遍中性派生。
 * 已经是暗底就直接返回 —— 组合成 [dark, dark] 或多跑一次不会越翻越离谱。
 *
 * 不用 ctx.mode 判「该不该翻」，而是看底与前景的实际亮度：
 * mode 是调用方声明的意图，亮度是这份令牌的真实状态，
 * 两者不一致时以真实状态为准，才不会把已经是暗色的种子又翻回亮色。
 *
 * @param {TokenTree} tokens 当前令牌树
 * @returns {TokenTree} 翻暗后的令牌树；已是暗底则原样返回
 */
export const darkAlgorithm: Algorithm = (tokens) => {
  const color = group(tokens, 'color')
  const bg = seedStr(color, 'bg')
  const fg = seedStr(color, 'fg')
  const brand = seedStr(color, 'brand')
  if (luminance(bg) < luminance(fg)) return tokens

  const flipped = assign({} as Dict, color, {
    bg: fg,
    fg: bg,
    shadow: '0 0 0',
  })
  return assign({} as Dict, tokens, {
    color: paintColor(flipped),
    shadow: paintDarkShadow(group(tokens, 'shadow'), brand),
  })
}

/**
 * 收紧尺度：只改三个基数，不改派生规则本身。
 * 基数改小后复用同一套 paint*，各档位之间的比例关系自然保持一致 ——
 * 「紧凑」是尺度变了，不是设计规则变了，写第二套档位规则迟早会跟第一套走偏。
 *
 * @param {TokenTree} tokens 当前令牌树
 * @param {DeriveContext} ctx 派生上下文，这里只取 space
 * @returns {TokenTree} 收紧后的令牌树
 */
export const compactAlgorithm: Algorithm = (tokens, ctx) => {
  const { space } = ctx
  const radius = group(tokens, 'radius')
  const font = group(tokens, 'font')
  const motion = group(tokens, 'motion')
  return assign({} as Dict, tokens, {
    // 收紧的也是 px 语义的量（圆角 ×0.75、字号 -1px），跟派生同样在同一个量纲上算完再落单位
    radius: paintRadius(
      assign({} as Dict, radius, {
        md: length(seedPx(radius, 'md', space) * 0.75, seedUnit(radius, 'md'), space),
      }),
      space
    ),
    font: paintFont(
      assign({} as Dict, font, {
        sizeMd: length(seedPx(font, 'sizeMd', space) - 1, seedUnit(font, 'sizeMd'), space),
      }),
      space
    ),
    motion: paintMotion(assign({} as Dict, motion, { base: ms(seedNum(motion, 'base') * 0.8) })),
  })
}

export interface DeriveOptions {
  /**
   * rem <-> px 互折用的根字号，默认 16。
   * 种子用 rem 写、而项目根字号不是 16 时才要改 —— 「减 2px」这个差值折成 rem 是多少，
   * 取决于根字号（root=16 时是 0.125rem，root=10 时是 0.2rem）。
   */
  rootFontSize?: number
  /**
   * 依赖运行环境的单位系数：{ vw: 视口宽/100, cqw: 容器宽/100 }。
   * 种子写别的相对单位（vw / em / cqw …）时用它把长度折到同一个量纲上；
   * 不给的话这些单位换算不了，原样带出去（不会被当成 px）。
   */
  factors?: Dict<number>
}

/**
 * 跑一遍派生管道。这是纯函数 —— 给同样的 seed 和 algorithm，结果必然一样。
 *
 * seed 是必传的，而且形状要完整（缺项直接抛错，不补默认值）。
 * 只给一个算法时写 deriveTokens(defaultSeed, darkAlgorithm) 即可。
 *
 * @param {TokenTree} seed 完整种子，见 SEED_REQUIRED 的注释
 * @param {Algorithm|Array<Algorithm>|null|undefined} algorithm 单个或数组。
 *   数组从左到右依次执行，前者输出是后者输入；不给就用 defaultAlgorithm
 * @param {ThemeMode|string} mode 'light' | 'dark'，传给算法的 ctx.mode
 * @param {DeriveOptions} options rootFontSize 与 factors，见 DeriveOptions
 * @returns {TokenTree} 派生后的完整令牌树
 */
export function deriveTokens(
  seed: TokenTree,
  algorithm?: Algorithm | Algorithm[] | null,
  mode?: ThemeMode | string,
  options?: DeriveOptions
): TokenTree {
  assertSeed(seed)
  const base: Dict = assign({} as Dict, seed) as Dict
  const list = Array.isArray(algorithm) ? algorithm : algorithm ? [algorithm] : [defaultAlgorithm]
  const modeValue: ThemeMode = mode === 'dark' ? 'dark' : 'light'
  const given = options && options.rootFontSize
  const rootFontSize = given ? given : DEFAULT_ROOT_FONT_SIZE
  const ctx: DeriveContext = {
    mode: modeValue,
    input: base,
    rootFontSize,
    space: { rootFontSize, factors: options && options.factors },
  }

  let out: Dict = base
  for (let i = 0; i < list.length; i++) {
    const fn = list[i]
    if (typeof fn !== 'function') continue
    const next = fn(out, ctx)
    if (isPlainObject(next)) out = next as Dict
  }
  return out
}
