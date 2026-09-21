/**
 * 双通道主题引擎
 * -------------------------------------------------------------
 * 通道一（现代）  cssVars
 *   写 :root { --ds-color-brand: ... }，semantic class 用 var() 引用。
 *   换主题 = 改几十个变量值，class 规则一份都不用动。
 *
 * 通道二（IE10）  static
 *   IE10 不认自定义属性，var() 所在的整条声明会被丢弃。
 *   所以把令牌预先求值，semantic class 直接写死真实色值。
 *   换主题 = 替换整段 <style> 内容，规则数随主题数线性增长 —— 这正是 class 要拆两层的原因。
 *
 * 两条通道对业务暴露的 API 完全一致，业务不需要知道自己在哪条通道上。
 */

import {
  createRegistry,
  buildClassSheet,
  resolveVars,
  toCssVars,
  each,
  assign,
  prefixOf,
  lightTheme,
  darkTheme,
  accents as presetAccents,
} from '@ds/core'
import type {
  Registry,
  Prefix,
  Dict,
  FlatTokens,
  TokenKey,
  Theme,
  ThemeDef,
  AccentDef,
  ScaleTable,
  ScaleRuleDef,
  UtilityDef,
  SemanticDef,
  BuildClassSheetOptions,
} from '@ds/core'
import { supportsCssVars, prefersDark, supportsMatchMedia } from './env'
import { createEmitter } from './emitter'
import type { Emitter, Handler } from './emitter'
import { writeStyle, removeStyle, setCssVar, removeCssVar } from './style'

/** createThemeManager 的入参 */
export interface ThemeManagerOptions {
  doc?: Document | null
  target?: HTMLElement | null
  /** 已建好的注册中心（不传则用内置的） */
  registry?: Registry
  /** 统一前缀：'acme' / '--acme-' / 'acme-' / 归一化对象 */
  prefix?: string | Prefix | Dict<string> | null
  /** 变量写在哪（默认 <html>；传容器可做局部深色区） */
  attr?: string
  modeAttr?: string
  accentAttr?: string
  idTokens?: string
  idPrimitive?: string
  idSemantic?: string
  /** 是否注入两层 class（默认 true） */
  withClasses?: boolean
  /** 跟随系统深浅（prefers-color-scheme）。一旦显式切换过主题就不再自动跟随 */
  followSystem?: boolean
  /** 默认主题名 */
  theme?: string
  /**
   * 默认强调色名。传空串表示「跟随主题」（品牌色用主题自带那一组）。
   * 注意：不给的话会被兜成 accents 表里的 indigo（见 defaultAccent）。
   */
  accent?: string
  /**
   * 关掉上面那个兜底。自建了 accents 表又想让品牌色跟随主题时必须显式传 false，
   * 否则 accent 的空串会被静默换成 indigo，而强调色在 resolve 顺序里盖住
   * theme.tokens —— 每套主题的 brand 一族都会被按成同一个靛蓝。
   */
  defaultAccent?: boolean
  /** 'auto' 时按能力检测二选一 */
  channel?: 'auto' | 'vars' | 'static'
  preset?: boolean
  themes?: Dict<Theme | ThemeDef>
  accents?: Dict<AccentDef>
  scales?: ScaleTable
  rules?: ScaleRuleDef[]
  utilities?: UtilityDef[]
  map?: Dict<SemanticDef>
  classPrefix?: string
  varPrefix?: string
  important?: boolean
}

/** 导出 CSS 文本的结果（供 SSR 内联） */
export interface CssTextResult {
  tokens: string
  primitive: string
  semantic: string
  channel: string
  /** 三者拼接后的完整 CSS */
  all: string
}

/** createThemeManager 返回给业务使用的句柄 */
export interface ThemeManager {
  registry: Registry
  channel: string
  /** 归一化后的前缀对象：{ ns, var, cls, attr, modeAttr, accentAttr, ids, keys } */
  prefix: Prefix
  /** 令牌键 -> CSS 变量名：'color-brand' -> '--acme-color-brand' */
  varName(key: string): string
  /** class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand' */
  className(short: string): string
  /** 挂载：写初始样式。可重复调用，等价于 apply() */
  init(): ThemeManager
  /** 重新应用当前主题（改了 override 之后调用） */
  apply(): ThemeManager
  use(name: string): ThemeManager
  useAccent(name: string): ThemeManager
  /**
   * 运行时开关「跟随系统」。传 false 关掉，不传或传 true 打开。
   * 打开时会清掉「用户手动选过」的标记并立刻按系统偏好切一次 ——
   * 否则之前切过主题的人点了开关却没反应，会以为是坏了。
   */
  followSystem(on?: boolean): ThemeManager
  /** 在明暗之间切换 */
  toggle(): ThemeManager
  override(key: TokenKey, value: unknown): ThemeManager
  /** 批量覆盖令牌，只重绘一次 */
  overrideMap(map: Dict<unknown> | null | undefined): ThemeManager
  resetOverrides(): ThemeManager
  /** 取令牌值。IE10 通道下返回已求值的实值，现代通道返回 var() 引用 */
  get(key: TokenKey, asRef?: boolean): string | undefined
  /** 生成行内样式对象，例如 :style="ds.style({ color: 'color-fg-muted' })" */
  style(map: Dict<TokenKey> | null | undefined): Dict<string>
  tokens(): FlatTokens
  state(): Dict<unknown>
  subscribe(fn: Handler): () => void
  /** 导出 CSS 文本，供 SSR 内联到 <head>（避免首屏闪白） */
  cssText(opt?: { theme?: string; accent?: string; channel?: string }): CssTextResult
  destroy(): void
}

export function pickChannel(option?: string): 'vars' | 'static' {
  if (option === 'vars' || option === 'static') return option
  return supportsCssVars() ? 'vars' : 'static'
}

/**
 * @param {object} [options]
 * @param {Document} [options.doc]
 * @param {Element}  [options.target]      变量写在哪（默认 <html>；传容器可做局部深色区）
 * @param {object}   [options.themes]      { light: theme, dark: theme }
 * @param {object}   [options.accents]
 * @param {string}   [options.theme]       默认主题名
 * @param {string}   [options.accent]
 * @param {string|object} [options.prefix] 统一前缀：'acme' / '--acme-' / 'acme-' / 归一化对象。
 *                                          一次设置，CSS 变量、class、DOM 属性、style id、存储 key 全跟着换
 * @param {'auto'|'vars'|'static'} [options.channel]
 * @param {boolean}  [options.withClasses] 是否注入两层 class（默认 true）
 * @param {boolean}  [options.followSystem] 跟随系统深浅；显式切换过主题后自动停止跟随
 *
 * 持久化不在核心里。要记住用户的主题选择请用 @ds/dom 的 storage 辅助：
 *   import { readTheme, bindTheme } from '@ds/dom'
 *   var saved = readTheme()
 *   var ds = createThemeManager({ theme: saved.theme || 'light' })
 *   bindTheme(ds)
 * 不接就完全不碰 localStorage / cookie，SSR 也没有任何副作用。
 */
export function createThemeManager(options?: ThemeManagerOptions): ThemeManager {
  const o = options || {}
  const doc = o.doc || (typeof document !== 'undefined' ? document : null)
  const registry = o.registry || createRegistry()

  // 前缀只归一化一次，后面所有地方都从 p 上取，杜绝 'ds' / '--ds-' / 'ds-' 混用
  const p = prefixOf(o.prefix)
  const prefix = p.var

  const target = o.target || (doc ? doc.documentElement : null)
  const attr = o.attr || p.attr
  const modeAttr = o.modeAttr || p.modeAttr
  const accentAttr = o.accentAttr || p.accentAttr
  const withClasses = o.withClasses !== false
  const channel = pickChannel(o.channel)

  const ids = {
    tokens: o.idTokens || p.ids.tokens,
    primitive: o.idPrimitive || p.ids.primitive,
    semantic: o.idSemantic || p.ids.semantic,
  }

  const emitter: Emitter = createEmitter()

  // 用户是否自己定过主题。用来决定 followSystem 还能不能改主题：
  // 显式传了 theme、或调用过 use() 就算「定过了」，之后不再自动跟随系统。
  // 之前这事儿靠读持久化状态判断，等于把业务逻辑绑在存储上——核心不碰存储后就改用内存标记。
  let pinned = !!o.theme
  // followSystem 现在是可以在运行时开关的（见 api.followSystem），
  // 所以状态不能只在 init 里读一次，得记成变量。
  let following = !!o.followSystem
  let detachMedia: (() => void) | null = null

  // 写 <style> 时统一带上前缀，标记属性才跟着变成 data-acme-style
  const styleOpts = { prefix: p }

  const classOpts = {
    scales: o.scales,
    rules: o.rules,
    utilities: o.utilities,
    map: o.map,
    prefix: p,
    classPrefix: o.classPrefix,
    varPrefix: o.varPrefix,
    important: o.important,
    indent: false,
  }

  let started = false
  let primitiveWritten = false
  let semanticWritten = false
  let lastKeys: string[] = []
  let semanticIds: string[] = []

  let themesIn: Dict<Theme | ThemeDef> = o.themes || {}
  let accentsIn: Dict<AccentDef> = o.accents || {}

  // 开箱即用：业务没给主题就上内置的明暗两套 + 内置强调色。
  // 想要完全自定义就传 preset: false，或者传自己的 themes/accents 覆盖同名项。
  if (o.preset !== false && !o.themes) {
    themesIn = { light: lightTheme, dark: darkTheme }
  }
  if (o.preset !== false && !o.accents) {
    accentsIn = presetAccents
  }

  each(themesIn, (def, name) => {
    registry.theme(name as string, def)
  })
  each(accentsIn, (def, name) => {
    registry.accent(name as string, def)
  })

  // 初始值只来自调用方显式传入，或 followSystem 的偏好推断。
  // 想恢复上次的主题就用 readTheme()（见 storage.ts）读出来再传进来 —— 核心不去碰存储。
  const initial = o.theme || (o.followSystem && prefersDark() ? 'dark' : '')
  if (initial) registry.use(initial)
  let initialAccent = o.accent
  // 不给默认强调色的话 brand 一族全是 undefined，界面上品牌色会直接消失
  if (!initialAccent && o.defaultAccent !== false && accentsIn.indigo) initialAccent = 'indigo'
  if (initialAccent) registry.useAccent(initialAccent)

  function currentFlat(): FlatTokens {
    return registry.resolve()
  }

  function currentResolved(): Dict<string> {
    return resolveVars(currentFlat(), { prefix: p })
  }

  function writeTokens(flat: FlatTokens): void {
    if (channel !== 'vars') return

    if (target && doc && target === doc.documentElement) {
      writeStyle(doc, ids.tokens, toCssVars(flat, { selector: ':root', prefix: p }), styleOpts)
      return
    }
    // 局部作用域：没有 :root 可用，直接往元素上写内联变量
    if (!target) return
    const next: string[] = []
    each(flat, (value, key) => {
      setCssVar(target, prefix + key, value)
      next.push(key as string)
    })
    // 清掉这次不再存在的键
    each(lastKeys, (key) => {
      if (next.indexOf(key) === -1) removeCssVar(target, prefix + key)
    })
    lastKeys = next
  }

  function writeClasses(flat: FlatTokens): void {
    if (!withClasses || !doc) return

    const sheetOpts: BuildClassSheetOptions = assign({}, classOpts, { tokens: flat })
    if (channel === 'static') sheetOpts.resolve = resolveVars(flat, { prefix: p })
    const sheet = buildClassSheet(sheetOpts)

    if (!primitiveWritten) {
      writeStyle(doc, ids.primitive, sheet.primitive, styleOpts)
      primitiveWritten = true
    }

    if (channel === 'vars') {
      // 用 var() 引用，规则只写一次，之后换主题只改变量
      if (!semanticWritten) {
        writeStyle(doc, ids.semantic, sheet.semantic, styleOpts)
        semanticWritten = true
      }
    } else {
      // IE10：每次换主题都得整段重写
      removeStyle(doc, semanticIds)
      semanticIds = writeStyle(doc, ids.semantic, sheet.semantic, styleOpts)
    }
  }

  function paint(): void {
    const flat = currentFlat()
    /**
     * 用 api.state() 而不是 registry.state()：前者才带 channel 与 followSystem。
     * 订阅者（Vue 绑定层的响应式状态、持久化辅助）要读这两个字段，
     * 用 registry 那份的话 followSystem 永远是 false —— 开关的显示会一直不对。
     */
    const state = api.state()

    if (target) {
      // state() 对外声明成 Dict<unknown>（它还要塞 channel / followSystem），
      // 写属性前统一 String() 一遍
      target.setAttribute(attr, String(state.theme))
      target.setAttribute(modeAttr, String(state.mode))
      if (state.accent) target.setAttribute(accentAttr, String(state.accent))
      else target.removeAttribute(accentAttr)
    }

    writeTokens(flat)
    writeClasses(flat)

    emitter.emit(assign({ tokens: flat }, state))
  }

  /** 系统偏好对应的主题名。没有同名主题就返回空，调用方决定是否切换 */
  function systemTheme(): string {
    return prefersDark() ? 'dark' : 'light'
  }

  /** 按系统偏好切一次。用户手动选过主题（pinned）就不动 */
  function applySystemPreference(): void {
    if (!following || pinned) return
    const want = systemTheme()
    if (!registry.getTheme(want)) return
    if (registry.state().theme !== want) registry.use(want)
  }

  /**
   * 挂 prefers-color-scheme 监听。幂等 —— 重复调用不会挂第二份。
   * IE10 没有 matchMedia，supportsMatchMedia() 会返回 false，直接跳过。
   */
  function watchSystem(): void {
    if (!following || detachMedia || !supportsMatchMedia()) return
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = function (e: MediaQueryListEvent) {
        if (!following || pinned) return
        registry.use(e.matches ? 'dark' : 'light')
        if (started) paint()
      }
      if (typeof mq.addListener === 'function') {
        mq.addListener(handler)
        detachMedia = function () {
          mq.removeListener(handler)
        }
      } else if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', handler)
        detachMedia = function () {
          mq.removeEventListener('change', handler)
        }
      }
    } catch {
      /* 隐私模式 / 老内核下调 matchMedia 可能直接抛，忽略即可 */
    }
  }

  const api: ThemeManager = {
    registry,
    channel,
    /** 归一化后的前缀对象：{ ns, var, cls, attr, modeAttr, accentAttr, ids, keys } */
    prefix: p,

    /** 令牌键 -> CSS 变量名：'color-brand' -> '--acme-color-brand' */
    varName(key) {
      return p.var + key
    },

    /** class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand' */
    className(short) {
      return p.cls + short
    },

    /** 挂载：写初始样式。可重复调用，等价于 apply() */
    init() {
      started = true
      applySystemPreference()
      paint()
      watchSystem()
      return api
    },

    /** 重新应用当前主题（改了 override 之后调用） */
    apply() {
      paint()
      return api
    },

    use(name) {
      registry.use(name)
      pinned = true
      if (started) paint()
      return api
    },

    useAccent(name) {
      registry.useAccent(name)
      if (started) paint()
      return api
    },

    /** 运行时开关「跟随系统明暗」 */
    followSystem(on) {
      const enable = on === undefined ? true : !!on
      following = enable
      if (enable) {
        // 开的时候要清掉手动标记，不然之前切过主题的人点了开关没反应
        pinned = false
        applySystemPreference()
        watchSystem()
      } else if (detachMedia) {
        detachMedia()
        detachMedia = null
      }
      if (started) paint()
      return api
    },

    /** 在明暗之间切换 */
    toggle() {
      const state = registry.state()
      const want = state.mode === 'dark' ? 'light' : 'dark'
      const names = registry.listThemes()
      let hit = ''
      for (let i = 0; i < names.length; i++) {
        const t = registry.getTheme(names[i])
        if (t && t.mode === want) {
          hit = names[i]
          break
        }
      }
      if (hit) api.use(hit)
      return api
    },

    override(key, value) {
      registry.override(key, value)
      if (started) paint()
      return api
    },

    /** 批量覆盖，只重绘一次 */
    overrideMap(map) {
      registry.overrideMap(map)
      if (started) paint()
      return api
    },

    resetOverrides() {
      registry.resetOverrides()
      if (started) paint()
      return api
    },

    /** 取令牌值。IE10 通道下返回已求值的实值，现代通道返回 var() 引用 */
    get(key, asRef) {
      if (asRef && channel === 'vars') return `var(${prefix}${key})`
      return currentResolved()[key]
    },

    /** 生成行内样式对象，例如 :style="ds.style({ color: 'color-fg-muted' })" */
    style(map) {
      const out: Dict<string> = {}
      each(map || {}, (tokenKey, cssProp) => {
        const v = api.get(tokenKey, channel === 'vars')
        if (v !== undefined && v !== null) out[cssProp] = v
      })
      return out
    },

    tokens() {
      return currentFlat()
    },

    /** 当前主题 / 强调色 / 明暗模式，外加是否在跟随系统 */
    state() {
      return assign({ channel, followSystem: following && !pinned }, registry.state())
    },

    subscribe(fn) {
      return emitter.on(fn)
    },

    /**
     * 导出 CSS 文本，供 SSR 内联到 <head>（避免首屏闪白）
     * @param {{theme?:string, accent?:string, channel?:string}} [opt]
     */
    cssText(opt) {
      const q = opt || {}
      const savedT = registry.state().theme
      const savedA = registry.state().accent
      if (q.theme) registry.use(q.theme)
      if (q.accent !== undefined) registry.useAccent(q.accent)

      const flat = currentFlat()
      const ch = q.channel || channel
      const sheetOpts: BuildClassSheetOptions = assign({}, classOpts, { tokens: flat })
      if (ch === 'static') sheetOpts.resolve = resolveVars(flat, { prefix: p })
      const sheet = buildClassSheet(sheetOpts)

      const out: CssTextResult = {
        tokens: ch === 'vars' ? toCssVars(flat, { selector: ':root', prefix: p }) : '',
        primitive: sheet.primitive,
        semantic: sheet.semantic,
        channel: ch,
        all: '',
      }
      out.all = out.tokens + out.primitive + out.semantic

      registry.use(savedT)
      registry.useAccent(savedA)
      return out
    },

    destroy() {
      if (doc) {
        removeStyle(doc, [ids.tokens, ids.primitive, ids.semantic])
        removeStyle(doc, semanticIds)
      }
      if (target) {
        each(lastKeys, (key) => {
          removeCssVar(target, prefix + key)
        })
      }
      lastKeys = []
      primitiveWritten = false
      semanticWritten = false
      started = false
      if (detachMedia) {
        detachMedia()
        detachMedia = null
      }
      emitter.clear()
    },
  }

  return api
}
