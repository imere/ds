/**
 * 极简事件总线
 * 不依赖 EventTarget / CustomEvent —— 这两样在 IE10 上都不完整。
 */

import { each } from '@ds/core'

/** 订阅回调：主题变化时被调用，payload 为当前主题快照 */
export type Handler = (payload?: any) => void

export interface Emitter {
  on(fn: Handler): () => void
  off(fn: Handler): void
  emit(payload?: any): void
  clear(): void
  count(): number
}

export function createEmitter(): Emitter {
  var handlers: Handler[] = []

  return {
    on: function (fn: Handler) {
      if (typeof fn !== 'function') return function () {}
      handlers.push(fn)
      var self = this
      return function off() {
        self.off(fn)
      }
    },
    off: function (fn: Handler) {
      var next: Handler[] = []
      each(handlers, function (h) {
        if (h !== fn) next.push(h)
      })
      handlers = next
    },
    emit: function (payload?: any) {
      // 复制一份再遍历，避免回调里 off 自己导致漏执行
      var snapshot = handlers.slice(0)
      each(snapshot, function (fn) {
        try {
          fn(payload)
        } catch (e) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[ds/dom] 主题订阅回调抛错：', e)
          }
        }
      })
    },
    clear: function () {
      handlers = []
    },
    count: function () {
      return handlers.length
    },
  }
}
