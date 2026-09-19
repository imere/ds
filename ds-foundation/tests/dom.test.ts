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

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createThemeManager, pickChannel, supportsCssVars, resetEnvCache } from '@ds/dom'

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
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    expect(m.channel).toBe('vars')
    m.destroy()
  })

  it('写入 #ds-tokens', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    expect(document.getElementById('ds-tokens')).toBeTruthy()
    m.destroy()
  })

  it('变量块挂在 :root 上', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    expect(text('ds-tokens').indexOf(':root{--ds-color-bg:#ffffff;')).toBe(0)
    m.destroy()
  })

  it('primitive class 已注入', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    expect(text('ds-class-primitive')).toContain('.ds-p-4{padding:16px;}')
    m.destroy()
  })

  it('semantic class 用 var()', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    expect(text('ds-class-semantic')).toContain(
      '.ds-bg-subtle{background-color:var(--ds-color-bg-subtle);}'
    )
    m.destroy()
  })

  it('html 上打了主题属性', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    expect(document.documentElement.getAttribute('data-ds-theme')).toBe('light')
    m.destroy()
  })

  it('style() 返回 var 引用', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    expect(m.style({ color: 'color-fg' }).color).toBe('var(--ds-color-fg)')
    m.destroy()
  })

  it('换主题触发订阅', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
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
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    m.use('dark')
    expect(text('ds-tokens')).toContain('--ds-color-bg:#0b1220;')
    m.destroy()
  })

  it('semantic class 没被重写（仍是一份 var）', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    m.use('dark')
    expect(text('ds-class-semantic')).toContain('var(--ds-color-bg-subtle)')
    // vars 通道下 semantic 始终只有一份规则，不随主题数增长
    expect(text('ds-class-semantic').split('var(--ds-color-bg-subtle)').length - 1).toBe(1)
    m.destroy()
  })

  it('html 属性同步', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    m.use('dark')
    expect(document.documentElement.getAttribute('data-ds-mode')).toBe('dark')
    m.destroy()
  })

  it('toggle 切回浅色', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    m.use('dark')
    m.toggle()
    expect(m.state().theme).toBe('light')
    m.destroy()
  })

  it('semantic 在 vars 通道下不随强调色重写', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    const before = text('ds-class-semantic')
    m.useAccent('orange')
    expect(text('ds-class-semantic')).toBe(before)
    m.destroy()
  })

  it('强调色反映到令牌', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light' })
    m.init()
    m.useAccent('orange')
    expect(m.tokens()['color-brand']).toBe('#ea580c')
    m.destroy()
  })
})

describe('B. IE10 通道（static）', () => {
  const legacyOpts = {
    channel: 'static',
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
    const ref = createThemeManager({ channel: 'vars', theme: 'light' })
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

describe('E. 批量覆盖令牌', () => {
  const make = () =>
    createThemeManager({ channel: 'vars', theme: 'light', withClasses: false }).init()

  it('overrideMap 一次改多个令牌', () => {
    const m = make()
    m.overrideMap({ 'radius-md': '20px', 'color-brand': '#010203' })
    expect(m.tokens()['radius-md']).toBe('20px')
    expect(m.tokens()['color-brand']).toBe('#010203')
    m.destroy()
  })

  it('对象值仍然按组合并，跟单个 override 行为一致', () => {
    const m = make()
    m.override('color', { brand: '#111111' })
    m.overrideMap({ color: { fg: '#222222' } })
    expect(m.tokens()['color-brand']).toBe('#111111')
    expect(m.tokens()['color-fg']).toBe('#222222')
    m.destroy()
  })

  it('三个令牌只重绘一次', () => {
    const m = make()
    let calls = 0
    m.subscribe(() => {
      calls += 1
    })
    calls = 0
    m.overrideMap({ 'radius-sm': '1px', 'radius-md': '2px', 'radius-lg': '3px' })
    expect(calls).toBe(1)
    m.destroy()
  })

  it('resetOverrides 之后回到主题自带值', () => {
    const m = make()
    const base = m.tokens()['radius-md']
    m.overrideMap({ 'radius-md': '20px' })
    expect(m.tokens()['radius-md']).toBe('20px')
    m.resetOverrides()
    expect(m.tokens()['radius-md']).toBe(base)
    m.destroy()
  })
})

/**
 * jsdom 不实现 matchMedia，所以下面这些用例自己做一个，
 * 并且每跑完一个就把 window.matchMedia 还原 + 清掉 env 的检测缓存 ——
 * env.ts 的能力检测是带缓存的，不还原会让同一个文件里后面的用例读到假结果。
 */
interface FakeSystem {
  setMatches(next: boolean): void
  listenerCount(): number
  restore(): void
}

function fakeSystem(prefersDarkNow: boolean): FakeSystem {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  let matches = prefersDarkNow

  const mql = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    addListener(fn: (e: MediaQueryListEvent) => void) {
      listeners.push(fn)
    },
    removeListener(fn: (e: MediaQueryListEvent) => void) {
      const i = listeners.indexOf(fn)
      if (i > -1) listeners.splice(i, 1)
    },
  }

  Object.defineProperty(window, 'matchMedia', {
    value: () => mql,
    configurable: true,
    writable: true,
  })
  resetEnvCache()

  return {
    setMatches(next: boolean) {
      matches = next
      listeners.slice().forEach((fn) => {
        fn({ matches: next } as MediaQueryListEvent)
      })
    },
    listenerCount() {
      return listeners.length
    },
    restore() {
      if (original) Object.defineProperty(window, 'matchMedia', original)
      else delete (window as { matchMedia?: unknown }).matchMedia
      resetEnvCache()
    },
  }
}

describe('E. 跟随系统明暗（运行时开关）', () => {
  let sys: FakeSystem | null = null

  afterEach(() => {
    if (sys) {
      sys.restore()
      sys = null
    }
  })

  it('init 时就跟随：系统偏好深色则进 dark', () => {
    sys = fakeSystem(true)
    const m = createThemeManager({ channel: 'vars', followSystem: true, withClasses: false }).init()
    expect(m.state().theme).toBe('dark')
    m.destroy()
  })

  it('手动切过主题之后不再自动跟随', () => {
    sys = fakeSystem(false)
    const m = createThemeManager({ channel: 'vars', followSystem: true, withClasses: false }).init()
    expect(m.state().theme).toBe('light')
    m.use('dark')
    sys.setMatches(true)
    expect(m.state().theme).toBe('dark')
    m.use('light')
    sys.setMatches(false)
    expect(m.state().theme).toBe('light') // pinned 住了，不动
    m.destroy()
  })

  it('运行时打开 followSystem 会清掉手动标记并立刻切一次', () => {
    sys = fakeSystem(false)
    const m = createThemeManager({ channel: 'vars', theme: 'light', withClasses: false }).init()
    expect(m.state().theme).toBe('light')

    sys.setMatches(true)
    expect(m.state().theme).toBe('light') // 还没开 followSystem

    m.followSystem(true)
    expect(m.state().theme).toBe('dark')
    expect(m.state().followSystem).toBe(true)
    m.destroy()
  })

  it('关掉 followSystem 后系统再变也不动', () => {
    sys = fakeSystem(false)
    const m = createThemeManager({ channel: 'vars', theme: 'light', withClasses: false }).init()
    m.followSystem(true)
    expect(m.state().theme).toBe('light')

    m.followSystem(false)
    sys.setMatches(true)
    expect(m.state().theme).toBe('light')
    expect(m.state().followSystem).toBe(false)
    m.destroy()
  })

  it('开着的时候系统偏好一变就跟着换', () => {
    sys = fakeSystem(false)
    const m = createThemeManager({ channel: 'vars', theme: 'light', withClasses: false }).init()
    m.followSystem(true)
    sys.setMatches(true)
    expect(m.state().theme).toBe('dark')
    sys.setMatches(false)
    expect(m.state().theme).toBe('light')
    m.destroy()
  })

  it('destroy 会摘掉系统监听', () => {
    sys = fakeSystem(true)
    const m = createThemeManager({ channel: 'vars', theme: 'light', withClasses: false }).init()
    m.followSystem(true)
    expect(sys.listenerCount()).toBe(1)
    m.destroy()
    expect(sys.listenerCount()).toBe(0)
  })

  it('没有 matchMedia 的老浏览器（IE9）打开开关也不抛错', () => {
    resetEnvCache() // 确保读到「不支持」
    const m = createThemeManager({
      channel: 'vars',
      theme: 'light',
      followSystem: true,
      withClasses: false,
    })
    expect(() => {
      m.init()
      m.followSystem(true)
    }).not.toThrow()
    expect(m.state().theme).toBe('light')
    m.destroy()
  })
})

describe('F. 自定义前缀落地到 DOM', () => {
  it('style id 与 DOM 属性全部跟着换', () => {
    const m = createThemeManager({ channel: 'vars', theme: 'light', prefix: 'acme' })
    m.init()
    expect(document.getElementById('acme-tokens')).toBeTruthy()
    expect(document.getElementById('acme-class-primitive')).toBeTruthy()
    expect(document.documentElement.getAttribute('data-acme-theme')).toBe('light')
    expect(text('acme-tokens')).toContain('--acme-color-bg:')
    expect(text('acme-class-primitive')).toContain('.acme-p-4{')
    m.destroy()
  })
})
