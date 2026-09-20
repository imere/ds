/**
 * @ds/vue2 state：响应式主题句柄
 * -------------------------------------------------------------
 * 两处「老版本兜底」必须真的跑一遍，否则它们只是看起来能用：
 *   1. Vue 2.6 以下没有 Vue.observable，借一个空实例承载响应式数据
 *   2. 订阅回调可能不带 payload（防御），sync 要能自己兜住
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import Vue from 'vue'
import type { VueConstructor } from 'vue'
import { createDsState } from '@ds/vue2'
import type { DsState } from '@ds/vue2'
import { createThemeManager } from '@ds/dom'
import type { ThemeManager } from '@ds/dom'
import { normalizePrefix } from '@ds/core'
import type { Dict } from '@ds/core'

/**
 * 必须 init 过：manager 只在 started 时才 paint / 通知订阅者，
 * 没 init 就改主题的话，state 不会同步（这是刻意的，避免挂载前就写 DOM）。
 */
function realDs(): DsState {
  const manager = createThemeManager({ channel: 'vars' })
  manager.init()
  return createDsState(Vue, manager)
}

function fakeVue(): VueConstructor {
  // Vue 2.6 以下没有 observable，走 new Vue({ data }) 那条路
  function FakeVue(this: Record<string, unknown>, options: { data: () => Dict<unknown> }) {
    this.$data = options.data()
  }
  return FakeVue as unknown as VueConstructor
}

describe('createDsState：基本同步', () => {
  it('初始状态来自 manager', () => {
    const ds = realDs()
    expect(ds.state.theme).toBe('light')
    expect(ds.state.mode).toBe('light')
    expect(ds.state.followSystem).toBe(false)
    expect(ds.channel).toBe('vars')
  })

  it('令牌进了响应式状态', () => {
    const ds = realDs()
    expect(ds.t('color-bg')).toBe('#ffffff')
  })

  it('varName / className 跟着前缀走', () => {
    const ds = realDs()
    expect(ds.varName('color-bg')).toBe('--ds-color-bg')
    expect(ds.className('bg-brand')).toBe('ds-bg-brand')
    expect(ds.prefix.ns).toBe('ds')
  })

  it('ref 给 var() 引用（vars 通道）', () => {
    const ds = realDs()
    expect(ds.ref('color-bg')).toBe('var(--ds-color-bg)')
  })

  it('style 生成行内样式对象', () => {
    const ds = realDs()
    expect(ds.style({ color: 'color-fg' })).toEqual({ color: 'var(--ds-color-fg)' })
  })

  it('manager 透传出去，指令层要用', () => {
    const ds = realDs()
    expect(ds.manager).toBeTruthy()
  })
})

describe('createDsState：改主题后状态跟着变', () => {
  it('use / useAccent / toggle 都同步到 state', () => {
    const ds = realDs()
    ds.use('dark')
    expect(ds.state.theme).toBe('dark')
    expect(ds.state.mode).toBe('dark')

    ds.useAccent('green')
    expect(ds.state.accent).toBe('green')

    ds.toggle()
    expect(ds.state.theme).toBe('light')
  })

  it('override / overrideMap / resetOverrides 都同步到 state', () => {
    const ds = realDs()
    ds.override('color-bg', '#123456')
    expect(ds.t('color-bg')).toBe('#123456')

    ds.overrideMap({ 'color-bg': '#abcdef', 'color-fg': '#000000' })
    expect(ds.t('color-bg')).toBe('#abcdef')
    expect(ds.t('color-fg')).toBe('#000000')

    ds.resetOverrides()
    expect(ds.t('color-bg')).toBe('#ffffff')
  })

  it('followSystem 会同步开关状态', () => {
    const ds = realDs()
    ds.followSystem(true)
    expect(ds.state.followSystem).toBe(true)
    ds.followSystem(false)
    expect(ds.state.followSystem).toBe(false)
  })

  it('off() 之后不再同步', () => {
    const ds = realDs()
    ds.off()
    ds.use('dark')
    expect(ds.state.theme).toBe('light')
  })
})

describe('createDsState：没有 Vue.observable 的老版本兜底', () => {
  it('借空实例承载响应式数据，状态照样同步', () => {
    const manager = createThemeManager({ channel: 'vars' })
    manager.init()
    const ds = createDsState(fakeVue(), manager)
    expect(ds.state.theme).toBe('light')
    expect(ds.t('color-bg')).toBe('#ffffff')
    ds.use('dark')
    expect(ds.state.theme).toBe('dark')
  })
})

describe('createDsState：订阅回调不带 payload 的防御', () => {
  it('payload 为空时落回默认值而不是崩', () => {
    const handlers: Array<(payload?: Dict<unknown>) => void> = []
    const manager = {
      channel: 'vars',
      prefix: normalizePrefix('ds'),
      state: () => ({ theme: 'light', accent: '', mode: 'light', label: '' }),
      tokens: () => ({ 'color-bg': '#ffffff' }),
      subscribe: (fn: (payload?: Dict<unknown>) => void) => {
        handlers.push(fn)
        return () => {}
      },
      use: () => manager,
      useAccent: () => manager,
      toggle: () => manager,
      override: () => manager,
      overrideMap: () => manager,
      resetOverrides: () => manager,
      followSystem: () => manager,
      get: () => 'var(--ds-color-bg)',
      style: () => ({}),
    } as unknown as ThemeManager

    const ds = createDsState(Vue, manager)
    expect(ds.state.theme).toBe('light')

    // 模拟一次不带 payload 的事件
    handlers.forEach((fn) => fn())
    expect(ds.state.theme).toBe('')
    expect(ds.state.mode).toBe('light')
    expect(ds.state.tokens).toEqual({})
    expect(ds.state.followSystem).toBe(false)
  })
})
