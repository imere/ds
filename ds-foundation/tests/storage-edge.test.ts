/**
 * @ds/dom storage：降级路径
 * -------------------------------------------------------------
 * storage.test.ts 测的是「正常能用」的组合，这里专测**用不了**的时候：
 * 隐私模式禁掉 localStorage、读的时候抛异常、cookie 里混进没有 = 的脏数据。
 * 这些是「用户反馈主题记不住」时真正会撞上的场景。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  webStorage,
  cookieStorage,
  memoryStorage,
  autoStorage,
  readTheme,
  bindTheme,
  createThemeManager,
} from '@ds/dom'
import type { KeyValueStore, ThemeManager } from '@ds/dom'
import { baseOpts } from './fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('webStorage：存储不可用时的整段降级', () => {
  it('探测写不进去就当没有存储，读写删全部静默', () => {
    vi.stubGlobal('localStorage', {
      setItem() {
        throw new Error('denied')
      },
      removeItem() {},
      getItem: () => '1',
    })
    const s = webStorage()
    expect(s.get('k')).toBeNull()
    expect(() => s.set('k', 'v')).not.toThrow()
    expect(() => s.remove('k')).not.toThrow()
  })

  it('压根没有 localStorage 对象时读不到任何东西', () => {
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true })
    const s = webStorage()
    expect(s.get('k')).toBeNull()
    expect(() => {
      s.set('k', 'v')
      s.remove('k')
    }).not.toThrow()
  })

  it('探测能过但读的时候抛异常 —— 也不该让调用方崩', () => {
    vi.stubGlobal('localStorage', {
      setItem() {},
      removeItem() {},
      getItem() {
        throw new Error('denied')
      },
    })
    expect(webStorage().get('k')).toBeNull()
  })

  it('写的时候抛异常 —— 主题存不下也不能影响切换', () => {
    vi.stubGlobal('localStorage', {
      setItem() {
        throw new Error('quota')
      },
      removeItem() {},
      getItem: () => null,
    })
    expect(() => webStorage().set('k', 'v')).not.toThrow()
  })

  it('删的时候抛异常同样静默', () => {
    vi.stubGlobal('localStorage', {
      setItem() {},
      removeItem() {
        throw new Error('denied')
      },
      getItem: () => null,
    })
    expect(() => webStorage().remove('k')).not.toThrow()
  })

  it('session: true 走 sessionStorage', () => {
    vi.stubGlobal('sessionStorage', { setItem() {}, removeItem() {}, getItem: () => 's' })
    expect(webStorage({ session: true }).get('k')).toBe('s')
  })
})

describe('cookieStorage：脏数据与写入失败', () => {
  function stubCookie(value: string, onSet?: () => void) {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => value,
      set: onSet || (() => {}),
    })
  }

  it('cookie 串里没有 = 的项不会误命中', () => {
    stubCookie('orphan; ds-theme=dark')
    expect(document.cookie).toBe('orphan; ds-theme=dark')
    expect(cookieStorage().get('ds-theme')).toBe('dark')
  })

  it('没有 = 的项自己被当作空值的键', () => {
    stubCookie('orphan')
    // 键名取整段、值取空串 —— 脏数据不该让解析崩掉
    expect(cookieStorage().get('orphan')).toBe('')
  })

  it('cookie 为空时读不到任何东西', () => {
    stubCookie('')
    expect(cookieStorage().get('ds-theme')).toBeNull()
  })

  it('写 cookie 抛异常时静默', () => {
    stubCookie('', () => {
      throw new Error('denied')
    })
    expect(() => cookieStorage().set('k', 'v')).not.toThrow()
    expect(() => cookieStorage().remove('k')).not.toThrow()
  })

  it('读 cookie 抛异常时给 null', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() {
        throw new Error('denied')
      },
      set: () => {},
    })
    expect(cookieStorage().get('k')).toBeNull()
  })
})

describe('autoStorage：主备切换的边界', () => {
  function store(map: Record<string, string>, opts?: { throwOnGet?: boolean }): KeyValueStore {
    return {
      get: (k) => {
        if (opts?.throwOnGet) throw new Error('boom')
        return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null
      },
      set: (k, v) => {
        map[k] = v
      },
      remove: (k) => {
        // 走 Reflect 而不是 delete 运算符：ESLint 的 no-dynamic-delete 禁后者，
        // 而测试用的替身存储本来就该模拟「键真的没了」
        Reflect.deleteProperty(map, k)
      },
    }
  }

  it('主存储读到了就直接返回，不去问备用', () => {
    const s = autoStorage({ primary: store({ k: 'fresh' }), secondary: store({ k: 'stale' }) })
    expect(s.get('k')).toBe('fresh')
  })

  it('主存储返回 undefined（不是 null）也会回落', () => {
    const secondary = store({ k: 'from-secondary' })
    const s = autoStorage({
      primary: { get: () => undefined as unknown as string, set: () => {}, remove: () => {} },
      secondary,
    })
    expect(s.get('k')).toBe('from-secondary')
  })

  it('关掉降级后，主存储读不到就是读不到', () => {
    const s = autoStorage({
      primary: store({}),
      secondary: store({ k: 'from-secondary' }),
      fallback: false,
    })
    expect(s.get('k')).toBeNull()
  })

  it('主存储写不进去且不允许降级时，直接放弃', () => {
    const secondary = store({})
    const s = autoStorage({
      primary: { get: () => null, set: () => {}, remove: () => {} },
      secondary,
      fallback: false,
    })
    s.set('k', 'v')
    expect(secondary.get('k')).toBeNull()
  })

  it('主存储写成了，就把备用里的旧值清掉（避免两边不一致）', () => {
    const primary = store({})
    const secondary = store({ k: 'stale' })
    autoStorage({ primary, secondary }).set('k', 'fresh')
    expect(secondary.get('k')).toBeNull()
    expect(primary.get('k')).toBe('fresh')
  })

  it('关掉降级时 remove 只清主存储', () => {
    const primary = store({ k: 'v' })
    const secondary = store({ k: 'v' })
    autoStorage({ primary, secondary, fallback: false }).remove('k')
    expect(primary.get('k')).toBeNull()
    expect(secondary.get('k')).toBe('v')
  })

  it('主存储读抛异常时（autoStorage.set 里的 try）当作没写进去', () => {
    const secondary = store({})
    const s = autoStorage({
      primary: store({}, { throwOnGet: true }),
      secondary,
    })
    s.set('k', 'v')
    expect(secondary.get('k')).toBe('v')
  })
})

describe('readTheme / bindTheme 的默认值', () => {
  it('readTheme 不给任何参数也能读（默认走 autoStorage）', () => {
    expect(readTheme()).toEqual({ theme: null, accent: null })
  })

  it('bindTheme 不给任何参数也能接（key 跟 manager 前缀，介质默认）', () => {
    const m = createThemeManager({ ...baseOpts, channel: 'vars' })
    const off = bindTheme(m)
    expect(typeof off).toBe('function')
    off()
    m.destroy()
  })

  it('没指定初始主题时落到第一个注册的，存储里写的就是它', () => {
    const s = memoryStorage()
    const m = createThemeManager({ ...baseOpts, channel: 'vars' })
    bindTheme(m, { store: s })
    expect(m.state().theme).toBe('light')
    expect(s.get('ds-theme')).toBe('light')
  })
})

describe('memoryStorage', () => {
  it('存过再删就读不到了', () => {
    const s = memoryStorage()
    s.set('k', 'v')
    expect(s.get('k')).toBe('v')
    s.remove('k')
    expect(s.get('k')).toBeNull()
  })
})

describe('bindTheme：订阅回调没带 payload 时', () => {
  it('不写任何东西，而不是把 undefined 落盘', () => {
    const writes: string[] = []
    const fakeManager = {
      subscribe: (fn: (payload?: unknown) => void) => {
        fn(undefined) // 模拟一次不带 payload 的通知
        return () => {}
      },
      state: () => ({ theme: 'light', accent: '' }),
    }
    const s = autoStorage({
      primary: {
        get: () => null,
        set: (k) => writes.push(k),
        remove: () => {},
      },
      secondary: memoryStorage(),
    })
    bindTheme(fakeManager as unknown as ThemeManager, {
      store: s,
      prefix: 'ds',
    })
    // 只有 bindTheme 自身那次同步会写；无 payload 的回调被挡掉了
    expect(writes).toEqual(['ds-theme'])
  })

  it('状态里没有主题名时不写 theme 键，只把 accent 清掉', () => {
    const writes: string[] = []
    const removes: string[] = []
    const fakeManager = {
      subscribe: () => () => {},
      state: () => ({ theme: '', accent: '' }),
    }
    const s = autoStorage({
      primary: {
        get: () => null,
        set: (k: string) => writes.push(k),
        remove: (k: string) => removes.push(k),
      },
      secondary: memoryStorage(),
    })
    bindTheme(fakeManager as unknown as ThemeManager, { store: s, prefix: 'ds' })
    expect(writes).toEqual([])
    expect(removes).toEqual(['ds-accent'])
  })
})
