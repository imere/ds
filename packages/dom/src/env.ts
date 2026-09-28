/**
 * 能力检测
 * -------------------------------------------------------------
 * 全部做缓存（一次会话内只测一遍），且全部包 try/catch：
 * IE10 上不少 API 存在但一调用就抛，检测本身不能把页面搞挂。
 */

import type { Dict } from '@ds/core'

let cache: Dict<unknown> = {}

/**
 * 缓存一次探测结果。
 * 探测本身带副作用（试探写 localStorage、建临时元素），一个会话内只该做一遍；
 * 泛型让调用方直接拿回自己那个类型，不用在外面再断言一次。
 * @param {string} key 缓存键
 * @param {Function} fn 真正做探测的函数，只在缓存未命中时执行一次
 * @returns {*} 探测结果；命中缓存时直接返回上次存下来的值
 */
function memo<T>(key: string, fn: () => T): T {
  if (cache[key] === undefined) cache[key] = fn()
  return cache[key] as T
}

/**
 * 是否支持 CSS 自定义属性。
 * 这是选通道的唯一依据：支持走 vars，不支持走 static（IE10 / IE11 都没有，Edge 15+ 才有）。
 * 先试标准 API，再退到「设一个变量再读回来」的人工检测 —— 两步都包 try/catch，
 * 因为老内核上 API 常常存在但一调用就抛，探测自己不能把页面搞挂。
 * @returns {boolean} 支持返回 true；没有 window（SSR）时按不支持处理，返回 false
 */
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

/**
 * 是否支持 window.matchMedia。
 * 「跟随系统深浅」全靠它：不支持（IE9）就整段跳过监听，而不是退化成定时轮询 ——
 * 轮询既费电，又会在切换的瞬间抢在渲染前面改属性，反而更容易闪。
 * @returns {boolean} 存在且是函数返回 true
 */
export function supportsMatchMedia(): boolean {
  return memo('matchMedia', () => {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  })
}

/**
 * 系统当前是否偏好深色。
 * 刻意不做缓存：系统偏好是可以在运行时改的，缓存下来会让「切了系统主题页面没反应」。
 * 取不到时返回 false —— 按浅色兜底，首屏至少是确定的，不会在深浅之间随机跳。
 * @returns {boolean} 系统偏好深色返回 true
 */
export function prefersDark(): boolean {
  if (!supportsMatchMedia()) return false
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches === true
  } catch {
    return false
  }
}

/**
 * 是否支持 localStorage。
 * 判定的方式是真写一次再删掉：file:// 与 IE 隐私模式下对象存在、typeof 也是 object，
 * 但一写就抛 —— 只看类型会误判成可用，等到真存主题时才炸，那时候已经晚了。
 * @returns {boolean} 可读写返回 true
 */
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

/**
 * 是否支持 element.classList。
 * IE10 有、IE9 没有；没有的时候只能整体重写 class 字符串，
 * 所以这类分支要提前知道，免得在热路径里反复 try。
 * @returns {boolean} documentElement 上能拿到 classList 返回 true
 */
export function supportsClassList(): boolean {
  return memo('classList', () => {
    return (
      typeof window !== 'undefined' &&
      !!window.document &&
      !!window.document.documentElement.classList
    )
  })
}

/**
 * 当前是否跑在 IE（含 10 / 11）。
 * 同时认 MSIE（IE10 及更老）与 Trident（IE11 改了 UA，但内核标记还在）。
 * 只在「要不要额外加载一份补丁」这种少数地方用：日常判断请探测能力、别探测浏览器，
 * UA 会骗人（兼容模式、企业策略改 UA），能力不会。
 * @returns {boolean} 命中 IE 返回 true
 */
export function isIE(): boolean {
  return memo('ie', () => {
    if (typeof window === 'undefined' || !window.navigator) return false
    const ua = window.navigator.userAgent
    return ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1
  })
}

/**
 * 清空所有探测缓存，只给测试用。
 * 测试会在同一个进程里改 UA、挪掉 localStorage，不清缓存的话后面的用例
 * 拿到的还是第一次探测的结果，用例之间会互相污染。
 * @returns {void} 无返回值
 */
export function resetEnvCache(): void {
  cache = {}
}
