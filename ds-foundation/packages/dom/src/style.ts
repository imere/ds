/**
 * <style> 标签管理
 * -------------------------------------------------------------
 * IE 有个老坑：单个样式表能容纳的规则数有上限（IE9 是 4095，IE10 放宽到 65534）。
 * 主题越多、semantic class 越多，越容易撞线，撞线的表现是"后面的样式静默丢失"——
 * 很难查。所以这里默认按 4000 条规则切片，超出就再开一个 <style>。
 */

import { prefixOf } from '@ds/core'
import type { Prefix, Dict } from '@ds/core'

export const DEFAULT_MAX_RULES: number = 4000

export interface WriteStyleOptions {
  maxRules?: number
  cleanup?: boolean
  previousCount?: number
  /** 统一前缀：控制标记属性名（默认 data-ds-style） */
  prefix?: string | Prefix | Dict<string> | null
}

/** 把一段完整 CSS 按 '}' 计数切片，避免撞 IE 单表规则上限 */
export function splitCss(css: string, maxRules?: number): string[] {
  const max = maxRules || DEFAULT_MAX_RULES
  const parts: string[] = []
  let start = 0
  let count = 0
  for (let i = 0; i < css.length; i++) {
    if (css.charAt(i) === '}') {
      count++
      if (count >= max) {
        parts.push(css.slice(start, i + 1))
        start = i + 1
        count = 0
      }
    }
  }
  if (start < css.length) parts.push(css.slice(start))
  return parts.length ? parts : ['']
}

/** IE8/IE9 的 <style> 才有 styleSheet.cssText，标准元素没有这个属性 */
interface LegacyStyleElement {
  styleSheet?: { cssText: string }
}

function setText(el: Element, css: string): void {
  try {
    el.textContent = css
  } catch {
    // IE8 及更老的分支：本包最低 IE10，走到这里说明宿主环境异常，再退一步
    const sheet = (el as Element & LegacyStyleElement).styleSheet
    if (sheet && typeof sheet.cssText === 'string') {
      sheet.cssText = css
    }
  }
}

export function getHead(doc: Document): Element {
  return doc.getElementsByTagName('head')[0] || doc.documentElement
}

/**
 * 取（或建）一个带 id 的 <style>
 * @param {Document} doc
 * @param {string} id
 * @param {string|object} [prefix] 控制标记属性名（默认 data-ds-style）
 * @returns {Element|null}
 */
export function ensureStyle(
  doc: Document,
  id: string,
  prefix?: string | Prefix | Dict<string> | null
): Element | null {
  if (!doc) return null
  const mark = `data-${prefixOf(prefix).ns}-style`
  let el: HTMLStyleElement | null = doc.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = doc.createElement('style')
    el.id = id
    el.setAttribute(mark, id)
    el.type = 'text/css'
    getHead(doc).appendChild(el)
  }
  return el
}

/**
 * 写入一段 CSS，必要时自动切片
 * @param {object} [opts] { maxRules, cleanup, previousCount, prefix }
 * @returns {Array<string>} 实际用到的所有 style id
 */
export function writeStyle(
  doc: Document,
  id: string,
  css: string,
  opts?: WriteStyleOptions
): string[] {
  const options = opts || {}
  const max = options.maxRules || DEFAULT_MAX_RULES
  const chunks = splitCss(css || '', max)
  const ids: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const sid = chunks.length === 1 ? id : `${id}-${i}`
    const el = ensureStyle(doc, sid, options.prefix)
    if (el) {
      setText(el, chunks[i])
      ids.push(sid)
    }
  }

  // 上一次用了更多切片、这次变少了，把多余的标签删掉
  if (options.cleanup !== false) {
    for (let j = chunks.length; j < (options.previousCount || chunks.length); j++) {
      const old = doc.getElementById(j === 0 ? id : `${id}-${j}`)
      if (old && old.parentNode) old.parentNode.removeChild(old)
    }
  }

  return ids
}

export function removeStyle(doc: Document, ids: string[]): void {
  if (!doc || !ids) return
  for (let i = 0; i < ids.length; i++) {
    const el = doc.getElementById(ids[i])
    if (el && el.parentNode) el.parentNode.removeChild(el)
  }
}

/** 现代通道：写自定义属性 */
export function setCssVar(el: HTMLElement | null, name: string, value: string): void {
  if (!el || !el.style) return
  try {
    el.style.setProperty(name, value)
  } catch {
    /* IE10 走到这里说明被强制切到了 vars 通道，静默失败 */
  }
}

export function removeCssVar(el: HTMLElement | null, name: string): void {
  if (!el || !el.style) return
  try {
    el.style.removeProperty(name)
  } catch {
    /* 忽略 */
  }
}
