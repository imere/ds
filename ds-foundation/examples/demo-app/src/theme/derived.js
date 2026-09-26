/**
 * 派生主题：Seed -> Algorithm[] -> Map
 * -------------------------------------------------------------
 * themes.js 里那 5 套主题是**手写**的：每个色值都是人挑的，改一个 brand
 * 不会让 brandHover / successFg 跟着动。这里走另一条路 —— 只给一个稀疏种子，
 * 整套颜色由算法算出来。
 *
 * 分三步：
 *   1. deriveTokens(seed, algorithm, mode)  由 @ds/core 算出完整令牌树
 *   2. 把库的中性/语义命名映射成**这个产品**的命名（下面 aliasColor）
 *   3. 与产品自己的基础尺度合并（间距 / 字号 / 层级不动，只让派生接管圆角与动效）
 *
 * 第 2 步不可省。库派生的键是 color-on-brand / color-bg-overlay / color-border-focus，
 * 而这个项目的样式消费的是 color-fg-on-brand / color-overlay / color-focus ——
 * 一个是库的语义层，一个是产品的语义层，中间必须有人翻译。
 * 这正是 antd 里 map token 与 alias token 的分工。
 */

import {
  deriveTokens,
  defaultAlgorithm,
  darkAlgorithm,
  compactAlgorithm,
  mergeTree,
  mix,
  toRgba,
} from '@ds/core'
import { defaultSeed } from '@ds/tokens'
import { scale, shadowPresets } from './tokens'

export { defaultAlgorithm, darkAlgorithm, compactAlgorithm }

/**
 * 产品自己的种子：垫在官方 defaultSeed 之上再改这两项。
 * 必须垫 —— 派生链不接受残缺种子(@ds/core 会直接抛错)，
 * 而自己补一份完整的既啰嗦又容易跟官方那份走偏。
 * 不垫的话圆角会退回 4px、动效退回 200ms，派生主题看起来像换了个产品。
 */
const BASE_SEED = mergeTree(defaultSeed, { radius: { md: '8px' }, motion: { base: '220ms' } })

/** 混色 / 转 rgba 认不出的色值会返回 null，派生结果不允许是空 —— 退回原值 */
function blend(a, b, weight, fallback) {
  const out = mix(a, b, weight)
  return out === null || out === undefined ? fallback : out
}

function alpha(value, a, fallback) {
  const out = toRgba(value, a)
  return out === null || out === undefined ? fallback : out
}

/** 语义色的前景色：浅色底上压暗、深色底上提亮，保证对比度 */
function statusFg(color, dark) {
  return dark ? blend(color, '#ffffff', 0.28, color) : blend(color, '#000000', 0.28, color)
}

/**
 * 库的语义层 -> 产品的语义层
 * @param {object} c deriveTokens 产出的 color 分组
 * @param {boolean} dark 是否暗色
 */
function aliasColor(c, dark) {
  const bg = c.bg || '#ffffff'
  const fg = c.fg || '#0f172a'

  return {
    // 表面
    bg,
    bgSubtle: c.bgSubtle,
    bgElevated: dark ? blend(bg, '#ffffff', 0.09, bg) : '#ffffff',
    bgInset: c.bgInset,
    bgHover: alpha(fg, 0.055, bg),
    bgActive: alpha(fg, 0.1, bg),
    bgDisabled: alpha(fg, 0.04, bg),

    // 文字
    fg,
    fgMuted: c.fgMuted,
    fgSubtle: c.fgSubtle,
    fgDisabled: c.fgDisabled,
    fgOnBrand: c.onBrand,

    // 描边
    border: c.border,
    borderStrong: c.borderStrong,
    borderSubtle: blend(bg, fg, 0.06, fg),

    // 品牌
    brand: c.brand,
    brandHover: c.brandHover,
    brandActive: c.brandActive,
    brandSubtle: c.brandSubtle,
    brandBorder: c.brandBorder,
    brandFg: c.brandHover,
    focus: c.borderFocus,

    // 语义色
    success: c.success,
    successSubtle: c.successSubtle,
    successFg: statusFg(c.success, dark),
    warning: c.warning,
    warningSubtle: c.warningSubtle,
    warningFg: statusFg(c.warning, dark),
    danger: c.danger,
    dangerSubtle: c.dangerSubtle,
    dangerFg: statusFg(c.danger, dark),
    info: c.info,
    infoSubtle: c.infoSubtle,
    infoFg: statusFg(c.info, dark),

    // 其它
    overlay: c.bgOverlay,
    skeleton: alpha(fg, 0.08, bg),
  }
}

/**
 * 造一个派生主题。返回值形状与 themes.js 里的 createTheme 一致，
 * 可以直接塞给 registry.theme(name, def)。
 *
 * @param {object} definition
 * @param {string} definition.label 面板上显示的名字
 * @param {'light'|'dark'} [definition.mode] 暗色会自动追加 darkAlgorithm
 * @param {object} definition.seed 稀疏种子，例如 { color: { brand: '#0d9480' } }
 * @param {Function|Function[]} [definition.algorithm] 不给就按 mode 自动挑
 */
export function createDerivedTheme(definition) {
  const { label, mode = 'light', seed = {}, algorithm } = definition
  const dark = mode === 'dark'

  const list =
    algorithm || (dark ? [defaultAlgorithm, darkAlgorithm] : [defaultAlgorithm])

  const derived = deriveTokens(mergeTree(BASE_SEED, seed), list, mode)
  const color = aliasColor(derived.color || {}, dark)
  const radius = derived.radius || {}
  const motion = derived.motion || {}

  return {
    label,
    mode,
    tokens: {
      ...scale,
      // 圆角与动效交给派生（这样 compactAlgorithm 才看得出来），
      // 其余尺度（间距 / 字号 / 层级 / 控件尺寸）是这个产品自己的，不动
      radius: { ...scale.radius, sm: radius.sm, md: radius.md, lg: radius.lg, full: radius.full },
      motion: {
        ...scale.motion,
        durationFast: motion.fast,
        durationBase: motion.base,
        durationSlow: motion.slow,
        easeStandard: motion.ease,
      },
      color,
      shadowColor: dark ? '0 0 0' : (seed.color && seed.color.shadow) || '15 23 42',
      ...shadowPresets[mode],
    },
  }
}
