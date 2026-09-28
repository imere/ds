/**
 * 响应式主题状态
 * -------------------------------------------------------------
 * Vue 2 的两个坑在这里都要绕：
 *   1. 给响应式对象加新 key 不会触发更新 —— 令牌表每次都是全新对象，
 *      所以直接"整体替换" state.tokens，Vue 会重新 observe，比逐个 Vue.set 更快也更稳
 *   2. Vue 2.6 起才有 Vue.observable；2.5 可用 new Vue({data}) 兜底
 */

import { VueConstructor } from 'vue'
import { each, assign, Dict, Prefix, TokenKey } from '@ds/core'
import { ThemeManager } from '@ds/dom'

/** 被 Vue 接管的响应式状态对象 */
export interface DsObservedState {
  theme: string
  accent: string
  mode: string
  label: string
  tokens: Dict<unknown>
  /** 是否在跟随系统明暗。UI 上的开关要读它做初始值 */
  followSystem: boolean
}

/** 挂在 this.$ds 上的句柄（install 返回的也是它） */
export interface DsState {
  /** 响应式状态：theme / accent / mode / label / tokens */
  state: DsObservedState
  /** 当前通道：'vars' | 'static' */
  channel: string
  /** 底层 ThemeManager（透传给指令） */
  manager: ThemeManager
  /** 归一化前缀对象：{ ns, var, cls, attr, ... } */
  prefix: Prefix
  /** 令牌键 -> CSS 变量名：'color-brand' -> '--acme-color-brand' */
  varName(key: TokenKey): string
  /** class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand' */
  className(short: string): string
  /** 切换主题，返回 this 以便链式 */
  use(name: string): DsState
  /** 切换强调色，返回 this */
  useAccent(name: string): DsState
  /** 明暗切换，返回 this */
  toggle(): DsState
  /** 手动覆盖令牌，返回 this */
  override(key: TokenKey, value: unknown): DsState
  /** 批量覆盖令牌（只重绘一次），返回 this */
  overrideMap(map: Dict<unknown> | null | undefined): DsState
  /** 清除覆盖，返回 this */
  resetOverrides(): DsState
  /** 运行时开关「跟随系统明暗」，返回 this */
  followSystem(on?: boolean): DsState
  /** 读令牌：t('color-brand') */
  t(key: TokenKey): unknown
  /** 取 var() 引用（仅 vars 通道有意义，static 通道返回实值） */
  ref(key: TokenKey): string | undefined
  /** 生成行内样式对象：:style="$ds.style({ color: 'color-fg-muted' })" */
  style(map: Dict<TokenKey> | null | undefined): Dict<string>
  /** 退订同步回调 */
  off: () => void
}

/**
 * 造一个「跟着 ThemeManager 走」的响应式句柄。
 * 关键设计是令牌表整体替换：Vue 2 的响应式对「新增 key」无感，
 * 逐键赋值要么不触发更新、要么逼你一个个 Vue.set；换成全新对象则会被重新
 * observe，一次生效，代码也更短。
 *
 * 响应式容器按版本分叉：2.6+ 用 Vue.observable，更老的借一个空实例的 data，
 * 两条路产出的对象对调用方完全一致，调用方不必关心自己跑在哪个版本上。
 *
 * @param {VueConstructor} Vue 建响应式对象用的构造函数；只用到它的 observable 或实例化能力
 * @param {ThemeManager} manager 底层主题引擎：状态与令牌从它读，修改也通过它下发
 * @returns {DsState} 挂在 this.$ds 上的句柄，其改动类方法均返回自身以便链式
 */
export function createDsState(Vue: VueConstructor, manager: ThemeManager): DsState {
  // Vue 2.6+ 有 Vue.observable；更老的版本借一个空实例承载响应式数据
  const state: DsObservedState =
    typeof Vue.observable === 'function'
      ? (Vue.observable({
          theme: '',
          accent: '',
          mode: 'light',
          label: '',
          tokens: {},
          followSystem: false,
        }) as DsObservedState)
      : (new Vue({
          /**
           * 老版本 Vue 没有 Vue.observable，借一个空实例的 data 承载响应式状态：
           * data 会被 Vue 走一遍 observe，效果与 observable 一致，代价是多一个实例。
           * 初始值全留空 —— 紧接着 sync() 会用 manager 的当前状态填实，
           * 在这里填一遍等于同一份初始值写两处，改的时候容易漏。
           * @returns {Object} 初始的 theme / accent / mode / label / tokens / followSystem
           */
          data() {
            return {
              theme: '',
              accent: '',
              mode: 'light',
              label: '',
              tokens: {},
              followSystem: false,
            }
          },
        }).$data as DsObservedState)

  /**
   * 把 manager 的一次状态快照搬进响应式 state。
   * 文本字段一律走 String() 收敛：订阅回调可能给出 undefined，模板渲染 undefined
   * 会得到 "undefined" 字样，空串至少看着是干净的。
   * @param {Dict<unknown>} [payload] 状态快照；缺省按空对象处理，等价于把字段全部复位
   * @returns {void} 无返回值，只把数据写进响应式 state，由 Vue 负责通知视图
   */
  function sync(payload?: Dict<unknown>): void {
    const p: Dict<unknown> = payload || {}
    state.theme = String(p.theme || '')
    state.accent = String(p.accent || '')
    state.mode = String(p.mode || 'light')
    state.label = String(p.label || '')
    state.followSystem = p.followSystem === true

    const next: Dict<unknown> = {}
    each((p.tokens as Dict<unknown>) || {}, (value, key) => {
      next[key] = value
    })
    state.tokens = next
  }

  const initial = manager.state()
  sync(assign({}, initial, { tokens: manager.tokens() }))

  const off = manager.subscribe(sync)

  const api: DsState = {
    state,
    channel: manager.channel,
    manager,
    /** 归一化前缀：{ ns, var, cls, attr, ... } */
    prefix: manager.prefix,

    /**
     * 令牌键 -> CSS 变量名：varName('color-brand') -> '--acme-color-brand'。
     * 前缀取 manager.prefix.var 而不是写死 '--ds-'：业务换前缀之后，
     * 手写的 var() 引用必须跟生成的变量同名，否则引用会静默落空。
     * @param {TokenKey} key 令牌键，如 'color-brand'
     * @returns {string} 完整变量名，如 '--acme-color-brand'
     */
    varName(key: TokenKey): string {
      return manager.prefix.var + key
    },

    /**
     * class 短名 -> 完整类名：className('bg-brand') -> 'acme-bg-brand'。
     * 与 varName 同理走 manager.prefix.cls，这样改了前缀之后，
     * 模板里拼出来的类名仍与生成的 CSS 对得上。
     * @param {string} short 不带前缀的短名，如 'bg-brand'
     * @returns {string} 完整类名，如 'acme-bg-brand'
     */
    className(short: string): string {
      return manager.prefix.cls + short
    },

    /**
     * 切主题。返回自身而不是别的值：这类「改动」没有有意义的返回值，
     * 硬造一个只会逼调用方写立即执行函数；返回自身还能在模板里连着写，
     * 如 v-on:click="$ds.use('dark').useAccent('green')"。
     * @param {string} name 已注册的主题名；不存在的名字由 manager 决定怎么报错
     * @returns {DsState} 自身，便于链式
     */
    use(name: string): DsState {
      manager.use(name)
      return api
    },
    /**
     * 切强调色。与 use 分开是刻意的：主题与强调色正交，
     * 合成一个方法就得靠参数顺序或对象入参区分，反而更难记、更易传错。
     * @param {string} name 已注册的强调色名；传空串表示回到默认强调色
     * @returns {DsState} 自身，便于链式
     */
    useAccent(name: string): DsState {
      manager.useAccent(name)
      return api
    },
    /**
     * 明暗互切。不接参数 —— 它表达的是「反过来」而不是「切到某一态」，
     * 落到哪个主题由 manager 按当前 mode 推导，调用方不该关心这个映射。
     * @returns {DsState} 自身，便于链式
     */
    toggle(): DsState {
      manager.toggle()
      return api
    },
    /**
     * 手动覆盖单个令牌。覆盖层与主题表分开存放：切主题不该冲掉业务自己改的值，
     * 否则「改个圆角」这类微调会在任何一次换肤后丢失。
     * @param {TokenKey} key 令牌键
     * @param {unknown} value 新值，原样输出，不做单位换算与合法性校验
     * @returns {DsState} 自身，便于链式
     */
    override(key: TokenKey, value: unknown): DsState {
      manager.override(key, value)
      return api
    },
    /**
     * 批量覆盖 —— 拖滑块改圆角那种场景，一次改好几个令牌只重绘一遍。
     * 循环调 override() 也能达成效果，但每改一个令牌都会触发一次重绘，
     * 滑块拖起来会明显掉帧；批量入口把重绘收敛成一次。
     * @param {Dict<unknown>} [map] 令牌键值表；传 null / undefined 等同于不覆盖
     * @returns {DsState} 自身，便于链式
     */
    overrideMap(map: Dict<unknown> | null | undefined): DsState {
      manager.overrideMap(map)
      return api
    },
    /**
     * 清掉全部覆盖，回到主题表本身的值。
     * 只清覆盖层，不动当前主题与强调色 —— 这是三个各自独立的状态维度。
     * @returns {DsState} 自身，便于链式
     */
    resetOverrides(): DsState {
      manager.resetOverrides()
      return api
    },
    /**
     * 运行时开关「跟随系统明暗」。不传参 = 打开。
     * 开关结果会同步进 state.followSystem：UI 上的那个开关要拿它做初始值，
     * 否则刷新后界面显示的是默认值，与真实行为对不上。
     * @param {boolean} [on] true 跟随系统；省略同样视为打开；false 固定住当前明暗
     * @returns {DsState} 自身，便于链式
     */
    followSystem(on?: boolean): DsState {
      manager.followSystem(on)
      return api
    },

    /**
     * 读令牌：t('color-brand')。
     * 读的是响应式 state.tokens 而不是 manager 的令牌表 —— 只有这样，
     * 在计算属性与模板里用才会随主题自动更新。
     * @param {TokenKey} key 令牌键
     * @returns {unknown} 令牌值；键不存在时是 undefined（不兜底，免得掩盖拼错的键）
     */
    t(key: TokenKey): unknown {
      return state.tokens[key]
    },

    /**
     * 取 var() 引用（仅 vars 通道有意义，static 通道返回实值）。
     * static 通道没有自定义属性可用，此时退回实值：宁可给一个能用的值，
     * 也不要返回一串在 IE10 上根本不生效的 var()。
     * @param {TokenKey} key 令牌键
     * @returns {string|undefined} var() 引用串；令牌不存在时 undefined
     */
    ref(key: TokenKey): string | undefined {
      return manager.get(key, true)
    },

    /**
     * 生成行内样式对象：:style="$ds.style({ color: 'color-fg-muted' })"。
     * 之所以不让人手写 var(...)：行内样式得跟着通道变，
     * static 通道下必须输出实值，手写就把通道写死了。
     * @param {Dict<TokenKey>} [map] CSS 属性 -> 令牌键的映射；空值返回空对象
     * @returns {Dict<string>} 可直接喂给 :style 的对象
     * @example
     * <div :style="$ds.style({ color: 'color-fg-muted', padding: 'space-4' })"></div>
     */
    style(map: Dict<TokenKey> | null | undefined): Dict<string> {
      return manager.style(map)
    },

    off,
  }

  return api
}
