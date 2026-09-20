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
 * 派生不是万能的：内置 preset 用的是手工挑过的色值（接近 Tailwind slate 色阶），
 * 线性插值得不到一模一样的结果 —— 所以 preset 保持手写，派生留给「新主题」。
 */

import { get, isPlainObject, assign } from './util'
import type { Dict } from './util'
import { mix, toRgba, luminance, parseColor } from './color'
import type { TokenTree } from './token'
import type { ThemeMode } from './theme'

/** 派生算法：吃当前令牌树，吐新的令牌树 */
export type Algorithm = (tokens: TokenTree, ctx: DeriveContext) => TokenTree

export interface DeriveContext {
  mode: ThemeMode
  /** 管道开跑前的原始种子，供后处理算法回看「用户最初的意图」 */
  input: TokenTree
}

/** 种子里各项的默认值。想整套手调可以一项项传自己的 */
export const DEFAULT_SEED: TokenTree = {
  color: {
    brand: '#4f46e5',
    bg: '#ffffff',
    fg: '#0f172a',
    shadow: '15 23 42',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0284c7',
  },
  radius: { md: '4px' },
  font: { sizeMd: '14px' },
  motion: { base: '200ms' },
}

const D_BRAND = '#4f46e5'
const D_BG = '#ffffff'
const D_FG = '#0f172a'
const D_SHADOW = '15 23 42'
const D_SUCCESS = '#16a34a'
const D_WARNING = '#d97706'
const D_DANGER = '#dc2626'
const D_INFO = '#0284c7'
const D_CHANNELS = '79, 70, 229'
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

/** 取路径上的字符串。tokens 里没写就用 fallback */
function seedStr(src: unknown, path: string, fallback: string): string {
  const v = get(src, path)
  if (typeof v === 'number') return String(v)
  return typeof v === 'string' && v ? v : fallback
}

/** 取路径上的数字。'4px' / '200ms' 这类带单位的值也能认 */
function seedNum(src: unknown, path: string, fallback: number): number {
  const v = get(src, path)
  if (typeof v === 'number' && !isNaN(v)) return v
  if (typeof v === 'string' && v) {
    const n = parseFloat(v)
    if (!isNaN(n)) return n
  }
  return fallback
}

/** 取一个子组，取不到给空对象。这样算法面对残缺输入也能跑完 */
function group(src: unknown, path: string): Dict {
  const v = get(src, path)
  return isPlainObject(v) ? (v as Dict) : {}
}

/**
 * 混色 / 转 rgba 时可能因为色值写法不认识而返回 null。
 * 派生出来的值不允许是 null —— 宁可退回种子值，也不能把令牌写成空的。
 */
function mixOr(a: string, b: string, weight: number, fallback: string): string {
  const out = mix(a, b, weight)
  return out === null ? fallback : out
}

function rgbaOr(value: string, alpha: number, fallback: string): string {
  const out = toRgba(value, alpha)
  return out === null ? fallback : out
}

/** '#4f46e5' -> '79, 70, 229'。逗号语法，IE10 也认；空格语法 IE10 不认 */
function channelsOr(value: string, fallback: string): string {
  const c = parseColor(value)
  if (!c) return fallback
  return `${c.r}, ${c.g}, ${c.b}`
}

function px(n: number): string {
  return `${Math.max(0, Math.round(n))}px`
}

function ms(n: number): string {
  return `${Math.max(0, Math.round(n))}ms`
}

/**
 * 品牌色一族：给一个主色推出 hover / active / subtle / border / 环 / 前景。
 * makeAccent 与 defaultAlgorithm 共用这段，避免两边各写一份越写越偏。
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

/** 中性底色 + 边框 + 语义色的完整派生。src 里已有的同名键会被派生值覆盖 */
function paintColor(src: Dict): Dict {
  const brand = seedStr(src, 'brand', D_BRAND)
  const bg = seedStr(src, 'bg', D_BG)
  const fg = seedStr(src, 'fg', D_FG)
  const success = seedStr(src, 'success', D_SUCCESS)
  const warning = seedStr(src, 'warning', D_WARNING)
  const danger = seedStr(src, 'danger', D_DANGER)
  const info = seedStr(src, 'info', D_INFO)

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

function paintRadius(src: Dict): Dict {
  const base = seedNum(src, 'md', 4)
  return assign({} as Dict, src, {
    sm: px(base * 0.5),
    md: px(base),
    lg: px(base * 2),
    full: '9999px',
  })
}

function paintFont(src: Dict): Dict {
  const base = seedNum(src, 'sizeMd', 14)
  return assign({} as Dict, src, {
    family: seedStr(src, 'family', FONT_FAMILY),
    sizeSm: px(base - 2),
    sizeMd: px(base),
    sizeLg: px(base + 2),
    lineTight: '1.25',
    lineNormal: '1.5',
  })
}

function paintMotion(src: Dict): Dict {
  const base = seedNum(src, 'base', 200)
  return assign({} as Dict, src, {
    fast: ms(base * 0.6),
    base: ms(base),
    slow: ms(base * 1.6),
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  })
}

function paintShadow(src: Dict, brand: string): Dict {
  const ch = channelsOr(seedStr(src, 'shadow', ''), D_SHADOW)
  const brandCh = channelsOr(brand, D_CHANNELS)
  return assign({} as Dict, src, {
    none: 'none',
    sm: `0 1px 2px rgba(${ch}, 0.06)`,
    md: `0 2px 8px rgba(${ch}, 0.08)`,
    lg: `0 8px 24px rgba(${ch}, 0.12)`,
    focus: `0 0 0 3px rgba(${brandCh}, 0.25)`,
  })
}

/** 暗色下的阴影不能用浅色叠加，得换成更重的纯黑 */
function paintDarkShadow(src: Dict, brand: string): Dict {
  const brandCh = channelsOr(brand, D_CHANNELS)
  return assign({} as Dict, src, {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 2px 8px rgba(0, 0, 0, 0.45)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.55)',
    focus: `0 0 0 3px rgba(${brandCh}, 0.35)`,
  })
}

/** 稀疏种子补全成完整令牌表 */
export const defaultAlgorithm: Algorithm = (tokens) => {
  const color = group(tokens, 'color')
  const brand = seedStr(color, 'brand', D_BRAND)
  return assign({} as Dict, tokens, {
    color: paintColor(color),
    radius: paintRadius(group(tokens, 'radius')),
    font: paintFont(group(tokens, 'font')),
    motion: paintMotion(group(tokens, 'motion')),
    shadow: paintShadow(group(tokens, 'shadow'), brand),
  })
}

/**
 * 把颜色翻成暗色：底与前景互换，再重新做一遍中性派生。
 * 已经是暗底就直接返回 —— 组合成 [dark, dark] 或多跑一次不会越翻越离谱。
 */
export const darkAlgorithm: Algorithm = (tokens) => {
  const color = group(tokens, 'color')
  const bg = seedStr(color, 'bg', D_BG)
  const fg = seedStr(color, 'fg', D_FG)
  const brand = seedStr(color, 'brand', D_BRAND)
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
 * 基数改小后复用同一套 paint*，各档位之间的比例关系自然保持一致。
 */
export const compactAlgorithm: Algorithm = (tokens) => {
  const radius = group(tokens, 'radius')
  const font = group(tokens, 'font')
  const motion = group(tokens, 'motion')
  return assign({} as Dict, tokens, {
    radius: paintRadius(assign({} as Dict, radius, { md: px(seedNum(radius, 'md', 4) * 0.75) })),
    font: paintFont(assign({} as Dict, font, { sizeMd: px(seedNum(font, 'sizeMd', 14) - 1) })),
    motion: paintMotion(
      assign({} as Dict, motion, { base: ms(seedNum(motion, 'base', 200) * 0.8) })
    ),
  })
}

/**
 * 跑一遍派生管道。这是纯函数 —— 给同样的 seed 和 algorithm，结果必然一样。
 * @param seed 稀疏种子；填什么就改什么，缺省走 DEFAULT_SEED
 * @param algorithm 单个或数组。数组从左到右依次执行，前者输出是后者输入
 */
export function deriveTokens(
  seed?: TokenTree | null,
  algorithm?: Algorithm | Algorithm[] | null,
  mode?: ThemeMode | string
): TokenTree {
  const base: Dict = isPlainObject(seed) ? (assign({} as Dict, seed) as Dict) : {}
  const list = Array.isArray(algorithm) ? algorithm : algorithm ? [algorithm] : [defaultAlgorithm]
  const modeValue: ThemeMode = mode === 'dark' ? 'dark' : 'light'

  let out: Dict = base
  for (let i = 0; i < list.length; i++) {
    const fn = list[i]
    if (typeof fn !== 'function') continue
    const next = fn(out, { mode: modeValue, input: base })
    if (isPlainObject(next)) out = next as Dict
  }
  return out
}
