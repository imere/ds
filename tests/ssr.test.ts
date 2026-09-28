/**
 * @ds/dom ssr：防闪烁脚本
 * -------------------------------------------------------------
 * 这段脚本要内联进 <head> 在 IE10 上直接执行，所以它是全仓库唯一
 * 刻意保留 var 的地方 —— 测试里除了断言结构，还要守住「它必须是 ES5」。
 */

import { describe, it, expect } from 'vitest'
import { getInitScript, renderHead } from '@ds/dom'

// restoreScript / styleId 之外，脚本内容本身必须是 ES5
const ES6_MARKERS = ['=>', 'let ', 'const ', '`', '...']

describe('getInitScript', () => {
  it('输出一个 IIFE，配置以 JSON 注入', () => {
    const s = getInitScript({ theme: 'dark' })
    expect(s.startsWith('<script>(function(c){try{')).toBe(true)
    expect(s).toContain('"def":"dark"')
    expect(s.endsWith('</script>')).toBe(true)
  })

  it('默认 modes 是 light/dark 两套', () => {
    expect(getInitScript()).toContain('"modes":{"light":"light","dark":"dark"}')
  })

  it('自定义 modes 原样写入', () => {
    expect(getInitScript({ modes: { violet: 'dark' } })).toContain('"modes":{"violet":"dark"}')
  })

  it('DOM 属性可单独覆盖', () => {
    const s = getInitScript({ attr: 'data-x', modeAttr: 'data-y', accentAttr: 'data-z' })
    expect(s).toContain('"attr":"data-x"')
    expect(s).toContain('"mattr":"data-y"')
    expect(s).toContain('"aattr":"data-z"')
  })

  it('没给默认主题时 def 是空串，脚本不会瞎猜', () => {
    expect(getInitScript()).toContain('"def":""')
  })

  it('restore 片段被拼进同一个作用域', () => {
    const s = getInitScript({ restore: 'try{t=localStorage.getItem("x")}catch(e){}' })
    expect(s).toContain('try{t=localStorage.getItem("x")}catch(e){}')
  })

  it('整段脚本不含 ES6 语法 —— 它要跑在 IE10 上', () => {
    const s = getInitScript({ theme: 'light', restore: 't="dark"' })
    ES6_MARKERS.forEach((m) => {
      expect(s).not.toContain(m)
    })
  })

  it('脚本整体包在 try/catch 里，任何环境都不会因为打属性而报错', () => {
    expect(getInitScript()).toContain('}catch(e){}})')
  })
})

describe('renderHead', () => {
  it('脚本 + 样式一起输出', () => {
    const out = renderHead('.a{color:red}', { theme: 'dark' })
    expect(out).toContain('<script>')
    expect(out).toContain('<style id="ds-ssr">.a{color:red}</style>')
  })

  it('完全不给选项也能用（theme 与 styleId 都走默认）', () => {
    const out = renderHead('.a{}')
    expect(out).toContain('<script>')
    expect(out).toContain('id="ds-ssr"')
  })

  it('没有 CSS 时只输出脚本', () => {
    const out = renderHead('', { theme: 'dark' })
    expect(out).not.toContain('<style')
  })

  it('styleId 可自定义', () => {
    expect(renderHead('.a{}', { styleId: 'app-ssr' })).toContain('id="app-ssr"')
  })

  it('styleId 跟着前缀走', () => {
    expect(renderHead('.a{}', { prefix: 'acme' })).toContain('id="acme-ssr"')
  })
})
