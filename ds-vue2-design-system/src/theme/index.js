/**
 * 主题接线
 * -------------------------------------------------------------
 * 这个文件是「应用」和「库」之间唯一的接缝：把产品自己的令牌数据喂给 @ds/dom，
 * 再把产出的 manager 交给 @ds/vue2 插件。之后业务组件只用 this.$ds。
 *
 *   @ds/core  令牌拍平 / 主题注册中心 / 断点（纯逻辑，不碰 DOM）
 *   @ds/dom   把令牌落到页面上（现代写 CSS 变量，IE10 注入静态 CSS）+ 持久化辅助
 *   @ds/vue2  把 manager 包成响应式的 this.$ds + v-ds-theme 指令
 *
 * 三件事在这里一次做完：
 *   1. createThemeManager —— 注册主题/强调色，选定通道
 *   2. Vue.use(dsPlugin, { manager }) —— 拿到 this.$ds；插件内部会调 manager.init()
 *   3. bindTheme(manager) —— 只有这一行才让页面开始往 localStorage 写东西
 *
 * 顺序不能改：必须在 new Vue() 之前跑完，否则首屏会先渲染默认色再跳一下。
 */

import { bindTheme, createThemeManager, readTheme } from '@ds/dom'
import dsPlugin from '@ds/vue2'
import { themes, DEFAULT_THEME } from './themes'
import { accents } from './accents'

/** 单例：重复 install（比如测试里多次 import）不该造出第二个 manager */
let manager = null

/**
 * color-scheme 不在库的职责里 —— 它只影响滚动条、表单控件这些原生件，
 * 谁关心谁自己同步。这里订阅一次。
 */
function syncColorScheme(state) {
  if (typeof document === 'undefined' || !document.documentElement) return
  document.documentElement.style.colorScheme = state.mode || 'light'
}

export function getThemeManager(options = {}) {
  if (manager) return manager

  const saved = readTheme(options.storage)

  manager = createThemeManager({
    themes,
    accents,
    theme: saved.theme || DEFAULT_THEME,
    // 强调色默认「跟随主题」= 空串：不给默认强调色，品牌色才是主题自带的那一组
    accent: saved.accent || '',
    // 库自带那两层 class（.ds-p-4 之类）这个项目用不上，组件样式全是手写 CSS
    withClasses: false,
    // 想绕开能力检测就传 'vars' / 'static'
    channel: options.channel,
  })

  manager.subscribe(syncColorScheme)
  // 持久化：读在上面（readTheme），写从这里开始
  bindTheme(manager, options.storage)

  return manager
}

/** 在 Vue 上装好主题插件。必须在 new Vue() / mount() 之前调用 */
export function installTheme(Vue, options = {}) {
  const m = getThemeManager(options)
  Vue.use(dsPlugin, { manager: m })
  // init 是幂等的；插件已经调过一次，这里再调是为了覆盖「插件早就装过、这次换了 manager」的情况
  m.init()
  syncColorScheme(m.state())
  return m
}

/** 测试用：丢掉单例，下次 getThemeManager 会重建 */
export function resetThemeManager() {
  if (manager) manager.destroy()
  manager = null
}

export { themes, DEFAULT_THEME, accents }
export { createTheme, scale, shadowPresets } from './tokens'
