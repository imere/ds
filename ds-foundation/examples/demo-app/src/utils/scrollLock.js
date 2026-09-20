/**
 * 滚动锁定：浮层打开时锁住 body 滚动，支持嵌套（多个浮层叠加时引用计数）。
 * 移动端 iOS 上用 position:fixed 兜底，防止背景跟着滚。
 */
let lockCount = 0
let saved = null

export function lockScroll() {
  if (typeof document === 'undefined') return
  lockCount += 1
  if (lockCount > 1) return

  const body = document.body
  const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

  saved = {
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
  }

  body.style.overflow = 'hidden'
  if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`
}

export function unlockScroll() {
  if (typeof document === 'undefined') return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0 || !saved) return

  const body = document.body
  body.style.overflow = saved.overflow
  body.style.paddingRight = saved.paddingRight
  body.style.position = saved.position
  body.style.top = saved.top
  body.style.width = saved.width
  saved = null
}

/** 强制重置（异常兜底，避免锁死后无法恢复） */
export function resetScrollLock() {
  lockCount = 0
  saved = null
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
}
