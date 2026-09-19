/**
 * 输出层：把令牌表变成 CSS 文本
 * -------------------------------------------------------------
 * 两条通道，由 @ds/dom 在运行时按能力检测结果二选一：
 *
 *   现代通道  toCssVars()      ->  :root { --ds-color-brand: #4f46e5; ... }
 *                                 一套规则，换主题只改写变量值，零 CSS 重排
 *
 *   IE10 通道 resolveVars() + rulesToCss() ->  .ds-bg-brand { background-color: #4f46e5 }
 *                                 IE10 不认识自定义属性，var() 整条声明会被丢弃，
 *                                 必须把值预先算好写死，换主题 = 替换整段 <style> 内容
 */

import { each, assign } from './util'
import type { Dict } from './util'
import { resolveVarValue } from './color'
import { prefixOf } from './prefix'
import type { Prefix } from './prefix'
// 只取类型，编译后这一行会被擦掉，不会和 class.ts 形成运行时循环
import type { CssRule } from './class'

export const DEFAULT_PREFIX = '--ds-'
export const DEFAULT_CLASS_PREFIX = 'ds-'

export type PrefixInput = string | Prefix | undefined | null

/**
 * 令牌键 -> CSS 变量名：color-bg-brand -> --ds-color-bg-brand
 * prefix 可以是 'acme' / '--acme-' / 'acme-' / 归一化对象，都接受
 */
export function cssVarName(key: string, prefix?: PrefixInput): string {
  return prefixOf(prefix).var + key
}

/** 'var(--ds-color-brand)'，给了 fallback 就是 'var(--ds-color-brand,#fff)' */
export function cssVarRef(key: string, prefix?: PrefixInput, fallback?: string): string {
  const name = cssVarName(key, prefix)
  return fallback ? `var(${name},${fallback})` : `var(${name})`
}

export interface CssVarsOptions {
  selector?: string
  prefix?: PrefixInput
  important?: boolean
}

/** 现代通道：令牌表 -> 一条带自定义属性的规则 */
export function toCssVars(flat: Dict<string>, opts?: CssVarsOptions): string {
  opts ||= {}
  const selector = opts.selector || ':root'
  const prefix = prefixOf(opts.prefix).var
  const important = opts.important ? ' !important' : ''
  let body = ''
  each(flat, (value, key) => {
    body += `${prefix + String(key)}:${value}${important};`
  })
  return `${selector}{${body}}`
}

/**
 * 把变量块包进任意作用域，用于预生成所有主题（避免首屏后注入带来的闪烁）
 *   toScopedCss(flat, '[data-ds-theme="dark"]')
 */
export function toScopedCss(flat: Dict<string>, selector: string, opts?: CssVarsOptions): string {
  return toCssVars(flat, assign({}, opts || {}, { selector }))
}

export interface ResolveVarsOptions {
  prefix?: PrefixInput
}

/**
 * 递归求值：令牌里写的 var(--ds-x) 全部换成真实值。
 * 迭代 5 轮是为了处理 A 引用 B、B 又引用 C 的链式情况。
 * IE10 通道与 SSR 静态导出都依赖它。
 */
export function resolveVars(flat: Dict<string>, opts?: ResolveVarsOptions): Dict<string> {
  const out: Dict<string> = {}
  each(flat, (value, key) => {
    out[String(key)] = value
  })
  const prefix = prefixOf(opts && opts.prefix).ns
  for (let pass = 0; pass < 5; pass++) {
    let changed = false
    each(out, (value, key) => {
      const k = String(key)
      const next = resolveVarValue(value, out, prefix)
      if (next !== value) {
        out[k] = next
        changed = true
      }
    })
    if (!changed) break
  }
  return out
}

export interface RulesToCssOptions {
  important?: boolean
  /** 传入已解析的令牌表后，值里的 var() 会被替换成实值（IE10 通道） */
  resolve?: Dict<string> | null
  prefix?: PrefixInput
  indent?: boolean
}

/** 规则数组 -> CSS 文本 */
export function rulesToCss(rules: CssRule[] | Dict<CssRule>, opts?: RulesToCssOptions): string {
  opts ||= {}
  const important = opts.important ? ' !important' : ''
  const resolved = opts.resolve || null
  const prefix = prefixOf(opts.prefix).ns
  const nl = opts.indent === false ? '' : '\n'
  let out = ''

  each(rules, (rule: CssRule) => {
    if (!rule || !rule.decls) return
    let body = ''
    each(rule.decls, (value, prop) => {
      const list = Array.isArray(value) ? value : [value]
      for (let i = 0; i < list.length; i++) {
        let v = list[i]
        if (v === undefined || v === null) continue
        if (resolved) v = resolveVarValue(v, resolved, prefix)
        body += `${String(prop)}:${v}${important};`
      }
    })
    if (!body) return
    out += `${rule.selector}{${body}}${nl}`
  })

  return out
}

/** 包成可直接塞进 innerHTML 的 <style> 标签 */
export function toStyleTag(
  css: string,
  id?: string | null,
  attrs?: Dict<string> | null,
  prefix?: PrefixInput
): string {
  let extra = ''
  each(attrs || {}, (v, k) => {
    extra += ` ${String(k)}="${v}"`
  })
  const mark = `data-${prefixOf(prefix).ns}-style`
  return `<style${id ? ` id="${id}"` : ''}${extra}${id ? ` ${mark}="${id}"` : ''}>${css}</style>`
}

/** 生成 SSR 用的 style 标签串（多主题一次性吐出，避免首屏闪烁） */
export function renderStyleTags(
  blocks: Dict<string> | null | undefined,
  prefix?: PrefixInput
): string {
  const { cls } = prefixOf(prefix)
  let out = ''
  each(blocks || {}, (css, key) => {
    if (!css) return
    out += toStyleTag(css, cls + String(key), null, prefix)
  })
  return out
}
