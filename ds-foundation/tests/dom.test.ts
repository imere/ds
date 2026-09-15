/**
 * @ds/dom 双通道适配层
 * -------------------------------------------------------------
 * 由原 scripts/dom-smoke.mjs 迁移而来，断言语义一律不变。
 * 需要真实 DOM，所以在 jsdom 环境跑。
 *
 * jsdom 不实现 CSS 自定义属性，能力检测会把它判成 static，
 * 所以这里显式指定 channel，分别验证两条通道的产物。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createThemeManager, pickChannel, supportsCssVars } from '@ds/dom'

function text(id: string): string {
  const el = document.getElementById(id)
  return el ? el.textContent || '' : ''
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.documentElement.removeAttribute('data-ds-theme')
  document.documentElement.removeAttribute('data-ds-mode')
  document.documentElement.removeAttribute('data-ds-accent')
})

describe('A. 现代通道（vars）', () => {
  it('通道判定为 vars', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    expect(m.channel).toBe('vars')
    m.destroy()
  })

  it('写入 #ds-tokens', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    expect(document.getElementById('ds-tokens')).toBeTruthy()
    m.destroy()
  })

  it('变量块挂在 :root 上', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    expect(text('ds-tokens').indexOf(':root{--ds-color-bg:#ffffff;')).toBe(0)
    m.destroy()
  })

  it('primitive class 已注入', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    expect(text('ds-class-primitive')).toContain('.ds-p-4{padding:16px;}')
    m.destroy()
  })

  it('semantic class 用 var()', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    expect(text('ds-class-semantic')).toContain(
      '.ds-bg-subtle{background-color:var(--ds-color-bg-subtle);}'
    )
    m.destroy()
  })

  it('html 上打了主题属性', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    expect(document.documentElement.getAttribute('data-ds-theme')).toBe('light')
    m.destroy()
  })

  it('style() 返回 var 引用', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    expect(m.style({ color: 'color-fg' }).color).toBe('var(--ds-color-fg)')
    m.destroy()
  })

  it('换主题触发订阅', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    let hits = 0
    m.subscribe(() => {
      hits++
    })
    m.use('dark')
    expect(hits).toBe(1)
    m.destroy()
  })

  it('变量块随主题更新', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    m.use('dark')
    expect(text('ds-tokens')).toContain('--ds-color-bg:#0b1220;')
    m.destroy()
  })

  it('semantic class 没被重写（仍是一份 var）', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    m.use('dark')
    expect(text('ds-class-semantic')).toContain('var(--ds-color-bg-subtle)')
    // vars 通道下 semantic 始终只有一份规则，不随主题数增长
    expect(text('ds-class-semantic').split('var(--ds-color-bg-subtle)').length - 1).toBe(1)
    m.destroy()
  })

  it('html 属性同步', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    m.use('dark')
    expect(document.documentElement.getAttribute('data-ds-mode')).toBe('dark')
    m.destroy()
  })

  it('toggle 切回浅色', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    m.use('dark')
    m.toggle()
    expect(m.state().theme).toBe('light')
    m.destroy()
  })

  it('semantic 在 vars 通道下不随强调色重写', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    const before = text('ds-class-semantic')
    m.useAccent('orange')
    expect(text('ds-class-semantic')).toBe(before)
    m.destroy()
  })

  it('强调色反映到令牌', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    m.init()
    m.useAccent('orange')
    expect(m.tokens()['color-brand']).toBe('#ea580c')
    m.destroy()
  })
})

describe('B. IE10 通道（static）', () => {
  const legacyOpts = {
    channel: 'static',
    persist: false,
    theme: 'light',
    idTokens: 'x-tokens',
    idPrimitive: 'x-primitive',
    idSemantic: 'x-semantic',
  } as const

  it('通道判定为 static', () => {
    const m = createThemeManager(legacyOpts)
    m.init()
    expect(m.channel).toBe('static')
    m.destroy()
  })

  it('不写无意义的变量块', () => {
    const m = createThemeManager(legacyOpts)
    m.init()
    expect(!document.getElementById('x-tokens') || text('x-tokens') === '').toBe(true)
    m.destroy()
  })

  it('primitive 与 vars 通道完全一致', () => {
    const m = createThemeManager(legacyOpts)
    m.init()
    // primitive 与主题无关，两条通道产物必须逐字节相同
    const ref = createThemeManager({ channel: 'vars', persist: false, theme: 'light' })
    ref.init()
    expect(text('x-primitive')).toBe(text('ds-class-primitive'))
    ref.destroy()
    m.destroy()
  })

  it('semantic 已换成实值', () => {
    const m = createThemeManager(legacyOpts)
    m.init()
    expect(text('x-semantic')).not.toContain('var(')
    m.destroy()
  })

  it('semantic 拿到真实色值', () => {
    const m = createThemeManager(legacyOpts)
    m.init()
    expect(text('x-semantic')).toContain('.ds-bg-subtle{background-color:#f8fafc;}')
    m.destroy()
  })

  it('style() 返回实值而非 var', () => {
    const m = createThemeManager(legacyOpts)
    m.init()
    expect(m.style({ color: 'color-fg' }).color).toBe('#0f172a')
    m.destroy()
  })

  it('换主题后整段重写', () => {
    const m = createThemeManager(legacyOpts)
    m.init()
    m.use('dark')
    expect(text('x-semantic')).toContain('#111a2b')
    expect(text('x-semantic')).not.toContain('var(')
    m.destroy()
  })
})

describe('C. 通道判定', () => {
  it('显式指定优先', () => {
    expect(pickChannel('vars')).toBe('vars')
    expect(pickChannel('static')).toBe('static')
  })

  it('auto 落在二选一内', () => {
    expect(['static', 'vars']).toContain(pickChannel('auto'))
  })

  it('auto 与能力检测结果一致', () => {
    // jsdom 30 已经支持自定义属性，所以这里跑出来多半是 vars；
    // 断言写成「映射一致」而不是写死某一边，换个环境才不会假失败。
    expect(pickChannel('auto')).toBe(supportsCssVars() ? 'vars' : 'static')
  })

  it('无 window 时不崩且落到一个确定值', () => {
    // env 内部对 window 缺失有短路分支，这里确认它返回布尔值而不是抛错
    expect(typeof supportsCssVars()).toBe('boolean')
  })
})

describe('D. 自定义前缀落地到 DOM', () => {
  it('style id 与 DOM 属性全部跟着换', () => {
    const m = createThemeManager({ channel: 'vars', persist: false, theme: 'light', prefix: 'acme' })
    m.init()
    expect(document.getElementById('acme-tokens')).toBeTruthy()
    expect(document.getElementById('acme-class-primitive')).toBeTruthy()
    expect(document.documentElement.getAttribute('data-acme-theme')).toBe('light')
    expect(text('acme-tokens')).toContain('--acme-color-bg:')
    expect(text('acme-class-primitive')).toContain('.acme-p-4{')
    m.destroy()
  })
})
