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
 *   const saved = readTheme({ themeKey: 'acme-theme' })
 *   const ds = createThemeManager({ theme: saved.theme || 'light', accent: saved.accent || '' })
 *   bindTheme(ds, { themeKey: 'acme-theme' })   // ← 这一行才让页面开始写存储
 *   ds.init()
 *
 * 注意 bindTheme 要在 init() 之前调：它会订阅状态变化，
 * 之后的每次 use() / toggle() 都会自动落盘。
 */

import { prefixOf, each } from '@ds/core'
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
 * @param {object} [opts] { session: true 时用 sessionStorage，关掉标签页即失效 }
 * @returns {KeyValueStore} 适配器；存储不可用时三个方法都是安全的空操作
 */
export function webStorage(opts?: WebStorageOptions): KeyValueStore {
  const session = !!(opts && opts.session)
  let cached: Storage | null = null
  let probed = false

  /**
   * 惰性取到底层的 Storage 对象。
   * 只在第一次访问时探测并缓存结果：探一次要真写再删，
   * 而主题读写可能在首屏高频发生，每次都探一遍既慢又制造无谓的磁盘写。
   * @returns {Storage|null} 可用的 Storage；环境不支持时为 null
   */
  function backing(): Storage | null {
    if (probed) return cached
    probed = true
    try {
      const w = window
      const s = session ? w.sessionStorage : w.localStorage
      if (!s) return null
      const probe = '__ds_probe__'
      s.setItem(probe, '1')
      s.removeItem(probe)
      cached = s
    } catch {
      cached = null
    }
    return cached
  }

  return {
    /**
     * 读一个键。
     * 读也可能抛（隐私策略收紧时会连读一起禁），抛了就当没存过 ——
     * 主题读不到最多是回到默认主题，不该让页面挂掉。
     * @param {string} key 键名
     * @returns {string|null} 存过的值；没有或不可用时 null
     */
    get(key: string): string | null {
      const s = backing()
      if (!s) return null
      try {
        return s.getItem(key)
      } catch {
        return null
      }
    },

    /**
     * 写一个键。
     * @param {string} key 键名
     * @param {string} value 值
     * @returns {void} 无返回值：写满或被禁用时静默放弃，
     *   不该因为存不下就让主题切换崩掉
     */
    set(key: string, value: string): void {
      const s = backing()
      if (!s) return
      try {
        s.setItem(key, value)
      } catch {
        /* 写满或被禁用：静默放弃，不该因为存不下就让主题切换崩掉 */
      }
    },

    /**
     * 删一个键。
     * @param {string} key 键名
     * @returns {void} 无返回值
     */
    remove(key: string): void {
      const s = backing()
      if (!s) return
      try {
        s.removeItem(key)
      } catch {
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

/**
 * 按名字读一条 cookie。
 * 手扫 document.cookie 而不用任何库：这段逻辑还有一份 ES5 版本要内联进 <head>
 * （见 restoreScript），两处必须能对得上，依赖越少越好抄。
 * 名与值之间的空格要 trim：分号后面常常带一个空格，不处理就永远匹配不上。
 * @param {string} name cookie 名
 * @returns {string|null} 解码后的值；没有这条 cookie 时 null
 */
function readCookie(name: string): string | null {
  try {
    const all = document.cookie ? document.cookie.split(';') : []
    for (let i = 0; i < all.length; i++) {
      const part = all[i]
      const eq = part.indexOf('=')
      const k = (eq > -1 ? part.slice(0, eq) : part).replace(/^\s+|\s+$/g, '')
      if (k === name) {
        return decodeURIComponent((eq > -1 ? part.slice(eq + 1) : '').replace(/^\s+|\s+$/g, ''))
      }
    }
  } catch {
    /* 忽略 */
  }
  return null
}

/**
 * 写一条 cookie。
 * 默认 180 天而不是会话 cookie：主题是长期偏好，关一次浏览器就丢的话
 * 用户会以为「设置没记住」。值走 encodeURIComponent，中文与空格才不会写坏。
 * @param {string} name cookie 名
 * @param {string} value 值
 * @param {number} [days] 有效期天数，默认 180
 * @param {string} [path] 路径，默认 '/'
 * @returns {void} 无返回值：cookie 被禁用时静默放弃
 */
function writeCookie(name: string, value: string, days?: number, path?: string): void {
  try {
    const d = new Date()
    d.setTime(d.getTime() + (days || 180) * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=${
      path || '/'
    }`
  } catch {
    /* 忽略 */
  }
}

/**
 * 删一条 cookie。
 * 做法是把它改写成「昨天过期」而不是直接删 —— HTTP 层面没有删除指令，
 * 只有过期。path 必须和写的时候一致，否则写的是旧 cookie、
 * 删的是新 cookie，看起来就像删不掉。
 * @param {string} name cookie 名
 * @param {string} [path] 路径，默认 '/'
 * @returns {void} 无返回值
 */
function eraseCookie(name: string, path?: string): void {
  try {
    const d = new Date()
    d.setTime(d.getTime() - 86400000)
    document.cookie = `${name}=;expires=${d.toUTCString()};path=${path || '/'}`
  } catch {
    /* 忽略 */
  }
}

/**
 * cookie 适配器。
 * localStorage 不可用时的兜底：file:// 下 IE 直接禁掉 Storage，
 * 而 cookie 在 file:// 上虽然也别扭，至少不会抛。
 * @param {object} [opts] { days: 有效期天数，path: 路径 }
 * @returns {KeyValueStore} 适配器
 */
export function cookieStorage(opts?: CookieStorageOptions): KeyValueStore {
  const o = opts || {}
  return {
    /**
     * 读一个键。
     * @param {string} key 键名（当作 cookie 名）
     * @returns {string|null} 值；没有时 null
     */
    get(key: string): string | null {
      return readCookie(key)
    },

    /**
     * 写一个键。
     * @param {string} key 键名
     * @param {string} value 值
     * @returns {void} 无返回值
     */
    set(key: string, value: string): void {
      writeCookie(key, value, o.days, o.path)
    },

    /**
     * 删一个键。
     * @param {string} key 键名
     * @returns {void} 无返回值
     */
    remove(key: string): void {
      eraseCookie(key, o.path)
    },
  }
}

/**
 * 内存适配器。
 * 测试、SSR、以及「明确不想在用户机器上留痕」的场景用它：
 * 刷新即丢是它的设计目的，不是缺陷。也是 KeyValueStore 只有三个方法的证明 ——
 * 换介质不需要改任何一个调用方。
 * @returns {KeyValueStore} 适配器；每次调用都是独立的存储空间
 */
export function memoryStorage(): KeyValueStore {
  let data: Dict<string> = {}
  return {
    /**
     * 读一个键。
     * 用 hasOwnProperty 而不是 `data[key] || null`：值为空串时后者会读成 null，
     * 而空串是合法的强调色取值（表示不启用）。
     * @param {string} key 键名
     * @returns {string|null} 值；键不存在时 null
     */
    get(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },

    /**
     * 写一个键。
     * @param {string} key 键名
     * @param {string} value 值
     * @returns {void} 无返回值
     */
    set(key: string, value: string): void {
      data[key] = value
    },

    /**
     * 删一个键。
     * @param {string} key 键名
     * @returns {void} 无返回值
     */
    remove(key: string): void {
      // 不用 `delete data[key]`：动态键的 delete 会让对象退出隐藏类优化，
      // 而且 ES5 下 delete 的失败是静默的。内存里就几条数据，重建一次最省心
      const next: Dict<string> = {}
      each(data, (value, k) => {
        if (String(k) !== key) next[String(k)] = value
      })
      data = next
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
 * @param {object} [opts] { primary, secondary, fallback, onFallback, days, path }
 * @returns {KeyValueStore} 组合适配器
 */
export function autoStorage(opts?: AutoStorageOptions): KeyValueStore {
  const o = opts || {}
  const primary = o.primary || webStorage()
  const secondary = o.secondary || cookieStorage({ days: o.days, path: o.path })
  const allowFallback = o.fallback !== false
  let notified = false

  /**
   * 取备用存储，并只通知一次降级。
   * 「只一次」是刻意的：降级是环境事实，不是每次读写的事件，
   * 回调里通常要打日志或上报，刷屏反而会让人忽略真正的问题。
   * @returns {KeyValueStore} 备用存储（默认 cookie 适配器）
   */
  function fallbackOnce(): KeyValueStore {
    if (!notified && o.onFallback) {
      notified = true
      o.onFallback()
    }
    return secondary
  }

  return {
    /**
     * 读一个键：主存储没有就退到备用。
     * @param {string} key 键名
     * @returns {string|null} 值；两边都没有或不允许降级时 null
     */
    get(key: string): string | null {
      const v = primary.get(key)
      if (v !== null && v !== undefined) return v
      if (!allowFallback) return null
      return fallbackOnce().get(key)
    },

    /**
     * 写一个键：主存储写不进去就退到备用。
     * @param {string} key 键名
     * @param {string} value 值
     * @returns {void} 无返回值
     */
    set(key: string, value: string): void {
      // 写入可能「成功返回但没写进去」（额度为 0 时不抛异常），也可能直接抛
      // （IE 隐私模式）。两种情况都靠回读验证，不能只看有没有抛。
      // 不初始化：两条路径（成功赋值 / catch 里置 false）都会给它值，
      // 写个初值反而会引来 no-useless-assignment —— 那才是真的死代码。
      let wrote
      try {
        primary.set(key, value)
        const ok = primary.get(key)
        wrote = ok !== null && ok !== undefined
      } catch {
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
    /**
     * 删一个键：两边都删。
     * 只删主存储的话，备用里那条旧值会在下次主存储不可用时「复活」，
     * 表现为主题莫名其妙跳回很久以前选过的那个。
     * @param {string} key 键名
     * @returns {void} 无返回值
     */
    remove(key: string): void {
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
  prefix?: string | Prefix | Dict<string> | null
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

/**
 * 推出实际要用的两个 key。
 * key 统一从前缀推、允许显式覆盖，是为了让 readTheme / bindTheme / restoreScript
 * 三处永远算到同一对键 —— 三处各写一份默认值，迟早有一处漂移，
 * 表现是「存进去了但读不回来」，极难查。
 * @param {object} o ThemeStorageOptions
 * @returns {{theme: string, accent: string}} 主题键与强调色键
 */
function keysOf(o: ThemeStorageOptions): { theme: string; accent: string } {
  const p = prefixOf(o.prefix)
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
 * @param {object} [opts] { store, prefix, themeKey, accentKey }
 * @returns {ThemeSnapshot} { theme, accent }，没存过就是 null —— 兜底交给调用方决定
 */
export function readTheme(opts?: ThemeStorageOptions): ThemeSnapshot {
  const o = opts || {}
  const k = keysOf(o)
  const store = o.store || autoStorage()
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
 * @param {ThemeManager} manager 要接上存储的 manager
 * @param {object} [opts] { store, prefix, themeKey, accentKey }
 * @returns {Function} 退订函数；调了之后就不再往存储里写
 */
export function bindTheme(manager: ThemeManager, opts?: ThemeStorageOptions): () => void {
  const o = opts || {}
  // key 默认跟着「被绑定的这个 manager」的前缀走。
  // 用 opts.prefix 会让 manager 是 acme 前缀、存下来的却是 ds-theme —— 下次 readTheme 读不回来。
  const k = keysOf({
    prefix: o.prefix || manager.prefix,
    themeKey: o.themeKey,
    accentKey: o.accentKey,
  })
  const store = o.store || autoStorage()

  /**
   * 收到一次状态变化就落盘。
   * accent 为空时要主动 remove 而不是写空串：空串会被 readTheme 读成「有值」，
   * 于是下次启动就变成「用户选过强调色，只是它是空的」，跟没选过不是一回事。
   * @param {object} [payload] manager 广播的状态快照；为空时直接返回
   * @returns {void} 无返回值
   */
  function write(payload?: Dict<unknown>): void {
    if (!payload) return
    if (payload.theme) store.set(k.theme, String(payload.theme))
    if (payload.accent) store.set(k.accent, String(payload.accent))
    else store.remove(k.accent)
  }

  const off = manager.subscribe(write)
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
 * @param {object} [opts] { prefix, themeKey, accentKey }（与 readTheme 传同一份）
 * @returns {string} 可直接交给 getInitScript({ restore }) 的 ES5 源码片段
 */
export function restoreScript(opts?: ThemeStorageOptions): string {
  const o = opts || {}
  const k = keysOf(o)
  const themeKey = JSON.stringify(k.theme)
  const accentKey = JSON.stringify(k.accent)

  // 顺序跟 autoStorage 保持一致：先 localStorage，读不到再从 cookie 里扫
  return (
    `try{var __rv=localStorage.getItem(${themeKey});if(__rv){t=__rv}}catch(e){}` +
    `if(!t){var __rs=document.cookie?document.cookie.split(';'):[];` +
    `for(var __ri=0;__ri<__rs.length;__ri++){var __rq=__rs[__ri],__rx=__rq.indexOf('='),` +
    `__rn=(__rx>-1?__rq.slice(0,__rx):__rq).replace(/^\\s+|\\s+$/g,'');` +
    `if(__rn===${
      themeKey
    }){t=decodeURIComponent((__rx>-1?__rq.slice(__rx+1):'').replace(/^\\s+|\\s+$/g,''));break}}}` +
    `try{var __rw=localStorage.getItem(${accentKey});if(__rw){a=__rw}}catch(e){}` +
    `if(!a){var __rs2=document.cookie?document.cookie.split(';'):[];` +
    `for(var __rj=0;__rj<__rs2.length;__rj++){var __rq2=__rs2[__rj],__ry=__rq2.indexOf('='),` +
    `__rm=(__ry>-1?__rq2.slice(0,__ry):__rq2).replace(/^\\s+|\\s+$/g,'');` +
    `if(__rm===${
      accentKey
    }){a=decodeURIComponent((__ry>-1?__rq2.slice(__ry+1):'').replace(/^\\s+|\\s+$/g,''));break}}}`
  )
}
