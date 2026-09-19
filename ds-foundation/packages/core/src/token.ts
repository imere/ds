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
 * 声明一组令牌。本身不做转换，只做校验并原样返回，
 * 目的是让「定义」这件事在代码里显式可读。
 */
export function defineTokens<T extends TokenTree>(tokens: T): T {
  if (!isPlainObject(tokens)) {
    throw new TypeError('[ds/core] defineTokens 需要一个普通对象')
  }
  return tokens
}

/**
 * 嵌套对象拍平：{ color: { bgSubtle: '#fff' } } -> { 'color-bg-subtle': '#fff' }
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

/** 把扁平键还原成嵌套对象：'color-bg' -> { color: { bg } } */
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

/** 只取某个前缀下的令牌，例如 pickTokens(flat, 'color') */
export function pickTokens(flat: FlatTokens, group: string): FlatTokens {
  const out: FlatTokens = {}
  const head = `${group}-`
  for (const key in flat) {
    if (!Object.prototype.hasOwnProperty.call(flat, key)) continue
    if (key.indexOf(head) === 0) out[key.slice(head.length)] = flat[key]
  }
  return out
}
