/**
 * @ds/dom theme：无 DOM 环境（SSR）
 * -------------------------------------------------------------
 * 这个包要能在 Node 里先算好 CSS 再内联进 <head>，所以整条链路
 * （建 manager -> 切主题 -> 导出 CSS -> destroy）在没有 document 时
 * 必须能跑完且不抛。跑在默认的 node 环境，不引入 jsdom。
 */

import { describe, it, expect } from 'vitest'
import { createThemeManager, pickChannel } from '@ds/dom'
import { baseOpts } from './fixtures'

describe('没有 document 时', () => {
  it('通道落到 static（无 CSS 变量可言）', () => {
    expect(pickChannel('auto')).toBe('static')
  })

  it('建 manager 不抛', () => {
    expect(() => createThemeManager({ ...baseOpts })).not.toThrow()
  })

  it('init / apply / use / toggle / override 都不抛', () => {
    const m = createThemeManager({ ...baseOpts })
    expect(() => {
      m.init()
      m.apply()
      m.use('dark')
      m.toggle()
      m.override('color-bg', '#000')
      m.overrideMap({ 'color-fg': '#fff' })
      m.resetOverrides()
      m.useAccent('green')
      m.followSystem(true)
    }).not.toThrow()
  })

  it('令牌照样能读、样式照样能导出', () => {
    const m = createThemeManager({ ...baseOpts })
    expect(m.get('color-bg')).toBe('#ffffff')
    expect(Object.keys(m.tokens()).length).toBeGreaterThan(30)
    const out = m.cssText({ theme: 'dark' })
    expect(out.semantic).toContain('#0b1220')
  })

  it('vars 通道下没有可写的元素时静默跳过（局部作用域传不进来）', () => {
    const m = createThemeManager({ ...baseOpts, channel: 'vars' })
    expect(() => {
      m.init()
      m.use('dark')
    }).not.toThrow()
    expect(m.get('color-bg')).toBe('#0b1220')
  })

  it('destroy 不抛', () => {
    const m = createThemeManager({ ...baseOpts })
    m.init()
    expect(() => m.destroy()).not.toThrow()
  })
})
