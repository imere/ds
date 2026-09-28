/**
 * @ds/core util：零依赖小工具
 * -------------------------------------------------------------
 * 这些函数是全库的底座（assign / each 替代 Object.assign / for-of），
 * 它们的降级分支平时跑不到 —— 比如 assign 跳过 null 源、each 吃掉 null，
 * 只有显式构造才能覆盖。这里逐个构造。
 */

import { describe, it, expect } from 'vitest'
import {
  isPlainObject,
  assign,
  kebab,
  each,
  map,
  filter,
  unique,
  get,
  shallowEqual,
  cssProp,
} from '@ds/core'

describe('isPlainObject', () => {
  it('普通对象为 true', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
  })

  it('数组 / null / 基本类型为 false', () => {
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject('x')).toBe(false)
    expect(isPlainObject(1)).toBe(false)
  })
})

describe('assign', () => {
  it('后者覆盖前者', () => {
    expect(assign({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 2, b: 3 })
  })

  it('null / undefined 源被跳过', () => {
    expect(assign({ a: 1 }, null, undefined, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('只搬自有属性，原型上的不算', () => {
    const proto = { inherited: 'no' }
    const src = Object.create(proto) as Record<string, unknown>
    src.own = 'yes'
    expect(assign({}, src)).toEqual({ own: 'yes' })
  })

  it('返回的是 target 本身', () => {
    const target = { a: 1 }
    expect(assign(target, { b: 2 })).toBe(target)
  })
})

describe('kebab', () => {
  it('驼峰转短横线', () => {
    expect(kebab('bgSubtle')).toBe('bg-subtle')
    expect(kebab('borderTopLeftRadius')).toBe('border-top-left-radius')
  })

  it('没有大写就原样返回', () => {
    expect(kebab('color')).toBe('color')
    expect(kebab('')).toBe('')
  })

  it('非字符串先 String() 一遍', () => {
    // 运行时拼键可能拼出数字，String() 兜住它而不是抛
    expect(kebab(12 as unknown as string)).toBe('12')
  })
})

describe('each', () => {
  it('数组给下标', () => {
    const seen: Array<[unknown, string | number]> = []
    each(['a', 'b'], (v, k) => seen.push([v, k]))
    expect(seen).toEqual([
      ['a', 0],
      ['b', 1],
    ])
  })

  it('对象给属性名', () => {
    const seen: Array<[unknown, string | number]> = []
    each({ x: 1, y: 2 }, (v, k) => seen.push([v, k]))
    expect(seen).toEqual([
      [1, 'x'],
      [2, 'y'],
    ])
  })

  it('null / undefined 静默跳过', () => {
    let n = 0
    each(null, () => n++)
    each(undefined, () => n++)
    expect(n).toBe(0)
  })

  it('跳过原型链上的属性', () => {
    const proto = { inherited: 1 }
    const src = Object.create(proto) as Record<string, unknown>
    src.own = 2
    const keys: Array<string | number> = []
    each(src, (_v, k) => keys.push(k))
    expect(keys).toEqual(['own'])
  })
})

describe('map / filter / unique', () => {
  it('map 数组与对象都能用', () => {
    expect(map([1, 2], (v) => v * 2)).toEqual([2, 4])
    expect(map({ a: 1 }, (v) => v)).toEqual([1])
  })

  it('map 空输入给空数组', () => {
    expect(map(null, (v) => v)).toEqual([])
  })

  it('filter 按回调筛选', () => {
    expect(filter([1, 2, 3], (v) => v > 1)).toEqual([2, 3])
    expect(filter({ a: 1, b: 2 }, (v) => v === 2)).toEqual([2])
  })

  it('unique 去重且不依赖 Set', () => {
    expect(unique([1, 1, 2, 2, 1])).toEqual([1, 2])
    expect(unique({ a: 'x', b: 'x' })).toEqual(['x'])
  })
})

describe('get', () => {
  const obj = { color: { brand: '#fff', deep: { x: 1 } }, n: 0 }

  it('按路径取值', () => {
    expect(get(obj, 'color.brand')).toBe('#fff')
    expect(get(obj, 'color.deep.x')).toBe(1)
    expect(get(obj, 'n')).toBe(0)
  })

  it('取不到给 undefined', () => {
    expect(get(obj, 'color.nope')).toBeUndefined()
    expect(get(obj, 'a.b.c.d')).toBeUndefined()
  })

  it('obj 或 path 为空直接 undefined', () => {
    expect(get(null, 'a')).toBeUndefined()
    expect(get(obj, '')).toBeUndefined()
  })
})

describe('shallowEqual', () => {
  it('同一引用直接相等', () => {
    const o = { a: 1 }
    expect(shallowEqual(o, o)).toBe(true)
  })

  it('内容相同为 true', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
  })

  it('键数不同为 false', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('值不同为 false', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('有一端不是普通对象就 false', () => {
    expect(shallowEqual({ a: 1 }, null)).toBe(false)
    expect(shallowEqual(1, 1)).toBe(true) // 走的 a === b 那条
    expect(shallowEqual([1], [1])).toBe(false)
  })
})

describe('cssProp', () => {
  it('驼峰转短横线，对齐 CSS 属性写法', () => {
    expect(cssProp('backgroundColor')).toBe('background-color')
    expect(cssProp('color')).toBe('color')
  })
})
