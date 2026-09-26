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

/**
 * 按规则数把一段 CSS 切片。
 * 只数 '}' 而不去解析 CSS：解析要一整套词法，而这里唯一要解决的
 * 是 IE 单表 4095 条规则的上限，数大括号就够了，也快得多。
 * 顺带保证每段都是完整规则 —— 从 '}' 后面断开，不会出现半条声明。
 * @param {string} css 完整 CSS 文本；传空串时返回 ['']，让调用方省掉一次判空
 * @param {number} [maxRules] 单片上限，默认 DEFAULT_MAX_RULES（4000）
 * @returns {Array<string>} 切片后的 CSS 数组，至少一项
 */
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

/**
 * 把 CSS 塞进 <style>。
 * 主流浏览器直接写 textContent 就行，异常分支是给 IE8/9 的 styleSheet.cssText 留的：
 * 本包最低 IE10，正常情况下走不到，但宿主被企业策略改过兼容模式时确实会出现，
 * 与其让整段样式静默丢失，不如再退一步。
 * @param {Element} el <style> 元素
 * @param {string} css CSS 文本
 * @returns {void} 无返回值
 */
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

/**
 * 取 <head>，取不到就退回 <html>。
 * 兜底不是多余的：SSR 出来的片段、被框架接管过的文档里都可能没有 head 节点，
 * 而样式挂不上只是「主题没生效」，不值得为此抛错把整页打断。
 * @param {Document} doc 目标文档
 * @returns {Element} head 元素，或 documentElement
 */
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
 * 写入一段 CSS，必要时自动切片。
 * 返回实际用到的 id 列表：切片数会随主题多少变化，调用方得拿着这份列表
 * 去清掉上一轮多出来的标签，否则旧样式会留在页面上把新样式盖掉。
 * @param {Document} doc 目标文档
 * @param {string} id 基准 style id；切成多片时依次加 -0、-1 后缀
 * @param {string} css CSS 文本
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

  // 上一次用了更多切片、这次变少了，把多余的标签删掉。
  // j 从 chunks.length 起（至少 1），所以清理的一定是带序号的那些，
  // 第 0 片用的就是 id 本身，永远不会被这里删到。
  if (options.cleanup !== false) {
    for (let j = chunks.length; j < (options.previousCount || chunks.length); j++) {
      const old = doc.getElementById(`${id}-${j}`)
      if (old && old.parentNode) old.parentNode.removeChild(old)
    }
  }

  return ids
}

/**
 * 按 id 删掉一批 <style>。
 * 走 parentNode.removeChild 而不是 el.remove()：后者是 DOM4 的方法，IE10 没有。
 * 只在 destroy() 与「这一轮切片变少了」时调用，删之前先确认节点还在，
 * 免得外部已经手动清过DOM 时抛错。
 * @param {Document} doc 目标文档
 * @param {Array<string>} ids 要删的 style id 列表
 * @returns {void} 无返回值
 */
export function removeStyle(doc: Document, ids: string[]): void {
  if (!doc || !ids) return
  for (let i = 0; i < ids.length; i++) {
    const el = doc.getElementById(ids[i])
    if (el && el.parentNode) el.parentNode.removeChild(el)
  }
}

/**
 * 往元素上写一个 CSS 自定义属性（现代通道 / 局部作用域都用它）。
 * 只在 vars 通道与「变量写容器而非 <html>」时才有意义，所以入口先判空再动手。
 * @param {Element} el 目标元素，通常是 documentElement 或局部容器；null 时直接返回
 * @param {string} name 完整变量名（带前缀），如 --acme-color-brand
 * @param {string} value 变量值
 * @returns {void} 无返回值
 */
export function setCssVar(el: HTMLElement | null, name: string, value: string): void {
  if (!el || !el.style) return
  try {
    el.style.setProperty(name, value)
  } catch {
    /* IE10 走到这里说明被强制切到了 vars 通道，静默失败 */
  }
}

/**
 * 删掉元素上一个 CSS 自定义属性。
 * 换主题时令牌数可能变少，残留的旧变量会一直挂在元素上参与继承，
 * 所以每次重绘都要把「这次不再存在的键」清掉，而不是只覆盖新值。
 * @param {Element} el 目标元素；null 时直接返回
 * @param {string} name 完整变量名（带前缀）
 * @returns {void} 无返回值
 */
export function removeCssVar(el: HTMLElement | null, name: string): void {
  if (!el || !el.style) return
  try {
    el.style.removeProperty(name)
  } catch {
    /* 忽略 */
  }
}
