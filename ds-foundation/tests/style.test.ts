/**
 * @ds/dom style：<style> 标签管理
 * -------------------------------------------------------------
 * IE 单个样式表有规则上限（IE9 是 4095），撞线的表现是「后面的样式静默丢失」，
 * 极难排查。所以这里默认按 4000 条切片 —— 切片、复用、清理多余标签都要测到。
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  splitCss,
  ensureStyle,
  writeStyle,
  removeStyle,
  setCssVar,
  removeCssVar,
  getHead,
  DEFAULT_MAX_RULES,
} from '@ds/dom'

beforeEach(() => {
  document.head.innerHTML = ''
})

describe('splitCss', () => {
  it('按 } 计数切片', () => {
    expect(splitCss('.a{}.b{}.c{}', 2)).toEqual(['.a{}.b{}', '.c{}'])
  })

  it('没超限就是一片', () => {
    expect(splitCss('.a{}', 4000)).toEqual(['.a{}'])
  })

  it('空串也给一片空串，避免写出没有内容的 style', () => {
    expect(splitCss('')).toEqual([''])
  })

  it('默认上限是 4000', () => {
    expect(DEFAULT_MAX_RULES).toBe(4000)
  })
})

describe('getHead / ensureStyle', () => {
  it('取到 head', () => {
    expect(getHead(document).tagName.toLowerCase()).toBe('head')
  })

  it('没有 doc 时返回 null，不抛', () => {
    expect(ensureStyle(null as unknown as Document, 'x')).toBeNull()
  })

  it('首次创建并打上标记属性', () => {
    const el = ensureStyle(document, 'ds-tokens')
    expect(el).not.toBeNull()
    expect(el?.id).toBe('ds-tokens')
    expect(el?.getAttribute('data-ds-style')).toBe('ds-tokens')
    expect((el as HTMLStyleElement).type).toBe('text/css')
  })

  it('已存在时复用同一个元素', () => {
    const a = ensureStyle(document, 'ds-tokens')
    const b = ensureStyle(document, 'ds-tokens')
    expect(a).toBe(b)
    expect(document.head.getElementsByTagName('style')).toHaveLength(1)
  })

  it('标记属性跟着前缀走', () => {
    const el = ensureStyle(document, 'x', 'acme')
    expect(el?.getAttribute('data-acme-style')).toBe('x')
  })
})

describe('writeStyle', () => {
  it('单片时用原 id', () => {
    expect(writeStyle(document, 'ds-tokens', '.a{}')).toEqual(['ds-tokens'])
    expect(document.getElementById('ds-tokens')?.textContent).toBe('.a{}')
  })

  it('多片时按序号命名', () => {
    const ids = writeStyle(document, 'ds-tokens', '.a{}.b{}.c{}', { maxRules: 2 })
    expect(ids).toEqual(['ds-tokens-0', 'ds-tokens-1'])
    expect(document.getElementById('ds-tokens-1')?.textContent).toBe('.c{}')
  })

  it('这次变短了就把多余的旧标签删掉', () => {
    writeStyle(document, 'ds-tokens', '.a{}.b{}.c{}', { maxRules: 2, cleanup: false })
    expect(document.getElementById('ds-tokens-1')).not.toBeNull()

    writeStyle(document, 'ds-tokens', '.a{}', { maxRules: 2, previousCount: 2 })
    expect(document.getElementById('ds-tokens-1')).toBeNull()
  })

  it('cleanup: false 时不删多余标签', () => {
    writeStyle(document, 'ds-tokens', '.a{}.b{}.c{}', { maxRules: 2, cleanup: false })
    writeStyle(document, 'ds-tokens', '.a{}', {
      maxRules: 2,
      cleanup: false,
      previousCount: 2,
    })
    expect(document.getElementById('ds-tokens-1')).not.toBeNull()
  })

  it('没有 doc 时不记 id，也不抛', () => {
    expect(writeStyle(null as unknown as Document, 'x', '.a{}')).toEqual([])
  })

  it('清理多余的旧标签时，标签不存在也不抛', () => {
    writeStyle(document, 'x', '.a{}', { previousCount: 3 })
    expect(document.getElementById('x')).not.toBeNull()
  })

  it('没有 head 时挂到 documentElement 上', () => {
    const root = document.createElement('div')
    const fakeDoc = {
      getElementById: () => null,
      createElement: () => document.createElement('style'),
      getElementsByTagName: () => [],
      documentElement: root,
    } as unknown as Document
    expect(getHead(fakeDoc)).toBe(root)
  })

  it('css 为空时也能写出一个空 style', () => {
    expect(writeStyle(document, 'x', '')).toEqual(['x'])
  })

  /**
   * IE8/IE9 的 <style> 只有 styleSheet.cssText，给 textContent 赋值会抛。
   * 本包最低 IE10，走到这里说明宿主环境异常 —— 但要能再退一步而不是崩。
   */
  it('textContent 写不进去时退到 styleSheet.cssText', () => {
    const el = document.createElement('style')
    el.id = 'legacy'
    document.head.appendChild(el)
    Object.defineProperty(el, 'textContent', {
      configurable: true,
      set() {
        throw new Error('not supported')
      },
    })
    const legacy = { cssText: '' }
    Object.defineProperty(el, 'styleSheet', { configurable: true, value: legacy })

    writeStyle(document, 'legacy', '.a{color:red}')
    expect(legacy.cssText).toBe('.a{color:red}')
  })

  it('连 styleSheet 都没有时就静默放弃', () => {
    const el = document.createElement('style')
    el.id = 'broken'
    document.head.appendChild(el)
    Object.defineProperty(el, 'textContent', {
      configurable: true,
      set() {
        throw new Error('not supported')
      },
    })
    expect(() => writeStyle(document, 'broken', '.a{}')).not.toThrow()
  })
})

describe('removeStyle', () => {
  it('按 id 逐个删除', () => {
    writeStyle(document, 'a', '.a{}')
    writeStyle(document, 'b', '.b{}')
    removeStyle(document, ['a', 'b'])
    expect(document.getElementById('a')).toBeNull()
    expect(document.getElementById('b')).toBeNull()
  })

  it('没有 doc / 没有 ids 时静默返回', () => {
    expect(() => removeStyle(null as unknown as Document, ['a'])).not.toThrow()
    expect(() => removeStyle(document, null as unknown as string[])).not.toThrow()
  })

  it('id 不存在也不抛', () => {
    expect(() => removeStyle(document, ['nope'])).not.toThrow()
  })
})

describe('setCssVar / removeCssVar', () => {
  it('写入与删除自定义属性', () => {
    const el = document.createElement('div')
    setCssVar(el, '--ds-color-bg', '#fff')
    expect(el.style.getPropertyValue('--ds-color-bg')).toBe('#fff')
    removeCssVar(el, '--ds-color-bg')
    expect(el.style.getPropertyValue('--ds-color-bg')).toBe('')
  })

  it('没有元素时静默返回', () => {
    expect(() => setCssVar(null, '--x', '1')).not.toThrow()
    expect(() => removeCssVar(null, '--x')).not.toThrow()
  })

  it('setProperty 抛异常（被强切到 vars 通道的 IE10）时静默失败', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'style', {
      configurable: true,
      value: {
        setProperty() {
          throw new Error('denied')
        },
        removeProperty() {
          throw new Error('denied')
        },
      },
    })
    expect(() => setCssVar(el, '--x', '1')).not.toThrow()
    expect(() => removeCssVar(el, '--x')).not.toThrow()
  })
})
