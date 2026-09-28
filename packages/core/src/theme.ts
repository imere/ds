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
  /** seed 用 rem 写、而项目根字号不是 16 时给这个，透传给 deriveTokens */
  rootFontSize?: number
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
 * 创建一个主题定义：把「种子 + 算法」或「手写表」归化成一份完整令牌。
 *
 * 归一化是为了让主题在库内部只有一种形状 —— 注册中心存的、resolve 读的、
 * 覆盖链盖的都是成品 Theme，谁都不用再判断「这份是种子还是表」。
 * 少了这一步，派生就会在每次读取时重跑一遍，覆盖也会被下一轮派生冲掉。
 *
 * @param {ThemeDef} def 主题定义；tokens 与 seed 至少要给一个，否则抛 TypeError
 * @returns {Theme} 归一化后的主题，可直接交给 resolveTokens 或注册中心
 * @example
 *   createTheme({ seed: { color: { brand: '#4f46e5' } }, algorithm: darkAlgorithm })
 */
export function createTheme(def: ThemeDef): Theme {
  if (!def || (!isPlainObject(def.tokens) && !isPlainObject(def.seed))) {
    throw new TypeError('[ds/core] createTheme 需要 tokens 或 seed')
  }
  const mode: ThemeMode = def.mode === 'dark' ? 'dark' : 'light'
  const derived =
    def.seed && isPlainObject(def.seed)
      ? deriveTokens(def.seed, def.algorithm, mode, { rootFontSize: def.rootFontSize })
      : null

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

/**
 * 主题注册中心：主题 / 强调色的注册、切换、覆盖与解析都收在这里。
 *
 * 做成工厂而不是类，是为了让状态（themes / accents / overrides）关在闭包里 ——
 * 外面拿不到可写的引用，改状态只能走 api 上这几个方法，
 * 「主题 -> 强调色 -> 覆盖」这条顺序才没人能绕过。
 *
 * @returns {Registry} 注册中心；每个方法都返回它自身，所以能一路链式写下去
 * @example
 *   const r = createRegistry()
 *   r.theme('light', lightDef).accent('blue', blueDef).use('light').useAccent('blue')
 *   const flat = r.resolve()
 */
export function createRegistry(): Registry {
  const themes: Dict<Theme> = {}
  const accents: Dict<AccentDef> = {}
  let overrides: Dict<unknown> = {}
  let current = ''
  let currentAccent = ''

  // 用 api 而非 this：解构出单个方法后依然能链式调用
  const api: Registry = {
    /**
     * 注册一个主题。存之前先归一化，库内部只留成品 Theme 这一种形状。
     *
     * 判断「要不要归一化」时必须把 seed 也算进去：只给 seed 的主题是合法的，
     * 漏掉就会被当成「已经归一化过」直接塞进表，派生永远不会发生。
     * 传进来的确实已经是 Theme（既没 tokens 也没 seed）时原样存，避免重复跑派生。
     *
     * @param {string} name 主题名；空名字视为无效，直接返回
     * @param {ThemeDef} def 主题定义
     * @returns {Registry} api 自身
     */
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
    /**
     * 注册一个强调色。强调色只换 brand 一族，跟主题的明暗是两根正交的轴。
     *
     * 这里不做归一化：强调色本来就是一小撮手写色值，
     * 走派生反而会让「换个品牌色」牵动一堆算出来的中间色。
     *
     * @param {string} name 强调色名
     * @param {AccentDef} def 强调色定义
     * @returns {Registry} api 自身
     */
    accent(name: string, def: AccentDef) {
      if (!name || !def) return api
      accents[name] = def
      return api
    },
    /**
     * 覆盖一个令牌。覆盖是最后一层，压在主题与强调色之上。
     *
     * 值也是对象时做一层浅合并而不是整块替换：叠加两处各改一半的
     * `color: { brand }` 与 `color: { bg }`，不该互相把对方冲掉。
     *
     * @param {TokenKey} key 扁平令牌键
     * @param {unknown} value 新值；对象则与已有覆盖合并，其余直接替换
     * @returns {Registry} api 自身
     */
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
     *
     * @param {Dict<unknown>|null|undefined} map 扁平键到值的映射；空值视为什么都不做
     * @returns {Registry} api 自身
     */
    overrideMap(map: Dict<unknown> | null | undefined) {
      each(map, (value, key) => {
        api.override(key as string, value)
      })
      return api
    },
    /**
     * 清空覆盖层，让主题与强调色重新说了算。
     *
     * 只清覆盖、不清已注册的主题：覆盖是「临时改几处」的手段，
     * 主题是资产，混在一起清会让使用者丢掉注册进来的东西。
     *
     * @returns {Registry} api 自身
     */
    resetOverrides() {
      overrides = {}
      return api
    },
    /**
     * 切换当前主题。只认已注册的名字，写错了静默忽略。
     *
     * 静默而不是抛错：切主题常跟着用户偏好走（localStorage / 媒体查询），
     * 一个过期名字不该让整页崩在这里。
     *
     * @param {string} name 已注册的主题名
     * @returns {Registry} api 自身
     */
    use(name: string) {
      if (themes[name]) current = name
      return api
    },
    /**
     * 切换当前强调色。传空字符串即「不用强调色」，回到主题自己的 brand。
     *
     * @param {string} name 强调色名，可以还没注册（先切后注册也允许）
     * @returns {Registry} api 自身
     */
    useAccent(name: string) {
      currentAccent = name || ''
      return api
    },
    /**
     * 列出全部主题名，供主题切换器渲染选项。
     *
     * 返回名字而不是 Theme 对象：调用方拿名字就能 use()，
     * 直接给对象反而容易被拿去改里面的 tokens。
     *
     * @returns {Array<string>} 主题名列表，按注册顺序
     */
    listThemes() {
      return Object.keys(themes)
    },
    /**
     * 列出全部强调色名，理由同 listThemes。
     *
     * @returns {Array<string>} 强调色名列表，按注册顺序
     */
    listAccents() {
      return Object.keys(accents)
    },
    /**
     * 取一个已注册的主题。不给名字就取当前那个。
     *
     * 找不到时退回当前主题再退回 null，而不是抛错：
     * 主题名多半来自外部存储，读不到的情况本来就该由调用方兜底。
     *
     * @param {string} [name] 主题名；省略表示当前主题
     * @returns {Theme|null} 主题；不存在就是 null
     */
    getTheme(name?: string) {
      return themes[name || current] || themes[current] || null
    },
    /**
     * 取一个已注册的强调色。不给名字就取当前那个。
     *
     * 用 `name === undefined` 而不是 `!name` 判「没给」：
     * 空字符串是「刻意不用强调色」的合法取值，不该被当成省略。
     *
     * @param {string} [name] 强调色名；省略表示当前强调色
     * @returns {AccentDef|null} 强调色定义；不存在就是 null
     */
    getAccent(name?: string) {
      return accents[name === undefined ? currentAccent : name] || null
    },
    /**
     * 当前生效的扁平令牌表：主题 -> 强调色 -> 覆盖，后者盖前者。
     *
     * 每次调用都重新算一遍，不做缓存 —— 缓存在「覆盖改了但缓存没失效」时
     * 会给出错误的令牌，而这种 bug 从结果上完全看不出来。
     *
     * @returns {FlatTokens} 扁平令牌表；还没有主题时是空对象
     */
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
    /**
     * 当前的一份快照：主题名 / 强调色名 / 明暗模式 / 标签。
     *
     * 单独给这个方法，是因为 UI 常常只要这几个元信息（比如按 mode 切图标），
     * 为此去 resolve() 一整张令牌表太重了。
     *
     * @returns {RegistryState} 当前状态；没有主题时 mode 记 'light'、label 记空串
     */
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
 * 一次性解析出扁平令牌：主题 -> 强调色 -> 覆盖，后者盖前者。
 *
 * 与注册中心解耦，是为了让「只有一份主题、不想建注册中心」的场景能直接算，
 * 也方便单测：给同样的入参必然得到同样的表，没有隐藏状态。
 *
 * @param {Theme|null|undefined} theme 主题；为空直接返回空表
 * @param {AccentDef|null|undefined} [accent] 强调色，可省略
 * @param {TokenTree|FlatTokens|null|undefined} [overrides] 覆盖层，可省略
 * @returns {FlatTokens} 合并后的扁平令牌表
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
