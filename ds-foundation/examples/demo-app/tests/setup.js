import Vue from 'vue'
import { config } from '@vue/test-utils'
import { installElement } from '@/element'

// jsdom 未实现 matchMedia，主题引擎会用到
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  })
}

// jsdom 未实现 ResizeObserver
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom 未实现 scrollTo
if (!window.scrollTo) {
  window.scrollTo = () => {}
}

// 关闭 Vue 生产提示噪音
Vue.config.productionTip = false
Vue.config.devtools = false

// Ds* 组件内部渲染 el-*，测试环境同样需要按需注册
installElement(Vue)

config.showDeprecationWarnings = false
