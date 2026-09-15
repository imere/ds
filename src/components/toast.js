/**
 * 全局轻提示（Toast）
 * -------------------------------------------------------------
 * 纯 JS API，任意位置调用：toast.success('保存成功')
 * 状态放在 Vue.observable 里，由 <DsToastHost /> 一次性渲染。
 */
import Vue from 'vue'

let seed = 0

export const toastState = Vue.observable({ items: [] })

const TONES = ['info', 'success', 'warning', 'danger']

function push(options) {
  const opts = typeof options === 'string' ? { message: options } : options || {}
  seed += 1
  const id = `ds-toast-${seed}`
  const item = {
    id,
    title: opts.title || '',
    message: opts.message || '',
    tone: TONES.includes(opts.tone) ? opts.tone : 'info',
    duration: opts.duration === undefined ? 3000 : opts.duration,
    closable: opts.closable !== false,
    icon: opts.icon || '',
  }
  toastState.items.push(item)

  if (item.duration > 0) {
    item.timer = setTimeout(() => dismiss(id), item.duration)
  }
  return id
}

export function dismiss(id) {
  const index = toastState.items.findIndex((t) => t.id === id)
  if (index > -1) {
    const [item] = toastState.items.splice(index, 1)
    if (item && item.timer) clearTimeout(item.timer)
  }
}

export function clearToasts() {
  toastState.items.forEach((t) => t.timer && clearTimeout(t.timer))
  toastState.items.splice(0, toastState.items.length)
}

export const toast = {
  show: push,
  info: (msg, opts = {}) => push({ ...opts, message: msg, tone: 'info' }),
  success: (msg, opts = {}) => push({ ...opts, message: msg, tone: 'success' }),
  warning: (msg, opts = {}) => push({ ...opts, message: msg, tone: 'warning' }),
  error: (msg, opts = {}) => push({ ...opts, message: msg, tone: 'danger' }),
  dismiss,
  clear: clearToasts,
  state: toastState,
}

export default toast
