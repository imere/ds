/**
 * @ds/vue2 —— Vue 2 绑定层
 * -------------------------------------------------------------
 * 给业务三样东西：
 *   this.$ds         响应式主题句柄（use / toggle / t / style）
 *   v-ds-theme       局部换肤指令
 *   provide/inject   不想层层传 props 时用 this.dsContext 拿同一份句柄
 *
 * install 里不 import vue，Vue 由插件参数注入 —— 这样 UMD 场景下
 * 依赖的是全局 Vue，不会把框架打进产物里。
 */

// 纯类型一律用 import type：SWC 是单文件转译的（isolatedModules），
// 不写 type 的话它会把类型当成值保留下来，rollup 就会去找一个根本不存在的导出。
import Vue from 'vue'
import type { VueConstructor, ComponentOptions } from 'vue'
import { createThemeManager } from '@ds/dom'
import type { ThemeManager, ThemeManagerOptions } from '@ds/dom'
import type { Dict } from '@ds/core'
import { createDsState } from './state'
import type { DsState } from './state'
import { makeDirective } from './directive'

// provide 的 key 直接用注入名，业务写 inject: ['dsContext'] 就行，
// 不用再配 from —— 少一个记不住的字符串。
export const DS_KEY = 'dsContext'

// 模块增强：让业务代码里 this.$ds 有类型，也让 Vue.ds 静态句柄有类型。
// 注意 only 增强实例与构造函数，不动运行时。
declare module 'vue/types/vue' {
  interface Vue {
    $ds: DsState
  }
  interface VueConstructor {
    ds: DsState
  }
}

let _Vue: VueConstructor | null = null
let _ds: DsState | null = null

/** install 入参：ThemeManagerOptions + 可选的已建好的 manager */
/**
 * 传了 manager 就不必再给 themes（那是 createThemeManager 的必填项）；
 * 两者都不给时由 @ds/dom 抛错，这里不做二次校验。
 */
export type DsPluginOptions = Partial<ThemeManagerOptions> & { manager?: ThemeManager }

/** 插件对象本体（Vue.use 接收的 install + version） */
export interface DsPlugin {
  install: (Vue: VueConstructor, options?: DsPluginOptions) => void
  version: string
}

/**
 * 插件安装入口：把同一份 DsState 铺到 Vue 的三个位置。
 * 幂等是硬要求 —— Vue.use 在同一个应用里被调用两次很常见（单测里尤其多），
 * 若每次都重建 manager，样式会被 init 两遍，上一轮的订阅还会泄漏。
 *
 * 挂三处不是重复：$ds 给组件实例用、Vue.ds 给组件外的普通模块用、
 * v-ds-theme 给模板用。三者共用同一份 DsState，天然不存在状态不同步。
 *
 * @param {VueConstructor} Vue 宿主构造函数，由 Vue.use 注入。本模块刻意不 import vue，
 *   UMD 场景下它就是对全局 Vue 的引用，不会把框架打进产物里
 * @param {DsPluginOptions} [options] 主题表，或一个已建好的 manager；两者都不给时
 *   由 @ds/dom 抛错 —— 本层不自带任何主题，也不重复校验一遍
 * @returns {void} 无返回值；装完之后句柄从 this.$ds / Vue.ds / useDs() 上取
 */
export function install(Vue: VueConstructor, options?: DsPluginOptions): void {
  if (_Vue === Vue && _ds) return

  // 不传 options 也能装（业务自己传 manager 的场景），但既不给 manager 又不给
  // themes 时会在 createThemeManager 里抛错 —— 本层同样不自带任何主题。
  const opts: DsPluginOptions = options || ({} as DsPluginOptions)
  const manager = opts.manager || createThemeManager(opts as ThemeManagerOptions)
  const ds = createDsState(Vue, manager)

  Vue.prototype.$ds = ds
  Vue.ds = ds
  Vue.directive('ds-theme', makeDirective(ds))

  const provideMixin: ComponentOptions<Vue> = {
    // 只在根实例 provide，避免每个组件都往 provide 链里塞一份
    /**
     * 只在根实例上 provide：mixin 会注入到每一个组件，
     * 不加 $root 判断的话，provide 链上会堆满同一个 ds 引用，白白多一层层查找。
     * @returns {Object} 形如 { dsContext: ds } 的 provide 对象；非根实例返回 undefined
     */
    provide(this: Vue) {
      if (this !== this.$root) return
      const ctx: Dict<unknown> = {}
      ctx[DS_KEY] = ds
      return ctx
    },
    inject: {
      dsContext: { from: DS_KEY, default: null },
    },
  }
  Vue.mixin(provideMixin)

  _Vue = Vue
  _ds = ds

  manager.init()
}

/**
 * 组件外取句柄的口子：普通模块里没有 this，就用它拿。
 * 故意返回 null 而不是抛错 —— install 之前调用是合法时序（比如模块顶层取值），
 * 让调用方自己决定兜底还是报错，比库替他抛错更灵活。
 * @returns {DsState|null} 已安装的句柄；尚未 install 时为 null
 * @example
 * // 组件外的工具函数里
 * const ds = useDs()
 * if (ds) ds.use('dark')
 */
export function useDs(): DsState | null {
  return _ds
}

export { createDsState, makeDirective, DsState }

// 持久化辅助从 @ds/dom 转出来一份：Vue 用户不用为了记住主题再单独装 @ds/dom。
// 插件本身一行存储代码都没有，只有你主动调 bindTheme 才会碰 localStorage / cookie。
export {
  readTheme,
  bindTheme,
  restoreScript,
  autoStorage,
  webStorage,
  cookieStorage,
  memoryStorage,
} from '@ds/dom'
export type {
  KeyValueStore,
  ThemeStorageOptions,
  ThemeSnapshot,
  WebStorageOptions,
  CookieStorageOptions,
  AutoStorageOptions,
} from '@ds/dom'

const plugin: DsPlugin = {
  install,
  version: '0.1.0',
}

export default plugin
