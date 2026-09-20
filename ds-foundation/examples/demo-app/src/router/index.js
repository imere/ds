import Vue from 'vue'
import VueRouter from 'vue-router'

import GettingStarted from '@/views/GettingStarted.vue'
import DesignTokens from '@/views/DesignTokens.vue'
import ButtonDocs from '@/views/ButtonDocs.vue'
import FormDocs from '@/views/FormDocs.vue'
import DisplayDocs from '@/views/DisplayDocs.vue'
import FeedbackDocs from '@/views/FeedbackDocs.vue'
import TableDocs from '@/views/TableDocs.vue'
import ResponsiveDocs from '@/views/ResponsiveDocs.vue'
import ApiLab from '@/views/ApiLab.vue'

Vue.use(VueRouter)

const routes = [
  { path: '/', name: 'getting-started', component: GettingStarted, meta: { title: '快速开始' } },
  { path: '/tokens', name: 'tokens', component: DesignTokens, meta: { title: '设计令牌' } },
  { path: '/components/button', name: 'button', component: ButtonDocs, meta: { title: '按钮 Button' } },
  { path: '/components/form', name: 'form', component: FormDocs, meta: { title: '表单 Form' } },
  { path: '/components/display', name: 'display', component: DisplayDocs, meta: { title: '数据展示' } },
  { path: '/components/feedback', name: 'feedback', component: FeedbackDocs, meta: { title: '反馈' } },
  { path: '/components/table', name: 'table', component: TableDocs, meta: { title: '表格与分页' } },
  {
    path: '/components/responsive',
    name: 'responsive',
    component: ResponsiveDocs,
    meta: { title: '响应式' },
  },
  { path: '/lab', name: 'lab', component: ApiLab, meta: { title: 'API 实验室' } },
  { path: '*', redirect: '/' },
]

const router = new VueRouter({
  mode: 'hash',
  base: '/',
  routes,
  scrollBehavior() {
    return { x: 0, y: 0 }
  },
})

router.afterEach((to) => {
  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} · Aurora DS`
  }
})

export default router
