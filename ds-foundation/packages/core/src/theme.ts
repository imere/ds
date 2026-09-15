/**
 * 主题：注册、解析、覆盖
 * -------------------------------------------------------------
 * 主题与强调色是两根正交的轴：
 *   主题   —— 换明暗底（bg / fg / border / shadow）
 *   强调色 —— 换品牌色（brand 一族）
 * 解析顺序固定为 主题 -> 强调色 -> 手动覆盖，后者覆盖前者。
 */

import { flattenTokens, defineTokens } from './token'
import type { FlatTokens, TokenTree } from './token'
import { isPlainObject, assign } from './util'
import type { Dict } from './util'

export type ThemeMode = 'light' | 'dark'

/** 创建一个主题时的入参 */
export interface ThemeDef {
  label?: string
  mode?: ThemeMode | string
  tokens: TokenTree
  shadowColor?: string
}

/** 规范化后的主题 */
export interface Theme {
  label: string
  mode: ThemeMode
  tokens: TokenTree
  shadowColor: string
}

/** 强调色：换 brand 一族 */
export interface AccentDef {
  label?: string
  swatch?: string
  tokens: TokenTree
}

export interface RegistryState {
  theme: string
  accent: string
  mode: ThemeMode
  label: string
}

export interface Registry {
  theme(name: string, def: ThemeDef): Registry
  accent(name: string, def: AccentDef): Registry
  override(key: string, value: any): Registry
  resetOverrides(): Registry
  use(name: string): Registry
  useAccent(name: string): Registry
  listThemes(): string[]
  listAccents(): string[]
  getTheme(name?: string): Theme | null
  getAccent(name?: string): AccentDef | null
  resolve(): FlatTokens
  state(): RegistryState
}

/**
 * 创建一个主题定义
 */
export function createTheme(def: ThemeDef): Theme {
  if (!def || !isPlainObject(def.tokens)) {
    throw new TypeError('[ds/core] createTheme 需要 { label, mode, tokens }')
  }
  return {
    label: def.label || '',
    mode: def.mode === 'dark' ? 'dark' : 'light',
    tokens: def.tokens,
    shadowColor: def.shadowColor || (def.mode === 'dark' ? '0 0 0' : '15 23 42'),
  }
}

/** 主题注册中心 */
export function createRegistry(): Registry {
  var themes: Dict<Theme> = {}
  var accents: Dict<AccentDef> = {}
  var overrides: Dict<any> = {}
  var current = ''
  var currentAccent = ''

  // 用 api 而非 this：解构出单个方法后依然能链式调用
  var api: Registry = {
    theme: function (name: string, def: ThemeDef) {
      if (!name) return api
      themes[name] = def && def.tokens ? (createTheme(def) as Theme) : (def as unknown as Theme)
      if (!current) current = name
      return api
    },
    accent: function (name: string, def: AccentDef) {
      if (!name || !def) return api
      accents[name] = def
      return api
    },
    override: function (key: string, value: any) {
      if (!key) return api
      if (isPlainObject(value)) {
        overrides[key] = assign(overrides[key] || {}, value)
      } else {
        overrides[key] = value
      }
      return api
    },
    resetOverrides: function () {
      overrides = {}
      return api
    },
    use: function (name: string) {
      if (themes[name]) current = name
      return api
    },
    useAccent: function (name: string) {
      currentAccent = name || ''
      return api
    },
    listThemes: function () {
      return Object.keys(themes)
    },
    listAccents: function () {
      return Object.keys(accents)
    },
    getTheme: function (name?: string) {
      return themes[name || current] || themes[current] || null
    },
    getAccent: function (name?: string) {
      return accents[name === undefined ? currentAccent : name] || null
    },
    /** 当前生效的扁平令牌表 */
    resolve: function () {
      var theme = themes[current]
      if (!theme) return {}
      var flat = flattenTokens(theme.tokens)

      var accent = accents[currentAccent]
      if (accent && accent.tokens) {
        assign(flat, flattenTokens(accent.tokens))
      }
      assign(flat, flattenTokens(overrides))
      return flat
    },
    /** 当前主题名 / 强调色名 / 明暗模式 */
    state: function () {
      var theme = themes[current]
      return {
        theme: current,
        accent: currentAccent,
        mode: theme ? theme.mode : 'light',
        label: theme ? theme.label : '',
      }
    },
  }

  return api
}

/**
 * 一次性解析出扁平令牌（不依赖注册中心，便于纯函数使用）
 */
export function resolveTokens(
  theme: Theme | null | undefined,
  accent?: AccentDef | null,
  overrides?: TokenTree | FlatTokens | null
): FlatTokens {
  if (!theme) return {}
  var flat = flattenTokens(theme.tokens)
  if (accent && accent.tokens) assign(flat, flattenTokens(accent.tokens))
  if (overrides) assign(flat, flattenTokens(overrides))
  return flat
}

export { defineTokens }
