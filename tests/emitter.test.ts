/**
 * @ds/dom emitter：极简事件总线
 * -------------------------------------------------------------
 * 不依赖 EventTarget / CustomEvent（IE10 上都不完整），所以订阅、退订、
 * 「回调里抛错不能连累其他订阅者」这些都要自己保证 —— 逐条测。
 */

import { describe, it, expect, vi } from 'vitest'
import { createEmitter } from '@ds/dom'

describe('on / emit', () => {
  it('订阅后能收到 payload', () => {
    const e = createEmitter()
    const fn = vi.fn()
    e.on(fn)
    e.emit({ theme: 'dark' })
    expect(fn).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('非函数不入列，返回的退订函数是空操作', () => {
    const e = createEmitter()
    const off = e.on('nope' as never)
    expect(e.count()).toBe(0)
    expect(() => off()).not.toThrow()
  })

  it('可以退订', () => {
    const e = createEmitter()
    const fn = vi.fn()
    const off = e.on(fn)
    off()
    e.emit()
    expect(fn).not.toHaveBeenCalled()
    expect(e.count()).toBe(0)
  })

  it('退订一个不影响其他订阅者', () => {
    const e = createEmitter()
    const a = vi.fn()
    const b = vi.fn()
    e.on(a)
    e.on(b)
    e.off(a)
    e.emit()
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it('emit 不传 payload 也能跑', () => {
    const e = createEmitter()
    const fn = vi.fn()
    e.on(fn)
    e.emit()
    expect(fn).toHaveBeenCalledWith(undefined)
  })
})

describe('emit 的健壮性', () => {
  it('回调抛错不打挂其他订阅者，只告警一次', () => {
    const e = createEmitter()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    e.on(bad)
    e.on(good)
    expect(() => e.emit()).not.toThrow()
    expect(good).toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('连 console 都没有的环境里也不炸', () => {
    const e = createEmitter()
    const bad = () => {
      throw new Error('boom')
    }
    e.on(bad)
    vi.stubGlobal('console', undefined)
    expect(() => e.emit()).not.toThrow()
    vi.unstubAllGlobals()
  })

  it('回调里退订自己，其余订阅者仍会执行（快照遍历）', () => {
    const e = createEmitter()
    const third = vi.fn()
    const self = vi.fn(() => {
      e.off(self)
    })
    e.on(self)
    e.on(third)
    e.emit()
    expect(self).toHaveBeenCalledTimes(1)
    expect(third).toHaveBeenCalledTimes(1)
  })
})

describe('clear / count', () => {
  it('clear 清空全部订阅者', () => {
    const e = createEmitter()
    e.on(() => {})
    e.on(() => {})
    expect(e.count()).toBe(2)
    e.clear()
    expect(e.count()).toBe(0)
  })
})
