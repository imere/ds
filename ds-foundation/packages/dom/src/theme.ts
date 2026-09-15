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
import { createStore } from './store'
import type { Store } from './store'
import { writeStyle, removeStyle, setCssVar, removeCssVar } from './style'

/** createThemeManager 的入参 */
export interface ThemeManagerOptions {
  doc?: Document | null
  target?: HTMLElement | null
  /** 已建好的注册中心（不传则用内置的） */
  registry?: Registry
  /** 统一前缀：'acme' / '--acme-' / 'acme-' / 归一化对象 */
  prefix?: string | Prefix | Dict<any> | null
  /** 变量写在哪（默认 <html>；传容器可做局部深色区） */
  attr?: string
  modeAttr?: string
  accentAttr?: string
  idTokens?: string
  idPrimitive?: string
  idSemantic?: string
  storageKey?: string
  accentKey?: string
  /** 是否注入两层 class（默认 true） */
  withClasses?: boolean
  persist?: boolean
  followSystem?: boolean
  /** 默认主题名 */
  theme?: string
  accent?: string
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
  /** 在明暗之间切换 */
  toggle(): ThemeManager
  override(key: string, value: any): ThemeManager
  resetOverrides(): ThemeManager
  /** 取令牌值。IE10 通道下返回已求值的实值，现代通道返回 var() 引用 */
  get(key: string, asRef?: boolean): string | undefined
  /** 生成行内样式对象，例如 :style="ds.style({ color: 'color-fg-muted' })" */
  style(map: Dict<string> | null | undefined): Dict<string>
  tokens(): FlatTokens
  state(): Dict<any>
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
 * @param {boolean}  [options.persist]
 * @param {boolean}  [options.followSystem]
 */
export function createThemeManager(options?: ThemeManagerOptions): ThemeManager {
  var o = options || {}
  var doc = o.doc || (typeof document !== 'undefined' ? document : null)
  var registry = o.registry || createRegistry()

  // 前缀只归一化一次，后面所有地方都从 p 上取，杜绝 'ds' / '--ds-' / 'ds-' 混用
  var p = prefixOf(o.prefix)
  var prefix = p.var

  var target = o.target || (doc ? doc.documentElement : null)
  var attr = o.attr || p.attr
  var modeAttr = o.modeAttr || p.modeAttr
  var accentAttr = o.accentAttr || p.accentAttr
  var withClasses = o.withClasses !== false
  var channel = pickChannel(o.channel)

  var ids = {
    tokens: o.idTokens || p.ids.tokens,
    primitive: o.idPrimitive || p.ids.primitive,
    semantic: o.idSemantic || p.ids.semantic,
  }

  var store: Store = createStore(o.storageKey || p.keys.theme, { persist: o.persist })
  var accentStore: Store = createStore(o.accentKey || p.keys.accent, { persist: o.persist })
  var emitter: Emitter = createEmitter()

  // 写 <style> 时统一带上前缀，标记属性才跟着变成 data-acme-style
  var styleOpts = { prefix: p }

  var classOpts = {
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

  var started = false
  var primitiveWritten = false
  var semanticWritten = false
  var lastKeys: string[] = []
  var semanticIds: string[] = []

  var themesIn: Dict<Theme | ThemeDef> = o.themes || {}
  var accentsIn: Dict<AccentDef> = o.accents || {}

  // 开箱即用：业务没给主题就上内置的明暗两套 + 内置强调色。
  // 想要完全自定义就传 preset: false，或者传自己的 themes/accents 覆盖同名项。
  if (o.preset !== false && !o.themes) {
    themesIn = { light: lightTheme, dark: darkTheme }
  }
  if (o.preset !== false && !o.accents) {
    accentsIn = presetAccents
  }

  each(themesIn, function (def, name) {
    registry.theme(name as string, def)
  })
  each(accentsIn, function (def, name) {
    registry.accent(name as string, def)
  })

  var stored = store.get()
  var initial = o.theme || stored || (o.followSystem && prefersDark() ? 'dark' : '')
  if (initial) registry.use(initial)
  var storedAccent = accentStore.get()
  var initialAccent = o.accent || storedAccent
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
    var next: string[] = []
    each(flat, function (value, key) {
      setCssVar(target, prefix + key, value)
      next.push(key as string)
    })
    // 清掉这次不再存在的键
    each(lastKeys, function (key) {
      if (next.indexOf(key) === -1) removeCssVar(target, prefix + key)
    })
    lastKeys = next
  }

  function writeClasses(flat: FlatTokens): void {
    if (!withClasses || !doc) return

    var sheetOpts: BuildClassSheetOptions = assign({}, classOpts, { tokens: flat })
    if (channel === 'static') sheetOpts.resolve = resolveVars(flat, { prefix: p })
    var sheet = buildClassSheet(sheetOpts)

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
    var flat = currentFlat()
    var state = registry.state()

    if (target) {
      target.setAttribute(attr, state.theme)
      target.setAttribute(modeAttr, state.mode)
      if (state.accent) target.setAttribute(accentAttr, state.accent)
      else target.removeAttribute(accentAttr)
    }

    writeTokens(flat)
    writeClasses(flat)

    emitter.emit(assign({ tokens: flat, channel: channel }, state))
  }

  var api: ThemeManager = {
    registry: registry,
    channel: channel,
    /** 归一化后的前缀对象：{ ns, var, cls, attr, modeAttr, accentAttr, ids, keys } */
    prefix: p,

    /** 令牌键 -> CSS 变量名：'color-brand' -> '--acme-color-brand' */
    varName: function (key) {
      return p.var + key
    },

    /** class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand' */
    className: function (short) {
      return p.cls + short
    },

    /** 挂载：写初始样式。可重复调用，等价于 apply() */
    init: function () {
      started = true
      paint()
      if (o.followSystem && supportsMatchMedia()) {
        try {
          var mq = window.matchMedia('(prefers-color-scheme: dark)')
          var handler = function (e: any) {
            if (store.get()) return // 用户手动选过就不跟随系统
            registry.use(e.matches ? 'dark' : 'light')
            paint()
          }
          if (typeof mq.addListener === 'function') mq.addListener(handler)
          else if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler)
        } catch (e) {
          /* 忽略 */
        }
      }
      return api
    },

    /** 重新应用当前主题（改了 override 之后调用） */
    apply: function () {
      paint()
      return api
    },

    use: function (name) {
      registry.use(name)
      store.set(name)
      if (started) paint()
      return api
    },

    useAccent: function (name) {
      registry.useAccent(name)
      accentStore.set(name || '')
      if (started) paint()
      return api
    },

    /** 在明暗之间切换 */
    toggle: function () {
      var state = registry.state()
      var want = state.mode === 'dark' ? 'light' : 'dark'
      var names = registry.listThemes()
      var hit = ''
      for (var i = 0; i < names.length; i++) {
        var t = registry.getTheme(names[i])
        if (t && t.mode === want) {
          hit = names[i]
          break
        }
      }
      if (hit) api.use(hit)
      return api
    },

    override: function (key, value) {
      registry.override(key, value)
      if (started) paint()
      return api
    },

    resetOverrides: function () {
      registry.resetOverrides()
      if (started) paint()
      return api
    },

    /** 取令牌值。IE10 通道下返回已求值的实值，现代通道返回 var() 引用 */
    get: function (key, asRef) {
      if (asRef && channel === 'vars') return 'var(' + prefix + key + ')'
      return currentResolved()[key]
    },

    /** 生成行内样式对象，例如 :style="ds.style({ color: 'color-fg-muted' })" */
    style: function (map) {
      var out: Dict<string> = {}
      each(map || {}, function (tokenKey, cssProp) {
        var v = api.get(tokenKey, channel === 'vars')
        if (v !== undefined && v !== null) out[cssProp] = v
      })
      return out
    },

    tokens: function () {
      return currentFlat()
    },

    state: function () {
      return assign({ channel: channel }, registry.state())
    },

    subscribe: function (fn) {
      return emitter.on(fn)
    },

    /**
     * 导出 CSS 文本，供 SSR 内联到 <head>（避免首屏闪白）
     * @param {{theme?:string, accent?:string, channel?:string}} [opt]
     */
    cssText: function (opt) {
      var q = opt || {}
      var savedT = registry.state().theme
      var savedA = registry.state().accent
      if (q.theme) registry.use(q.theme)
      if (q.accent !== undefined) registry.useAccent(q.accent)

      var flat = currentFlat()
      var ch = q.channel || channel
      var sheetOpts: BuildClassSheetOptions = assign({}, classOpts, { tokens: flat })
      if (ch === 'static') sheetOpts.resolve = resolveVars(flat, { prefix: p })
      var sheet = buildClassSheet(sheetOpts)

      var out: CssTextResult = {
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

    destroy: function () {
      if (doc) {
        removeStyle(doc, [ids.tokens, ids.primitive, ids.semantic])
        removeStyle(doc, semanticIds)
      }
      if (target) {
        each(lastKeys, function (key) {
          removeCssVar(target, prefix + key)
        })
      }
      lastKeys = []
      primitiveWritten = false
      semanticWritten = false
      started = false
      emitter.clear()
    },
  }

  return api
}
