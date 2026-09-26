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
  /** 以下三项必传：本包不自带尺度与命名约定，官方那一套在 @ds/tokens */
  scales: ScaleTable
  rules: ScaleRuleDef[]
  utilities: UtilityDef[]
}

export interface SemanticOptions {
  prefix?: string | Prefix
  classPrefix?: string
  varPrefix?: string
  /** 必传：语义类到令牌分组的映射属于设计决策，官方那一套在 @ds/tokens */
  map: Dict<SemanticDef>
}

/**
 * 合并自定义 scale（浅合并到分组粒度）。
 *
 * 只并到分组这一层：档位才是使用方真正要改的东西（spacing.5 想改成 22px），
 * 整组替换会逼使用方把没改的档位照抄一遍，改起来烦、也更容易抄错。
 * base 也复制一份再返回，避免调用方拿着同一张表反复叠加越滚越大。
 *
 * @param {ScaleTable} base 基础 scale 表
 * @param {ScaleTable|null} [custom] 自定义覆盖，按分组浅合并进 base
 * @returns {ScaleTable} 合并后的新表，不改动入参
 */
export function defineScales(base: ScaleTable, custom?: ScaleTable | null): ScaleTable {
  const out: ScaleTable = {}
  each(base, (v, k) => {
    out[String(k)] = v
  })
  each(custom || {}, (v, k) => {
    out[String(k)] = isPlainObject(out[String(k)]) ? assign({}, out[String(k)], v) : v
  })
  return out
}

/**
 * 把「一个属性或多个属性」统一成数组。
 *
 * 用 Object.prototype.toString 而不是 Array.isArray：本包还要跑在 IE10，
 * 跨 realm 的数组（iframe 传来的）在老引擎上 instanceof 会误判，toString 标签不会。
 * 归一成数组后，调用方一律 for 循环展开，不必到处写 typeof 分支。
 *
 * @param {string|string[]} v 单个属性名或属性名数组
 * @returns {string[]} 属性名数组
 */
function toArray(v: string | string[]): string[] {
  return Object.prototype.toString.call(v) === '[object Array]' ? (v as string[]) : [v as string]
}

/**
 * 生成 primitive 规则（主题无关）。
 *
 * 值直接写死成 scale 里的实值，不经过 var()：这一层与主题无关，
 * 写死才能做到「一辈子只生成一份」，N 个主题共用，省下 N-1 份重复体积。
 *
 * scale 缺失时静默跳过而不是抛错：rules 是声明式的，
 * 使用方可能拿一份通用规则配一张裁剪过的 scale，缺几档不该让整次构建失败。
 *
 * @param {PrimitiveOptions} opts 前缀、scale 表、派生规则与静态工具类
 * @returns {CssRule[]} 规则数组，顺序为「scale 派生在前、静态工具类在后」
 */
export function primitiveRules(opts: PrimitiveOptions): CssRule[] {
  const prefix = opts.classPrefix || prefixOf(opts.prefix).cls
  const { scales } = opts
  const defs = opts.rules
  const utils = opts.utilities
  const rules: CssRule[] = []

  each(defs, (def: ScaleRuleDef) => {
    const scale = scales[def.scale]
    if (!scale) return
    const props = toArray(def.prop)
    each(scale, (value, step) => {
      const decls: Dict<string> = {}
      for (let i = 0; i < props.length; i++) decls[props[i]] = value
      rules.push({
        selector: `.${prefix}${def.prefix}-${kebab(String(step))}`,
        decls,
      })
    })
  })

  each(utils, (util: UtilityDef) => {
    rules.push({
      selector: `.${prefix}${util.name}`,
      decls: util.decls,
    })
  })

  return rules
}

/**
 * 生成 semantic 规则（主题相关，值写成 var(--ds-*)）。
 *
 * 值必须是 var() 引用而非实值：这一层每个主题各一份，
 * 写死就得为每个主题重发整段 CSS；引用变量则换主题只改 :root 里的值，零重排。
 *
 * 走「遍历 map × 遍历令牌」而不是反查：映射项通常只有十几个、令牌几百个，
 * 双向扫描的常数很小，换来的是不必维护一张反向索引表。
 * wrap 用 %s 占位（如 '0 0 0 2px %s'）是为了让阴影、描边这类复合值也能复用同一套映射。
 *
 * @param {Dict<string>} flat 扁平令牌表，用来决定每个映射项能派生出哪些 class
 * @param {SemanticOptions} opts 前缀、变量前缀与语义映射表
 * @returns {CssRule[]} 规则数组，值为 var() 引用
 */
export function semanticRules(flat: Dict<string>, opts: SemanticOptions): CssRule[] {
  const p = prefixOf(opts.prefix)
  const prefix = opts.classPrefix || p.cls
  const { map } = opts
  const varPrefix = opts.varPrefix || p.var
  const rules: CssRule[] = []

  each(map, (def: SemanticDef, short) => {
    const head = def.group
    each(flat, (_value, key) => {
      let suffix: string | null = null
      const k = String(key)
      if (k === head) suffix = ''
      else if (k.indexOf(`${head}-`) === 0) suffix = k.slice(head.length + 1)
      if (suffix === null) return

      let value = cssVarRef(k, varPrefix)
      if (def.wrap) value = def.wrap.replace('%s', value)

      const d: Dict<string> = {}
      d[def.prop] = value
      rules.push({
        selector: `.${prefix}${String(short)}${suffix ? `-${suffix}` : ''}`,
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
  /** 以下四项必传，理由同 PrimitiveOptions / SemanticOptions */
  scales: ScaleTable
  rules: ScaleRuleDef[]
  utilities: UtilityDef[]
  map: Dict<SemanticDef>
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
 * 一次性产出两层 class 的 CSS 文本。
 *
 * 同时返回文本与规则数组：文本直接塞 <style>，规则留给
 * PostCSS 插件 / SSR 内联等场景复用，避免它们再生成一遍（生成不贵，但分歧贵）。
 * 没给 tokens 时 semantic 段返回空串而不是报错 —— 只想要 primitive 一层是合法用法。
 *
 * @param {BuildClassSheetOptions} opts 令牌表、scale、映射表与各类前缀开关
 * @returns {ClassSheet} 两层的 CSS 文本与对应规则数组
 *
 * @example
 * const sheet = buildClassSheet({ scales, rules, utilities, map, tokens: flat })
 */
export function buildClassSheet(opts: BuildClassSheetOptions): ClassSheet {
  const p = prefixOf(opts.prefix)
  const cssOpts = {
    important: opts.important,
    resolve: opts.resolve,
    prefix: p,
    indent: opts.indent,
  }

  const pRules = primitiveRules({
    prefix: p,
    classPrefix: opts.classPrefix,
    scales: opts.scales,
    rules: opts.rules,
    utilities: opts.utilities,
  })

  const sRules = opts.tokens
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
