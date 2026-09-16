/**
 * class 层：两层 class
 * -------------------------------------------------------------
 * 拆两层的唯一理由：IE10 没有 CSS 自定义属性。
 *
 *   primitive  .ds-p-4  .ds-rounded-md  .ds-flex
 *              值来自固定 scale，与主题无关 —— 一辈子只生成一份
 *
 *   semantic   .ds-bg-brand  .ds-text-fg-muted  .ds-border-subtle
 *              值是 var(--ds-*)，与主题相关 —— 每个主题一份
 *
 * 不拆的话 IE10 下的体积是 全部 class × 主题数；
 * 拆开后是 primitive(1) + semantic(N)，主题越多省得越多。
 */

import { each, assign, isPlainObject, kebab } from './util'
import type { Dict } from './util'
import { cssVarRef, rulesToCss } from './output'
import { prefixOf } from './prefix'
import type { Prefix } from './prefix'

/** 一条 CSS 规则：选择器 + 声明表 */
export interface CssRule {
  selector: string
  decls: Dict<string | string[]>
}

/** scale 表：分组名 -> { 档位名: 值 } */
export type ScaleTable = Dict<Dict<string>>

/** scale 派生的 primitive 规则声明 */
export interface ScaleRuleDef {
  prefix: string
  prop: string | string[]
  scale: string
}

/** 静态工具 class */
export interface UtilityDef {
  name: string
  decls: Dict<string | string[]>
}

/** semantic 映射项 */
export interface SemanticDef {
  prop: string
  group: string
  wrap?: string
}

export interface PrimitiveOptions {
  prefix?: string | Prefix
  classPrefix?: string
  scales?: ScaleTable
  rules?: ScaleRuleDef[]
  utilities?: UtilityDef[]
}

export interface SemanticOptions {
  prefix?: string | Prefix
  classPrefix?: string
  varPrefix?: string
  map?: Dict<SemanticDef>
}

/** 默认 scale：primitive class 的取值域（主题无关，所以可以放死值） */
export var DEFAULT_SCALES: ScaleTable = {
  space: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radius: { none: '0px', sm: '2px', md: '4px', lg: '8px', xl: '12px', full: '9999px' },
  fontSize: {
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
  },
  lineHeight: { tight: '1.25', snug: '1.375', normal: '1.5', relaxed: '1.625' },
  borderWidth: { 0: '0px', 1: '1px', 2: '2px', 4: '4px' },
  zIndex: { 0: '0', 10: '10', 20: '20', 30: '30', 40: '40', 50: '50', max: '2147483647' },
  size: {
    auto: 'auto',
    full: '100%',
    half: '50%',
    screen: '100vw',
    0: '0px',
    4: '16px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
}

/**
 * scale 派生的 primitive 规则声明
 * prop 可以是数组，一条 class 同时写多个属性（如 px -> padding-left/right）
 */
export var DEFAULT_SCALE_RULES: ScaleRuleDef[] = [
  { prefix: 'p', prop: 'padding', scale: 'space' },
  { prefix: 'px', prop: ['padding-left', 'padding-right'], scale: 'space' },
  { prefix: 'py', prop: ['padding-top', 'padding-bottom'], scale: 'space' },
  { prefix: 'pt', prop: 'padding-top', scale: 'space' },
  { prefix: 'pr', prop: 'padding-right', scale: 'space' },
  { prefix: 'pb', prop: 'padding-bottom', scale: 'space' },
  { prefix: 'pl', prop: 'padding-left', scale: 'space' },

  { prefix: 'm', prop: 'margin', scale: 'space' },
  { prefix: 'mx', prop: ['margin-left', 'margin-right'], scale: 'space' },
  { prefix: 'my', prop: ['margin-top', 'margin-bottom'], scale: 'space' },
  { prefix: 'mt', prop: 'margin-top', scale: 'space' },
  { prefix: 'mr', prop: 'margin-right', scale: 'space' },
  { prefix: 'mb', prop: 'margin-bottom', scale: 'space' },
  { prefix: 'ml', prop: 'margin-left', scale: 'space' },

  { prefix: 'gap', prop: 'gap', scale: 'space' },
  { prefix: 'rounded', prop: 'border-radius', scale: 'radius' },
  { prefix: 'text', prop: 'font-size', scale: 'fontSize' },
  { prefix: 'leading', prop: 'line-height', scale: 'lineHeight' },
  { prefix: 'border', prop: 'border-width', scale: 'borderWidth' },
  { prefix: 'z', prop: 'z-index', scale: 'zIndex' },
  { prefix: 'w', prop: 'width', scale: 'size' },
  { prefix: 'h', prop: 'height', scale: 'size' },
]

/**
 * 静态工具 class。
 * decls 的值是数组时按顺序全部输出 —— 这是 IE10 前缀降级的关键：
 *   display: ['-ms-flexbox', 'flex']  会输出两条，IE10 吃前者，现代浏览器吃后者。
 */
export var DEFAULT_UTILITIES: UtilityDef[] = [
  { name: 'flex', decls: { display: ['-ms-flexbox', 'flex'] } },
  { name: 'inline-flex', decls: { display: ['-ms-inline-flexbox', 'inline-flex'] } },
  { name: 'block', decls: { display: 'block' } },
  { name: 'inline-block', decls: { display: 'inline-block' } },
  { name: 'inline', decls: { display: 'inline' } },
  { name: 'hidden', decls: { display: 'none' } },

  { name: 'flex-row', decls: { '-ms-flex-direction': 'row', 'flex-direction': 'row' } },
  { name: 'flex-col', decls: { '-ms-flex-direction': 'column', 'flex-direction': 'column' } },
  { name: 'flex-wrap', decls: { '-ms-flex-wrap': 'wrap', 'flex-wrap': 'wrap' } },
  { name: 'flex-1', decls: { '-ms-flex': '1 1 0%', flex: '1 1 0%' } },
  { name: 'flex-none', decls: { '-ms-flex': 'none', flex: 'none' } },

  { name: 'items-start', decls: { '-ms-flex-align': 'start', 'align-items': 'flex-start' } },
  { name: 'items-center', decls: { '-ms-flex-align': 'center', 'align-items': 'center' } },
  { name: 'items-end', decls: { '-ms-flex-align': 'end', 'align-items': 'flex-end' } },
  { name: 'justify-start', decls: { '-ms-flex-pack': 'start', 'justify-content': 'flex-start' } },
  { name: 'justify-center', decls: { '-ms-flex-pack': 'center', 'justify-content': 'center' } },
  { name: 'justify-end', decls: { '-ms-flex-pack': 'end', 'justify-content': 'flex-end' } },
  {
    name: 'justify-between',
    decls: { '-ms-flex-pack': 'justify', 'justify-content': 'space-between' },
  },

  { name: 'text-left', decls: { 'text-align': 'left' } },
  { name: 'text-center', decls: { 'text-align': 'center' } },
  { name: 'text-right', decls: { 'text-align': 'right' } },
  { name: 'font-normal', decls: { 'font-weight': '400' } },
  { name: 'font-medium', decls: { 'font-weight': '500' } },
  { name: 'font-semibold', decls: { 'font-weight': '600' } },
  { name: 'font-bold', decls: { 'font-weight': '700' } },
  { name: 'italic', decls: { 'font-style': 'italic' } },
  { name: 'underline', decls: { 'text-decoration': 'underline' } },
  {
    name: 'truncate',
    decls: { overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
  },

  { name: 'relative', decls: { position: 'relative' } },
  { name: 'absolute', decls: { position: 'absolute' } },
  { name: 'fixed', decls: { position: 'fixed' } },
  { name: 'overflow-hidden', decls: { overflow: 'hidden' } },
  { name: 'overflow-auto', decls: { overflow: 'auto' } },
  { name: 'cursor-pointer', decls: { cursor: 'pointer' } },
  { name: 'cursor-disabled', decls: { cursor: 'not-allowed' } },
  { name: 'border-solid', decls: { 'border-style': 'solid' } },
]

/**
 * semantic 映射：类名前缀 -> 令牌分组
 *   bg     -> color-bg-*      .ds-bg-brand  { background-color: var(--ds-color-bg-brand) }
 *   text   -> color-fg-*      .ds-text-muted{ color:            var(--ds-color-fg-muted) }
 * wrap 用于需要拼装的属性，如 ring 的 box-shadow
 */
export var DEFAULT_SEMANTIC_MAP: Dict<SemanticDef> = {
  bg: { prop: 'background-color', group: 'color-bg' },
  text: { prop: 'color', group: 'color-fg' },
  border: { prop: 'border-color', group: 'color-border' },
  ring: { prop: 'box-shadow', group: 'color-ring', wrap: '0 0 0 2px %s' },
  shadow: { prop: 'box-shadow', group: 'shadow' },
}

/** 合并自定义 scale（浅合并到分组粒度） */
export function defineScales(custom?: ScaleTable | null): ScaleTable {
  var out: ScaleTable = {}
  each(DEFAULT_SCALES, function (v, k) {
    out[String(k)] = v
  })
  each(custom || {}, function (v, k) {
    out[String(k)] = isPlainObject(out[String(k)]) ? assign({}, out[String(k)], v) : v
  })
  return out
}

function toArray(v: string | string[]): string[] {
  return Object.prototype.toString.call(v) === '[object Array]' ? (v as string[]) : [v as string]
}

/**
 * 生成 primitive 规则（主题无关）
 */
export function primitiveRules(opts?: PrimitiveOptions): CssRule[] {
  opts = opts || {}
  var prefix = opts.classPrefix || prefixOf(opts.prefix).cls
  var scales = opts.scales || DEFAULT_SCALES
  var defs = opts.rules || DEFAULT_SCALE_RULES
  var utils = opts.utilities || DEFAULT_UTILITIES
  var rules: CssRule[] = []

  each(defs, function (def: ScaleRuleDef) {
    var scale = scales[def.scale]
    if (!scale) return
    var props = toArray(def.prop)
    each(scale, function (value, step) {
      var decls: Dict<string> = {}
      for (var i = 0; i < props.length; i++) decls[props[i]] = value
      rules.push({
        selector: '.' + prefix + def.prefix + '-' + kebab(String(step)),
        decls: decls,
      })
    })
  })

  each(utils, function (util: UtilityDef) {
    rules.push({
      selector: '.' + prefix + util.name,
      decls: util.decls,
    })
  })

  return rules
}

/**
 * 生成 semantic 规则（主题相关，值写成 var(--ds-*)）
 */
export function semanticRules(flat: Dict<string>, opts?: SemanticOptions): CssRule[] {
  opts = opts || {}
  var p = prefixOf(opts.prefix)
  var prefix = opts.classPrefix || p.cls
  var map = opts.map || DEFAULT_SEMANTIC_MAP
  var varPrefix = opts.varPrefix || p.var
  var rules: CssRule[] = []

  each(map, function (def: SemanticDef, short) {
    var head = def.group
    each(flat, function (_value, key) {
      var suffix: string | null = null
      var k = String(key)
      if (k === head) suffix = ''
      else if (k.indexOf(head + '-') === 0) suffix = k.slice(head.length + 1)
      if (suffix === null) return

      var value = cssVarRef(k, varPrefix)
      if (def.wrap) value = def.wrap.replace('%s', value)

      var d: Dict<string> = {}
      d[def.prop] = value
      rules.push({
        selector: '.' + prefix + String(short) + (suffix ? '-' + suffix : ''),
        decls: d,
      })
    })
  })

  return rules
}

export interface ClassSheet {
  primitive: string
  semantic: string
  primitiveRules: CssRule[]
  semanticRules: CssRule[]
}

export interface BuildClassSheetOptions {
  tokens?: Dict<string>
  scales?: ScaleTable
  rules?: ScaleRuleDef[]
  utilities?: UtilityDef[]
  map?: Dict<SemanticDef>
  /** 统一前缀：CSS 变量 / class / DOM 属性一起换 */
  prefix?: string | Prefix
  /** 只覆盖 class 前缀（优先于 prefix） */
  classPrefix?: string
  /** 只覆盖 CSS 变量前缀（优先于 prefix） */
  varPrefix?: string
  important?: boolean
  /** 传入已求值的令牌表时，var() 会被替换成实值（IE10 通道） */
  resolve?: Dict<string> | null
  indent?: boolean
}

/**
 * 一次性产出两层 class 的 CSS 文本
 */
export function buildClassSheet(o?: BuildClassSheetOptions): ClassSheet {
  var opts = o || {}
  var p = prefixOf(opts.prefix)
  var cssOpts = {
    important: opts.important,
    resolve: opts.resolve,
    prefix: p,
    indent: opts.indent,
  }

  var pRules = primitiveRules({
    prefix: p,
    classPrefix: opts.classPrefix,
    scales: opts.scales,
    rules: opts.rules,
    utilities: opts.utilities,
  })

  var sRules = opts.tokens
    ? semanticRules(opts.tokens, {
        prefix: p,
        classPrefix: opts.classPrefix,
        varPrefix: opts.varPrefix,
        map: opts.map,
      })
    : []

  return {
    primitive: rulesToCss(pRules, cssOpts),
    semantic: rulesToCss(sRules, cssOpts),
    primitiveRules: pRules,
    semanticRules: sRules,
  }
}
