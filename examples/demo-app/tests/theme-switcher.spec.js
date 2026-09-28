/**
 * 主题面板 / 令牌页的「强调色冲突」提示
 * -------------------------------------------------------------
 * 起因是个真 bug：@ds/dom 在 accent 为空时会静默兜成内置的 indigo，
 * 而强调色在 resolve 顺序里盖住 theme.tokens，整组 brand 被换掉 ——
 * 表现是「所有主题品牌色一样」「派生主题换了种子色却看不出来」。
 * 修法（defaultAccent: false）已由 theme.spec.js 的回归用例守住，
 * 这里守的是配套的那两条提示：冲突发生时必须让人看见，而不是默默生效。
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Vue from 'vue'
import ThemeSwitcher from '@/docs/components/ThemeSwitcher.vue'
import DesignTokens from '@/views/DesignTokens.vue'
import { installTheme, resetThemeManager, getThemeManager } from '@/theme'

// Vue.use 是幂等的：插件只会装一次，组件里的 $ds 永远指向第一次 install 的那个 manager。
// 所以整个文件只能 install 一次 —— 中途 resetThemeManager() 会把组件的 $ds 换成已销毁的实例，
// 之后 use() / useAccent() 改的是新 manager，组件却再也收不到更新。
let ds

beforeAll(() => {
  resetThemeManager()
  installTheme(Vue)
  ds = getThemeManager()
})

describe('主题面板：强调色接管的提示', () => {
  beforeEach(async () => {
    ds.useAccent('')
    ds.use('light')
  })

  it('没选强调色时（跟随主题）不显示提示', () => {
    const wrapper = mount(ThemeSwitcher)
    expect(ds.state().accent).toBe('')
    expect(wrapper.find('.theme-switcher__note').exists()).toBe(false)
  })

  it('选了强调色就提示它会接管品牌色，并说清怎么恢复', async () => {
    const wrapper = mount(ThemeSwitcher)
    ds.useAccent('indigo')
    await wrapper.vm.$nextTick()
    const note = wrapper.find('.theme-switcher__note')
    expect(note.exists()).toBe(true)
    const text = note.text()
    expect(text).toContain('靛蓝 Indigo')
    expect(text).toContain('跟随主题')
  })

  it('切回「跟随主题」提示消失', async () => {
    const wrapper = mount(ThemeSwitcher)
    ds.useAccent('indigo')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.theme-switcher__note').exists()).toBe(true)
    ds.useAccent('')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.theme-switcher__note').exists()).toBe(false)
  })

  it('派生主题在面板里和手写主题并列出现', () => {
    const wrapper = mount(ThemeSwitcher)
    const labels = wrapper.findAll('.theme-card__label').wrappers.map((w) => w.text())
    expect(labels).toContain('极光 Aurora · 派生')
    expect(labels).toContain('熔岩 Ember · 派生')
  })
})

describe('令牌页：派生演示卡的冲突提示', () => {
  beforeEach(() => {
    ds.useAccent('')
    ds.use('light')
  })

  it('默认不提示；选了强调色才提示种子色改不动 brand', async () => {
    const wrapper = mount(DesignTokens)
    expect(wrapper.vm.accentActive).toBe(false)
    expect(wrapper.find('.panel-note').exists()).toBe(false)

    ds.useAccent('indigo')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.accentActive).toBe(true)
    expect(wrapper.vm.accentLabel).toBe('靛蓝 Indigo')
    expect(wrapper.find('.panel-note').exists()).toBe(true)
  })

  it('演示卡的色块读的是当前生效令牌，换主题后跟着变', async () => {
    const wrapper = mount(DesignTokens)
    ds.use('aurora')
    await wrapper.vm.$nextTick()
    const brand = wrapper.vm.derivedSwatches.find((s) => s.key === '--ds-color-brand')
    expect(brand.value).toBe('#0d9480')
    ds.use('light')
  })
})
