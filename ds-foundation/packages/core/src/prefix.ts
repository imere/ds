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
export var DEFAULT_NS = 'ds'

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
var VALID = /^[A-Za-z_][A-Za-z0-9_-]*$/

function trim(s: string): string {
  return String(s).replace(/^\s+|\s+$/g, '')
}

/**
 * 'ds' / '--ds-' / 'ds-' -> 'ds'
 * 只砍开头的一对 -- 和末尾的 -；中间的 - 是前缀的一部分，保留。
 */
function strip(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  var s = trim(String(raw))
  if (s.indexOf('--') === 0) s = s.slice(2)
  while (s.charAt(s.length - 1) === '-') s = s.slice(0, -1)
  return s
}

export function normalizePrefix(input?: string | Prefix | Dict<any> | null): Prefix {
  var ns = ''

  if (isPlainObject(input)) {
    var o = input as Dict<any>
    ns = o.ns || o.token || strip(o.var || o.cls || o.class || '')
  } else if (typeof input === 'string') {
    ns = strip(input)
  }

  if (!ns || !VALID.test(ns)) ns = DEFAULT_NS

  return {
    /** 命名空间，resolveVars / resolveVarValue 用它 */
    ns: ns,
    /** ns 的别名，语义化一点 */
    token: ns,
    /** CSS 变量前缀：--acme- */
    var: '--' + ns + '-',
    /** class 前缀：acme- */
    cls: ns + '-',
    /** cls 的别名 */
    classPrefix: ns + '-',

    attr: 'data-' + ns + '-theme',
    modeAttr: 'data-' + ns + '-mode',
    accentAttr: 'data-' + ns + '-accent',
    styleAttr: 'data-' + ns + '-style',

    ids: {
      tokens: ns + '-tokens',
      primitive: ns + '-class-primitive',
      semantic: ns + '-class-semantic',
      ssr: ns + '-ssr',
    },

    keys: {
      theme: ns + '-theme',
      accent: ns + '-accent',
    },
  }
}

/** 已经是归一化对象了就别再算一遍 */
export function isPrefix(v: unknown): v is Prefix {
  return (
    isPlainObject(v) &&
    typeof (v as Prefix).ns === 'string' &&
    typeof (v as Prefix).var === 'string'
  )
}

/** 入口统一走这个：传什么都不用管，拿到的永远是归一化对象 */
export function prefixOf(v?: string | Prefix | Dict<any> | null): Prefix {
  return isPrefix(v) ? v : normalizePrefix(v)
}
