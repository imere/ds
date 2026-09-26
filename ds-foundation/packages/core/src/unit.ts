/**
 * 长度单位
 * -------------------------------------------------------------
 * 单位不是「px 还是 rem」的二选一。CSS 的长度单位一直在长：
 *   早年    px / em / rem / ex / ch / vw / vh / vmin / vmax
 *   近年    dvh / lvw / svh（动态视口）、cqw / cqh / cqi / cqb（容器查询）、
 *           cap / lh / rlh（字体度量）、rex / rch（根相对）
 * 今天手写一份「认得的单位」清单，明天就得为新单位回来改库。
 * 所以这里**没有认字清单**：单位符号是开放的，
 * 能不能换算只取决于查不查得到系数。
 *
 * （判据跟 IE10 API 那件事是同一条：集合会长大的，就不要手写它 ——
 *   语法用解析器判、API 用 compat 数据判、单位用系数表判。）
 *
 * 换算的唯一依据是「1 单位 = 多少 px」，系数有三条来源：
 *
 *   ABSOLUTE_UNITS  CSS 绝对单位（px / pt / pc / in / cm / mm / q）。
 *                   这组是**物理定义**定死的换算率，CSS 规范里的封闭集合 ——
 *                   不像「什么新品种全家桶」那种会一直冒出来的东西，写在这里是安全的
 *   rootFontSize    rem 的系数。浏览器默认 16px，也是绝大多数项目的习惯值
 *   factors         视口 / 容器 / 字体度量单位（vw / cqw / ex / cap …）。
 *                   1vw 等于多少 px 只有页面知道，库在 SSR 与构建期拿不到 ——
 *                   想换算就把系数传进来，不给就换不了
 *
 * 查不到系数（factorOf 返回 0）一律按「换算不了」处理：**原样保留**，
 * 绝不悄悄当成 px —— 把 10vw 当成 10px 算进去，比报错难查得多。
 *
 * 于是「内部一律在 px 空间做算术」这句话要修正成更准确的一条：
 * 内部是把长度折到**同一个可换算的量纲**（通常是 px），差值在这个量纲上算完，
 * 出口再按目标单位的系数落回字符串。所以
 *   · 给 pt 种子出 pt，给 rem 种子出 rem；
 *   · 差值跟着一起折（`sizeSm = sizeMd - 2` 的 2 是 2px，root=16 时折成 0.125rem）；
 *   · 目标单位查不到系数时，算术落在该单位自身的量纲上，单位原样带出去。
 */

import { each, isPlainObject } from './util'
import type { Dict } from './util'
import type { FlatTokens, TokenTree } from './token'

/**
 * 常见长度单位，**只为编辑器补全而列，不是白名单**。
 * 没列出来的照样能用 —— 见下面的 UnitId。
 */
export type KnownUnit =
  // 绝对单位（物理定义）
  | 'px'
  | 'pt'
  | 'pc'
  | 'in'
  | 'cm'
  | 'mm'
  | 'q'
  // 字体相对
  | 'em'
  | 'rem'
  | 'ex'
  | 'rex'
  | 'ch'
  | 'rch'
  | 'cap'
  | 'rcap'
  | 'ic'
  | 'ric'
  | 'lh'
  | 'rlh'
  // 视口相对
  | 'vw'
  | 'vh'
  | 'vi'
  | 'vb'
  | 'vmin'
  | 'vmax'
  | 'svw'
  | 'svh'
  | 'svi'
  | 'svb'
  | 'svmin'
  | 'svmax'
  | 'lvw'
  | 'lvh'
  | 'lvi'
  | 'lvb'
  | 'lvmin'
  | 'lvmax'
  | 'dvw'
  | 'dvh'
  | 'dvi'
  | 'dvb'
  | 'dvmin'
  | 'dvmax'
  // 容器相对
  | 'cqw'
  | 'cqh'
  | 'cqi'
  | 'cqb'
  | 'cqmin'
  | 'cqmax'
  // 比率
  | '%'
  | 'fr'

/**
 * 单位符号。刻意写成开放联合 —— 跟 TokenKey 同一个写法，同一个理由：
 *   · 字面量那一半     打字时给自动补全
 *   · `(string & {})`  留逃生舱，出了新单位（或你自己的业务单位）不用改库
 *
 * 想用哪天新出的单位，直接写字符串就行：库不会因为不认识它而报错，
 * 只会因为它查不到系数而把值原样保留。
 */
export type UnitId = KnownUnit | (string & {})

/**
 * 单位换算上下文。三者合起来决定 factorOf 能不能算出系数。
 *
 * 之所以要一个「上下文」而不是一个 unit 参数：
 * vw / cqw 这些单位的 px 值**依赖运行环境**，同一个令牌在不同视口下是不同数字。
 * 把它们当常量写死进库才是真的错 —— 所以这块交给调用方给。
 */
export interface UnitSpace {
  /** 1rem 等于多少 px，默认 DEFAULT_ROOT_FONT_SIZE */
  rootFontSize?: number
  /** 1em 等于多少 px（元素自身字号）。不给就退回 rootFontSize */
  fontSize?: number
  /**
   * 依赖运行环境的单位系数：{ vw: 视口宽/100, cqw: 容器宽/100 }。
   * 视口 / 容器多宽只有页面知道；不给就换不了，也不会被当成 px 处理。
   */
  factors?: Dict<number>
}

/** CSS 绝对单位 -> 1 单位等于多少 px。物理定义，见文件头那两条理由 */
export const ABSOLUTE_UNITS: Dict<number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
}

/** rem 换算的根字号。浏览器默认就是 16px，也是绝大多数项目的习惯值 */
export const DEFAULT_ROOT_FONT_SIZE = 16

/**
 * 不该随根字号缩放的键前缀（扁平键写法）：
 *   · 描边宽度 —— 1px 边框跟着根字号缩放，在高缩放下会变糊甚至消失
 *   · 阴影 —— 它是固定的视觉深度，不属于排版尺度
 * 它们是「策略」而不是「算法」，所以由 @ds/dom 的 keepPx 传进来；
 * rescale 自己仍然是谁都不放过。
 */
export const DEFAULT_KEEP_PX = ['border-width', 'shadow']

/** 整个字符串就是一个「数字 + 单位」，用来判定这个值属于哪个单位 */
const WHOLE = /^(-?\d+(?:\.\d+)?)([a-z%]+)$/i

/** 字符串里的每一段「数字 + 单位」，用于整串换算（阴影那种复合写法必然走这里） */
const SEGMENT = /(-?\d+(?:\.\d+)?)([a-z%]+)/gi

/**
 * 根字号的兜底：没给、给 0、给负数都回到 16。
 *
 * 收口在一个函数里，而不是每处各写一次 `|| 16`：
 * 「根字号不合法」怎么判必须只有一份答案，否则 0 会在某些路径下被当成
 * 真的 0 用去换算，算出来的 rem 会大到离谱且看不出原因。
 *
 * @param {number|undefined} size 调用方给的根字号
 * @returns {number} 可用的根字号
 */
function rootOf(size: number | undefined): number {
  return size && size > 0 ? size : DEFAULT_ROOT_FONT_SIZE
}

/**
 * 通用截位：浮点噪声（0.30000000000000004）统一收掉
 * @param {number} n 任意数字
 * @returns {number} 保留三位小数的数字
 */
export function trimNum(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * px 换别的单位时要更精细：1/16 = 0.0625，截三位会变成 0.063（差 1.2%）
 * @param {number} n 任意数字
 * @returns {number} 保留五位小数的数字
 */
export function trimRem(n: number): number {
  return Math.round(n * 100000) / 100000
}

/**
 * 取数值部分
 * @param {unknown} value 长度写法的字符串或数字：'14px' / '0.875rem' / 14
 * @returns {number} 数字部分；取不到就是 0（'#f8fafc' -> 0，色值不是长度）
 */
export function numOf(value: unknown): number {
  if (typeof value === 'number') return value
  const hit = /^(-?\d+(?:\.\d+)?)/.exec(String(value))
  return hit ? parseFloat(hit[1]) : 0
}

/**
 * 取单位后缀。
 *
 * 判据是「**整个字符串**就是一个数字 + 一串字母」，而不是「结尾是字母」：
 *   '16px'               -> 'px'
 *   '100vw'              -> 'vw'
 *   '16PX'               -> 'px'
 *   '#f8fafc'            -> ''（不是长度）
 *   '0 2px 8px rgba(...)'-> ''（这是阴影串，不是一个长度，用 rescale 处理）
 *
 * 不列认得的单位清单，正是为了让 cqw / dvmax 这类新单位天生就能用 ——
 * 清单一旦手写，每年新出的单位都得回来改库。
 *
 * @param {unknown} value 任意值
 * @returns {string} 小写的单位符号；不是长度就是空串
 */
export function unitOf(value: unknown): string {
  const hit = WHOLE.exec(String(value).trim())
  if (!hit) return ''
  return hit[2].toLowerCase()
}

/**
 * 一个单位等于多少 px —— 换算的唯一依据。
 *
 * 查不到系数返回 **0**，意思是「库不认识这个单位，也不会替你猜」。
 * 调用方拿到 0 就该原样保留原值，而不是把数字当成 px 接着算。
 *
 * 优先级：调用方给的 factors > CSS 绝对单位 > rem / em 的上下文推导。
 * 自己的系数优先，是因为只有你这个场景才知道 1vw 到底是多少 px。
 *
 * @param {string} unit 单位符号，大小写不敏感
 * @param {UnitSpace} space 换算上下文（rootFontSize / fontSize / factors）
 * @returns {number} 1 unit 等于多少 px；0 表示换算不了
 */
export function factorOf(unit: string, space?: UnitSpace): number {
  const u = String(unit).toLowerCase()
  if (!u) return 0

  const given = space && space.factors ? space.factors[u] : undefined
  if (typeof given === 'number' && given > 0) return given

  const abs = ABSOLUTE_UNITS[u]
  if (typeof abs === 'number') return abs

  if (u === 'rem') return rootOf(space && space.rootFontSize)
  if (u === 'em') {
    const own = space && space.fontSize
    return own && own > 0 ? own : rootOf(space && space.rootFontSize)
  }
  return 0
}

/**
 * 这个单位能不能换算。视口 / 容器单位不给 factors 就是不能。
 * @param {string} unit 单位符号
 * @param {UnitSpace} space 换算上下文
 * @returns {boolean} 能算出 px 系数就是 true
 */
export function canConvert(unit: string, space?: UnitSpace): boolean {
  return factorOf(unit, space) > 0
}

/**
 * 任意写法归一化成 px 数字。
 *
 * 换算不了的单位返回**数字部分本身**（'10vw' -> 10），配合 length() 用是自洽的：
 * length 查不到目标单位系数时也会原样带上单位输出，两者串起来是恒等变换。
 *
 * 这里刻意不截位：中间量截一次，出口再折回原单位就会带着误差（pt 会算出 14.00025pt）。
 * 截位是输出的事 —— length() 自己做。
 *
 * @param {unknown} value '14px' / '1rem' / 4 / '10vw'
 * @param {UnitSpace} space 换算上下文
 * @returns {number} px 空间里的数字
 */
export function toPx(value: unknown, space?: UnitSpace): number {
  const n = numOf(value)
  const f = factorOf(unitOf(value), space)
  return f ? n * f : n
}

/**
 * px 数字落成目标单位的字符串 —— 派生链的出口都走这里。
 *
 * 目标单位查不到系数时不捏造换算，而是 `${n}${unit}` 原样带出去：
 * 认不出 vw 是多少 px，就别假装算过，把单位留给浏览器才是诚实的。
 *
 * @param {number} n px 空间的数字。负值夹到 0（长度不允许负值）
 * @param {UnitId} unit 目标单位，任意符号；不写就是 px
 * @param {UnitSpace} space 换算上下文
 * @returns {string} 带单位的 CSS 长度字符串
 */
export function length(n: number, unit: UnitId, space?: UnitSpace): string {
  const u = String(unit || 'px')
  const px = n > 0 ? n : 0
  const f = factorOf(u, space)
  if (!f) return `${trimNum(px)}${u}`
  if (u === 'px') return `${Math.round(px)}px`
  return `${trimRem(px / f)}${u}`
}

/**
 * 把一个长度换成目标单位。源单位或目标单位换算不了时**原样返回**。
 *
 * 「只换一半」是最危险的结果：'10vw' 换成 '10px' 会让令牌跑出完全不同的尺度，
 * 而且从这个数字本身看不出它是错的。所以要么两端都换得了，要么一个字都不动。
 *
 * @param {unknown} value 原值
 * @param {UnitId} unit 目标单位
 * @param {UnitSpace} space 换算上下文
 * @returns {string} 换算后的字符串；换不了就是原值的字符串
 */
export function toUnit(value: unknown, unit: UnitId, space?: UnitSpace): string {
  const raw = String(value)
  const from = unitOf(raw)
  if (!from) return raw
  if (!canConvert(from, space) || !canConvert(unit, space)) return raw
  return length(toPx(raw, space), unit, space)
}

/**
 * 整串里的每一个长度片段都换到目标单位。
 *
 * 阴影（'0 1px 2px rgba(15, 23, 42, 0.08)'）这种复合写法必须走这里 ——
 * 它不是「一个数字 + 一个单位」，unitOf 认不出，但里面每个 px 段都得换。
 * 认不出的片段（色值、时间、关键字）原样保留：十六进制尾巴不会被当成单位，
 * 因为它查不到系数。
 *
 * 目标单位本身换算不了时整串原样返回，不做「只换个单位符号」这种假换算。
 *
 * @param {unknown} value 原值
 * @param {UnitId} unit 目标单位
 * @param {UnitSpace} space 换算上下文
 * @returns {string} 换算后的字符串
 */
export function rescale(value: unknown, unit: UnitId, space?: UnitSpace): string {
  const raw = String(value)
  if (!canConvert(unit, space)) return raw
  return raw.replace(SEGMENT, (seg) => {
    if (!canConvert(unitOf(seg), space)) return seg
    return length(toPx(seg, space), unit, space)
  })
}

/**
 * 扁平键的前缀匹配：'border-width-thin' 命中 'border-width'，'bordered' 不命中 'border'
 * @param {string} key 扁平令牌键
 * @param {Array<string>} list 前缀清单
 * @returns {boolean} 命中就是 true
 */
function hasKeyPrefix(key: string, list: string[]): boolean {
  for (let i = 0; i < list.length; i++) {
    const prefix = list[i]
    if (key === prefix) return true
    if (key.indexOf(prefix) === 0 && key.charAt(prefix.length) === '-') return true
  }
  return false
}

/**
 * 整张扁平令牌表换到同一个单位。
 *
 * @ds/dom 的出口就走这一步 —— 手写令牌（不过派生链的那部分）也要跟着响应式，
 * 所以换算得放在最后汇总的这一处，而不是只在派生链里做。
 *
 * @param tokens 扁平令牌表
 * @param unit 目标单位，任意符号
 * @param space 换算上下文
 * @param keep 这些前缀的键保持原样（见 DEFAULT_KEEP_PX 那两条理由）
 * @returns 新的令牌表，不改动入参
 */
export function rescaleTokens(
  tokens: FlatTokens,
  unit: UnitId,
  space?: UnitSpace,
  keep?: string[]
): FlatTokens {
  const skip = keep || []
  const out: FlatTokens = {}
  each(tokens, (value, key) => {
    const k = String(key)
    out[k] = hasKeyPrefix(k, skip) ? String(value) : rescale(String(value), unit, space)
  })
  return out
}

/**
 * 整张表 px -> rem。rescaleTokens 的 rem 特例，名字留着因为它是最高频的那一档。
 * @param {FlatTokens} tokens 扁平令牌表
 * @param {UnitSpace} space 换算上下文（主要用 rootFontSize）
 * @param {Array<string>} keep 保持 px 的键前缀，不给就是谁都不放过
 * @returns {FlatTokens} 换算后的令牌表
 */
export function remify(tokens: FlatTokens, space?: UnitSpace, keep?: string[]): FlatTokens {
  return rescaleTokens(tokens, 'rem', space, keep)
}

/**
 * 单个值 px -> rem。remify 的单值版本。
 * @param {unknown} value 原值
 * @param {UnitSpace} space 换算上下文
 * @returns {string} 换算后的字符串；没有 px 段就原样返回
 */
export function pxToRem(value: unknown, space?: UnitSpace): string {
  return rescale(value, 'rem', space)
}

/**
 * 点分路径挝平成短横线，就能复用扁平键那套前缀规则
 * @param {string} path 'shadow.md' 这种点分路径
 * @returns {string} 'shadow-md'
 */
function dashed(path: string): string {
  return path.replace(/\./g, '-')
}

/**
 * 递归换一棵令牌树的单位。
 * @param {TokenTree} node 当前子树
 * @param {string} path 点分路径，用于前缀匹配
 * @param {UnitSpace} space 换算上下文
 * @param {Array<string>} skip 保持原样的键前缀
 * @returns {TokenTree} 新的子树
 */
function walkTree(node: TokenTree, path: string, space: UnitSpace, skip: string[]): TokenTree {
  const out: TokenTree = {}
  const keys = Object.keys(node)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = node[key]
    const next = path ? `${path}.${key}` : key
    if (isPlainObject(value)) {
      out[key] = walkTree(value as TokenTree, next, space, skip)
    } else if (typeof value === 'string') {
      // 只折算字符串值；数字等非字符串原样留着，别把 4 这种裸数字改成字符串
      out[key] = hasKeyPrefix(dashed(next), skip) ? value : rescale(value, 'rem', space)
    } else {
      out[key] = value
    }
  }
  return out
}

/**
 * 嵌套令牌树整棵换成 rem。种子、手写主题这类不走扁平表的数据用这个。
 *
 * 没走 flatten/unflatten：那条路会把 `font.sizeMd` 拍成 `font-size-md`，
 * 还原时成了 `font.size.md` —— kebab 是有损的，种子的 camelCase 键会被换掉位置。
 * 所以这里老实递归，键名一个字符都不动。
 *
 * @param {TokenTree} tree 嵌套令牌树
 * @param {UnitSpace} space 换算上下文
 * @param {Array<string>} keep 保持 px 的键前缀
 * @returns {TokenTree} 新的令牌树
 */
export function remifyTree(tree: TokenTree, space?: UnitSpace, keep?: string[]): TokenTree {
  return walkTree(tree, '', space || {}, keep || [])
}
