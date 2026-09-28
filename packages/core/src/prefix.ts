/**
 * 前缀归一化
 * -------------------------------------------------------------
 * 以前 prefix 这个选项传得像一团乱麻：同一个名字在不同函数里含义不同——
 *   toCssVars(flat,  { prefix: '--ds-' })  要 CSS 变量形式
 *   resolveVars(flat,{ prefix: 'ds'    })  要命名空间形式
 *   semanticRules(...,{ prefix: '--ds-' }) 又要变量形式
 *   primitiveRules({ classPrefix: 'ds-' }) 又是 class 形式
 * 业务想换个前缀，得先猜眼前这个 API 想要哪一种；猜错不报错，只是静默失效。
 *
 * 现在统一：所有入口都接受下面任意一种写法，内部一次性归一化成对象。
 *   'acme'         命名空间
 *   '--acme-'      CSS 变量形式
 *   'acme-'        class 形式
 *   { ns:'acme' }  已归一化的对象（原样透传）
 *
 * 一次设置，三处同时生效：
 *   CSS 变量   --acme-color-brand
 *   class      .acme-bg-brand
 *   DOM 属性   data-acme-theme / data-acme-mode / data-acme-accent
 *   <style> id acme-tokens / acme-class-primitive / acme-class-semantic
 *   存储 key   acme-theme / acme-accent
 *
 * 非法输入（空、纯数字开头、含空格或特殊字符）一律退回 'ds' 而不是抛错——
 * 前缀拼进 CSS 选择器里，抛错会让整页样式挂掉，兜底更安全。
 */

import { isPlainObject } from './util'
import type { Dict } from './util'

/** 默认命名空间 */
export const DEFAULT_NS = 'ds'

/** 归一化后的前缀对象：一次算好，各处直接取用 */
export interface Prefix {
  /** 命名空间，resolveVars / resolveVarValue 用它 */
  ns: string
  /** ns 的别名，语义化一点 */
  token: string
  /** CSS 变量前缀：--acme- */
  var: string
  /** class 前缀：acme- */
  cls: string
  /** cls 的别名 */
  classPrefix: string

  attr: string
  modeAttr: string
  accentAttr: string
  styleAttr: string

  ids: {
    tokens: string
    primitive: string
    semantic: string
    ssr: string
  }

  keys: {
    theme: string
    accent: string
  }
}

/** CSS 自定义属性 / class 名都要求以字母或下划线开头，数字开头两边都不合法 */
const VALID = /^[A-Za-z_][A-Za-z0-9_-]*$/

/**
 * 去掉首尾空白。
 * 不用 String.prototype.trim 是因为要跑在 IE10 上，它虽然支持 trim，
 * 但这里处理的是用户配置进来的前缀，先 String() 包一层，
 * 传 null / undefined / 数字也不会抛错。
 * @param {string} s 原始字符串
 * @returns {string} 去空白后的字符串
 */
function trim(s: string): string {
  return String(s).replace(/^\s+|\s+$/g, '')
}

/**
 * 'ds' / '--ds-' / 'ds-' -> 'ds'
 * 只砍开头的一对 -- 和末尾的 -；中间的 - 是前缀的一部分，保留。
 * 用 while 去尾而不是只切一次：'ds--' 这类误输入也能收敛到 'ds'，
 * 总比拼出 --ds---color 这种畸形变量名强。
 * @param {string} raw 用户传进来的原始前缀
 * @returns {string} 只含命名空间的名字
 */
function strip(raw: string): string {
  let s = trim(raw)
  if (s.indexOf('--') === 0) s = s.slice(2)
  while (s.charAt(s.length - 1) === '-') s = s.slice(0, -1)
  return s
}

/**
 * 把任意写法的前缀归一化成一个对象。
 * 之所以一次算好所有派生串（变量前缀、class 前缀、DOM 属性、style id、存储 key），
 * 是因为它们必须同进同退：分头拼的话，换个前缀总有一处忘了改，
 * 而那种错误不会报错，只会静默失效。
 * 对象入参按 ns / token / var / cls / class 依次回退取值，
 * 于是上一层已经算好的 Prefix 传回来也能原样接受。
 * @param {string|object} [input] 命名空间、'--ns-'、'ns-' 或已归一化的对象
 * @returns {Prefix} 归一化后的前缀对象；输入非法时按 DEFAULT_NS 兜底
 * @example
 * normalizePrefix('--acme-').var // => '--acme-'
 */
export function normalizePrefix(input?: string | Prefix | Dict<string> | null): Prefix {
  let ns = ''

  if (isPlainObject(input)) {
    const o = input as Dict<string>
    ns = o.ns || o.token || strip(o.var || o.cls || o.class || '')
  } else if (typeof input === 'string') {
    ns = strip(input)
  }

  if (!ns || !VALID.test(ns)) ns = DEFAULT_NS

  return {
    /** 命名空间，resolveVars / resolveVarValue 用它 */
    ns,
    /** ns 的别名，语义化一点 */
    token: ns,
    /** CSS 变量前缀：--acme- */
    var: `--${ns}-`,
    /** class 前缀：acme- */
    cls: `${ns}-`,
    /** cls 的别名 */
    classPrefix: `${ns}-`,

    attr: `data-${ns}-theme`,
    modeAttr: `data-${ns}-mode`,
    accentAttr: `data-${ns}-accent`,
    styleAttr: `data-${ns}-style`,

    ids: {
      tokens: `${ns}-tokens`,
      primitive: `${ns}-class-primitive`,
      semantic: `${ns}-class-semantic`,
      ssr: `${ns}-ssr`,
    },

    keys: {
      theme: `${ns}-theme`,
      accent: `${ns}-accent`,
    },
  }
}

/**
 * 已经是归一化对象了就别再算一遍。
 * 只查 ns 和 var 两个字段而不是逐个字段比对：这两个是所有派生串的来源，
 * 有它们就足以认定对象是由 normalizePrefix 产出的，多查只会让兼容面变窄。
 * @param {unknown} v 任意值
 * @returns {boolean} 是已归一化的 Prefix 返回 true
 */
export function isPrefix(v: unknown): v is Prefix {
  return (
    isPlainObject(v) &&
    typeof (v as Prefix).ns === 'string' &&
    typeof (v as Prefix).var === 'string'
  )
}

/**
 * 入口统一走这个：传什么都不用管，拿到的永远是归一化对象。
 * 各 API 以前各要一种前缀写法，猜错不报错只是静默失效；
 * 现在所有入口都过这道闸门，业务换前缀只需改一处。
 * 已是 Prefix 就直接透传，避免层层包装时反复重算同一批字符串。
 * @param {string|object} [v] 命名空间、'--ns-'、'ns-'、归一化对象或空
 * @returns {Prefix} 归一化后的前缀对象
 */
export function prefixOf(v?: string | Prefix | Dict<string> | null): Prefix {
  return isPrefix(v) ? v : normalizePrefix(v)
}
