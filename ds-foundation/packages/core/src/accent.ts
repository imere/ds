/**
 * 强调色工厂
 * -------------------------------------------------------------
 * 只做一件事：给一个主色，推出配套的 hover / active / subtle / border / 环 / 前景。
 * 是**算法**，所以留在 core —— 业务接自己的品牌色时直接调用它，
 * 不需要引任何预设包。
 *
 * 具体色板（靛蓝 / 天蓝 / 青绿 / 暖橙）是设计决策，在 @ds/tokens。
 */

import { mix, toRgba, luminance } from './color'
import type { AccentDef } from './theme'

/**
 * 由一个主色推出整套品牌令牌。
 *
 * hover / active 用「往黑里混」而不是挑两个新色：同一支品牌色的不同状态
 * 应该保持同一个色相，人工挑色很容易在状态之间跳色相。
 * onBrand（品牌色上的文字）按亮度二选一 —— 这是少数不需要看设计稿就能定对的决定，
 * 因为它的目标是对比度而不是好看。
 *
 * @param hex 主色，任意 CSS 色值写法（'#4f46e5' / 'rgb(79, 70, 229)'）
 * @param label 展示名，不给就用色值本身
 * @returns 可直接喂给 registry.accent() 的强调色定义
 * @example
 *   registry.accent('brand', makeAccent('#0ea5e9', '天蓝'))
 */
export function makeAccent(hex: string, label?: string): AccentDef {
  const subtle = toRgba(hex, 0.12)
  const darker = mix(hex, '#000000', 0.12)
  const darkest = mix(hex, '#000000', 0.24)
  const onFill = luminance(hex) > 0.45 ? '#0f172a' : '#ffffff'
  return {
    label: label || hex,
    swatch: hex,
    tokens: {
      color: {
        brand: hex,
        brandHover: darker,
        brandActive: darkest,
        brandSubtle: subtle,
        brandBorder: toRgba(hex, 0.4),
        onBrand: onFill,
        ring: toRgba(hex, 0.35),
        borderFocus: hex,
      },
      shadow: {
        focus: `0 0 0 3px ${toRgba(hex, 0.25)}`,
      },
    },
  }
}
