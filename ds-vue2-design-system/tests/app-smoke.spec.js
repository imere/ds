import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'
import store from '@/store'
import { installElement } from '@/element'
import { installTheme } from '@/theme'
import Vue from 'vue'

import GettingStarted from '@/views/GettingStarted.vue'
import DesignTokens from '@/views/DesignTokens.vue'
import ButtonDocs from '@/views/ButtonDocs.vue'
import FormDocs from '@/views/FormDocs.vue'
import TableDocs from '@/views/TableDocs.vue'
import DisplayDocs from '@/views/DisplayDocs.vue'
import FeedbackDocs from '@/views/FeedbackDocs.vue'
import ApiLab from '@/views/ApiLab.vue'
import ResponsiveDocs from '@/views/ResponsiveDocs.vue'

/**
 * 集成冒烟：整个文档站挂载后不应出现 console.error / Vue warn。
 * 用于守住「Ds* 换成了 el-* 之后，页面级渲染没有崩」这条底线。
 */
describe('文档站集成冒烟', () => {
  // 文档站的组件已经改成读 this.$ds（@ds/vue2 插件提供），不装插件根本挂不起来
  beforeAll(() => {
    installTheme(Vue)
  })

  it('App 可以挂载且不产生错误日志', async () => {
    installTheme(Vue)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const stubs = { 'router-link': true, 'router-view': true }

    const wrapper = mount(App, {
      store,
      stubs,
      mocks: { $route: { path: '/', fullPath: '/', meta: {} } },
    })
    await wrapper.vm.$nextTick()

    const errors = errorSpy.mock.calls.map((c) => String(c[0]))
    const warns = warnSpy.mock.calls.map((c) => String(c[0]))
    errorSpy.mockRestore()
    warnSpy.mockRestore()

    console.log('ERRORS:', JSON.stringify(errors, null, 2))
    console.log('WARNS:', JSON.stringify(warns, null, 2))

    expect(wrapper.html()).toContain('Aurora')
    expect(errors).toEqual([])
    expect(warns).toEqual([])
  })

  const pages = [
    ['GettingStarted', GettingStarted],
    ['DesignTokens', DesignTokens],
    ['ButtonDocs', ButtonDocs],
    ['FormDocs', FormDocs],
    ['TableDocs', TableDocs],
    ['DisplayDocs', DisplayDocs],
    ['FeedbackDocs', FeedbackDocs],
    ['ApiLab', ApiLab],
    ['ResponsiveDocs', ResponsiveDocs],
  ]

  it.each(pages)('%s 页面挂载无错误日志', async (_name, Page) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mount(Page, {
      store,
      stubs: { 'router-link': true, 'router-view': true },
      mocks: { $route: { path: '/', fullPath: '/', meta: {}, params: {}, query: {} } },
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const errors = errorSpy.mock.calls.map((c) => String(c[0]))
    const warns = warnSpy.mock.calls.map((c) => String(c[0]))
    errorSpy.mockRestore()
    warnSpy.mockRestore()

    console.log(_name, 'ERRORS:', JSON.stringify(errors))
    console.log(_name, 'WARNS:', JSON.stringify(warns))
    expect(errors).toEqual([])
    expect(warns).toEqual([])
    wrapper.destroy()
  })
})
