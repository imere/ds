/**
 * @ds/vue2 install：插件安装
 * -------------------------------------------------------------
 * 模块级单例（_Vue / _ds）让「重复安装」和「传已有 manager」这两条分支
 * 必须放在独立文件里测 —— 同一个文件里第二次 install 会被幂等判断挡掉。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import Vue from 'vue'
import type { VueConstructor } from 'vue'
import { install, useDs, DS_KEY } from '@ds/vue2'
import { createThemeManager } from '@ds/dom'
import type { ThemeManager } from '@ds/dom'
import { baseOpts } from './fixtures'

describe('install：传入已建好的 manager', () => {
  // Vue.extend 出来的子类构造器：install 只改它自己的 options，不污染全局 Vue
  const Sub = Vue.extend({}) as VueConstructor

  it('复用传入的 manager，不另起一个', () => {
    const manager: ThemeManager = createThemeManager({ ...baseOpts, channel: 'vars' })
    install(Sub, { manager })
    expect(Sub.ds.manager).toBe(manager)
  })

  it('useDs() 拿到的就是这份句柄', () => {
    expect(useDs()).toBe(Sub.ds)
  })

  it('provide 的 key 是 dsContext', () => {
    expect(DS_KEY).toBe('dsContext')
  })

  it('重复安装同一个构造器不会重建句柄', () => {
    const first = Sub.ds
    install(Sub, {})
    expect(Sub.ds).toBe(first)
  })
})

describe('install：不带任何选项', () => {
  const Sub2 = Vue.extend({}) as VueConstructor

  it('自己建 manager 并 init', () => {
    install(Sub2, { ...baseOpts })
    expect(Sub2.ds.state.theme).toBe('light')
    expect(document.getElementById('ds-tokens')).not.toBeNull()
    Sub2.ds.manager.destroy()
  })

  it('连 options 都不给时由底层抛错：插件层同样不自带主题', () => {
    const Sub3 = Vue.extend({}) as VueConstructor
    // 具体是缺 themes 还是缺尺度取决于底层先查哪一项，这里只断言「不静默装上去」
    expect(() => install(Sub3)).toThrow(/\[ds\/dom\]/)
  })
})
