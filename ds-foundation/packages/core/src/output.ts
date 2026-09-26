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
 *
 * 前缀交给 prefixOf 归一而不是自己拼：'--' 该加几个、末尾要不要短横线，
 * 这种细节只允许在一处决定，否则 toCssVars 写出的名和 cssVarRef 引用的名会对不上。
 * 令牌键本身不再做 kebab 转换 —— 进来的已经是拍平后的键，二次转换会把驼峰切坏。
 *
 * @param {string} key 拍平后的令牌键
 * @param {PrefixInput} [prefix] 变量前缀，缺省用内置的 --ds-
 * @returns {string} 完整的 CSS 变量名，含 -- 前缀
 */
export function cssVarName(key: string, prefix?: PrefixInput): string {
  return prefixOf(prefix).var + key
}

/**
 * 生成 var() 引用：'var(--ds-color-brand)'，给了 fallback 就是
 * 'var(--ds-color-brand,#fff)'。
 *
 * 逗号后面不空格：老版 Safari 与 IE 系的 var() 解析器对空白容忍度差，
 * 紧凑写法在所有目标浏览器上都能出图，代价只是源码少一个空格。
 * fallback 走参数而不是让调用方拼字符串，是为了保证名字那段一定经过 prefixOf 归一。
 *
 * @param {string} key 拍平后的令牌键
 * @param {PrefixInput} [prefix] 变量前缀，缺省用内置的 --ds-
 * @param {string} [fallback] 变量未定义时的兜底值，不传就不写 fallback
 * @returns {string} 可直接写进声明值的 var() 表达式
 */
export function cssVarRef(key: string, prefix?: PrefixInput, fallback?: string): string {
  const name = cssVarName(key, prefix)
  return fallback ? `var(${name},${fallback})` : `var(${name})`
}

export interface CssVarsOptions {
  selector?: string
  prefix?: PrefixInput
  important?: boolean
}

/**
 * 现代通道：令牌表 -> 一条带自定义属性的规则。
 *
 * 全部声明挤在一条规则里而不是一令牌一条：换主题时只需替换这一规则的内容，
 * 浏览器不必重算任何选择器匹配，这是「零重排」的来源。
 * 声明之间不加换行，因为这段文本要进 <style> 与 SSR HTML，体积小一点是一点。
 *
 * @param {Dict<string>} flat 扁平令牌表
 * @param {CssVarsOptions} [opts] 选择器、变量前缀与 !important 开关
 * @returns {string} 形如 ':root{--ds-color-brand:#4f46e5;}' 的 CSS 文本
 */
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
 *
 * 只覆盖 opts 里的 selector、其余原样透传：作用域选择器和变量前缀是两件事，
 * 拆开后「同一套变量名挂到不同作用域」不用重复传前缀，也就不会传错。
 *
 * @param {Dict<string>} flat 扁平令牌表
 * @param {string} selector 作用域选择器，如 '[data-ds-theme="dark"]'
 * @param {CssVarsOptions} [opts] 变量前缀与 !important 开关，selector 会被覆盖
 * @returns {string} 带作用域选择器的 CSS 文本
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
 *
 * 固定 5 轮 + 无变化即退出，而不是一直跑到不动为止：真实设计系统里引用链
 * 超过 5 层说明令牌拆错了，早就该改；封顶能避免写错成循环引用时把页面卡死。
 * 先整表复制再原地改，是为了让引用总是基于同一张快照求值，
 * 不会因为遍历顺序不同而得到不同结果。
 *
 * @param {Dict<string>} flat 扁平令牌表，值里可以含 var() 引用
 * @param {ResolveVarsOptions} [opts] 变量前缀，缺省用内置的 ds
 * @returns {Dict<string>} var() 全部替换成实值的新表
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

/**
 * 规则数组 -> CSS 文本。
 *
 * 数组和字典都收：调用方手里的规则有时是按名字索引的字典，
 * 要求先转数组只会多一次无意义的拷贝，each 两种都能遍历。
 *
 * 声明值支持数组（如 ['-webkit-box', 'flex']）：同一属性写多遍即可，
 * 浏览器按最后一条能解析的生效 —— 比手写 @supports 分支省事，也更好压缩。
 * 空声明的规则直接丢弃，避免产出一批只有选择器的空壳。
 * 换行默认开（indent 只在显式传 false 时关），压平留给构建期的压缩器。
 *
 * @param {CssRule[]|Dict<CssRule>} rules 规则数组或以名字为键的规则字典
 * @param {RulesToCssOptions} [opts] !important、var 求值表、前缀与换行开关
 * @returns {string} 拼好的 CSS 文本
 */
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

/**
 * 包成可直接塞进 innerHTML 的 <style> 标签。
 *
 * 给了 id 才顺带写 data-ds-style 标记：运行时靠这个属性反查「我注入过哪些 style」，
 * 做去重与整段替换；没有 id 的临时样式没有替换需求，多写个属性只是噪声。
 * 属性用 each 手拼而不引 DOM API —— 这段文本也可能在 Node 里生成（SSR）。
 *
 * @param {string} css 已生成的 CSS 文本
 * @param {string|null} [id] 样式 id，传了才会带上可反查的 data 标记
 * @param {Dict<string>|null} [attrs] 额外属性，如 media、type
 * @param {PrefixInput} [prefix] 命名空间前缀，决定 data 标记的属性名
 * @returns {string} 完整的 <style>...</style> 字符串
 */
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

/**
 * 生成 SSR 用的 style 标签串（多主题一次性吐出，避免首屏闪烁）。
 *
 * 所有主题在首屏 HTML 里就位，客户端只在切换主题时改元素属性，
 * 不新增 <style> —— 否则首屏用默认主题、脚本跑完才换成目标主题，会闪一下。
 * 每块的 id 统一取「class 前缀 + 主题名」，运行时才能按名字定位并替换其中一块。
 * 空块跳过：某个主题被裁到一条规则都没有时，不该插一个空标签占位。
 *
 * @param {Dict<string>} [blocks] 主题名 -> CSS 文本
 * @param {PrefixInput} [prefix] 前缀，同时决定 class 前缀与 data 标记名
 * @returns {string} 拼接后的多个 <style> 标签
 */
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
