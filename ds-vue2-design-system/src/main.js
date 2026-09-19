import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import AuroraDS from './components'
import ElementSetup from './element'
import { installTheme } from './theme'

// 1) Element 基础样式（按需）
// 2) 我们自己的重置与工具类
// 3) Token 桥接层：必须放在最后，用于覆盖 theme-chalk 的硬编码色值
import './styles/base.css'
import './styles/utilities.css'
import './styles/element-bridge.css'

// 主题引擎必须在挂载前初始化，避免首屏闪烁：
// installTheme 内部会 createThemeManager -> Vue.use(@ds/vue2 插件) -> manager.init()
installTheme(Vue)

Vue.use(ElementSetup)
Vue.use(AuroraDS)
Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app')
