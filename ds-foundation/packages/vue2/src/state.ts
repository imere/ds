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
  tokens: Dict<any>
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
  override(key: string, value: any): DsState
  /** 清除覆盖，返回 this */
  resetOverrides(): DsState
  /** 读令牌：t('color-brand') */
  t(key: string): any
  /** 取 var() 引用（仅 vars 通道有意义，static 通道返回实值） */
  ref(key: string): string | undefined
  /** 生成行内样式对象：:style="$ds.style({ color: 'color-fg-muted' })" */
  style(map: Dict<string> | null | undefined): Dict<string>
  /** 退订同步回调 */
  off: () => void
}

export function createDsState(Vue: VueConstructor, manager: ThemeManager): DsState {
  // Vue 2.6+ 有 Vue.observable；更老的版本借一个空实例承载响应式数据
  var state: DsObservedState =
    typeof Vue.observable === 'function'
      ? (Vue.observable({
          theme: '',
          accent: '',
          mode: 'light',
          label: '',
          tokens: {},
        }) as DsObservedState)
      : (new Vue({
          data: function () {
            return { theme: '', accent: '', mode: 'light', label: '', tokens: {} }
          },
        }).$data as DsObservedState)

  function sync(payload: Dict<any>): void {
    state.theme = payload.theme || ''
    state.accent = payload.accent || ''
    state.mode = payload.mode || 'light'
    state.label = payload.label || ''

    var next: Dict<any> = {}
    each(payload.tokens || {}, function (value, key) {
      next[key] = value
    })
    state.tokens = next
  }

  var initial = manager.state()
  sync(assign({}, initial, { tokens: manager.tokens() }))

  var off = manager.subscribe(sync)

  var api: DsState = {
    state: state,
    channel: manager.channel,
    manager: manager,
    /** 归一化前缀：{ ns, var, cls, attr, ... } */
    prefix: manager.prefix,

    /** 令牌键 -> CSS 变量名：varName('color-brand') -> '--acme-color-brand' */
    varName: function (key: string): string {
      return manager.prefix.var + key
    },

    /** class 短名 -> 完整类名：'bg-brand' -> 'acme-bg-brand' */
    className: function (short: string): string {
      return manager.prefix.cls + short
    },

    use: function (name: string): DsState {
      manager.use(name)
      return api
    },
    useAccent: function (name: string): DsState {
      manager.useAccent(name)
      return api
    },
    toggle: function (): DsState {
      manager.toggle()
      return api
    },
    override: function (key: string, value: any): DsState {
      manager.override(key, value)
      return api
    },
    resetOverrides: function (): DsState {
      manager.resetOverrides()
      return api
    },

    /** 读令牌：t('color-brand') */
    t: function (key: string): any {
      return state.tokens[key]
    },

    /** 取 var() 引用（仅 vars 通道有意义，static 通道返回实值） */
    ref: function (key: string): string | undefined {
      return manager.get(key, true)
    },

    /** 生成行内样式对象：:style="$ds.style({ color: 'color-fg-muted' })" */
    style: function (map: Dict<string> | null | undefined): Dict<string> {
      return manager.style(map)
    },

    off: off,
  }

  return api
}
