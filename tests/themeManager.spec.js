import { describe, it, expect, beforeEach } from 'vitest'
import {
  state,
  setTheme,
  setAccent,
  setToken,
  setTokens,
  resetTokens,
  registerTheme,
  resolveTokens,
  resolveCssVars,
  exportCssVariables,
} from '@/design/themeManager'
import { createTheme } from '@/design/tokens'
import { themes } from '@/design/themes'

describe('themeManager', () => {
  beforeEach(() => {
    resetTokens()
    setTheme('light')
    setAccent('')
  })

  it('内置主题全部可用且带有 label / mode / tokens', () => {
    const names = Object.keys(themes)
    expect(names.length).toBeGreaterThanOrEqual(5)
    names.forEach((name) => {
      expect(themes[name].label).toBeTruthy()
      expect(['light', 'dark']).toContain(themes[name].mode)
      expect(themes[name].tokens.color.bg).toBeTruthy()
    })
  })

  it('resolveTokens 返回扁平键，且包含核心语义令牌', () => {
    const tokens = resolveTokens()
    expect(tokens['color-bg']).toBeTruthy()
    expect(tokens['color-fg']).toBeTruthy()
    expect(tokens['color-brand']).toBeTruthy()
    expect(tokens['space-4']).toBeTruthy()
    expect(tokens['radius-md']).toBeTruthy()
    expect(tokens['font-size-md']).toBeTruthy()
  })

  it('切换主题会改变解析结果并同步 DOM 属性', () => {
    const light = resolveTokens()['color-bg']
    setTheme('dark')
    const dark = resolveTokens()['color-bg']

    expect(state.name).toBe('dark')
    expect(light).not.toBe(dark)
    expect(document.documentElement.getAttribute('data-ds-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-ds-mode')).toBe('dark')
  })

  it('强调色与明暗主题正交，可自由组合', () => {
    setTheme('midnight')
    const themeBrand = resolveTokens()['color-brand']

    setAccent('emerald')
    const accentBrand = resolveTokens()['color-brand']

    expect(themeBrand).not.toBe(accentBrand)
    expect(accentBrand).toBe('#059669')

    setAccent('')
    expect(resolveTokens()['color-brand']).toBe(themeBrand)
  })

  it('setToken / setTokens 覆盖任意令牌，优先级高于主题', () => {
    setToken('color-brand', '#123456')
    expect(resolveTokens()['color-brand']).toBe('#123456')

    setTokens({ 'radius-md': '20px', 'color-danger': '#000000' })
    expect(resolveTokens()['radius-md']).toBe('20px')
    expect(resolveTokens()['color-danger']).toBe('#000000')

    resetTokens()
    expect(resolveTokens()['color-brand']).not.toBe('#123456')
  })

  it('运行时注册自定义主题后可立即切换', () => {
    registerTheme(
      'unit-test-theme',
      createTheme({
        label: '单测主题',
        mode: 'dark',
        color: { bg: '#010203', fg: '#ffffff', brand: '#ff00ff' },
      }),
    )

    expect(state.themes['unit-test-theme']).toBeTruthy()
    setTheme('unit-test-theme')
    expect(resolveTokens()['color-bg']).toBe('#010203')
    expect(resolveTokens()['color-brand']).toBe('#ff00ff')
  })

  it('CSS 变量带 --ds- 前缀，可导出为 :root 文本', () => {
    const vars = resolveCssVars()
    expect(vars['--ds-color-bg']).toBe(resolveTokens()['color-bg'])

    const css = exportCssVariables()
    expect(css.startsWith(':root {')).toBe(true)
    expect(css).toContain('--ds-color-bg:')
  })
})
