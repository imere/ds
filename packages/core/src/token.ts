/**
 * 令牌定义与拍平
 * -------------------------------------------------------------
 * 令牌在源码里按分组嵌套书写（color.bgSubtle），
 * 对外与 CSS 变量里都是扁平的短横线键（color-bg-subtle）。
 */

import { isPlainObject, kebab, assign } from './util'
import type { Dict } from './util'

/** 嵌套书写的令牌：值可以是标量，也可以是更深一层的对象 */
export type TokenTree = Dict<unknown>

/** 拍平后的令牌表：'color-bg-subtle' -> '#fff' */
export type FlatTokens = Dict<string>

/**
 * 内置令牌的扁平键清单。
 *
 * 刻意用 interface 而不是 type —— interface 可以被声明合并，使用方能往上加自己的键：
 *
 *   declare module '@ds/core' {
 *     interface TokenMap {
 *       'brand-gradient': string
 *     }
 *   }
 *
 * 加完之后 'brand-gradient' 就会出现在自动补全里，跟内置键同等对待。
 */
export interface TokenMap {
  'color-bg': string
  'color-bg-subtle': string
  'color-bg-inset': string
  'color-bg-overlay': string
  'color-fg': string
  'color-fg-muted': string
  'color-fg-subtle': string
  'color-fg-disabled': string
  'color-fg-on-fill': string
  'color-border': string
  'color-border-strong': string
  'color-border-focus': string
  'color-success': string
  'color-success-subtle': string
  'color-warning': string
  'color-warning-subtle': string
  'color-danger': string
  'color-danger-subtle': string
  'color-info': string
  'color-info-subtle': string
  'color-brand': string
  'color-brand-hover': string
  'color-brand-active': string
  'color-brand-subtle': string
  'color-brand-border': string
  'color-on-brand': string
  'color-ring': string
  'radius-sm': string
  'radius-md': string
  'radius-lg': string
  'radius-full': string
  'font-family': string
  'font-size-sm': string
  'font-size-md': string
  'font-size-lg': string
  'font-line-tight': string
  'font-line-normal': string
  'shadow-none': string
  'shadow-sm': string
  'shadow-md': string
  'shadow-lg': string
  'shadow-focus': string
  'motion-fast': string
  'motion-base': string
  'motion-slow': string
  'motion-ease': string
}

/**
 * 令牌键的类型。两半缺一不可：
 *   · `keyof TokenMap`      写字面量时给自动补全，拼错能在编译期发现
 *   · `(string & {})`       留逃生舱 —— 运行时拼出来的键、使用方自己加的键都能过
 *
 * 只留 interface 会把使用方锁死：自定义的令牌一律类型报错。
 * 直接放宽成 string 又退回 Dict<string>，补全和拼错检查全丢。
 * `(string & {})` 这个交集在赋值时等价于 string，但在联合里能保住字面量的补全提示。
 */
export type TokenKey = keyof TokenMap | (string & {})

/**
 * 声明一组令牌。本身不做转换，只做校验并原样返回，
 * 目的是让「定义」这件事在代码里显式可读 —— 令牌在哪一层被覆盖，
 * 站在调用处就能看出来，而不是散落在若干层 assign 里靠猜。
 *
 * 之所以要抛错而不是静默接受：非普通对象（数组、class 实例、null）
 * 在后续拍平时会得到一堆无意义的键，早失败比晚调试便宜。
 *
 * @param {T} tokens 嵌套书写的令牌树
 * @returns {T} 原样返回入参，泛型保留字面量类型，便于后续按键取值
 *
 * @example
 * const brand = defineTokens({ color: { brand: '#4f46e5' } })
 */
export function defineTokens<T extends TokenTree>(tokens: T): T {
  if (!isPlainObject(tokens)) {
    throw new TypeError('[ds/core] defineTokens 需要一个普通对象')
  }
  return tokens
}

/**
 * 嵌套对象拍平：{ color: { bgSubtle: '#fff' } } -> { 'color-bg-subtle': '#fff' }。
 *
 * 拍平是刻意的：CSS 自定义属性没有层级概念，扁平键才能直接拼成 --ds-color-bg-subtle；
 * 同时「按前缀取子集」「按主题整表替换」都退化成普通字典操作，不必再递归。
 *
 * prefix 与 out 暴露出来只为递归服务：每层沿用同一个 result，
 * 既省掉逐层建对象再合并的分配开销，也避免同名键被后来的空对象覆盖。
 *
 * @param {TokenTree} obj 待拍平的嵌套令牌树
 * @param {string} [prefix] 递归累积的键前缀，外部直接调用时一般不传
 * @param {FlatTokens} [out] 复用的结果容器，传入时键值对直接写进这个对象
 * @returns {FlatTokens} 扁平后的令牌表
 */
export function flattenTokens(obj: TokenTree, prefix?: string, out?: FlatTokens): FlatTokens {
  const result = out || {}
  const head = prefix || ''
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
    const value = obj[key]
    const next = head ? `${head}-${kebab(key)}` : kebab(key)
    if (isPlainObject(value)) {
      flattenTokens(value as TokenTree, next, result)
    } else if (value !== undefined && value !== null) {
      result[next] = String(value)
    }
  }
  return result
}

/**
 * 把扁平键还原成嵌套对象：'color-bg' -> { color: { bg } }。
 *
 * 存在的理由是「给人看」—— 扁平表适合拼 CSS，但按分组浏览、出文档、
 * 导出 JSON 预览时嵌套更接近书写习惯。注意它是有损的：
 * 短横线一律当层级切分，'font-family' 会被拆成 font.family，
 * 所以别拿它做「拍平 -> 还原」的往返，往返请用 mergeTree 直接并树。
 *
 * @param {FlatTokens} flat 扁平令牌表
 * @returns {TokenTree} 还原出的嵌套令牌树
 */
export function unflattenTokens(flat: FlatTokens): TokenTree {
  const out: TokenTree = {}
  for (const key in flat) {
    if (!Object.prototype.hasOwnProperty.call(flat, key)) continue
    const parts = key.split('-')
    let cur = out
    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlainObject(cur[parts[i]])) cur[parts[i]] = {}
      cur = cur[parts[i]] as TokenTree
    }
    cur[parts[parts.length - 1]] = flat[key]
  }
  return out
}

/**
 * 合并多组令牌，后者覆盖前者。
 * 用于「主题 <- 强调色 <- 手动覆盖」的叠加顺序。
 *
 * 入参一律先拍平再合并：调用方可能递嵌套树，也可能递拍平表，混着传也能拿到
 * 正确的覆盖顺序，不必要求调用方先自己拍平一次 —— 少一个「忘了拍平」的坑。
 * null / undefined 直接跳过，让「条件性地加一层覆盖」写成三元表达式也不炸。
 *
 * @param {Array<TokenTree|FlatTokens|null|undefined>} sources 按优先级由低到高的令牌源
 * @returns {FlatTokens} 合并后的扁平令牌表
 */
export function mergeTokens(
  ...sources: Array<TokenTree | FlatTokens | null | undefined>
): FlatTokens {
  const out: FlatTokens = {}
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i]
    if (!src) continue
    assign(out, flattenTokens(src))
  }
  return out
}

/**
 * 深合并两组嵌套令牌树，后者覆盖前者；只有两端都是普通对象才继续往下钻。
 *
 * 为什么不能走「先拍平再 unflatten」：拍平后 'color-brand' 与 'color-brand-hover'
 * 会同时存在，unflatten 时前者要写 color.brand = '#fff'（字符串），
 * 后者要写 color.brand = { hover }（对象）—— 一个键不可能两种形态，
 * 谁后写谁覆盖，另一个键就凭空消失了。所以树对树必须直接深合并。
 *
 * 只有两端都是普通对象才往下钻：base 里是字符串、patch 里是对象时直接替换，
 * 因为「半个对象」没有意义，硬凑只会得到谁也读不懂的中间态。
 *
 * @param {TokenTree|null} [base] 基础树，缺省视为空树
 * @param {TokenTree|null} [patch] 覆盖树，缺省视为空树
 * @returns {TokenTree} 全新的合并结果，不改动任何入参
 */
export function mergeTree(base?: TokenTree | null, patch?: TokenTree | null): TokenTree {
  const out: TokenTree = {}
  const sources: Array<TokenTree | null | undefined> = [base, patch]
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i]
    if (!isPlainObject(src)) continue
    for (const key in src) {
      if (!Object.prototype.hasOwnProperty.call(src, key)) continue
      const value = src[key]
      if (isPlainObject(value)) {
        const prev = out[key]
        out[key] = mergeTree(isPlainObject(prev) ? (prev as TokenTree) : {}, value as TokenTree)
      } else if (value !== undefined) {
        out[key] = value
      }
    }
  }
  return out
}

/**
 * 只取某个前缀下的令牌，例如 pickTokens(flat, 'color')。
 *
 * 返回的键已经剥掉前缀（'color-bg' -> 'bg'），因为取子集通常是为了交给某个
 * 「只认短名」的下游（比如一个只画颜色色卡的调试面板），留着前缀反而要再剥一次。
 *
 * @param {FlatTokens} flat 扁平令牌表
 * @param {string} group 分组前缀，不带尾部短横线
 * @returns {FlatTokens} 该分组下的令牌，键已去掉前缀
 *
 * @example
 * pickTokens({ 'color-bg': '#fff', 'radius-md': '6px' }, 'color') // { bg: '#fff' }
 */
export function pickTokens(flat: FlatTokens, group: string): FlatTokens {
  const out: FlatTokens = {}
  const head = `${group}-`
  for (const key in flat) {
    if (!Object.prototype.hasOwnProperty.call(flat, key)) continue
    if (key.indexOf(head) === 0) out[key.slice(head.length)] = flat[key]
  }
  return out
}
