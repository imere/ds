/**
 * @ds/vue2 directive：v-ds-theme
 * -------------------------------------------------------------
 * 指令有两套行为：
 *   vars 通道 —— 把令牌写成元素的内联自定义属性，后代 var() 就近取值（局部换肤）
 *   static 通道 —— IE10 没有自定义属性，退化成整站切换并告警一次
 * 退化路径平时跑不到（现代浏览器默认都是 vars），这里用 channel: 'static' 强制走到。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeDirective } from '@ds/vue2'
import type { DirectiveBinding } from 'vue'
import type { DsState } from '@ds/vue2'
import { createThemeManager } from '@ds/dom'
import type { ThemeManager } from '@ds/dom'

function dsOf(manager: ThemeManager): DsState {
  // 指令只读 ds.manager，其余字段用不到
  return { manager } as unknown as DsState
}

function el(): HTMLElement {
  const node = document.createElement('div')
  document.body.appendChild(node)
  return node
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('vars 通道：局部换肤', () => {
  it('字符串形态 = 只换主题', () => {
    const m = createThemeManager({ channel: 'vars' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(node, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)

    expect(node.getAttribute('data-ds-theme')).toBe('dark')
    expect(node.style.getPropertyValue('--ds-color-bg')).toBe('#0b1220')
  })

  it('对象形态 = 主题 + 强调色', () => {
    const m = createThemeManager({ channel: 'vars' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(
      node,
      { value: { theme: 'dark', accent: 'green' } } as DirectiveBinding<never>,
      {} as never,
      {} as never
    )

    expect(node.getAttribute('data-ds-theme')).toBe('dark')
    expect(node.getAttribute('data-ds-accent')).toBe('green')
  })

  it('强调色传空串时按「没有强调色」解析', () => {
    const m = createThemeManager({ channel: 'vars' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(
      node,
      { value: { theme: 'dark', accent: '' } } as DirectiveBinding<never>,
      {} as never,
      {} as never
    )
    // 空串等价于不指定：accent 属性不写，令牌里也只剩主题那一套
    expect(node.hasAttribute('data-ds-accent')).toBe(false)
    expect(node.style.getPropertyValue('--ds-color-bg')).toBe('#0b1220')
  })

  it('值为空时把标记属性摘掉', () => {
    const m = createThemeManager({ channel: 'vars' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(node, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    dir.update?.(node, { value: null } as DirectiveBinding<never>, {} as never, {} as never)

    expect(node.hasAttribute('data-ds-theme')).toBe(false)
    expect(node.hasAttribute('data-ds-accent')).toBe(false)
  })

  it('同一个值不重复写（靠签名比对）', () => {
    const m = createThemeManager({ channel: 'vars' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(node, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    node.style.setProperty('--ds-color-bg', 'sentinel')
    dir.update?.(node, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    expect(node.style.getPropertyValue('--ds-color-bg')).toBe('sentinel')
  })

  it('换主题后清掉上一份里多出来的变量', () => {
    // 两份主题的令牌集合不同：b 比 a 少一个键
    const m = createThemeManager({
      channel: 'vars',
      preset: false,
      themes: {
        a: { mode: 'light', tokens: { color: { bg: '#fff', extra: '1px' } } },
        b: { mode: 'light', tokens: { color: { bg: '#000' } } },
      },
    })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(node, { value: 'a' } as DirectiveBinding<never>, {} as never, {} as never)
    expect(node.style.getPropertyValue('--ds-color-extra')).toBe('1px')

    dir.update?.(node, { value: 'b' } as DirectiveBinding<never>, {} as never, {} as never)
    expect(node.style.getPropertyValue('--ds-color-bg')).toBe('#000')
    expect(node.style.getPropertyValue('--ds-color-extra')).toBe('')
  })

  it('unbind 一个从没绑过的元素也不抛', () => {
    const m = createThemeManager({ channel: 'vars' })
    const dir = makeDirective(dsOf(m))
    expect(() => dir.unbind?.(el(), {} as never, {} as never, {} as never)).not.toThrow()
  })

  it('unbind 清掉内联变量并复位签名', () => {
    const m = createThemeManager({ channel: 'vars' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(node, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    dir.unbind?.(node, {} as never, {} as never, {} as never)
    expect(node.style.getPropertyValue('--ds-color-bg')).toBe('')

    // 复位之后再绑同值也要重新写一遍
    dir.bind?.(node, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    expect(node.style.getPropertyValue('--ds-color-bg')).toBe('#0b1220')
  })
})

describe('static 通道（IE10）：退化为整站切换', () => {
  it('只告警一次，并真的切了整站主题', () => {
    const m = createThemeManager({ channel: 'static' })
    const dir = makeDirective(dsOf(m))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const a = el()
    const b = el()

    dir.bind?.(a, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(m.state().theme).toBe('dark')

    dir.bind?.(b, { value: 'dark' } as DirectiveBinding<never>, {} as never, {} as never)
    expect(warn).toHaveBeenCalledTimes(1)

    warn.mockRestore()
  })

  it('没指定主题时不切整站主题（只按强调色走）', () => {
    const m = createThemeManager({ channel: 'static' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(
      node,
      { value: { accent: 'green' } } as DirectiveBinding<never>,
      {} as never,
      {} as never
    )
    expect(m.state().theme).toBe('light')
    expect(m.state().accent).toBe('green')
  })

  it('强调色也一并切（accent 为空串时清掉）', () => {
    const m = createThemeManager({ channel: 'static' })
    const dir = makeDirective(dsOf(m))
    const node = el()
    dir.bind?.(
      node,
      { value: { theme: 'dark', accent: 'green' } } as DirectiveBinding<never>,
      {} as never,
      {} as never
    )
    expect(m.state().accent).toBe('green')

    dir.update?.(
      node,
      { value: { theme: 'dark', accent: '' } } as DirectiveBinding<never>,
      {} as never,
      {} as never
    )
    expect(m.state().accent).toBe('')
  })
})
