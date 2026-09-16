/**
 * 持久化辅助工具（可选，核心不引用它）
 * -------------------------------------------------------------
 * 为什么单独放一个文件：
 *   核心（theme.ts / ssr.ts）一行存储代码都没有 —— 不读 localStorage、不写 cookie，
 *   SSR 下也不会去摸 document。想持久化，就用这里的东西显式接上去。
 *
 *   带来的好处：
 *   · 默认零副作用。引了包不等于你的页面开始往用户磁盘写东西，
 *     这在隐私合规（GDPR / 个保法要求先同意再存储）上是硬要求
 *   · 介质随便换。localStorage / sessionStorage / cookie / 内存 / 你自己的实现，
 *     只要满足 KeyValueStore 三个方法
 *   · 好测。测试里塞个普通对象当 store 就行，不用 mock Storage
 *   · tree-shaking 友好。不用就整段摇掉
 *
 * 典型接法：
 *
 *   var saved = readTheme({ themeKey: 'acme-theme' })
 *   var ds = createThemeManager({ theme: saved.theme || 'light', accent: saved.accent || '' })
 *   bindTheme(ds, { themeKey: 'acme-theme' })   // ← 这一行才让页面开始写存储
 *   ds.init()
 *
 * 注意 bindTheme 要在 init() 之前调：它会订阅状态变化，
 * 之后的每次 use() / toggle() 都会自动落盘。
 */

import { prefixOf } from '@ds/core'
import type { Prefix, Dict } from '@ds/core'
import type { ThemeManager } from './theme'

/**
 * 存储的最小抽象。三个方法，跟 DOM Storage 无关，
 * 所以 sessionStorage、cookie、内存对象、甚至远端同步都能塞进来。
 */
export interface KeyValueStore {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export interface WebStorageOptions {
  /** true 用 sessionStorage，关掉标签页即失效 */
  session?: boolean
}

/**
 * localStorage / sessionStorage 适配器
 *
 * 两个现实场景会让它挂掉：IE 隐私模式 / 安全策略收紧时 setItem 直接抛异常，
 * 还有 Safari 无痕模式下对象存在但额度为 0。所以第一次访问时先写再删探一下，
 * 探失败就整段降级，而不是每次调 get/set 都抛。
 */
export function webStorage(opts?: WebStorageOptions): KeyValueStore {
  var session = !!(opts && opts.session)
  var cached: Storage | null = null
  var probed = false

  function backing(): Storage | null {
    if (probed) return cached
    probed = true
    try {
      var w = window
      var s = session ? w.sessionStorage : w.localStorage
      if (!s) return null
      var probe = '__ds_probe__'
      s.setItem(probe, '1')
      s.removeItem(probe)
      cached = s
    } catch (e) {
      cached = null
    }
    return cached
  }

  return {
    get: function (key: string): string | null {
      var s = backing()
      if (!s) return null
      try {
        return s.getItem(key)
      } catch (e) {
        return null
      }
    },
    set: function (key: string, value: string): void {
      var s = backing()
      if (!s) return
      try {
        s.setItem(key, value)
      } catch (e) {
        /* 写满或被禁用：静默放弃，不该因为存不下就让主题切换崩掉 */
      }
    },
    remove: function (key: string): void {
      var s = backing()
      if (!s) return
      try {
        s.removeItem(key)
      } catch (e) {
        /* 忽略 */
      }
    },
  }
}

export interface CookieStorageOptions {
  /** 有效期天数，默认 180 */
  days?: number
  path?: string
}

function readCookie(name: string): string | null {
  try {
    var all = document.cookie ? document.cookie.split(';') : []
    for (var i = 0; i < all.length; i++) {
      var part = all[i]
      var eq = part.indexOf('=')
      var k = (eq > -1 ? part.slice(0, eq) : part).replace(/^\s+|\s+$/g, '')
      if (k === name) {
        return decodeURIComponent((eq > -1 ? part.slice(eq + 1) : '').replace(/^\s+|\s+$/g, ''))
      }
    }
  } catch (e) {
    /* 忽略 */
  }
  return null
}

function writeCookie(name: string, value: string, days?: number, path?: string): void {
  try {
    var d = new Date()
    d.setTime(d.getTime() + (days || 180) * 24 * 60 * 60 * 1000)
    document.cookie =
      name +
      '=' +
      encodeURIComponent(value) +
      ';expires=' +
      d.toUTCString() +
      ';path=' +
      (path || '/')
  } catch (e) {
    /* 忽略 */
  }
}

function eraseCookie(name: string, path?: string): void {
  try {
    var d = new Date()
    d.setTime(d.getTime() - 86400000)
    document.cookie = name + '=;expires=' + d.toUTCString() + ';path=' + (path || '/')
  } catch (e) {
    /* 忽略 */
  }
}

/** cookie 适配器。localStorage 不可用时（file://、IE 隐私模式）的兜底 */
export function cookieStorage(opts?: CookieStorageOptions): KeyValueStore {
  var o = opts || {}
  return {
    get: function (key: string): string | null {
      return readCookie(key)
    },
    set: function (key: string, value: string): void {
      writeCookie(key, value, o.days, o.path)
    },
    remove: function (key: string): void {
      eraseCookie(key, o.path)
    },
  }
}

/** 内存适配器。测试、SSR、或明确不想留痕的场景用它 */
export function memoryStorage(): KeyValueStore {
  var data: Dict<string> = {}
  return {
    get: function (key: string): string | null {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    set: function (key: string, value: string): void {
      data[key] = value
    },
    remove: function (key: string): void {
      delete data[key]
    },
  }
}

export interface AutoStorageOptions extends CookieStorageOptions {
  /** 主存储，默认 webStorage()（localStorage） */
  primary?: KeyValueStore
  /** 备用存储，默认 cookieStorage()。主存储写不进去时用 */
  secondary?: KeyValueStore
  /** 主存储不可用时是否退到备用，默认 true */
  fallback?: boolean
  /** 发生降级时回调一次，便于排查「主题记不住」这类问题 */
  onFallback?: () => void
}

/**
 * localStorage 优先，不可用则退 cookie 的组合适配器
 *
 * 这是 IE10 场景的默认推荐：IE 的隐私模式会直接禁掉 localStorage，
 * 不降级的话刷新后主题会跳回默认值（肉眼可见闪一下）。
 */
export function autoStorage(opts?: AutoStorageOptions): KeyValueStore {
  var o = opts || {}
  var primary = o.primary || webStorage()
  var secondary = o.secondary || cookieStorage({ days: o.days, path: o.path })
  var allowFallback = o.fallback !== false
  var notified = false

  function fallbackOnce(): KeyValueStore {
    if (!notified && o.onFallback) {
      notified = true
      o.onFallback()
    }
    return secondary
  }

  return {
    get: function (key: string): string | null {
      var v = primary.get(key)
      if (v !== null && v !== undefined) return v
      if (!allowFallback) return null
      return fallbackOnce().get(key)
    },
    set: function (key: string, value: string): void {
      // 写入可能「成功返回但没写进去」（额度为 0 时不抛异常），也可能直接抛
      // （IE 隐私模式）。两种情况都靠回读验证，不能只看有没有抛。
      // 不初始化：两条路径（成功赋值 / catch 里置 false）都会给它值，
      // 写个初值反而会引来 no-useless-assignment —— 那才是真的死代码。
      var wrote
      try {
        primary.set(key, value)
        var ok = primary.get(key)
        wrote = ok !== null && ok !== undefined
      } catch (e) {
        wrote = false
      }

      if (!wrote) {
        if (!allowFallback) return
        fallbackOnce().set(key, value)
        return
      }
      // 主存储写成了，就把备用里的旧值清掉，免得两边不一致
      if (allowFallback && secondary.get(key) !== null) secondary.remove(key)
    },
    remove: function (key: string): void {
      primary.remove(key)
      if (allowFallback) secondary.remove(key)
    },
  }
}

/** readTheme / bindTheme / restoreScript 共用的入参 */
export interface ThemeStorageOptions {
  /** 存到哪。不给就用 autoStorage()（localStorage 优先，失败退 cookie） */
  store?: KeyValueStore
  /** 归一化前缀对象，或直接传 'acme' —— 用于推导默认 key */
  prefix?: string | Prefix | Dict<any> | null
  /** 主题 key，默认取 prefix.keys.theme */
  themeKey?: string
  /** 强调色 key，默认取 prefix.keys.accent */
  accentKey?: string
}

/** readTheme 的返回值。没存过就是 null，兜底交给调用方决定 */
export interface ThemeSnapshot {
  theme: string | null
  accent: string | null
}

function keysOf(o: ThemeStorageOptions): { theme: string; accent: string } {
  var p = prefixOf(o.prefix)
  return {
    theme: o.themeKey || p.keys.theme,
    accent: o.accentKey || p.keys.accent,
  }
}

/**
 * 建 manager 之前读一次上次的主题，把结果喂给 createThemeManager 的 theme / accent。
 *
 * @example
 *   var saved = readTheme({ themeKey: 'acme-theme' })
 *   createThemeManager({ theme: saved.theme || 'light' })
 */
export function readTheme(opts?: ThemeStorageOptions): ThemeSnapshot {
  var o = opts || {}
  var k = keysOf(o)
  var store = o.store || autoStorage()
  return {
    theme: store.get(k.theme),
    accent: store.get(k.accent),
  }
}

/**
 * 把 manager 的状态变化接到存储上。返回退订函数。
 *
 * 要在 manager.init() 之前调用：这样后续每次 use() / toggle() / useAccent() 都会落盘。
 * 调用时会立刻同步一次当前状态，所以初次挂载也会写。
 */
export function bindTheme(manager: ThemeManager, opts?: ThemeStorageOptions): () => void {
  var o = opts || {}
  // key 默认跟着「被绑定的这个 manager」的前缀走。
  // 用 opts.prefix 会让 manager 是 acme 前缀、存下来的却是 ds-theme —— 下次 readTheme 读不回来。
  var k = keysOf({
    prefix: o.prefix || manager.prefix,
    themeKey: o.themeKey,
    accentKey: o.accentKey,
  })
  var store = o.store || autoStorage()

  function write(payload: Dict<any>): void {
    if (payload.theme) store.set(k.theme, payload.theme)
    if (payload.accent) store.set(k.accent, payload.accent)
    else store.remove(k.accent)
  }

  var off = manager.subscribe(write)
  write(manager.state())
  return off
}

/**
 * 生成一段给 getInitScript 用的 JS 源码，让首屏脚本也能读回上次的主题。
 *
 * 返回的是字符串，会被内联进 <head>，所以它必须是纯 ES5 —— 这段跑在 IE10 上，
 * 没法复用本文件里的任何实现，只能把读取逻辑再写一遍。
 *
 * 约定：片段里可读可写两个变量 t（主题）和 a（强调色）。
 * 变量一律带 __r 前缀：这段代码是直接拼进 getInitScript 的同一个函数作用域的，
 * 起个短名很容易撞上人家脚本里的临时变量。
 */
export function restoreScript(opts?: ThemeStorageOptions): string {
  var o = opts || {}
  var k = keysOf(o)
  var themeKey = JSON.stringify(k.theme)
  var accentKey = JSON.stringify(k.accent)

  // 顺序跟 autoStorage 保持一致：先 localStorage，读不到再从 cookie 里扫
  return (
    'try{var __rv=localStorage.getItem(' +
    themeKey +
    ');if(__rv){t=__rv}}catch(e){}' +
    "if(!t){var __rs=document.cookie?document.cookie.split(';'):[];" +
    "for(var __ri=0;__ri<__rs.length;__ri++){var __rq=__rs[__ri],__rx=__rq.indexOf('=')," +
    "__rn=(__rx>-1?__rq.slice(0,__rx):__rq).replace(/^\\s+|\\s+$/g,'');" +
    'if(__rn===' +
    themeKey +
    "){t=decodeURIComponent((__rx>-1?__rq.slice(__rx+1):'').replace(/^\\s+|\\s+$/g,''));break}}}" +
    'try{var __rw=localStorage.getItem(' +
    accentKey +
    ');if(__rw){a=__rw}}catch(e){}' +
    "if(!a){var __rs2=document.cookie?document.cookie.split(';'):[];" +
    "for(var __rj=0;__rj<__rs2.length;__rj++){var __rq2=__rs2[__rj],__ry=__rq2.indexOf('=')," +
    "__rm=(__ry>-1?__rq2.slice(0,__ry):__rq2).replace(/^\\s+|\\s+$/g,'');" +
    'if(__rm===' +
    accentKey +
    "){a=decodeURIComponent((__ry>-1?__rq2.slice(__ry+1):'').replace(/^\\s+|\\s+$/g,''));break}}}"
  )
}
