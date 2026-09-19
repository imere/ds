/**
 * 主题层（@ds/core + @ds/dom + @ds/vue2 在本项目的接线）
 * -------------------------------------------------------------
 * 以前这里测的是自家那套 themeManager —— 那份实现已经删掉了，
 * 现在的测法应该是「验接线」而不是「验引擎」：
 *   · 引擎本身的正确性由 ds-foundation 的 173 项测试负责（那边有 IE10 双通道等分支）
 *   · 这里只关心：本项目的数据有没有正确灌进去、DOM 有没有按约定写、持久化有没有接上
 *
 * 所以断言集中在三点：令牌完整、DOM 属性对了、localStorage 收工。
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import Vue from 'vue'
import { installTheme, getThemeManager } from '@/theme'
import { themes } from '@/theme/themes'
import { accents } from '@/theme/accents'
import { createTheme } from '@/theme/tokens'

describe('主题接线', () => {
  let ds

  beforeAll(() => {
    installTheme(Vue)
    ds = getThemeManager()
  })

  beforeEach(() => {
    ds.resetOverrides()
    ds.useAccent('')
    ds.use('light')
  })

  it('内置主题全部注册进注册中心，且带 label / mode / 颜色', () => {
    const names = ds.registry.listThemes()
    expect(names.length).toBe(Object.keys(themes).length)
    names.forEach((name) => {
      const def = ds.registry.getTheme(name)
      expect(def.label).toBeTruthy()
      expect(['light', 'dark']).toContain(def.mode)
      expect(def.tokens.color.bg).toBeTruthy()
    })
  })

  it('内置强调色全部注册进注册中心', () => {
    expect(ds.registry.listAccents()).toEqual(Object.keys(accents))
  })

  it('令牌拍平后覆盖核心语义令牌 —— 业务 CSS 全靠这些名字', () => {
    const flat = ds.tokens()
    expect(flat['color-bg']).toBeTruthy()
    expect(flat['color-fg']).toBeTruthy()
    expect(flat['color-brand']).toBeTruthy()
    expect(flat['space-4']).toBe('16px')
    expect(flat['radius-md']).toBe('8px')
    expect(flat['font-size-md']).toBe('14px')
    expect(flat['shadow-md']).toBeTruthy()
  })

  it('CSS 变量写到 :root 且带 --ds- 前缀', () => {
    const style = document.getElementById('ds-tokens')
    expect(style).toBeTruthy()
    expect(style.textContent).toContain(':root{')
    expect(style.textContent).toContain('--ds-color-bg:')
  })

  it('切主题会同步 <html> 上的 data-ds-theme / data-ds-mode', () => {
    ds.use('midnight')
    const el = document.documentElement
    expect(el.getAttribute('data-ds-theme')).toBe('midnight')
    expect(el.getAttribute('data-ds-mode')).toBe('dark')

    ds.use('light')
    expect(el.getAttribute('data-ds-theme')).toBe('light')
    expect(el.getAttribute('data-ds-mode')).toBe('light')
  })

  it('强调色与明暗正交：换了强调色只动 brand 一族', () => {
    const before = ds.tokens()['color-bg']
    ds.useAccent('emerald')
    expect(ds.tokens()['color-brand']).toBe(accents.emerald.tokens.color.brand)
    expect(ds.tokens()['color-bg']).toBe(before)
    expect(document.documentElement.getAttribute('data-ds-accent')).toBe('emerald')
  })

  it('运行时覆盖令牌，优先级高于主题；resetOverrides 能还原', () => {
    ds.override('color-brand', '#123456')
    expect(ds.tokens()['color-brand']).toBe('#123456')

    ds.overrideMap({ 'radius-md': '20px', 'radius-lg': '30px' })
    expect(ds.tokens()['radius-md']).toBe('20px')
    expect(ds.tokens()['radius-lg']).toBe('30px')

    ds.resetOverrides()
    expect(ds.tokens()['color-brand']).not.toBe('#123456')
    expect(ds.tokens()['radius-md']).toBe('8px')
  })

  it('运行时注册主题后可立即切换（后台下发品牌配置的场景）', () => {
    ds.registry.theme(
      'unit-test-theme',
      createTheme({
        label: '单测主题',
        mode: 'dark',
        color: { bg: '#010203', fg: '#ffffff', brand: '#ff00ff' },
      }),
    )

    ds.use('unit-test-theme')
    expect(ds.tokens()['color-bg']).toBe('#010203')
    expect(ds.tokens()['color-brand']).toBe('#ff00ff')
    expect(ds.state().mode).toBe('dark')

    ds.use('light')
  })

  it('选择会写进 localStorage，键跟 manager 前缀走', () => {
    ds.use('midnight')
    ds.useAccent('rose')
    expect(window.localStorage.getItem('ds-theme')).toBe('midnight')
    expect(window.localStorage.getItem('ds-accent')).toBe('rose')

    ds.useAccent('')
    // 空强调色 = 跟随主题，要连键一起删掉，不能留个空字符串
    expect(window.localStorage.getItem('ds-accent')).toBe(null)

    ds.use('light')
  })

  it('$ds 是响应式的：主题一换 state.theme 跟着更新', async () => {
    const vm = new Vue({ render: (h) => h('div') })
    expect(vm.$ds.state.theme).toBe('light')
    ds.use('violet')
    await vm.$nextTick()
    expect(vm.$ds.state.theme).toBe('violet')
    expect(vm.$ds.state.mode).toBe('dark')
    ds.use('light')
    vm.$destroy()
  })
})
