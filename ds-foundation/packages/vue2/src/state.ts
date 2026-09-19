/**
 * 响应式主题状态
 * -------------------------------------------------------------
 * Vue 2 的两个坑在这里都要绕：
 *   1. 给响应式对象加新 key 不会触发更新 —— 令牌表每次都是全新对象，
 *      所以直接"整体替换" state.tokens，Vue 会重新 observe，比逐个 Vue.set 更快也更稳
 *   2. Vue 2.6 起才有 Vue.observable；2.5 可用 new Vue({data}) 兜底
 */

import { VueConstructor } from 'vue'
import { each, assign, Dict, Prefix } from '@ds/core'
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
  varName(key: string): string
  /** class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand' */
  className(short: string): string
  /** 切换主题，返回 this 以便链式 */
  use(name: string): DsState
  /** 切换强调色，返回 this */
  useAccent(name: string): DsState
  /** 明暗切换，返回 this */
  toggle(): DsState
  /** 手动覆盖令牌，返回 this */
  override(key: string, value: unknown): DsState
  /** 批量覆盖令牌（只重绘一次），返回 this */
  overrideMap(map: Dict<unknown> | null | undefined): DsState
  /** 清除覆盖，返回 this */
  resetOverrides(): DsState
  /** 运行时开关「跟随系统明暗」，返回 this */
  followSystem(on?: boolean): DsState
  /** 读令牌：t('color-brand') */
  t(key: string): unknown
  /** 取 var() 引用（仅 vars 通道有意义，static 通道返回实值） */
  ref(key: string): string | undefined
  /** 生成行内样式对象：:style="$ds.style({ color: 'color-fg-muted' })" */
  style(map: Dict<string> | null | undefined): Dict<string>
  /** 退订同步回调 */
  off: () => void
}

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

    /** 令牌键 -> CSS 变量名：varName('color-brand') -> '--acme-color-brand' */
    varName(key: string): string {
      return manager.prefix.var + key
    },

    /** class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand' */
    className(short: string): string {
      return manager.prefix.cls + short
    },

    use(name: string): DsState {
      manager.use(name)
      return api
    },
    useAccent(name: string): DsState {
      manager.useAccent(name)
      return api
    },
    toggle(): DsState {
      manager.toggle()
      return api
    },
    override(key: string, value: unknown): DsState {
      manager.override(key, value)
      return api
    },
    /** 批量覆盖 —— 拖滑块改圆角那种场景，一次改好几个令牌只重绘一遍 */
    overrideMap(map: Dict<unknown> | null | undefined): DsState {
      manager.overrideMap(map)
      return api
    },
    resetOverrides(): DsState {
      manager.resetOverrides()
      return api
    },
    /** 运行时开关「跟随系统明暗」。不传参 = 打开 */
    followSystem(on?: boolean): DsState {
      manager.followSystem(on)
      return api
    },

    /** 读令牌：t('color-brand') */
    t(key: string): unknown {
      return state.tokens[key]
    },

    /** 取 var() 引用（仅 vars 通道有意义，static 通道返回实值） */
    ref(key: string): string | undefined {
      return manager.get(key, true)
    },

    /** 生成行内样式对象：:style="$ds.style({ color: 'color-fg-muted' })" */
    style(map: Dict<string> | null | undefined): Dict<string> {
      return manager.style(map)
    },

    off,
  }

  return api
}
