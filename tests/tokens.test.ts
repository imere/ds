/**
 * @ds/tokens：官方设计令牌集
 * -------------------------------------------------------------
 * 这里断言的是「值这一侧的契约」，跟 core 那边的机制断言分开：
 *
 *   1. 色板与令牌表的结构（具体色值不断言 —— 那属于设计决策，改了是正常的）
 *   2. **官方 seed 必须能被 core 的派生链接受**
 *      这条最值钱：core 给 seed 的形状定了一套必填项，tokens 是它的实现。
 *      两边谁先动，这里立刻红 —— 否则要等有人真的去派生一个新主题才发现。
 *   3. 尺度与规则的互相引用要对得上（规则引用了不存在的分组会静默产出空 class）
 */

import { describe, it, expect } from 'vitest'
import { makeAccent, luminance, deriveTokens, flattenTokens } from '@ds/core'
import {
  lightTokens,
  darkTokens,
  lightTheme,
  darkTheme,
  themes,
  accents,
  defaultAccent,
  defaultSeed,
  defaultBreakpoints,
  defaultScales,
  defaultScaleRules,
  defaultSemanticMap,
} from '@ds/tokens'

describe('makeAccent：算法在 core，色板在 tokens', () => {
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

describe('强调色板', () => {
  it('默认强调色是靛蓝', () => {
    expect(defaultAccent.label).toBe('靛蓝')
    expect((defaultAccent.tokens.color as Record<string, string>).brand).toBe('#4f46e5')
  })

  it('四个预设都在，indigo 就是默认那个', () => {
    expect(Object.keys(accents)).toEqual(['indigo', 'blue', 'green', 'orange'])
    expect(accents.indigo).toBe(defaultAccent)
  })
})

describe('明暗令牌表', () => {
  it('两套主题的 mode 与 label 正确', () => {
    expect(lightTheme.mode).toBe('light')
    expect(darkTheme.mode).toBe('dark')
    expect(themes.light).toBe(lightTheme)
    expect(themes.dark).toBe(darkTheme)
  })

  it('明暗共用同一份字体与动效（引用相等，改一处两边都动）', () => {
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

  it('暗底确实比亮底暗 —— 防止两份表被互相覆盖过', () => {
    expect(luminance(darkTokens.color.bg)).toBeLessThan(luminance(lightTokens.color.bg))
    expect(luminance(darkTokens.color.fg)).toBeGreaterThan(luminance(lightTokens.color.fg))
  })
})

describe('官方 seed 与 core 的种子契约', () => {
  it('defaultSeed 交给 deriveTokens 不抛错', () => {
    expect(() => deriveTokens(defaultSeed)).not.toThrow()
  })

  it('跑完能补全出全套令牌，而不是原样返回种子', () => {
    const out = flattenTokens(deriveTokens(defaultSeed))
    expect(Object.keys(out).length).toBeGreaterThan(30)
    expect(out['color-brand-hover']).toBeTruthy()
    expect(out['radius-lg']).toBeTruthy()
  })

  it('种子里每一项都有值 —— 派生链不接受残缺种子', () => {
    const flat = flattenTokens(defaultSeed)
    Object.keys(flat).forEach((key) => {
      expect(flat[key], `种子的 ${key} 是空的`).not.toBe('')
    })
  })
})

describe('断点与尺度', () => {
  it('断点按宽度升序，xs 为 0（up("xs") 等价于不加限制）', () => {
    const names = Object.keys(defaultBreakpoints)
    const widths = names.map((n) => defaultBreakpoints[n])
    expect(widths.slice().sort((a, b) => a - b)).toEqual(widths)
    expect(defaultBreakpoints.xs).toBe(0)
  })

  it('scale 规则引用的分组都在 defaultScales 里', () => {
    const groups = Object.keys(defaultScales)
    defaultScaleRules.forEach((rule) => {
      expect(groups, `规则 ${rule.prefix} 引用了不存在的分组 ${rule.scale}`).toContain(rule.scale)
    })
  })

  it('语义映射指向的分组名是令牌表里真实存在的前缀', () => {
    Object.keys(defaultSemanticMap).forEach((short) => {
      expect(defaultSemanticMap[short].group).toMatch(/^(color|shadow|radius|font|motion)/)
    })
  })
})
