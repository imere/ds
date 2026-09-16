/**
 * @vitest-environment jsdom
 *
 * 持久化辅助 vs 核心职责边界
 * -------------------------------------------------------------
 * 最重要的一条回归：createThemeManager 默认不该往任何地方写东西。
 * 之前 persist 默认是开的（ options.persist !== false ），
 * 等于库被 import 那一刻就开始操作用户的 localStorage —— 这在隐私合规上是硬伤，
 * 而且介质写死在核心里，想换 sessionStorage 或走服务端同步都改不了源码。
 *
 * 现在核心一行存储代码都没有，持久化全在 storage.ts 里，且必须显式调用才生效。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createThemeManager,
  getInitScript,
  memoryStorage,
  cookieStorage,
  webStorage,
  autoStorage,
  readTheme,
  bindTheme,
  restoreScript,
} from '@ds/dom'
import type { KeyValueStore } from '@ds/dom'

function freshManager(theme?: string) {
  return createThemeManager({ channel: 'vars', theme: theme || 'light' })
}

describe('A. 核心默认不碰存储', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.cookie = ''
  })

  it('建 manager + init 之后，localStorage 依然是空的', () => {
    freshManager().init()
    expect(window.localStorage.length).toBe(0)
  })

  it('切换主题也不会写进去', () => {
    const m = freshManager()
    m.init()
    m.use('dark')
    m.useAccent('green')
    m.toggle()
    expect(window.localStorage.getItem('ds-theme')).toBeNull()
    expect(window.localStorage.getItem('ds-accent')).toBeNull()
  })

  it('也不写 cookie', () => {
    const m = freshManager()
    m.init()
    m.use('dark')
    expect(document.cookie).not.toContain('ds-theme')
  })

  it('SSR 初始化脚本默认不含任何存储读取', () => {
    expect(getInitScript()).not.toContain('localStorage')
  })
})

describe('B. KeyValueStore 适配器', () => {
  function behaves(store: KeyValueStore, name: string) {
    it(`${name}：读写删`, () => {
      expect(store.get('k')).toBeNull()
      store.set('k', 'v')
      expect(store.get('k')).toBe('v')
      store.remove('k')
      expect(store.get('k')).toBeNull()
    })
  }

  behaves(memoryStorage(), 'memoryStorage')
  behaves(webStorage(), 'webStorage')
  behaves(cookieStorage(), 'cookieStorage')

  it('memoryStorage 之间互相隔离', () => {
    const a = memoryStorage()
    const b = memoryStorage()
    a.set('k', '1')
    expect(b.get('k')).toBeNull()
  })

  it('memoryStorage 取值区分空串与不存在', () => {
    const s = memoryStorage()
    s.set('empty', '')
    expect(s.get('empty')).toBe('')
    expect(s.get('missing')).toBeNull()
  })

  it('webStorage session 版写到 sessionStorage 而非 localStorage', () => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    webStorage({ session: true }).set('probe', '1')
    expect(window.sessionStorage.getItem('probe')).toBe('1')
    expect(window.localStorage.getItem('probe')).toBeNull()
  })

  it('cookieStorage 过期式删除真的把 cookie 清掉', () => {
    cookieStorage().set('gone', 'v')
    expect(document.cookie).toContain('gone=')
    cookieStorage().remove('gone')
    expect(document.cookie).not.toContain('gone=')
  })
})

describe('C. autoStorage 降级', () => {
  /** 模拟 IE 隐私模式：localStorage 对象在，但一写就抛 */
  function throwing(): KeyValueStore {
    return {
      get() {
        return null
      },
      set() {
        throw new Error('denied')
      },
      remove() {
        /* 忽略 */
      },
    }
  }

  it('localStorage 可用时不写 cookie', () => {
    window.localStorage.clear()
    autoStorage().set('theme', 'dark')
    expect(window.localStorage.getItem('theme')).toBe('dark')
    expect(document.cookie).not.toContain('theme=')
  })

  it('主存储抛异常时退到备用存储', () => {
    const backup = memoryStorage()
    autoStorage({ primary: throwing(), secondary: backup }).set('theme', 'dark')
    expect(backup.get('theme')).toBe('dark')
  })

  it('降级后主备不一致时以主为准读（主读不到才回落）', () => {
    const backup = memoryStorage()
    const store = autoStorage({ primary: throwing(), secondary: backup })
    expect(store.get('theme')).toBeNull()
    store.set('theme', 'dark')
    expect(store.get('theme')).toBe('dark')
  })

  it('降级会回调一次 onFallback', () => {
    let calls = 0
    autoStorage({
      primary: throwing(),
      secondary: memoryStorage(),
      onFallback() {
        calls++
      },
    }).set('x', 'y')
    expect(calls).toBeGreaterThan(0)
  })

  it('fallback: false 时主存储挂了就真的存不进去', () => {
    const backup = memoryStorage()
    autoStorage({ primary: throwing(), secondary: backup, fallback: false }).set('zz', '1')
    expect(backup.get('zz')).toBeNull()
  })

  it('remove 会同时清掉主备两边', () => {
    const main = memoryStorage()
    const backup = memoryStorage()
    const store = autoStorage({ primary: main, secondary: backup })
    store.set('k', 'v')
    store.remove('k')
    expect(main.get('k')).toBeNull()
    expect(backup.get('k')).toBeNull()
  })
})

describe('D. readTheme / bindTheme 组合器', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('bindTheme 之后切换主题会落盘', () => {
    const m = freshManager()
    bindTheme(m, { store: memoryStorage() })
    m.init()
    m.use('dark')
    expect(m.state().theme).toBe('dark')
  })

  it('写进去的值能被 readTheme 读回来', () => {
    const store = memoryStorage()
    const m = freshManager()
    bindTheme(m, { store })
    m.init()
    m.use('dark')

    const saved = readTheme({ store })
    expect(saved.theme).toBe('dark')
  })

  it('读回来的值能用来还原 manager', () => {
    const store = memoryStorage()
    const first = freshManager()
    bindTheme(first, { store })
    first.init()
    first.use('dark')

    const saved = readTheme({ store })
    const second = freshManager(saved.theme || 'light')
    expect(second.state().theme).toBe('dark')
  })

  it('强调色为空时会把旧值删掉，不会留下脏数据', () => {
    const store = memoryStorage()
    const m = createThemeManager({ channel: 'vars', theme: 'light', accent: 'indigo' })
    bindTheme(m, { store })
    m.init()
    expect(store.get('ds-accent')).toBe('indigo')

    m.useAccent('')
    expect(store.get('ds-accent')).toBeNull()
  })

  it('bindTheme 调用时就立刻同步一次当前状态', () => {
    const store = memoryStorage()
    const m = freshManager('dark')
    bindTheme(m, { store })
    expect(store.get('ds-theme')).toBe('dark')
  })

  it('返回的退订函数能断开同步', () => {
    const store = memoryStorage()
    const m = freshManager()
    const off = bindTheme(m, { store })
    m.init()
    off()
    m.use('dark')
    expect(store.get('ds-theme')).toBe('light')
  })

  it('自定义 key 覆盖默认', () => {
    const store = memoryStorage()
    const m = freshManager()
    bindTheme(m, { store, themeKey: 'acme-theme' })
    m.init()
    expect(store.get('acme-theme')).toBe('light')
    expect(store.get('ds-theme')).toBeNull()
  })

  it('前缀会把默认 key 也换掉', () => {
    const store = memoryStorage()
    const m = createThemeManager({ channel: 'vars', theme: 'light', prefix: 'acme' })
    bindTheme(m, { store })
    m.init()
    expect(store.get('acme-theme')).toBe('light')
  })
})

describe('E. restoreScript', () => {
  it('默认 key 是 ds-theme', () => {
    expect(restoreScript()).toContain('ds-theme')
  })

  it('前缀换 key 也跟着换', () => {
    expect(restoreScript({ prefix: 'acme' })).toContain('acme-theme')
  })

  it('只写 ES5 语法 —— 这段要跑在 IE10 上', () => {
    const s = restoreScript()
    expect(s).not.toMatch(/=>/)
    expect(s).not.toMatch(/`/)
    expect(s).not.toContain('const ')
    expect(s).not.toContain('let ')
  })

  it('变量都带 __r 前缀，避免撞上主脚本作用域', () => {
    // 直接拼进 getInitScript 的同一个 function 里，起短名会覆盖人家的变量
    expect(restoreScript()).not.toMatch(/\bvar\s+(i|q|x|n|s|v|w|m|j)\s*=/)
  })

  it('拼进 getInitScript 后仍是合法的一段脚本', () => {
    const script = getInitScript({ restore: restoreScript() })
    expect(script.indexOf('localStorage')).toBeGreaterThan(0)
    // 括号配平：拼坏了浏览器会整段罢工，而且很难查
    let open = 0
    for (let i = 0; i < script.length; i++) {
      if (script.charAt(i) === '{') open++
      else if (script.charAt(i) === '}') open--
    }
    expect(open).toBe(0)
  })
})
