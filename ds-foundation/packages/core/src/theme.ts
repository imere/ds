/**
 * 主题：注册、解析、覆盖
 * -------------------------------------------------------------
 * 主题与强调色是两根正交的轴：
 *   主题   —— 换明暗底（bg / fg / border / shadow）
 *   强调色 —— 换品牌色（brand 一族）
 * 解析顺序固定为 主题 -> 强调色 -> 手动覆盖，后者覆盖前者。
 */

import { flattenTokens, defineTokens, mergeTree } from './token'
import type { FlatTokens, TokenTree, TokenKey } from './token'
import { deriveTokens } from './derive'
import type { Algorithm } from './derive'
import { isPlainObject, assign, each } from './util'
import type { Dict } from './util'

export type ThemeMode = 'light' | 'dark'

/**
 * 创建一个主题时的入参
 *
 * 两条路：
 *   手写 —— 给 tokens，值写多少就是多少（内置 preset 走这条路）
 *   派生 —— 给 seed + algorithm，由算法算出整套 map（新主题推荐）
 * 两者可以一起给：seed 先跑出 map，再让 tokens 按扁平键覆盖其中几项。
 */
export interface ThemeDef {
  label?: string
  mode?: ThemeMode | string
  /** 手写令牌表 */
  tokens?: TokenTree
  /** 种子令牌，稀疏即可：填什么就改什么，其余走 DEFAULT_SEED */
  seed?: TokenTree
  /** 派生算法，单个或数组（顺序执行，前者输出是后者输入） */
  algorithm?: Algorithm | Algorithm[]
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
  /** 覆盖单个令牌。key 写了 TokenKey，拼错能在编译期发现 */
  override(key: TokenKey, value: unknown): Registry
  /** 批量覆盖：一次改多个令牌，只算一次 resolve */
  overrideMap(map: Dict<unknown> | null | undefined): Registry
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
 * 创建一个主题定义：把「种子 + 算法」或「手写表」归化成一份完整令牌
 */
export function createTheme(def: ThemeDef): Theme {
  if (!def || (!isPlainObject(def.tokens) && !isPlainObject(def.seed))) {
    throw new TypeError('[ds/core] createTheme 需要 tokens 或 seed')
  }
  const mode: ThemeMode = def.mode === 'dark' ? 'dark' : 'light'
  const derived = isPlainObject(def.seed) ? deriveTokens(def.seed, def.algorithm, mode) : null

  // 两条路都给了：先派生，再让手写的盖上去。
  // 顺序不能反 —— 对齐 antd 的约定，手写的 theme.token 能盖掉 algorithm 算出的 map token。
  // 树对树深合并（mergeTree），不能绕扁平键：unflatten 会让 'color-brand' 与
  // 'color-brand-hover' 抢同一个 color.brand，谁后写谁把对方冲掉。
  const tokens: TokenTree =
    derived && isPlainObject(def.tokens)
      ? mergeTree(derived, def.tokens)
      : ((derived || def.tokens) as TokenTree)

  return {
    label: def.label || '',
    mode,
    tokens,
    shadowColor: def.shadowColor || (mode === 'dark' ? '0 0 0' : '15 23 42'),
  }
}

/** 主题注册中心 */
export function createRegistry(): Registry {
  const themes: Dict<Theme> = {}
  const accents: Dict<AccentDef> = {}
  let overrides: Dict<unknown> = {}
  let current = ''
  let currentAccent = ''

  // 用 api 而非 this：解构出单个方法后依然能链式调用
  const api: Registry = {
    theme(name: string, def: ThemeDef) {
      if (!name) return api
      // 判断必须带上 seed：只给 seed 没给 tokens 的主题也是合法的，
      // 漏掉的话会被当成「已经归一化过」直接塞进去，派生压根不会发生
      const need = def && (isPlainObject(def.tokens) || isPlainObject(def.seed))
      if (need) themes[name] = createTheme(def)
      else themes[name] = def as unknown as Theme
      if (!current) current = name
      return api
    },
    accent(name: string, def: AccentDef) {
      if (!name || !def) return api
      accents[name] = def
      return api
    },
    override(key: TokenKey, value: unknown) {
      if (!key) return api
      if (isPlainObject(value)) {
        const base: Dict = isPlainObject(overrides[key]) ? (overrides[key] as Dict) : {}
        overrides[key] = assign(base, value as Dict)
      } else {
        overrides[key] = value
      }
      return api
    },
    /**
     * 批量覆盖。跟连着调 override() 的结果一样，但只走一轮；
     * 上层（比如拖动滑块改圆角）一次要改好几个令牌时用它。
     */
    overrideMap(map: Dict<unknown> | null | undefined) {
      each(map, (value, key) => {
        api.override(key as string, value)
      })
      return api
    },
    resetOverrides() {
      overrides = {}
      return api
    },
    use(name: string) {
      if (themes[name]) current = name
      return api
    },
    useAccent(name: string) {
      currentAccent = name || ''
      return api
    },
    listThemes() {
      return Object.keys(themes)
    },
    listAccents() {
      return Object.keys(accents)
    },
    getTheme(name?: string) {
      return themes[name || current] || themes[current] || null
    },
    getAccent(name?: string) {
      return accents[name === undefined ? currentAccent : name] || null
    },
    /** 当前生效的扁平令牌表 */
    resolve() {
      const theme = themes[current]
      if (!theme) return {}
      const flat = flattenTokens(theme.tokens)

      const accent = accents[currentAccent]
      if (accent && accent.tokens) {
        assign(flat, flattenTokens(accent.tokens))
      }
      assign(flat, flattenTokens(overrides))
      return flat
    },
    /** 当前主题名 / 强调色名 / 明暗模式 */
    state() {
      const theme = themes[current]
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
  const flat = flattenTokens(theme.tokens)
  if (accent && accent.tokens) assign(flat, flattenTokens(accent.tokens))
  if (overrides) assign(flat, flattenTokens(overrides))
  return flat
}

export { defineTokens }
