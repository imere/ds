/**
 * @ds/core prefix：前缀归一化
 * -------------------------------------------------------------
 * 业务换前缀只应该改一处，所以 normalizePrefix 接受四种写法：
 * 'acme' / '--acme-' / 'acme-' / { ns, var, cls, ... }。
 * 非法输入一律兜底到 'ds'（前缀要拼进 CSS 选择器，抛错会让整页样式挂掉）。
 */

import { describe, it, expect } from 'vitest'
import { normalizePrefix, isPrefix, prefixOf, DEFAULT_NS } from '@ds/core'
import type { Prefix } from '@ds/core'

describe('normalizePrefix：四种写法归一到同一个 ns', () => {
  it('命名空间写法', () => {
    expect(normalizePrefix('acme').ns).toBe('acme')
  })

  it('CSS 变量写法', () => {
    const p = normalizePrefix('--acme-')
    expect(p.ns).toBe('acme')
    expect(p.var).toBe('--acme-')
  })

  it('class 写法', () => {
    const p = normalizePrefix('acme-')
    expect(p.ns).toBe('acme')
    expect(p.cls).toBe('acme-')
  })

  it('中间的短横线属于前缀本身，只砍末尾那一个', () => {
    expect(normalizePrefix('ac-me-').ns).toBe('ac-me')
  })

  it('已归一化对象原样透传', () => {
    const p = normalizePrefix('acme')
    expect(normalizePrefix(p).ns).toBe('acme')
  })
})

describe('normalizePrefix：对象形态的取值顺序', () => {
  it('优先 ns', () => {
    expect(normalizePrefix({ ns: 'acme', token: 'other' }).ns).toBe('acme')
  })

  it('其次 token', () => {
    expect(normalizePrefix({ token: 'acme' }).ns).toBe('acme')
  })

  it('再次 var', () => {
    expect(normalizePrefix({ var: '--acme-' }).ns).toBe('acme')
  })

  it('再次 cls', () => {
    expect(normalizePrefix({ cls: 'acme-' }).ns).toBe('acme')
  })

  it('最后 class', () => {
    expect(normalizePrefix({ class: 'acme-' }).ns).toBe('acme')
  })

  it('空对象退回默认', () => {
    expect(normalizePrefix({}).ns).toBe(DEFAULT_NS)
  })
})

describe('normalizePrefix：非法输入兜底而不是抛错', () => {
  it('空串 / null / undefined', () => {
    expect(normalizePrefix('').ns).toBe(DEFAULT_NS)
    expect(normalizePrefix(null).ns).toBe(DEFAULT_NS)
    expect(normalizePrefix().ns).toBe(DEFAULT_NS)
  })

  it('数字开头（CSS 选择器不允许）', () => {
    expect(normalizePrefix('1abc').ns).toBe(DEFAULT_NS)
  })

  it('含空格或特殊字符', () => {
    expect(normalizePrefix('a b').ns).toBe(DEFAULT_NS)
    expect(normalizePrefix('a.b').ns).toBe(DEFAULT_NS)
  })

  it('既不是字符串也不是对象', () => {
    expect(normalizePrefix(123 as unknown as string).ns).toBe(DEFAULT_NS)
  })
})

describe('normalizePrefix：一处设置，五处同时生效', () => {
  const p = normalizePrefix('acme')

  it('CSS 变量', () => expect(p.var).toBe('--acme-'))
  it('class', () => expect(p.cls).toBe('acme-'))
  it('classPrefix 是 cls 的别名', () => expect(p.classPrefix).toBe('acme-'))
  it('token 是 ns 的别名', () => expect(p.token).toBe('acme'))
  it('DOM 属性', () => {
    expect(p.attr).toBe('data-acme-theme')
    expect(p.modeAttr).toBe('data-acme-mode')
    expect(p.accentAttr).toBe('data-acme-accent')
    expect(p.styleAttr).toBe('data-acme-style')
  })
  it('style id', () => {
    expect(p.ids.tokens).toBe('acme-tokens')
    expect(p.ids.primitive).toBe('acme-class-primitive')
    expect(p.ids.semantic).toBe('acme-class-semantic')
    expect(p.ids.ssr).toBe('acme-ssr')
  })
  it('存储 key', () => {
    expect(p.keys.theme).toBe('acme-theme')
    expect(p.keys.accent).toBe('acme-accent')
  })
})

describe('isPrefix', () => {
  it('有 ns 与 var 的才算已归一化', () => {
    expect(isPrefix(normalizePrefix('acme'))).toBe(true)
  })

  it('缺 var 不算', () => {
    expect(isPrefix({ ns: 'acme' })).toBe(false)
  })

  it('非对象不算', () => {
    expect(isPrefix('acme')).toBe(false)
    expect(isPrefix(null)).toBe(false)
  })
})

describe('prefixOf', () => {
  it('已归一化就原样返回，不重复计算', () => {
    const p: Prefix = normalizePrefix('acme')
    expect(prefixOf(p)).toBe(p)
  })

  it('其余一律走归一化', () => {
    expect(prefixOf('acme').ns).toBe('acme')
    expect(prefixOf('--acme-').var).toBe('--acme-')
    expect(prefixOf(null).ns).toBe(DEFAULT_NS)
    expect(prefixOf().ns).toBe(DEFAULT_NS)
  })
})
