/**
 * 极简事件总线
 * 不依赖 EventTarget / CustomEvent —— 这两样在 IE10 上都不完整。
 */

import { each } from '@ds/core'
import type { Dict } from '@ds/core'

/** 订阅回调：主题变化时被调用，payload 为当前主题快照 */
export type Handler = (payload?: Dict<unknown>) => void

export interface Emitter {
  on(fn: Handler): () => void
  off(fn: Handler): void
  emit(payload?: Dict<unknown>): void
  clear(): void
  count(): number
}

export function createEmitter(): Emitter {
  let handlers: Handler[] = []

  return {
    on(fn: Handler) {
      if (typeof fn !== 'function') return function () {}
      handlers.push(fn)
      // 箭头函数直接吃外层的 this，不需要 `var self = this` 这种 ES5 时代的写法
      return () => {
        this.off(fn)
      }
    },
    off(fn: Handler) {
      const next: Handler[] = []
      each(handlers, (h) => {
        if (h !== fn) next.push(h)
      })
      handlers = next
    },
    emit(payload?: Dict<unknown>) {
      // 复制一份再遍历，避免回调里 off 自己导致漏执行
      const snapshot = handlers.slice(0)
      each(snapshot, (fn) => {
        try {
          fn(payload)
        } catch (e) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[ds/dom] 主题订阅回调抛错：', e)
          }
        }
      })
    },
    clear() {
      handlers = []
    },
    count() {
      return handlers.length
    },
  }
}
