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

/**
 * 建一个事件总线。
 * 自己实现而不是用 EventTarget / CustomEvent：这两样在 IE10 上都不完整
 * （CustomEvent 没有构造函数，EventTarget 只能挂在元素上），
 * 依赖它们等于把「主题能不能换」绑定在浏览器的实现完整度上。
 * @returns {Emitter} 含 on / off / emit / clear / count 的句柄
 */
export function createEmitter(): Emitter {
  let handlers: Handler[] = []

  return {
    /**
     * 订阅主题变化。
     * 返回的退订函数是订阅这件事最容易被漏掉的一半：组件卸载时忘了退订，
     * 回调就会一直抓着 DOM 与闭包不放。给一个返回值，调用方才想得起来。
     * @param {Function} fn 收到 payload（当前主题快照）的回调
     * @returns {Function} 退订函数，调一次即可把自己摘掉
     */
    on(fn: Handler) {
      if (typeof fn !== 'function') return function () {}
      handlers.push(fn)
      // 箭头函数直接吃外层的 this，不需要 `var self = this` 这种 ES5 时代的写法
      return () => {
        this.off(fn)
      }
    },
    /**
     * 退订一个回调。
     * 重建数组而不是 splice：splice 要按引用找下标，而这里本来就要遍历一遍，
     * 顺手挑出留下的更省心，也免得边遍历边改长度漏掉元素。
     * @param {Function} fn 之前传给 on() 的那个函数；传了没订阅过的函数不会报错
     * @returns {void} 无返回值
     */
    off(fn: Handler) {
      const next: Handler[] = []
      each(handlers, (h) => {
        if (h !== fn) next.push(h)
      })
      handlers = next
    },
    /**
     * 广播一次主题变化。
     * 每个回调都单独 try/catch：一个订阅者（比如某个 Vue 组件）抛错，
     * 不该连累后面的订阅者收不到通知，更不该让主题切换这个动作整体失败。
     * @param {object} [payload] 当前主题快照，会原样交给每个回调
     * @returns {void} 无返回值
     */
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
    /**
     * 清空所有订阅者。
     * 只在 manager.destroy() 时调：销毁之后再广播就没有意义了，
     * 而且留着回调等于替业务持有已经卸载的组件。
     * @returns {void} 无返回值
     */
    clear() {
      handlers = []
    },

    /**
     * 当前订阅者数量。
     * 主要给测试与排障用（「为什么样式写了两遍」常常就是订阅了两份），
     * 顺便让内存泄漏能被断言出来。
     * @returns {number} 订阅者个数
     */
    count() {
      return handlers.length
    },
  }
}
