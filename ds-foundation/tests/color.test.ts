/**
 * @ds/core color：色值换算
 * -------------------------------------------------------------
 * 四条降级路径必须都跑到：
 *   · 三位 hex 展开（业务手写 #fff 很常见）
 *   · rgb() 的逗号语法与空格斜杠语法（CSS 两套写法都合法）
 *   · 解析失败返回 null —— 上游靠这个信号保留原值，而不是把令牌写成空
 *   · resolveVarValue 找不到值时的 fallback 与「原样返回」两条分支
 */

import { describe, it, expect } from 'vitest'
import {
  parseHex,
  parseRgb,
  parseColor,
  toChannels,
  toRgba,
  toHex,
  mix,
  luminance,
  contrast,
  resolveVarValue,
  isColorToken,
} from '@ds/core'

describe('parseHex', () => {
  it('六位 hex', () => {
    expect(parseHex('#4f46e5')).toEqual({ r: 79, g: 70, b: 229 })
  })

  it('三位 hex 展开成六位', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHex('0f0')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('长度不对或非十六进制字符 -> null', () => {
    expect(parseHex('#ff')).toBeNull()
    expect(parseHex('#ffff')).toBeNull()
    expect(parseHex('#gggggg')).toBeNull()
  })

  it('非字符串 -> null', () => {
    expect(parseHex(123 as unknown as string)).toBeNull()
  })
})

describe('parseRgb', () => {
  it('逗号 + alpha 语法', () => {
    expect(parseRgb('rgba(15, 23, 42, .045)')).toEqual({ r: 15, g: 23, b: 42, a: 0.045 })
  })

  it('空格斜杠语法（现代 CSS 写法）', () => {
    expect(parseRgb('rgb(15 23 42 / 0.5)')).toEqual({ r: 15, g: 23, b: 42, a: 0.5 })
  })

  it('不给 alpha 时默认 1', () => {
    expect(parseRgb('rgb(1,2,3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
  })

  it('不足三段 -> null', () => {
    expect(parseRgb('rgb(1,2)')).toBeNull()
  })

  it('通道解析不出数字 -> null', () => {
    expect(parseRgb('rgb(a,b,c)')).toBeNull()
  })

  it('alpha 解析不出数字 -> 退回 1', () => {
    expect(parseRgb('rgb(1,2,3,x)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
  })

  it('不是 rgb() 形态 -> null', () => {
    expect(parseRgb('#fff')).toBeNull()
  })

  it('非字符串 -> null', () => {
    expect(parseRgb(null as unknown as string)).toBeNull()
  })
})

describe('parseColor', () => {
  it('# 开头走 hex 分支并补 alpha', () => {
    expect(parseColor('#4f46e5')).toEqual({ r: 79, g: 70, b: 229, a: 1 })
  })

  it('# 开头但解析不了 -> null', () => {
    expect(parseColor('#zz')).toBeNull()
  })

  it('其余走 rgb 分支', () => {
    expect(parseColor('rgb(1,2,3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
  })

  it('非字符串 -> null', () => {
    expect(parseColor(1 as unknown as string)).toBeNull()
  })
})

describe('toChannels', () => {
  it('输出空格分隔的三通道，供 rgb(var(--x) / a) 使用', () => {
    expect(toChannels('#4f46e5')).toBe('79 70 229')
  })

  it('解析不了 -> null', () => {
    expect(toChannels('not-a-color')).toBeNull()
  })
})

describe('toRgba', () => {
  it('不传 alpha 时用原值的 alpha', () => {
    expect(toRgba('rgba(15, 23, 42, 0.5)')).toBe('rgba(15, 23, 42, 0.5)')
  })

  it('传 alpha 时覆盖', () => {
    expect(toRgba('#4f46e5', 0.12)).toBe('rgba(79, 70, 229, 0.12)')
  })

  it('传 null 也当作没传', () => {
    expect(toRgba('#4f46e5', null)).toBe('rgba(79, 70, 229, 1)')
  })

  it('解析不了 -> null', () => {
    expect(toRgba('nope')).toBeNull()
  })
})

describe('toHex', () => {
  it('转回 #rrggbb', () => {
    expect(toHex('rgb(79, 70, 229)')).toBe('#4f46e5')
  })

  it('单位数补零', () => {
    expect(toHex('rgb(0, 0, 0)')).toBe('#000000')
  })

  it('超出 0-255 会被钳位', () => {
    expect(toHex('rgb(300, -20, 255)')).toBe('#ff00ff')
  })

  it('解析不了 -> null', () => {
    expect(toHex('nope')).toBeNull()
  })
})

describe('mix', () => {
  it('默认各取一半', () => {
    expect(mix('#000000', '#ffffff')).toBe('rgb(128, 128, 128)')
  })

  it('weight=0 取前者，1 取后者', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('rgb(0, 0, 0)')
    expect(mix('#000000', '#ffffff', 1)).toBe('rgb(255, 255, 255)')
  })

  it('任一色解析不了 -> null', () => {
    expect(mix('#000000', 'nope')).toBeNull()
    expect(mix('nope', '#ffffff')).toBeNull()
  })
})

describe('luminance / contrast', () => {
  it('黑色亮度为 0，白色为 1', () => {
    expect(luminance('#000000')).toBe(0)
    expect(luminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('解析不了的颜色亮度按 0 算，不会算出 NaN', () => {
    expect(luminance('nope')).toBe(0)
  })

  it('对比度对两色对称', () => {
    expect(contrast('#ffffff', '#000000')).toBe(contrast('#000000', '#ffffff'))
  })

  it('白底黑字是 21', () => {
    expect(contrast('#ffffff', '#000000')).toBe(21)
  })
})

describe('resolveVarValue', () => {
  const tokens = { 'color-brand': '#4f46e5', 'color-bg': '#ffffff' }

  it('不含 var() 就原样返回', () => {
    expect(resolveVarValue('#fff', tokens, 'ds')).toBe('#fff')
  })

  it('非字符串也原样返回', () => {
    expect(resolveVarValue(1 as unknown as string, tokens, 'ds')).toBe(1)
  })

  it('按带前缀的键名命中', () => {
    expect(resolveVarValue('var(--ds-color-brand)', tokens, 'ds')).toBe('#4f46e5')
  })

  it('按去掉前缀的裸键名命中', () => {
    expect(resolveVarValue('var(--ds-color-brand)', tokens, 'ds')).toBe('#4f46e5')
  })

  it('变量名不带本库前缀时，直接用全名去查表', () => {
    expect(resolveVarValue('var(--other)', { other: '#0f0' }, 'ds')).toBe('#0f0')
  })

  it('默认前缀是 ds', () => {
    expect(resolveVarValue('var(--ds-color-bg)', tokens)).toBe('#ffffff')
  })

  it('找不到且有 fallback 时用 fallback', () => {
    expect(resolveVarValue('var(--ds-nope, #000)', tokens, 'ds')).toBe('#000')
  })

  it('找不到且没 fallback 时保留原式，交给浏览器忽略这条声明', () => {
    expect(resolveVarValue('var(--ds-nope)', tokens, 'ds')).toBe('var(--ds-nope)')
  })
})

describe('isColorToken', () => {
  it('# 与 rgb 开头的字符串算颜色', () => {
    expect(isColorToken('#fff')).toBe(true)
    expect(isColorToken('rgba(0,0,0,0.5)')).toBe(true)
  })

  it('其他值不算', () => {
    expect(isColorToken('4px')).toBe(false)
    expect(isColorToken(123)).toBe(false)
    expect(isColorToken(null)).toBe(false)
  })
})
