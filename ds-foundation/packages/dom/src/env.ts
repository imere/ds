/**
 * 能力检测
 * -------------------------------------------------------------
 * 全部做缓存（一次会话内只测一遍），且全部包 try/catch：
 * IE10 上不少 API 存在但一调用就抛，检测本身不能把页面搞挂。
 */

import type { Dict } from '@ds/core'

let cache: Dict<unknown> = {}

/** 缓存一次探测结果。泛型让调用方拿回自己那个类型，不用再断言 */
function memo<T>(key: string, fn: () => T): T {
  if (cache[key] === undefined) cache[key] = fn()
  return cache[key] as T
}

/** 是否支持 CSS 自定义属性（IE10 / IE11 都不支持，Edge 15+ 才有） */
export function supportsCssVars(): boolean {
  return memo('cssVars', () => {
    if (typeof window === 'undefined' || !window.document) return false

    if (window.CSS && typeof window.CSS.supports === 'function') {
      try {
        return window.CSS.supports('--ds-test', '0')
      } catch {
        /* 继续走下面的人工检测 */
      }
    }

    try {
      const el = window.document.createElement('div')
      el.style.setProperty('--ds-test', '0')
      return el.style.getPropertyValue('--ds-test') === '0'
    } catch {
      return false
    }
  })
}

/** 是否支持 matchMedia（IE10 支持，IE9 不支持） */
export function supportsMatchMedia(): boolean {
  return memo('matchMedia', () => {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  })
}

/** 系统是否偏好深色 */
export function prefersDark(): boolean {
  if (!supportsMatchMedia()) return false
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches === true
  } catch {
    return false
  }
}

/** 是否支持 localStorage（file:// 下 IE 会不可用） */
export function supportsStorage(): boolean {
  return memo('storage', () => {
    try {
      const k = '__ds_test__'
      window.localStorage.setItem(k, '1')
      window.localStorage.removeItem(k)
      return true
    } catch {
      return false
    }
  })
}

/** 是否支持 classList（IE10 有，IE9 没有） */
export function supportsClassList(): boolean {
  return memo('classList', () => {
    return (
      typeof window !== 'undefined' &&
      !!window.document &&
      !!window.document.documentElement.classList
    )
  })
}

/** 当前是否跑在 IE（含 10/11），用于加载补丁分支 */
export function isIE(): boolean {
  return memo('ie', () => {
    if (typeof window === 'undefined' || !window.navigator) return false
    const ua = window.navigator.userAgent
    return ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1
  })
}

/** 测试用：清空检测缓存 */
export function resetEnvCache(): void {
  cache = {}
}
