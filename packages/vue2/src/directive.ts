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

/**
 * 把指令值归一成 { theme, accent }。
 * 归一放在最前面，是为了让「值没变就不动手」的判断只写一处：
 * 字符串与对象两种写法最终收敛成同一个形状，签名比较才准。
 * 空值（null / undefined / ''）统一按「不设定」处理而不是报错 —— 指令值来自模板，
 * 交给它抛错会把整个渲染打断，代价远比静默忽略大。
 * @param {unknown} value 指令原始值：主题名字符串，或 { theme, accent } 对象
 * @returns {ThemeConfig} 归一化后的配置；空值时是空对象
 */
function normalize(value: unknown): ThemeConfig {
  if (!value) return {}
  if (typeof value === 'string') return { theme: value }
  // 指令值是模板里写死的，走到这里只可能是对象形态
  return value as ThemeConfig
}

/**
 * 算配置的签名，用来判断「这一次的取值相对于上一次是不是真变了」。
 * 用拼串而不是深比较：update 在每次组件重渲染都会触发，
 * 每个元素都深比较一遍太贵，拼成字符串后一次 === 就够了。
 * @param {ThemeConfig} cfg 归一化后的配置
 * @returns {string} 形如 'dark|green' 的签名；未设定的一侧留空串
 */
function signature(cfg: ThemeConfig): string {
  return `${cfg.theme || ''}|${cfg.accent || ''}`
}

let warned = false

/**
 * 造一份 v-ds-theme 指令定义。
 * 做成工厂而不是模块级单例：指令要闭包住 ds（含 manager 与前缀），
 * 而 ds 是 install 时才产生的，做成单例在模块加载时它就还是 null。
 *
 * 前缀在工厂里取一次并闭包住，不在每次 apply 时重算 ——
 * 前缀决定写出去的变量名，中途一变就会出现「旧变量没清掉、新变量对不上」。
 *
 * @param {DsState} ds 主题句柄，这里取它的 manager 与归一化前缀
 * @returns {DirectiveOptions} Vue 2 指令定义（bind / update / unbind）
 * @example
 * Vue.directive('ds-theme', makeDirective(ds))
 * // <section v-ds-theme="{ theme: 'dark', accent: 'green' }">…</section>
 */
export function makeDirective(ds: DsState): DirectiveOptions {
  const { manager } = ds
  const { registry } = manager
  // 前缀从 manager 上取，业务换前缀后指令写出来的变量名跟着变，
  // 否则会出现"整站是 --acme-*，局部换肤写的还是 --ds-*"的错位
  const PREFIX = prefixOf(manager.prefix).var
  const { attr } = prefixOf(manager.prefix)
  const { accentAttr } = prefixOf(manager.prefix)

  /**
   * 按配置解析出这一处局部主题的完整令牌表。
   * 走 registry 而不是自己缓存一份主题表：局部换肤要能吃到业务后注册的主题与强调色，
   * 自己存一份就得跟着注册时序同步，迟早漏掉后注册的那几个。
   * @param {ThemeConfig} cfg 归一化后的配置；accent 为 undefined 表示不动强调色
   * @returns {Dict<string>} 该处局部主题解析出的扁平令牌表
   */
  function tokensFor(cfg: ThemeConfig): Dict<string> {
    const theme = registry.getTheme(cfg.theme || undefined)
    const accent = cfg.accent === undefined ? null : registry.getAccent(cfg.accent || undefined)
    return resolveTokens(theme, accent, null)
  }

  /**
   * 把局部主题落到元素上。
   * 两件事分开做：先写主题属性（CSS 选择器可能依赖它），再写内联自定义属性。
   * 内联变量是「就近覆盖」的关键 —— 后代的 var(--ds-*) 会取到离它最近的这份值。
   *
   * static 通道（IE10）没有自定义属性，做不到就近覆盖，只能退化成整站切换，
   * 并给一次一次性告警：静默降级会让业务以为局部换肤真的生效了。
   *
   * @param {HTMLElement} el 指令绑定的元素
   * @param {unknown} value 指令值，交给 normalize 归一后再用
   * @returns {void} 无返回值，属性与变量直接落在元素上
   */
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

  /**
   * 解绑收尾：撤掉这个元素写上去的全部内联变量。
   * 逐个 remove 而不是清空 style —— style 上还挂着业务自己的行内样式，
   * 一并清掉是越权，会让元素的表现莫名变样。
   * @param {HTMLElement} el 指令绑定的元素
   * @returns {void} 无返回值，只做清理
   */
  function clear(el: HTMLElement): void {
    each(el.__dsVars__ || {}, (v, k) => {
      removeCssVar(el, PREFIX + k)
    })
    el.__dsVars__ = null
    el.__dsSig__ = null
  }

  return {
    /**
     * Vue 2 指令的 bind 钩子：元素首次绑定时执行一次。
     * 与 update 共用同一套 apply：首次绑定与后续更新的行为必须完全一致，
     * 分成两份逻辑迟早会出现「第一次生效、更新却不生效」这类偏差。
     * @param {HTMLElement} el 指令绑定的元素
     * @param {Object} binding Vue 传入的绑定对象，这里只取 binding.value
     * @returns {void} 无返回值，Vue 不读指令钩子的返回值
     */
    bind(el, binding) {
      apply(el, binding.value)
    },
    /**
     * 值变化时重跑一遍 apply。
     * 不在这里先比一次新旧值再转发：apply 内部已经用签名挡住了「值没变」的情况，
     * 再比一次是重复劳动，而且比较逻辑放两处很容易只改一处。
     * @param {HTMLElement} el 指令绑定的元素
     * @param {Object} binding Vue 传入的绑定对象，这里只取 binding.value
     * @returns {void} 无返回值，Vue 不读指令钩子的返回值
     */
    update(el, binding) {
      apply(el, binding.value)
    },
    /**
     * 解绑钩子：元素被销毁时清掉写上去的变量，避免私有标记与节点一起滞留。
     * @param {HTMLElement} el 指令绑定的元素
     */
    unbind(el: HTMLElement): void {
      clear(el)
    },
  }
}

export default makeDirective
