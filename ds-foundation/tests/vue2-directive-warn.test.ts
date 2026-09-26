/**
 * @ds/vue2 directive：告警分支
 * -------------------------------------------------------------
 * 「static 通道下做不到局部换肤」这条告警只打一次（模块级 flag），
 * 所以「有 console」和「没 console」两种情况没法放在同一个文件里测 ——
 * 谁先跑谁就把 flag 吃掉。这个文件只负责后者。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeDirective } from '@ds/vue2'
import type { DirectiveBinding } from 'vue'
import type { DsState } from '@ds/vue2'
import { createThemeManager } from '@ds/dom'
import { baseOpts } from './fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('static 通道且宿主没有 console', () => {
  it('不抛异常，也不因为找 console 而中断退化', () => {
    vi.stubGlobal('console', undefined)
    const m = createThemeManager({ ...baseOpts, channel: 'static' })
    const dir = makeDirective({ manager: m } as unknown as DsState)
    const node = document.createElement('div')

    expect(() => {
      dir.bind?.(node, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    }).not.toThrow()
    // 退化为整站切换这件事照常发生
    expect(m.state().theme).toBe('dark')
  })
})
