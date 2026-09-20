/**
 * @ds/dom env：能力检测
 * -------------------------------------------------------------
 * 这一层的每个函数都是「探测 + 缓存 + 全部包 try/catch」：
 * IE10 上不少 API 存在但一调用就抛，检测本身不能把页面搞挂。
 * 所以这里的目标不是验证浏览器能力，而是**把每条降级路径都走一遍** ——
 * 有 API、没 API、API 抛异常，三种情况都不能炸。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  supportsCssVars,
  supportsMatchMedia,
  prefersDark,
  supportsStorage,
  supportsClassList,
  isIE,
  resetEnvCache,
} from '@ds/dom'

// 每个用例都从空缓存开始：探测结果被 memo 住了，不重置就只测到第一次
beforeEach(() => {
  resetEnvCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('supportsCssVars', () => {
  it('CSS.supports 说支持就算支持', () => {
    vi.stubGlobal('CSS', { supports: () => true })
    expect(supportsCssVars()).toBe(true)
  })

  it('CSS.supports 抛异常时退到人工检测', () => {
    vi.stubGlobal('CSS', {
      supports: () => {
        throw new Error('boom')
      },
    })
    // 人工检测的结果取决于 jsdom 是否实现自定义属性，两种都算通过
    expect(typeof supportsCssVars()).toBe('boolean')
  })

  it('没有 CSS 对象时走人工检测', () => {
    vi.stubGlobal('CSS', undefined)
    expect(typeof supportsCssVars()).toBe('boolean')
  })

  it('连人工检测都抛异常时判为不支持', () => {
    vi.stubGlobal('CSS', undefined)
    vi.stubGlobal('document', {
      createElement: () => ({
        style: {
          setProperty() {
            throw new Error('denied')
          },
        },
      }),
    })
    expect(supportsCssVars()).toBe(false)
  })

  it('没有 window 时不支持', () => {
    vi.stubGlobal('window', undefined)
    expect(supportsCssVars()).toBe(false)
  })

  it('结果被缓存：第二次不再探测', () => {
    const supports = vi.fn(() => true)
    vi.stubGlobal('CSS', { supports })
    expect(supportsCssVars()).toBe(true)
    expect(supportsCssVars()).toBe(true)
    expect(supports).toHaveBeenCalledTimes(1)
  })
})

describe('supportsMatchMedia', () => {
  it('有 matchMedia 就是 true', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(supportsMatchMedia()).toBe(true)
  })

  it('没有 window 时是 false', () => {
    vi.stubGlobal('window', undefined)
    expect(supportsMatchMedia()).toBe(false)
  })
})

describe('prefersDark', () => {
  it('系统偏好深色时为 true', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(prefersDark()).toBe(true)
  })

  it('系统偏好浅色时为 false', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(prefersDark()).toBe(false)
  })

  it('matchMedia 抛异常时为 false', () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('boom')
    })
    expect(prefersDark()).toBe(false)
  })

  it('没有 matchMedia 时为 false', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersDark()).toBe(false)
  })
})

describe('supportsStorage', () => {
  it('能写能删就是 true', () => {
    expect(supportsStorage()).toBe(true)
  })

  it('setItem 抛异常（隐私模式）时是 false', () => {
    // jsdom 的 localStorage 是 Storage 实例，spyOn 实例方法够不着原型上的实现，
    // 所以整个换成会抛的替身
    vi.stubGlobal('localStorage', {
      setItem() {
        throw new Error('denied')
      },
      removeItem() {},
      getItem: () => null,
    })
    expect(supportsStorage()).toBe(false)
  })

  it('localStorage 整个不存在时也是 false', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(supportsStorage()).toBe(false)
  })
})

describe('supportsClassList', () => {
  it('有 classList 就是 true', () => {
    expect(supportsClassList()).toBe(true)
  })

  it('没有 document 时是 false', () => {
    vi.stubGlobal('document', undefined)
    expect(supportsClassList()).toBe(false)
  })
})

describe('isIE', () => {
  function stubUA(ua: string) {
    Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
  }

  it('MSIE 10 的 UA 判为 IE', () => {
    stubUA('Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2)')
    expect(isIE()).toBe(true)
  })

  it('Trident（IE11）的 UA 也判为 IE', () => {
    stubUA('Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko')
    expect(isIE()).toBe(true)
  })

  it('现代浏览器不是 IE', () => {
    stubUA('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120')
    expect(isIE()).toBe(false)
  })

  it('没有 navigator 时不是 IE', () => {
    Object.defineProperty(window, 'navigator', { value: undefined, configurable: true })
    expect(isIE()).toBe(false)
  })
})
