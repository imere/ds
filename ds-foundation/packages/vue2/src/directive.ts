/**
 * v-ds-theme 指令
 * -------------------------------------------------------------
 * 用法：
 *   <div v-ds-theme="'dark'">                     局部深色区
 *   <section v-ds-theme="{ theme: 'dark', accent: 'green' }">
 *
 * 实现原理（vars 通道）：把该主题解析出的令牌值写成元素的内联自定义属性，
 * 后代元素里的 var(--ds-*) 会就近取到这份值，于是出现了"局部换肤"。
 *
 * IE10 通道做不到 —— 没有自定义属性就没有继承覆盖这一说，
 * 只能退化成整站切换，并给出一次性告警。这是能力边界，不是 bug。
 */

import { DirectiveOptions } from 'vue'
import { resolveTokens, resolveVars, each, prefixOf, Dict } from '@ds/core'
import { setCssVar, removeCssVar } from '@ds/dom'
import type { DsState } from './state'

// 指令在元素上挂的私有标记，靠全局增强补类型，不污染运行时
declare global {
  interface HTMLElement {
    __dsSig__?: string | null
    __dsVars__?: Dict<string> | null
  }
}

/** v-ds-theme 的值归一化后的形态：`'dark'` 或 `{ theme, accent }` */
export interface ThemeConfig {
  theme?: string
  accent?: string | null
}

function normalize(value: unknown): ThemeConfig {
  if (!value) return {}
  if (typeof value === 'string') return { theme: value }
  // 指令值是模板里写死的，走到这里只可能是对象形态
  return value as ThemeConfig
}

function signature(cfg: ThemeConfig): string {
  return `${cfg.theme || ''}|${cfg.accent || ''}`
}

let warned = false

export function makeDirective(ds: DsState): DirectiveOptions {
  const { manager } = ds
  const { registry } = manager
  // 前缀从 manager 上取，业务换前缀后指令写出来的变量名跟着变，
  // 否则会出现"整站是 --acme-*，局部换肤写的还是 --ds-*"的错位
  const PREFIX = prefixOf(manager.prefix).var
  const { attr } = prefixOf(manager.prefix)
  const { accentAttr } = prefixOf(manager.prefix)

  function tokensFor(cfg: ThemeConfig): Dict<string> {
    const theme = registry.getTheme(cfg.theme || undefined)
    const accent = cfg.accent === undefined ? null : registry.getAccent(cfg.accent || undefined)
    return resolveTokens(theme, accent, null)
  }

  function apply(el: HTMLElement, value: unknown): void {
    const cfg = normalize(value)
    const sig = signature(cfg)
    if (el.__dsSig__ === sig) return
    el.__dsSig__ = sig

    if (cfg.theme) el.setAttribute(attr, cfg.theme)
    else el.removeAttribute(attr)
    if (cfg.accent) el.setAttribute(accentAttr, cfg.accent)
    else el.removeAttribute(accentAttr)

    if (manager.channel !== 'vars') {
      if (!warned) {
        warned = true
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(
            '[ds/vue2] 当前处于 static 通道（IE10），v-ds-theme 无法做局部换肤，已退化为整站切换'
          )
        }
      }
      if (cfg.theme) manager.use(cfg.theme)
      if (cfg.accent !== undefined) manager.useAccent(cfg.accent || '')
      return
    }

    const flat = resolveVars(tokensFor(cfg), { prefix: manager.prefix })
    const prev = el.__dsVars__ || {}

    each(flat, (v, k) => {
      setCssVar(el, PREFIX + k, v)
    })
    each(prev, (v, k) => {
      if (flat[k] === undefined) removeCssVar(el, PREFIX + k)
    })

    el.__dsVars__ = flat
  }

  function clear(el: HTMLElement): void {
    each(el.__dsVars__ || {}, (v, k) => {
      removeCssVar(el, PREFIX + k)
    })
    el.__dsVars__ = null
    el.__dsSig__ = null
  }

  return {
    bind(el, binding) {
      apply(el, binding.value)
    },
    update(el, binding) {
      apply(el, binding.value)
    },
    unbind(el: HTMLElement): void {
      clear(el)
    },
  }
}

export default makeDirective
