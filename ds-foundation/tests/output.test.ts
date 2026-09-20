/**
 * @ds/core output：令牌表 -> CSS 文本
 * -------------------------------------------------------------
 * IE10 通道全靠这一层：var() 求值、多轮迭代解开链式引用、规则拼装。
 * 所以「解不开」「空规则」「值为数组（前缀降级）」这些边角都要单独测。
 */

import { describe, it, expect } from 'vitest'
import {
  cssVarName,
  cssVarRef,
  toCssVars,
  toScopedCss,
  resolveVars,
  rulesToCss,
  toStyleTag,
  renderStyleTags,
} from '@ds/core'
import type { CssRule } from '@ds/core'

describe('cssVarName / cssVarRef', () => {
  it('键名 -> 变量名', () => {
    expect(cssVarName('color-bg')).toBe('--ds-color-bg')
    expect(cssVarName('color-bg', 'acme')).toBe('--acme-color-bg')
  })

  it('引用形式', () => {
    expect(cssVarRef('color-bg')).toBe('var(--ds-color-bg)')
  })

  it('带 fallback 的引用形式', () => {
    expect(cssVarRef('color-bg', 'acme', '#fff')).toBe('var(--acme-color-bg,#fff)')
  })
})

describe('toCssVars', () => {
  it('默认选择器是 :root', () => {
    expect(toCssVars({ 'color-bg': '#fff' })).toBe(':root{--ds-color-bg:#fff;}')
  })

  it('自定义选择器', () => {
    expect(toCssVars({ 'color-bg': '#fff' }, { selector: '.x' })).toBe('.x{--ds-color-bg:#fff;}')
  })

  it('important 会加到每条声明上', () => {
    expect(toCssVars({ 'color-bg': '#fff' }, { important: true })).toBe(
      ':root{--ds-color-bg:#fff !important;}'
    )
  })

  it('空表也能出一条空规则，不会拼出 undefined', () => {
    expect(toCssVars({})).toBe(':root{}')
  })
})

describe('toScopedCss', () => {
  it('选择器由入参指定，其余选项透传', () => {
    expect(toScopedCss({ 'color-bg': '#000' }, '[data-ds-theme="dark"]')).toBe(
      '[data-ds-theme="dark"]{--ds-color-bg:#000;}'
    )
  })

  it('透传的 important 依然生效', () => {
    expect(toScopedCss({ 'color-bg': '#000' }, '.dark', { important: true })).toContain(
      '!important'
    )
  })
})

describe('resolveVars', () => {
  it('链式引用逐层解开', () => {
    const out = resolveVars({ a: '#f00', b: 'var(--ds-a)', c: 'var(--ds-b)' })
    expect(out.c).toBe('#f00')
  })

  it('循环引用不会转不出来（最多迭代 5 轮后收工）', () => {
    // 两轮之后 a 停在 'var(--ds-a)'（自引用），既没有死循环也没有抛错 ——
    // 剩下的交给浏览器：无效声明会被忽略
    expect(resolveVars({ a: 'var(--ds-b)', b: 'var(--ds-a)' }).a).toBe('var(--ds-a)')
  })

  it('一轮就解完时立刻收工（changed=false 那条分支）', () => {
    expect(resolveVars({ a: '#f00' }).a).toBe('#f00')
  })

  it('自定义前缀下也能解开', () => {
    expect(resolveVars({ a: '#f00', b: 'var(--acme-a)' }, { prefix: 'acme' }).b).toBe('#f00')
  })
})

describe('rulesToCss', () => {
  const rule: CssRule = { selector: '.a', decls: { color: 'red' } }

  it('数组形态', () => {
    expect(rulesToCss([rule])).toBe('.a{color:red;}\n')
  })

  it('字典形态（按值遍历）', () => {
    expect(rulesToCss({ k: rule })).toBe('.a{color:red;}\n')
  })

  it('indent: false 时不换行', () => {
    expect(rulesToCss([rule], { indent: false })).toBe('.a{color:red;}')
  })

  it('值是数组时按顺序输出多条（IE10 前缀降级靠它）', () => {
    expect(
      rulesToCss([{ selector: '.flex', decls: { display: ['-ms-flexbox', 'flex'] } }], {
        indent: false,
      })
    ).toBe('.flex{display:-ms-flexbox;display:flex;}')
  })

  it('undefined / null 的声明被跳过', () => {
    expect(
      rulesToCss([{ selector: '.a', decls: { color: undefined as never, background: 'red' } }], {
        indent: false,
      })
    ).toBe('.a{background:red;}')
  })

  it('没 decls 或声明全空的规则被跳过', () => {
    expect(rulesToCss([{ selector: '.a' } as CssRule], { indent: false })).toBe('')
    expect(rulesToCss([{ selector: '.a', decls: {} }], { indent: false })).toBe('')
    expect(rulesToCss([null as unknown as CssRule], { indent: false })).toBe('')
  })

  it('给了 resolve 就把 var() 换成实值', () => {
    expect(
      rulesToCss([{ selector: '.a', decls: { color: 'var(--ds-x)' } }], {
        indent: false,
        resolve: { x: '#f00' },
      })
    ).toBe('.a{color:#f00;}')
  })

  it('important 会加到每条声明上', () => {
    expect(rulesToCss([rule], { indent: false, important: true })).toBe('.a{color:red !important;}')
  })
})

describe('toStyleTag', () => {
  it('不给 id 就只有标记属性', () => {
    expect(toStyleTag('.a{}')).toBe('<style>.a{}</style>')
  })

  it('给 id 时同时写 id 与标记属性', () => {
    expect(toStyleTag('.a{}', 'ds-tokens')).toBe(
      '<style id="ds-tokens" data-ds-style="ds-tokens">.a{}</style>'
    )
  })

  it('额外属性原样拼上', () => {
    expect(toStyleTag('.a{}', 'x', { media: 'print' })).toBe(
      '<style id="x" media="print" data-ds-style="x">.a{}</style>'
    )
  })

  it('标记属性跟着前缀走', () => {
    expect(toStyleTag('.a{}', 'x', null, 'acme')).toContain('data-acme-style')
  })
})

describe('renderStyleTags', () => {
  it('每个块一个带 id 的 style', () => {
    const out = renderStyleTags({ tokens: '.a{}', primitive: '.b{}' })
    expect(out).toBe(
      '<style id="ds-tokens" data-ds-style="ds-tokens">.a{}</style>' +
        '<style id="ds-primitive" data-ds-style="ds-primitive">.b{}</style>'
    )
  })

  it('空串 / null 的块被跳过', () => {
    expect(renderStyleTags({ a: '', b: null as unknown as string })).toBe('')
    expect(renderStyleTags(null)).toBe('')
  })
})
