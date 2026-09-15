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

function normalize(value: any): Dict<any> {
  if (!value) return {}
  if (typeof value === 'string') return { theme: value }
  return value
}

function signature(cfg: Dict<any>): string {
  return (cfg.theme || '') + '|' + (cfg.accent || '')
}

var warned = false

export function makeDirective(ds: DsState): DirectiveOptions {
  var manager = ds.manager
  var registry = manager.registry
  // 前缀从 manager 上取，业务换前缀后指令写出来的变量名跟着变，
  // 否则会出现"整站是 --acme-*，局部换肤写的还是 --ds-*"的错位
  var PREFIX = prefixOf(manager.prefix).var
  var attr = prefixOf(manager.prefix).attr
  var accentAttr = prefixOf(manager.prefix).accentAttr

  function tokensFor(cfg: Dict<any>): Dict<string> {
    var theme = registry.getTheme(cfg.theme || undefined)
    var accent = cfg.accent === undefined ? null : registry.getAccent(cfg.accent)
    return resolveTokens(theme, accent, null)
  }

  function apply(el: HTMLElement, value: any): void {
    var cfg = normalize(value)
    var sig = signature(cfg)
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
          console.warn('[ds/vue2] 当前处于 static 通道（IE10），v-ds-theme 无法做局部换肤，已退化为整站切换')
        }
      }
      if (cfg.theme) manager.use(cfg.theme)
      if (cfg.accent !== undefined) manager.useAccent(cfg.accent)
      return
    }

    var flat = resolveVars(tokensFor(cfg), { prefix: manager.prefix })
    var prev = el.__dsVars__ || {}

    each(flat, function (v, k) {
      setCssVar(el, PREFIX + k, v)
    })
    each(prev, function (v, k) {
      if (flat[k] === undefined) removeCssVar(el, PREFIX + k)
    })

    el.__dsVars__ = flat
  }

  function clear(el: HTMLElement): void {
    each(el.__dsVars__ || {}, function (v, k) {
      removeCssVar(el, PREFIX + k)
    })
    el.__dsVars__ = null
    el.__dsSig__ = null
  }

  return {
    bind: function (el, binding) {
      apply(el, binding.value)
    },
    update: function (el, binding) {
      apply(el, binding.value)
    },
    unbind: function (el: HTMLElement): void {
      clear(el)
    },
  }
}

export default makeDirective
