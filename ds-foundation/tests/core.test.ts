/**
 * @ds/core 纯逻辑层
 * -------------------------------------------------------------
 * 由原 scripts/smoke.mjs 迁移而来，断言语义一律不变。
 * 不需要 DOM，跑在 node 环境。
 */

import { describe, it, expect } from 'vitest'
import {
  createRegistry,
  createTheme,
  resolveVars,
  buildClassSheet,
  toCssVars,
  resolveVarValue,
  normalizePrefix,
  prefixOf,
  cssVarName,
  contrast,
  lightTheme,
  darkTheme,
  accents,
} from '@ds/core'
import type { ThemeDef } from '@ds/core'
import { splitCss, getInitScript, pickChannel, restoreScript } from '@ds/dom'

function makeRegistry() {
  const registry = createRegistry()
  registry.theme('light', lightTheme)
  registry.theme('dark', darkTheme)
  registry.accent('green', accents.green)
  registry.use('dark')
  registry.useAccent('green')
  return registry
}

describe('1. 令牌解析', () => {
  it('注册中心解析出令牌', () => {
    const flat = makeRegistry().resolve()
    expect(Object.keys(flat).length).toBeGreaterThan(30)
  })

  it('主题生效（dark 的 bg）', () => {
    expect(makeRegistry().resolve()['color-bg']).toBe('#0b1220')
  })

  it('强调色覆盖 brand', () => {
    expect(makeRegistry().resolve()['color-brand']).toBe('#16a34a')
  })

  it('手动覆盖优先级最高', () => {
    const registry = makeRegistry()
    registry.override('radius', { md: '20px' })
    expect(registry.resolve()['radius-md']).toBe('20px')
  })
})

describe('2. var() 求值（IE10 通道的关键）', () => {
  it('链式引用被逐层解开', () => {
    const r = resolveVars({ a: '#ff0000', b: 'var(--ds-a)', c: 'var(--ds-b)' }, { prefix: 'ds' })
    expect(r.c).toBe('#ff0000')
  })

  it('解不开时保留回退值', () => {
    expect(resolveVars({ d: 'var(--ds-nope, #000)' }, { prefix: 'ds' }).d).toBe('#000')
  })

  it('单值替换正确', () => {
    expect(resolveVarValue('var(--ds-a)', { a: 'red' }, 'ds')).toBe('red')
  })

  it('回退值生效', () => {
    expect(resolveVarValue('var(--ds-missing, blue)', {}, 'ds')).toBe('blue')
  })
})

describe('3. class 两层生成', () => {
  const flat = makeRegistry().resolve()
  const sheet = buildClassSheet({ tokens: flat })

  it('primitive 生成成功', () => {
    expect(sheet.primitive).toContain('.ds-p-4{')
  })

  it('primitive 不含 var()', () => {
    expect(sheet.primitive).not.toContain('var(')
  })

  it('semantic 生成成功', () => {
    expect(sheet.semantic).toContain('.ds-bg-subtle{')
  })

  it('semantic 用 var() 引用', () => {
    expect(sheet.semantic).toContain('var(--ds-color-bg-subtle)')
  })

  it('IE10 flex 降级写法', () => {
    expect(sheet.primitive).toContain('-ms-flexbox')
  })

  it('静态通道已把 var() 换成实值', () => {
    const s = buildClassSheet({ tokens: flat, resolve: resolveVars(flat, { prefix: 'ds' }) })
    expect(s.semantic).not.toContain('var(')
  })

  it('静态通道拿到真实色值', () => {
    const s = buildClassSheet({ tokens: flat, resolve: resolveVars(flat, { prefix: 'ds' }) })
    expect(s.semantic).toContain('#0b1220')
  })
})

describe('5. CSS 输出与切片', () => {
  it('变量块格式正确', () => {
    expect(toCssVars({ 'color-bg': '#fff' }, { selector: ':root' })).toBe(
      ':root{--ds-color-bg:#fff;}'
    )
  })

  it('超限时自动切片', () => {
    expect(splitCss('.a{}.b{}.c{}', 2)).toHaveLength(2)
  })

  it('未超限不切片', () => {
    expect(splitCss('.a{}', 4000)).toHaveLength(1)
  })
})

describe('6. SSR 防闪烁脚本', () => {
  it('返回可执行字符串', () => {
    // 注意：默认主题的参数名是 theme，不是 defaultTheme。
    // 早先写成 defaultTheme 时 TS 会报 unknown property，而运行时静默忽略 ——
    // 脚本照样生成、长度也够长，只有"首屏不再闪烁"这件事悄悄失效了。
    const script = getInitScript({ modes: { light: 'light', dark: 'dark' }, theme: 'light' })
    expect(typeof script).toBe('string')
    expect(script.length).toBeGreaterThan(50)
  })

  it('默认主题真的写进了脚本', () => {
    expect(getInitScript({ theme: 'light' })).toContain('"def":"light"')
  })

  // 核心不碰存储：没传 restore 就不该出现任何读取介质，SSR 下也不会去摸 localStorage
  it('默认不含任何存储读取', () => {
    const script = getInitScript()
    expect(script).not.toContain('localStorage')
    expect(script).not.toContain('cookie')
  })

  it('传了 restore 片段才有存储读取', () => {
    const script = getInitScript({ restore: restoreScript() })
    expect(script).toContain('localStorage')
    expect(script).toContain('ds-theme')
  })

  it('无 window 时降级为 static', () => {
    expect(['static', 'vars']).toContain(pickChannel('auto'))
  })
})

describe('7. 对比度', () => {
  it('白底深字达标 AA', () => {
    expect(contrast('#ffffff', '#0f172a')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('8. createTheme 校验', () => {
  it('非法定义抛错', () => {
    // 故意传空对象验校验逻辑：类型上不合法，所以要转两次
    expect(() => createTheme({} as unknown as ThemeDef)).toThrow()
  })
})

describe('9. 自定义令牌前缀', () => {
  const pn = normalizePrefix('acme')

  it('命名空间', () => expect(pn.ns).toBe('acme'))
  it('CSS 变量前缀', () => expect(pn.var).toBe('--acme-'))
  it('class 前缀', () => expect(pn.cls).toBe('acme-'))
  it('DOM 属性跟着换', () => expect(pn.attr).toBe('data-acme-theme'))
  it('style id 跟着换', () => expect(pn.ids.tokens).toBe('acme-tokens'))
  it('存储 key 跟着换', () => expect(pn.keys.theme).toBe('acme-theme'))

  it('三种写法归一到同一个 ns', () => {
    expect(normalizePrefix('acme').ns).toBe(normalizePrefix('--acme-').ns)
    expect(normalizePrefix('--acme-').ns).toBe(normalizePrefix('acme-').ns)
  })

  it('已归一化对象原样透传', () => {
    expect(prefixOf(pn)).toBe(pn)
  })

  it('数字开头不合法 -> 兜底 ds', () => {
    expect(normalizePrefix('1abc').ns).toBe('ds')
  })

  it('空值兜底 ds', () => {
    expect(normalizePrefix('').ns).toBe('ds')
    expect(normalizePrefix().ns).toBe('ds')
  })

  it('老写法 --ds- 仍等价', () => {
    expect(normalizePrefix('--ds-').var).toBe('--ds-')
  })

  it('cssVarName 跟随前缀', () => {
    expect(cssVarName('color-bg', 'acme')).toBe('--acme-color-bg')
  })

  it('变量块跟随前缀', () => {
    expect(toCssVars({ 'color-bg': '#fff' }, { prefix: 'acme' })).toBe(
      ':root{--acme-color-bg:#fff;}'
    )
  })

  it('老调用形式不变', () => {
    expect(toCssVars({ 'color-bg': '#fff' }, { prefix: '--ds-' })).toBe(
      ':root{--ds-color-bg:#fff;}'
    )
  })

  it('自定义前缀下 var() 仍能解开', () => {
    expect(resolveVars({ a: '#f00', b: 'var(--acme-a)' }, { prefix: 'acme' }).b).toBe('#f00')
  })

  const flat = makeRegistry().resolve()
  const acmeSheet = buildClassSheet({ tokens: flat, prefix: 'acme' })

  it('primitive class 跟随前缀', () => {
    expect(acmeSheet.primitive).toContain('.acme-p-4{')
  })

  it('semantic class 跟随前缀', () => {
    expect(acmeSheet.semantic).toContain('.acme-bg-subtle{')
  })

  it('semantic 引用的变量名也换了', () => {
    expect(acmeSheet.semantic).toContain('var(--acme-color-bg-subtle)')
  })

  it('换前缀后不再出现 ds-', () => {
    expect(acmeSheet.semantic).not.toContain('--ds-')
  })
})

describe('10. SSR 防闪烁脚本跟随前缀', () => {
  const acmeScript = getInitScript({ prefix: 'acme' })

  it('脚本里的属性名跟着换', () => {
    expect(acmeScript).toContain('data-acme-theme')
  })

  // 存储 key 不在核心脚本里了，它只出现在可选的 restoreScript 片段中
  it('restoreScript 的存储 key 跟着前缀换', () => {
    expect(restoreScript({ prefix: 'acme' })).toContain('acme-theme')
  })
})
