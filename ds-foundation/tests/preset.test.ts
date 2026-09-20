/**
 * @ds/core preset：开箱即用预设
 * -------------------------------------------------------------
 * preset 的色值是人工挑的（接近 Tailwind slate 色阶），线性插值得不到一样的结果，
 * 所以这里只断言「结构正确 + 派生方向正确」，不断言具体色值 ——
 * 具体色值的断言在 core.test.ts 里（那里负责守住 preset 不被派生改动影响）。
 */

import { describe, it, expect } from 'vitest'
import { makeAccent, DEFAULT_ACCENT, accents, lightTokens, darkTokens, luminance } from '@ds/core'

describe('makeAccent', () => {
  it('label 缺省时就是色值本身', () => {
    expect(makeAccent('#0ea5e9').label).toBe('#0ea5e9')
  })

  it('推出 hover / active / subtle / border / ring / focus', () => {
    const a = makeAccent('#0ea5e9', '天蓝')
    const t = a.tokens.color as Record<string, string>
    expect(a.label).toBe('天蓝')
    expect(a.swatch).toBe('#0ea5e9')
    expect(t.brand).toBe('#0ea5e9')
    expect(t.brandHover).toBeTruthy()
    expect(t.brandActive).toBeTruthy()
    expect(t.brandSubtle).toContain('rgba(')
    expect(t.brandBorder).toContain('rgba(')
    expect(t.ring).toContain('rgba(')
    expect(t.borderFocus).toBe('#0ea5e9')
  })

  it('hover 比主色暗、active 更暗', () => {
    const t = makeAccent('#0ea5e9').tokens.color as Record<string, string>
    expect(luminance(t.brandHover)).toBeLessThan(luminance(t.brand))
    expect(luminance(t.brandActive)).toBeLessThan(luminance(t.brandHover))
  })

  it('深色主色上用白字', () => {
    const t = makeAccent('#4f46e5').tokens.color as Record<string, string>
    expect(t.onBrand).toBe('#ffffff')
  })

  it('浅色主色上用深字', () => {
    const t = makeAccent('#facc15').tokens.color as Record<string, string>
    expect(t.onBrand).toBe('#0f172a')
  })

  it('focus 阴影用主色的半透明', () => {
    const a = makeAccent('#0ea5e9')
    const shadow = a.tokens.shadow as Record<string, string>
    expect(shadow.focus).toContain('rgba(14, 165, 233, 0.25)')
  })
})

describe('内置强调色', () => {
  it('默认强调色是靛蓝', () => {
    expect(DEFAULT_ACCENT.label).toBe('靛蓝')
    expect((DEFAULT_ACCENT.tokens.color as Record<string, string>).brand).toBe('#4f46e5')
  })

  it('四个预设都在', () => {
    expect(Object.keys(accents)).toEqual(['indigo', 'blue', 'green', 'orange'])
    expect(accents.indigo).toBe(DEFAULT_ACCENT)
  })
})

describe('内置令牌表', () => {
  it('明暗两套共用同一份字体与动效（引用相等）', () => {
    expect(darkTokens.font).toBe(lightTokens.font)
    expect(darkTokens.motion).toBe(lightTokens.motion)
  })

  it('半透明色一律用逗号语法 —— 空格语法 IE10 不认', () => {
    expect(lightTokens.color.bgOverlay).toBe('rgba(15, 23, 42, 0.45)')
    expect(darkTokens.color.successSubtle).toBe('rgba(34, 197, 94, 0.16)')
  })

  it('暗色的阴影换成纯黑叠加', () => {
    expect(darkTokens.shadow.md).toBe('0 2px 8px rgba(0, 0, 0, 0.45)')
  })
})
