/**
 * 持久化：localStorage 优先，失败降级 cookie
 * -------------------------------------------------------------
 * 两个现实场景会让 localStorage 挂掉：
 *   · IE 的隐私模式 / 安全策略收紧
 *   · 直接用 file:// 打开 UMD 示例页
 * 所以必须有 cookie 兜底，否则刷新后主题会跳回默认值（肉眼可见的闪一下）。
 */

import { supportsStorage } from './env'

export interface StoreOptions {
  persist?: boolean
  cookie?: boolean
  days?: number
}

export interface Store {
  get(): string | null
  set(value: string): void
  remove(): void
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

function writeCookie(name: string, value: string, days?: number): void {
  try {
    var d = new Date()
    d.setTime(d.getTime() + (days || 180) * 24 * 60 * 60 * 1000)
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/'
  } catch (e) {
    /* 忽略 */
  }
}

export function createStore(key: string, opts?: StoreOptions): Store {
  var options = opts || {}
  var enabled = options.persist !== false
  var useCookie = options.cookie === true || !supportsStorage()

  return {
    get: function () {
      if (!enabled) return null
      try {
        return useCookie ? readCookie(key) : window.localStorage.getItem(key)
      } catch (e) {
        return null
      }
    },
    set: function (value: string) {
      if (!enabled) return
      try {
        if (useCookie) writeCookie(key, value, options.days)
        else window.localStorage.setItem(key, value)
      } catch (e) {
        // localStorage 写满 / 被禁用，临时退到 cookie
        writeCookie(key, value, options.days)
      }
    },
    remove: function () {
      if (!enabled) return
      try {
        if (useCookie) writeCookie(key, '', -1)
        else window.localStorage.removeItem(key)
      } catch (e) {
        /* 忽略 */
      }
    },
  }
}
