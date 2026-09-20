/**
 * @ds/core token：嵌套 <-> 扁平 与两种合并
 * -------------------------------------------------------------
 * 重点覆盖两处「看起来能简化、简化了就出事」的地方：
 *   1. mergeTree 为什么必须存在（不能绕扁平键合并）
 *   2. flatten 跳过 undefined / null，以及 out 参数被复用时的行为
 */

import { describe, it, expect } from 'vitest'
import {
  defineTokens,
  flattenTokens,
  unflattenTokens,
  mergeTokens,
  mergeTree,
  pickTokens,
} from '@ds/core'

describe('defineTokens', () => {
  it('原样返回且保持引用', () => {
    const t = { color: { bg: '#fff' } }
    expect(defineTokens(t)).toBe(t)
  })

  it('非普通对象抛类型错误', () => {
    expect(() => defineTokens('nope' as never)).toThrow(TypeError)
    expect(() => defineTokens(null as never)).toThrow(/defineTokens/)
  })
})

describe('flattenTokens', () => {
  it('嵌套拍平成短横线键', () => {
    expect(flattenTokens({ color: { bgSubtle: '#fff' } })).toEqual({ 'color-bg-subtle': '#fff' })
  })

  it('顶层标量也走 kebab', () => {
    expect(flattenTokens({ radiusMd: '4px' })).toEqual({ 'radius-md': '4px' })
  })

  it('跳过 undefined 与 null，不让空值污染令牌表', () => {
    const flat = flattenTokens({ a: '1', b: undefined, c: null })
    expect(Object.keys(flat)).toEqual(['a'])
  })

  it('值统一转成字符串', () => {
    expect(flattenTokens({ n: 4 as unknown as string }).n).toBe('4')
  })

  it('可传入 out 复用同一个结果对象', () => {
    const out: Record<string, string> = { exist: 'x' }
    const r = flattenTokens({ a: '1' }, '', out)
    expect(r).toBe(out)
    expect(r).toEqual({ exist: 'x', a: '1' })
  })

  it('prefix 会作为键的前缀', () => {
    expect(flattenTokens({ brand: '#fff' }, 'color')).toEqual({ 'color-brand': '#fff' })
  })

  it('跳过原型链上的键', () => {
    const proto = { inherited: 'no' }
    const src = Object.create(proto) as Record<string, unknown>
    src.own = 'yes'
    expect(Object.keys(flattenTokens(src))).toEqual(['own'])
  })
})

describe('unflattenTokens', () => {
  it('扁平键还原成嵌套', () => {
    // 注意：按 '-' 切段，所以 'color-fg-muted' 会还原成 color.fg.muted 两级，
    // 而不是 color 下的一个 'fg-muted' 平级键
    expect(unflattenTokens({ 'color-bg': '#fff', 'color-fg-muted': '#000' })).toEqual({
      color: { bg: '#fff', fg: { muted: '#000' } },
    })
  })

  it('单段键直接挂顶层', () => {
    expect(unflattenTokens({ brand: '#fff' })).toEqual({ brand: '#fff' })
  })

  it('空表给空对象', () => {
    expect(unflattenTokens({})).toEqual({})
  })

  it('跳过原型链上的键', () => {
    const proto = { inherited: 'no' }
    const src = Object.create(proto) as Record<string, unknown>
    src['own-x'] = 'yes'
    expect(Object.keys(unflattenTokens(src as Record<string, string>))).toEqual(['own'])
  })
})

describe('mergeTokens', () => {
  it('后者覆盖前者（扁平键粒度）', () => {
    expect(mergeTokens({ a: '1', b: '2' }, { b: '3' })).toEqual({ a: '1', b: '3' })
  })

  it('嵌套入参先拍平再合并', () => {
    expect(mergeTokens({ color: { bg: '#fff' } }, { color: { bg: '#000' } })).toEqual({
      'color-bg': '#000',
    })
  })

  it('null / undefined 源被跳过', () => {
    expect(mergeTokens(null, { a: '1' }, undefined)).toEqual({ a: '1' })
  })

  it('不给任何源就是空表', () => {
    expect(mergeTokens()).toEqual({})
  })
})

describe('mergeTree', () => {
  it('后者覆盖前者，非对象值直接替换', () => {
    expect(mergeTree({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 })
  })

  it('两端都是对象时继续往下钻', () => {
    expect(mergeTree({ color: { bg: '#fff', fg: '#000' } }, { color: { bg: '#111' } })).toEqual({
      color: { bg: '#111', fg: '#000' },
    })
  })

  it('一端是标量一端是对象时，标量被对象盖掉', () => {
    expect(mergeTree({ color: '#fff' }, { color: { bg: '#000' } })).toEqual({
      color: { bg: '#000' },
    })
  })

  it('undefined 不写进结果（留着 base 里的旧值）', () => {
    expect(mergeTree({ a: 1 }, { a: undefined })).toEqual({ a: 1 })
  })

  it('null / 非对象入参被跳过', () => {
    expect(mergeTree(null, { a: 1 })).toEqual({ a: 1 })
    expect(mergeTree({ a: 1 }, 'nope' as never)).toEqual({ a: 1 })
  })

  it('跳过原型链上的键', () => {
    const proto = { inherited: 'no' }
    const patch = Object.create(proto) as Record<string, unknown>
    patch.own = 'yes'
    expect(Object.keys(mergeTree({ a: 1 }, patch))).toEqual(['a', 'own'])
  })

  /**
   * 这条是 mergeTree 存在的理由。
   * 拍平后 'color-brand' 与 'color-brand-hover' 是两个键，unflatten 时都要写
   * color.brand —— 一个要字符串一个要对象，谁后写谁把对方冲掉。
   */
  it('长短键共存时不会互相冲掉（扁平合并做不到这件事）', () => {
    const merged = mergeTree(
      { color: { brand: '#4f46e5' } },
      { color: { brandHover: '#3f37c9', brandSubtle: 'rgba(79, 70, 229, 0.12)' } }
    )
    expect(merged.color).toEqual({
      brand: '#4f46e5',
      brandHover: '#3f37c9',
      brandSubtle: 'rgba(79, 70, 229, 0.12)',
    })
  })
})

describe('pickTokens', () => {
  it('只取某个前缀下的键并去掉前缀', () => {
    expect(pickTokens({ 'color-bg': '#fff', 'radius-md': '4px' }, 'color')).toEqual({ bg: '#fff' })
  })

  it('前缀不匹配则返回空表', () => {
    expect(pickTokens({ 'color-bg': '#fff' }, 'radius')).toEqual({})
  })

  it('跳过原型链上的键', () => {
    const proto = { 'color-inherited': 'no' }
    const src = Object.create(proto) as Record<string, string>
    src['color-own'] = 'yes'
    expect(pickTokens(src, 'color')).toEqual({ own: 'yes' })
  })
})
