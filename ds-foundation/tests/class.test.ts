/**
 * @ds/core class：两层 class
 * -------------------------------------------------------------
 * primitive（主题无关，一辈子一份）与 semantic（主题相关，每个主题一份）
 * 分开生成，是为了让 IE10 下的体积从 全部class × 主题数 降到 primitive(1)+semantic(N)。
 * 这里覆盖两层各自的边界：scale 缺失跳过、prop 数组、wrap 拼装、无令牌时不出 semantic。
 */

import { describe, it, expect } from 'vitest'
import { defineScales, primitiveRules, semanticRules, buildClassSheet } from '@ds/core'
import type { ScaleRuleDef, UtilityDef, SemanticDef } from '@ds/core'
import { defaultScales, defaultSemanticMap } from '@ds/tokens'
import { classOpts } from './fixtures'

describe('defineScales', () => {
  it('不给 custom 就等于 base', () => {
    expect(defineScales(defaultScales)).toEqual(defaultScales)
  })

  it('自定义项合并进已有分组，不整组替换', () => {
    const out = defineScales(defaultScales, { space: { 99: '99px' } })
    expect(out.space['99']).toBe('99px')
    expect(out.space['4']).toBe('16px')
  })

  it('新分组直接挂上去', () => {
    const out = defineScales(defaultScales, { brand: { xs: '1px' } })
    expect(out.brand).toEqual({ xs: '1px' })
  })

  it('custom 为 null 不影响', () => {
    expect(defineScales(defaultScales, null)).toEqual(defaultScales)
  })
})

describe('primitiveRules', () => {
  it('默认生成 scale 规则与工具 class', () => {
    const rules = primitiveRules({ ...classOpts })
    expect(rules.length).toBeGreaterThan(50)
  })

  it('step 名走 kebab', () => {
    const rules = primitiveRules({
      ...classOpts,
      scales: { s: { bigStep: '4px' } },
      rules: [{ prefix: 'p', prop: 'padding', scale: 's' }],
      utilities: [],
    })
    expect(rules[0].selector).toBe('.ds-p-big-step')
  })

  it('prop 为数组时一条 class 写多个属性', () => {
    const defs: ScaleRuleDef[] = [
      { prefix: 'px', prop: ['padding-left', 'padding-right'], scale: 's' },
    ]
    const rules = primitiveRules({
      ...classOpts,
      scales: { s: { '4': '16px' } },
      rules: defs,
      utilities: [],
    })
    expect(rules).toEqual([
      {
        selector: '.ds-px-4',
        decls: { 'padding-left': '16px', 'padding-right': '16px' },
      },
    ])
  })

  it('scale 不存在时整条规则定义跳过', () => {
    const defs: ScaleRuleDef[] = [
      { prefix: 'gone', prop: 'color', scale: 'nope' },
      { prefix: 'ok', prop: 'color', scale: 'c' },
    ]
    const rules = primitiveRules({
      ...classOpts,
      scales: { c: { red: 'red' } },
      rules: defs,
      utilities: [],
    })
    expect(rules).toHaveLength(1)
    expect(rules[0].selector).toBe('.ds-ok-red')
  })

  it('自定义 classPrefix 优先于 prefix', () => {
    const rules = primitiveRules({
      ...classOpts,
      prefix: 'acme',
      classPrefix: 'zz-',
      scales: { s: { '1': '1px' } },
      rules: [{ prefix: 'p', prop: 'padding', scale: 's' }],
      utilities: [],
    })
    expect(rules[0].selector).toBe('.zz-p-1')
  })

  it('工具 class 原样输出', () => {
    const utilities: UtilityDef[] = [{ name: 'flex', decls: { display: ['-ms-flexbox', 'flex'] } }]
    const rules = primitiveRules({ ...classOpts, scales: {}, rules: [], utilities })
    expect(rules).toEqual([{ selector: '.ds-flex', decls: { display: ['-ms-flexbox', 'flex'] } }])
  })
})

describe('semanticRules', () => {
  const flat = {
    'color-bg': '#ffffff',
    'color-bg-subtle': '#f8fafc',
    'color-fg': '#0f172a',
    'color-ring': 'rgba(79, 70, 229, 0.35)',
    'shadow-md': '0 2px 8px rgba(0,0,0,.08)',
  }

  it('按 map 里的分组生成规则', () => {
    const rules = semanticRules(flat, { ...classOpts })
    const selectors = rules.map((r) => r.selector)
    expect(selectors).toContain('.ds-bg')
    expect(selectors).toContain('.ds-bg-subtle')
    expect(selectors).toContain('.ds-text')
    expect(selectors).toContain('.ds-shadow-md')
  })

  it('键与分组名完全相同时不留后缀', () => {
    const rules = semanticRules({ 'color-bg': '#fff' }, { ...classOpts })
    expect(rules[0].selector).toBe('.ds-bg')
  })

  it('wrap 用于需要拼装的属性', () => {
    const rules = semanticRules(flat, { ...classOpts })
    const [ring] = rules.filter((r) => r.selector === '.ds-ring')
    expect(ring.decls['box-shadow']).toBe('0 0 0 2px var(--ds-color-ring)')
  })

  it('varPrefix 覆盖变量前缀', () => {
    const rules = semanticRules({ 'color-bg': '#fff' }, { ...classOpts, varPrefix: '--acme-' })
    expect(rules[0].decls['background-color']).toBe('var(--acme-color-bg)')
  })

  it('classPrefix 覆盖 class 前缀', () => {
    const rules = semanticRules({ 'color-bg': '#fff' }, { ...classOpts, classPrefix: 'acme-' })
    expect(rules[0].selector).toBe('.acme-bg')
  })

  it('自定义 map 生效', () => {
    const map: Record<string, SemanticDef> = { fill: { prop: 'fill', group: 'color-bg' } }
    const rules = semanticRules({ 'color-bg': '#fff' }, { ...classOpts, map })
    expect(rules[0]).toEqual({
      selector: '.ds-fill',
      decls: { fill: 'var(--ds-color-bg)' },
    })
  })

  it('前缀相同但不是分组层级的键不会被误配', () => {
    // 'color-bgx' 以 'color-bg' 开头但不是它的子级，只有当键是 'color-bg-*' 才算
    const rules = semanticRules({ 'color-bgx': '#fff' }, { ...classOpts })
    expect(rules).toEqual([])
  })

  it('默认 map 是导出的那一份', () => {
    expect(defaultSemanticMap.bg.group).toBe('color-bg')
  })
})

describe('buildClassSheet', () => {
  const flat = { 'color-bg': '#ffffff', 'color-fg': '#0f172a' }

  it('两层都产出 CSS 文本', () => {
    const sheet = buildClassSheet({ ...classOpts, tokens: flat })
    expect(sheet.primitive).toContain('.ds-p-4{')
    expect(sheet.semantic).toContain('.ds-bg{')
    expect(sheet.semanticRules.length).toBeGreaterThan(0)
  })

  it('不给 tokens 时只有 primitive', () => {
    const sheet = buildClassSheet({ ...classOpts })
    expect(sheet.primitive).toContain('.ds-p-4{')
    expect(sheet.semantic).toBe('')
    expect(sheet.semanticRules).toEqual([])
  })

  it('important 两边都生效', () => {
    const sheet = buildClassSheet({ ...classOpts, tokens: flat, important: true, indent: false })
    expect(sheet.primitive).toContain('!important')
    expect(sheet.semantic).toContain('!important')
  })

  it('resolve 只在 semantic 里把 var() 换成实值', () => {
    const sheet = buildClassSheet({
      ...classOpts,
      tokens: flat,
      resolve: { 'color-bg': '#ffffff', 'color-fg': '#0f172a' },
      indent: false,
    })
    expect(sheet.semantic).toContain('background-color:#ffffff')
    expect(sheet.semantic).not.toContain('var(')
  })

  it('自定义 scales / utilities 会进到结果里', () => {
    const sheet = buildClassSheet({
      ...classOpts,
      scales: { space: { '4': '16px' } },
      rules: [{ prefix: 'p', prop: 'padding', scale: 'space' }],
      utilities: [{ name: 'my-util', decls: { color: 'red' } }],
      indent: false,
    })
    expect(sheet.primitive).toContain('.ds-p-4{padding:16px;}')
    expect(sheet.primitive).toContain('.ds-my-util{color:red;}')
  })

  it('自定义前缀同时作用于两层', () => {
    const sheet = buildClassSheet({ ...classOpts, tokens: flat, prefix: 'acme', indent: false })
    expect(sheet.primitive).toContain('.acme-p-4{')
    expect(sheet.semantic).toContain('var(--acme-color-bg)')
  })
})
