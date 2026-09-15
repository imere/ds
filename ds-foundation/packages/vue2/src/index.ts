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
export var DS_KEY = 'dsContext'

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

var _Vue: VueConstructor | null = null
var _ds: DsState | null = null

/** install 入参：ThemeManagerOptions + 可选的已建好的 manager */
export interface DsPluginOptions extends ThemeManagerOptions {
  manager?: ThemeManager
}

/** 插件对象本体（Vue.use 接收的 install + version） */
export interface DsPlugin {
  install: (Vue: VueConstructor, options?: DsPluginOptions) => void
  version: string
}

export function install(Vue: VueConstructor, options?: DsPluginOptions): void {
  if (_Vue === Vue && _ds) return

  var opts = options || {}
  var manager = opts.manager || createThemeManager(opts)
  var ds = createDsState(Vue, manager)

  Vue.prototype.$ds = ds
  Vue.ds = ds
  Vue.directive('ds-theme', makeDirective(ds))

  var provideMixin: ComponentOptions<Vue> = {
    // 只在根实例 provide，避免每个组件都往 provide 链里塞一份
    provide: function (this: Vue) {
      if (this !== this.$root) return
      var ctx: Dict<any> = {}
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

/** 组件内获取（install 之前调用会拿到 null） */
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

var plugin: DsPlugin = {
  install: install,
  version: '0.1.0',
}

export default plugin
