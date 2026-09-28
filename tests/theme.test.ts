/**
 * @ds/core theme：注册中心
 * -------------------------------------------------------------
 * 注册中心是「主题 <- 强调色 <- 手动覆盖」这条覆盖链的执行者。
 * 这里把每个方法的**拒绝分支**都走一遍：空名字、不存在的主题、
 * 没建过任何主题时的 resolve / state —— 这些路径平时跑不到，
 * 但一旦跑到（比如业务在 init 之前就读令牌）必须是确定行为而不是崩。
 */

import { describe, it, expect } from 'vitest'
import { createRegistry, createTheme, resolveTokens } from '@ds/core'
import type { ThemeDef, AccentDef } from '@ds/core'
import { darkTheme, lightTheme } from '@ds/tokens'

function def(tokens: Record<string, unknown>): ThemeDef {
  return { label: 't', mode: 'light', tokens }
}

describe('createTheme', () => {
  it('手写 tokens 原样保留', () => {
    const t = createTheme(def({ color: { bg: '#fff' } }))
    expect(t.tokens).toEqual({ color: { bg: '#fff' } })
    expect(t.label).toBe('t')
  })

  it('不给 mode 时是 light', () => {
    expect(createTheme({ tokens: { a: '1' } }).mode).toBe('light')
  })

  it('mode=dark 时阴影基色翻成黑', () => {
    expect(createTheme({ mode: 'dark', tokens: { a: '1' } }).shadowColor).toBe('0 0 0')
  })

  it('浅色的阴影基色是 slate', () => {
    expect(createTheme({ tokens: { a: '1' } }).shadowColor).toBe('15 23 42')
  })

  it('显式给 shadowColor 时不覆盖', () => {
    expect(createTheme({ tokens: { a: '1' }, shadowColor: '1 2 3' }).shadowColor).toBe('1 2 3')
  })

  it('label 缺省为空串', () => {
    expect(createTheme({ tokens: { a: '1' } }).label).toBe('')
  })

  it('tokens 与 seed 都没有 -> 抛错', () => {
    expect(() => createTheme({} as unknown as ThemeDef)).toThrow(/tokens 或 seed/)
    expect(() => createTheme(null as unknown as ThemeDef)).toThrow(TypeError)
  })
})

describe('registry.theme', () => {
  it('第一个注册的主题自动成为当前主题', () => {
    const r = createRegistry()
    r.theme('a', def({ x: '1' }))
    expect(r.state().theme).toBe('a')
  })

  it('空名字被忽略', () => {
    const r = createRegistry()
    expect(r.theme('', def({ x: '1' }))).toBe(r)
    expect(r.listThemes()).toEqual([])
  })

  it('既没 tokens 也没 seed 的定义原样塞进表里（已是归一化结果，不再派生）', () => {
    const r = createRegistry()
    r.theme('a', { label: 'x', mode: 'dark', tokens: { y: '2' }, shadowColor: '0 0 0' })
    expect(r.getTheme('a')?.tokens).toEqual({ y: '2' })
  })

  it('连 tokens 都没有的定义也照样进表（调用方自己保证形态）', () => {
    const r = createRegistry()
    const raw = { label: 'raw' } as unknown as ThemeDef
    r.theme('raw', raw)
    expect(r.getTheme('raw')).toBe(raw)
  })

  it('返回 api 本身，可链式', () => {
    const r = createRegistry()
    expect(r.theme('a', def({ x: '1' })).theme('b', def({ x: '2' }))).toBe(r)
  })
})

describe('registry.accent', () => {
  it('空名字或空定义被忽略', () => {
    const r = createRegistry()
    r.accent('', { tokens: { a: '1' } })
    r.accent('a', null as unknown as AccentDef)
    expect(r.listAccents()).toEqual([])
  })

  it('正常注册后可取回', () => {
    const r = createRegistry()
    const a: AccentDef = { label: 'g', tokens: { color: { brand: '#0f0' } } }
    r.accent('g', a)
    expect(r.getAccent('g')).toBe(a)
  })
})

describe('registry.override', () => {
  it('空键被忽略', () => {
    const r = createRegistry()
    r.theme('a', def({ x: '1' })).override('', 'v')
    expect(r.resolve()['']).toBeUndefined()
  })

  it('标量值直接写', () => {
    const r = createRegistry()
    r.theme('a', def({ 'color-bg': '#fff' })).override('color-bg', '#000')
    expect(r.resolve()['color-bg']).toBe('#000')
  })

  it('对象值按组合并，已有的那组不被整组替换', () => {
    const r = createRegistry()
    r.theme('a', def({ radius: { sm: '2px', md: '4px' } }))
      .override('radius', { md: '20px' })
      .override('radius', { lg: '30px' })
    expect(r.resolve()).toMatchObject({
      'radius-sm': '2px',
      'radius-md': '20px',
      'radius-lg': '30px',
    })
  })

  it('对象值覆盖在原本是标量的键上也不会炸', () => {
    const r = createRegistry()
    r.theme('a', def({ radius: '4px' })).override('radius', { md: '20px' })
    expect(r.resolve()['radius-md']).toBe('20px')
  })

  it('resetOverrides 清空所有覆盖', () => {
    const r = createRegistry()
    r.theme('a', def({ 'color-bg': '#fff' }))
      .override('color-bg', '#000')
      .resetOverrides()
    expect(r.resolve()['color-bg']).toBe('#fff')
  })
})

describe('registry.overrideMap', () => {
  it('null / undefined 安全', () => {
    const r = createRegistry()
    expect(r.overrideMap(null)).toBe(r)
    expect(r.overrideMap(undefined)).toBe(r)
  })

  it('一次改多个，结果与逐个 override 一致', () => {
    const r = createRegistry()
    r.theme('a', def({ 'color-bg': '#fff', 'color-fg': '#000' }))
    r.overrideMap({ 'color-bg': '#111', 'color-fg': '#222' })
    expect(r.resolve()['color-bg']).toBe('#111')
    expect(r.resolve()['color-fg']).toBe('#222')
  })
})

describe('registry.use / useAccent', () => {
  it('切到不存在的主题时保持原样', () => {
    const r = createRegistry()
    r.theme('a', def({ x: '1' })).use('nope')
    expect(r.state().theme).toBe('a')
  })

  it('useAccent 传空串表示「不用强调色」', () => {
    const r = createRegistry()
    r.theme('a', def({ x: '1' }))
    r.accent('g', { tokens: { color: { brand: '#0f0' } } })
    r.useAccent('g')
    r.useAccent('')
    expect(r.state().accent).toBe('')
  })
})

describe('registry.getTheme / getAccent', () => {
  it('不传名字取当前主题', () => {
    const r = createRegistry()
    r.theme('a', def({ x: '1' }))
    expect(r.getTheme()).toBe(r.getTheme('a'))
  })

  it('没有任何主题时返回 null', () => {
    const r = createRegistry()
    expect(r.getTheme()).toBeNull()
    expect(r.getAccent()).toBeNull()
  })

  it('取不存在的强调色返回 null', () => {
    const r = createRegistry()
    expect(r.getAccent('nope')).toBeNull()
  })
})

describe('registry.resolve / state', () => {
  it('没有任何主题时 resolve 给空表，state 给安全默认值', () => {
    const r = createRegistry()
    expect(r.resolve()).toEqual({})
    expect(r.state()).toEqual({ theme: '', accent: '', mode: 'light', label: '' })
  })

  it('强调色排在主题之后、手动覆盖之前', () => {
    const r = createRegistry()
    r.theme('a', def({ color: { brand: '#111' } }))
    r.accent('g', { tokens: { color: { brand: '#222' } } })
    r.useAccent('g')
    expect(r.resolve()['color-brand']).toBe('#222')
    r.override('color-brand', '#333')
    expect(r.resolve()['color-brand']).toBe('#333')
  })

  it('强调色没有 tokens 时不参与解析', () => {
    const r = createRegistry()
    r.theme('a', def({ color: { brand: '#111' } }))
    r.accent('empty', { label: 'e' } as unknown as AccentDef)
    r.useAccent('empty')
    expect(r.resolve()['color-brand']).toBe('#111')
  })
})

describe('resolveTokens（纯函数版）', () => {
  it('没给主题返回空表', () => {
    expect(resolveTokens(null)).toEqual({})
  })

  it('主题 + 强调色 + 覆盖三层叠加', () => {
    const flat = resolveTokens(
      lightTheme,
      { tokens: { color: { brand: '#0f0' } } },
      { color: { bg: '#eee' } }
    )
    expect(flat['color-brand']).toBe('#0f0')
    expect(flat['color-bg']).toBe('#eee')
  })

  it('强调色没 tokens 时跳过', () => {
    expect(resolveTokens(lightTheme, {} as AccentDef, null)['color-brand']).toBeUndefined()
  })
})

describe('内置 preset', () => {
  it('light / dark 的 mode 与 label', () => {
    expect(lightTheme.mode).toBe('light')
    expect(darkTheme.mode).toBe('dark')
    expect(lightTheme.label).toBe('浅色')
    expect(darkTheme.label).toBe('深色')
  })
})
