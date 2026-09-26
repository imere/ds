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
  rescaleTokens,
  each,
  assign,
  prefixOf,
  isPlainObject,
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
  UnitSpace,
  UnitId,
} from '@ds/core'
import { supportsCssVars, prefersDark, supportsMatchMedia } from './env'
import { DEFAULT_KEEP_PX } from '@ds/core'
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
   * 初始强调色名。不给就是不启用强调色，品牌色走主题自带的那一组。
   *
   * 这里**没有任何兜底**。早期版本会在没给 accent 时套上色板里的 indigo，
   * 而强调色在 resolve 顺序里盖住 theme.tokens —— 结果每套主题的 brand 一族
   * 都被按成同一个靛蓝，且从界面上看不出是兜底干的。
   */
  accent?: string
  /** 'auto' 时按能力检测二选一 */
  channel?: 'auto' | 'vars' | 'static'
  /** 必传：本层不自带任何主题，官方那两套在 @ds/tokens */
  themes: Dict<Theme | ThemeDef>
  /**
   * 必传：本层不自带色板，官方那套在 @ds/tokens。
   * 注意官方主题里**不含** brand 一族 —— 品牌色只由强调色提供，
   * 一份强调色都不给的话，产出的令牌表就是没有 color-brand 的。
   */
  accents: Dict<AccentDef>
  /** 以下四项是设计决策，必传；不用 class 通道就传 withClasses: false */
  scales: ScaleTable
  rules: ScaleRuleDef[]
  utilities: UtilityDef[]
  map: Dict<SemanticDef>
  classPrefix?: string
  varPrefix?: string
  important?: boolean
  /**
   * 长度单位落地成 px（默认）还是别的。
   *
   * 任意单位都能写（'rem' / 'vw' / 'cqw' / 'pt' …）：换不换得成取决于
   * unit.ts 查不查得到 px 系数 —— 绝对单位与 rem 天然可换，
   * vw / cqw 这类依赖环境的要给 factors。换不了的值会原样保留，不会假装换过。
   *
   * 这一层做而不是只让派生做，是因为**大部分令牌不过派生链** ——
   * 官方那两套主题是手工挑的静态值，直接由 registry 拼进令牌表。
   * 在出口统一换一次，来源不管是手写的、派生的还是 Figma 导入的，口径一致。
   */
  unit?: UnitId
  /** rem 的根字号，默认 16 */
  rootFontSize?: number
  /** 依赖运行环境的单位系数：{ vw: 视口宽/100, cqw: 容器宽/100 }。unit 用到这些单位时必填 */
  factors?: Dict<number>
  /**
   * unit 指定的目标单位下仍然保持原单位 px 的键前缀，默认 DEFAULT_KEEP_PX
   * （描边宽度：1px 跟着根字号缩放会变糊；阴影：固定的视觉深度，不是排版尺度）
   */
  keepPx?: string[]
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

/**
 * 决定走哪条通道。
 * 'auto' 时按能力检测二选一，而不是按 UA：UA 会骗人（兼容模式、企业策略改 UA），
 * CSS.supports 不会。显式给了 'vars' / 'static' 就照办 ——
 * 测试要固定通道，业务也可能知道自己只要 IE10 分支。
 * @param {string} [option] 'auto' | 'vars' | 'static'，默认 'auto'
 * @returns {string} 'vars' 或 'static'
 */
export function pickChannel(option?: string): 'vars' | 'static' {
  if (option === 'vars' || option === 'static') return option
  return supportsCssVars() ? 'vars' : 'static'
}

/**
 * @param {object} [options]
 * @param {Document} [options.doc]
 * @param {Element}  [options.target]      变量写在哪（默认 <html>；传容器可做局部深色区）
 * @param {object}    options.themes      必传：{ light: theme, dark: theme }。官方那两套在 @ds/tokens
 * @param {object}    options.accents     必传：{ indigo: accent, ... }。官方色板在 @ds/tokens
 *                                         （品牌色只由强调色提供，主题那两套里没有 brand）
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
 *   var ds = createThemeManager({ themes: themes, theme: saved.theme || 'light' })
 *   bindTheme(ds)
 * 不接就完全不碰 localStorage / cookie，SSR 也没有任何副作用。
 * @returns {ThemeManager} 主题句柄：所有写操作都在它的 api 方法里，
 *   不调 init() 就一个字节都不会写进 DOM
 */
export function createThemeManager(options: ThemeManagerOptions): ThemeManager {
  const o = options
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
  // 不给 rootFontSize / keepPx 时交回 core 的默认值，不要在这里再兜一份数字
  const unit: UnitId | undefined = o.unit
  const space: UnitSpace = { rootFontSize: o.rootFontSize, factors: o.factors }

  // 要注入 class 就得给全尺度与映射 —— 这一层同样不自带。
  // 缺了不会报错，只会静默产出一张空的样式表，那种错最难查。
  if (withClasses && (!o.scales || !o.rules || !o.utilities || !o.map)) {
    throw new Error(
      '[ds/dom] withClasses 开启时必须给 scales / rules / utilities / map（官方那一套在 @ds/tokens）'
    )
  }

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

  const themesIn: Dict<Theme | ThemeDef> = o.themes
  const accentsIn: Dict<AccentDef> = o.accents

  // 主题必须由调用方给全，本层一套都不自带。
  // 早期版本这里会兜上内置的明暗两套，代价是「忘了传也不报错」——
  // 界面上出现的是库的设计而不是业务的，而且很难看出来。
  if (!isPlainObject(themesIn) || !Object.keys(themesIn).length) {
    throw new Error('[ds/dom] themes 不能为空：官方那两套在 @ds/tokens（lightTheme / darkTheme）')
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
  // 不给就不启用强调色，品牌色走主题自带那一组。没有兜底，也没有默认值。
  if (o.accent) registry.useAccent(o.accent)

  /**
   * 当前令牌表：单位换算只在这一处做。
   *
   * 令牌表往下走的所有分支（写变量、写 class、SSR 导出、subscribe 给出去的那份）
   * 拿到的都是同一份换算过的表，不会有的 rem 有的 px。
   *
   * @returns {object} 换算到 o.unit 之后的扁平令牌表
   */
  function currentFlat(): FlatTokens {
    const keepPx = o.keepPx || DEFAULT_KEEP_PX
    return unit ? rescaleTokens(registry.resolve(), unit, space, keepPx) : registry.resolve()
  }

  /**
   * 把令牌表解析成「可直接写进 CSS」的字符串表。
   * 解析的是已换算过的那一份（currentFlat），所以 var() 引用链与实值两条
   * 出口口径一致：vars 通道下拿到 var(--x)，static 通道下拿到真实色值。
   * @returns {object} 令牌键 -> CSS 值
   */
  function currentResolved(): Dict<string> {
    return resolveVars(currentFlat(), { prefix: p })
  }

  /**
   * 写变量（仅 vars 通道）。
   * 目标是 <html> 时走 <style> 里的 :root 规则：一次写入、可整体替换，
   * 也比逐个 setProperty 快得多（IE 上尤其明显）。
   * 目标是容器时没有 :root 可用，只能逐个写到元素上，
   * 于是还要顺手清掉这次不再存在的键 —— 残留变量会继续参与继承。
   * @param {object} flat 已换算的扁平令牌表
   * @returns {void} 无返回值
   */
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

  /**
   * 写两层 class 样式表（primitive + semantic）。
   * primitive 只依赖尺度、跟主题无关，写一次就够，之后不再动它 ——
   * 这是拆两层的直接收益：换主题时重写的只有 semantic 那一层。
   * vars 通道下 semantic 的规则全是 var() 引用，同样只写一次；
   * static 通道下每条规则都是算好的实值，换主题就得整段重写（先删后写）。
   * @param {object} flat 已换算的扁平令牌表
   * @returns {void} 无返回值
   */
  function writeClasses(flat: FlatTokens): void {
    if (!withClasses || !doc) return

    const sheetOpts = assign({}, classOpts, { tokens: flat }) as BuildClassSheetOptions
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

  /**
   * 重绘：把当前状态落到 DOM 上，再广播出去。
   * 唯一的一次「写页面」入口。所有 api 方法最后都汇到这里，
   * 于是「属性 / 变量 / class / 通知」四件事不可能出现只做一半的情况。
   * @returns {void} 无返回值
   */
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

  /**
   * 系统偏好对应的主题名。
   * 只认 'dark' / 'light' 这两个约定名：跟随系统这个功能本身就是按明暗来的，
   * 业务如果只注册了别的名字，hasTheme() 会挡住，这里不做猜测。
   * @returns {string} 'dark' 或 'light'
   */
  function systemTheme(): string {
    return prefersDark() ? 'dark' : 'light'
  }

  /**
   * 注册中心里到底有没有这一套主题。
   * 不能用 getTheme 判 —— 它查不到会兜回当前主题，「没注册」和「注册了」
   * 都返回非 null，判不出来。
   * @param {string} name 主题名
   * @returns {boolean} 注册过返回 true
   */
  function hasTheme(name: string): boolean {
    const names = registry.listThemes()
    for (let i = 0; i < names.length; i++) {
      if (names[i] === name) return true
    }
    return false
  }

  /**
   * 按系统偏好切一次。
   * 两个前置条件：正在跟随（following）、且用户没手动选过（pinned）。
   * 「用户选过」优先于系统偏好，否则用户每换一次系统主题，自己挑的就被覆盖掉，
   * 那种体验比不跟随还糟。
   * @returns {void} 无返回值
   */
  function applySystemPreference(): void {
    if (!following || pinned) return
    const want = systemTheme()
    // 只认注册过的名字：业务就给了一套 light，系统再怎么偏好深色也不能凭空切过去
    if (!hasTheme(want)) return
    if (registry.state().theme !== want) registry.use(want)
  }

  /**
   * 挂 prefers-color-scheme 监听。
   * 幂等 —— 重复调用不会挂第二份，否则一次系统切换会触发两次重绘。
   * addListener / addEventListener 两种都要认：老 Safari 只有前者，
   * 新浏览器已把前者标废弃。整段包 try/catch，隐私模式下调 matchMedia 会直接抛。
   * @returns {void} 无返回值
   */
  function watchSystem(): void {
    if (!following || detachMedia || !supportsMatchMedia()) return
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      /**
       * 系统深浅变了。
       * 只改注册中心再重绘，不碰 pinned：用户手动选过主题后系统再变也不该跟着变。
       * @param {MediaQueryListEvent} e 媒体查询变更事件
       * @returns {void} 无返回值
       */
      const handler = function (e: MediaQueryListEvent) {
        if (!following || pinned) return
        registry.use(e.matches ? 'dark' : 'light')
        if (started) paint()
      }
      if (typeof mq.addListener === 'function') {
        mq.addListener(handler)
        /**
         * 老式解绑（Safari 14 之前只有 addListener / removeListener）。
         * @returns {void} 无返回值
         */
        detachMedia = function () {
          mq.removeListener(handler)
        }
      } else if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', handler)
        /**
         * 标准解绑。
         * @returns {void} 无返回值
         */
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

    /**
     * 令牌键 -> CSS 变量名：'color-brand' -> '--acme-color-brand'。
     * 业务不要自己拼前缀：前缀是可配的，拼错就会拼出一个没人写的变量名，
     * 而 CSS 变量写错是静默失败 —— 页面上只是少个颜色，没有报错。
     * @param {string} key 扁平令牌键，如 'color-brand'
     * @returns {string} 带前缀的 CSS 变量名
     */
    varName(key) {
      return p.var + key
    },

    /**
     * class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand'。
     * 同 varName：类名前缀也是可配的，统一从这里出。
     * @param {string} short class 短名，如 'bg-brand'
     * @returns {string} 带前缀的完整类名
     */
    className(short) {
      return p.cls + short
    },

    /**
     * 挂载：写初始样式。
     * 可重复调用，等价于 apply() 外加「补上系统偏好与监听」两步 ——
     * destroy() 之后想再启用，直接再 init() 一次就行。
     * @returns {ThemeManager} 返回自身，方便 bootstrap().init() 这种链式写法
     */
    init() {
      started = true
      applySystemPreference()
      paint()
      watchSystem()
      return api
    },

    /**
     * 重新应用当前主题。
     * 改完 override() 之后调它：override 只改注册中心里的值，
     * 不主动重绘 —— 批量改几十个令牌时不该每改一个就重排一次。
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
    apply() {
      paint()
      return api
    },

    /**
     * 切换主题。
     * 切过一次就置上 pinned：用户显式选过的主题优先于系统偏好，
     * 之后系统深浅再变也不会覆盖用户的选择。
     * @param {string} name 主题名；没注册过的名字交给注册中心处理
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
    use(name) {
      registry.use(name)
      pinned = true
      if (started) paint()
      return api
    },

    /**
     * 切换强调色。
     * 不置 pinned：强调色跟明暗无关，选过强调色不影响「跟随系统」继续管主题。
     * 传空串等于关掉强调色，品牌色回到主题自带的那一组。
     * @param {string} name 强调色名
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
    useAccent(name) {
      registry.useAccent(name)
      if (started) paint()
      return api
    },

    /**
     * 运行时开关「跟随系统明暗」。
     * 打开时除了置标记，还要立刻按系统偏好切一次并挂上监听 ——
     * 只置标记的话，之前手动切过主题的人点了开关却看不到变化，会以为是坏了。
     * 关闭时把监听摘掉：留着就是白占一份回调，且会在系统切换时误改主题。
     * @param {boolean} [on] 传 false 关闭；不传或传 true 打开
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
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

    /**
     * 在明暗之间切换。
     * 按 mode 找另一半而不是在两套主题间轮换：业务可能有三套
     * （light / dark / dark-high-contrast），轮换会切到不想要的那套。
     * 找不到对应 mode 的主题就什么都不做 —— 宁可没反应，也不要切错。
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
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

    /**
     * 覆盖一个令牌。
     * 走 override 而不是改主题定义：主题是共享的、来自 @ds/tokens 的不可变输入，
     * 而覆盖是这一次的运行时决定（比如按租户换品牌色）。
     * @param {string} key 令牌键
     * @param {*} value 新值
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
    override(key, value) {
      registry.override(key, value)
      if (started) paint()
      return api
    },

    /**
     * 批量覆盖令牌，只重绘一次。
     * 逐个调 override() 也能达到同样结果，但每调一次就重绘一次，
     * 一次换十几个令牌等于十几次整表重排 —— 批量接口的存在的意义就是这个。
     * @param {object} [map] 令牌键 -> 值；传 null / undefined 等于什么也不做
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
    overrideMap(map) {
      registry.overrideMap(map)
      if (started) paint()
      return api
    },

    /**
     * 清掉所有覆盖，回到主题原本的令牌。
     * 只清覆盖层、不动主题与强调色：这三层是分开存的，
     * 混在一起就没法「撤掉这一次的定制」了。
     * @returns {ThemeManager} 返回自身，支持链式调用
     */
    resetOverrides() {
      registry.resetOverrides()
      if (started) paint()
      return api
    },

    /**
     * 取一个令牌的值。
     * 默认给「可落地的字符串」：static 通道是实值，vars 通道也是实值
     * （解析后的），业务拿去算颜色对比度时才不会拿到一串 var()。
     * @param {string} key 令牌键
     * @param {boolean} [asRef] true 时在 vars 通道下返回 'var(--x)' 引用；
     *   style() 就靠它让行内样式跟着变量一起变
     * @returns {string|undefined} 令牌值；令牌不存在时 undefined
     */
    get(key, asRef) {
      if (asRef && channel === 'vars') return `var(${prefix}${key})`
      return currentResolved()[key]
    },

    /**
     * 生成行内样式对象，例如 :style="ds.style({ color: 'color-fg-muted' })"。
     * 入参是「CSS 属性 -> 令牌键」而不是反过来：写起来跟平时写 style 对象一致，
     * 读起来一眼能看出落在哪个属性上。
     * vars 通道下取的是 var() 引用，所以换主题时行内样式会自己跟着变，
     * 不需要订阅再手动刷新组件。
     * @param {object} [map] CSS 属性名 -> 令牌键；传 null / undefined 得到空对象
     * @returns {object} 可直接交给 :style / style 绑定的对象
     * @example
     *   // <div :style="ds.style({ color: 'color-fg-muted', background: 'color-bg-subtle' })">
     *   ds.style({ color: 'color-fg-muted' })  // => { color: 'var(--ds-color-fg-muted)' }
     */
    style(map) {
      const out: Dict<string> = {}
      each(map || {}, (tokenKey, cssProp) => {
        const v = api.get(tokenKey, channel === 'vars')
        if (v !== undefined && v !== null) out[cssProp] = v
      })
      return out
    },

    /**
     * 当前令牌表（已做过单位换算）。
     * 给出去的是「换算后」的那一份，与写进 CSS 的是同一份，
     * 订阅者拿去算东西才不会出现「页面上 rem、脚本里 px」。
     * @returns {object} 扁平令牌表
     */
    tokens() {
      return currentFlat()
    },

    /**
     * 当前状态快照：主题 / 强调色 / 明暗模式，外加通道与是否仍在跟随系统。
     * 比 registry.state() 多两个字段，订阅者（Vue 绑定层、持久化辅助）
     * 正是靠它们决定 UI 上那个「跟随系统」开关该显示成什么样。
     * @returns {object} 状态对象
     */
    state() {
      return assign({ channel, followSystem: following && !pinned }, registry.state())
    },

    /**
     * 订阅主题变化。
     * 回调收到的是 state() 外加一份令牌表：既要知道「现在是深色」，
     * 也常常要拿到具体色值去画 canvas / 同步给第三方组件。
     * @param {Function} fn 回调，收到 payload
     * @returns {Function} 退订函数
     */
    subscribe(fn) {
      return emitter.on(fn)
    },

    /**
     * 导出 CSS 文本，供 SSR 内联到 <head>（避免首屏闪白）。
     * 允许临时换主题 / 强调色 / 通道再算：服务端常常要为每个用户
     * 各算一份，但同一个进程里只有一个 manager，所以算完必须还原 ——
     * 最后的 registry.use(savedT) 不是可选的清理，漏了会串到下一个请求上。
     * @param {object} [opt] { theme, accent, channel }：
     *   theme 按名临时切换；accent 传空串表示不启用强调色；channel 可指定导出通道
     * @returns {CssTextResult} { tokens, primitive, semantic, channel, all }
     */
    cssText(opt) {
      const q = opt || {}
      const savedT = registry.state().theme
      const savedA = registry.state().accent
      if (q.theme) registry.use(q.theme)
      if (q.accent !== undefined) registry.useAccent(q.accent)

      const flat = currentFlat()
      const ch = q.channel || channel
      const sheetOpts = assign({}, classOpts, { tokens: flat }) as BuildClassSheetOptions
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

    /**
     * 销毁：撤掉这个 manager 往页面上写的一切。
     * 分三步：删 <style>、清元素上的内联变量、摘掉系统监听与订阅者。
     * 清内联变量用的是 lastKeys（上次写过的键）：没有这份记录就只能
     * 遍历整张令牌表去猜，而局部作用域下根本拿不到完整表。
     * @returns {void} 无返回值
     */
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
