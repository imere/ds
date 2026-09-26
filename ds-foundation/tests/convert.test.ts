/**
 * 外部令牌格式 -> 本库令牌表（core/convert.ts）
 * -------------------------------------------------------------
 * 夹具是三份真实 Figma 导出（Primitive / Semantic / Component）裁出来的样本，
 * 保留了原结构：颜色是 `{colorSpace, components, alpha}` 对象、数值是不带单位的裸数字、
 * 单位语义写在 `com.figma.scopes` 里、Component 那份带 `{...}` 别名引用。
 *
 * 断言刻意不写死整套令牌值 —— 那些是设计稿的内容，改一次色板就得跟着改一遍。
 * 这里只断言**格式翻译**本身对不对：颜色落成什么写法、裸数字按 scope 补了什么单位、
 * 别名有没有接上、认不出来的有没有如实报出来。
 */

import { describe, it, expect } from 'vitest'
import { fromW3C, fromFigma, remify, pxToRem, toCssVars, prefixOf } from '@ds/core'
import primitive from './fixtures/figma/primitive.tokens.json'
import semantic from './fixtures/figma/semantic.tokens.json'
import component from './fixtures/figma/component.tokens.json'

/** 手写的 W3C 样本：只有标准里那几种写法，用来测没有 Figma 扩展时的行为 */
const w3c = {
  color: {
    $type: 'color',
    brand: { $value: '#4f46e5' },
    subtle: { $value: 'rgba(79, 70, 229, 0.12)' },
  },
  space: {
    $type: 'dimension',
    1: { $value: '4px' },
    2: { $value: '8px' },
    ref: { $value: '{space.2}' },
  },
  typography: {
    body: {
      $type: 'typography',
      $value: {
        fontFamily: 'Inter',
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: '22px',
      },
    },
  },
  shadow: {
    card: {
      $type: 'shadow',
      $value: {
        $description: '卡片阴影',
        color: { colorSpace: 'srgb', components: [0.059, 0.09, 0.165], alpha: 1 },
        offsetX: '0px',
        offsetY: '2px',
        blur: '8px',
      },
    },
  },
  // 类型不认识但值是标量 —— 标量本身能用，只是没有单位可推断，照收
  weird: { $type: 'mystery', thing: { $value: '???' }, blob: { $value: { a: 1 } } },
}

/** Figma 的 scope 决定裸数字是什么单位，用最小样本逐个验 */
const scopes: Record<string, unknown> = {
  gap: { $value: 8, $extensions: { 'com.figma.scopes': ['GAP'] } },
  radius: { $value: 4, $extensions: { 'com.figma.scopes': ['CORNER_RADIUS'] } },
  size: { $value: 24, $extensions: { 'com.figma.scopes': ['WIDTH_HEIGHT'] } },
  fontSize: { $value: 14, $extensions: { 'com.figma.scopes': ['FONT_SIZE'] } },
  lineHeight: { $value: 22.5, $extensions: { 'com.figma.scopes': ['LINE_HEIGHT'] } },
  letterSpacing: {
    $value: -1.559999942779541,
    $extensions: { 'com.figma.scopes': ['LETTER_SPACING'] },
  },
  effect: { $value: 24, $extensions: { 'com.figma.scopes': ['EFFECT_FLOAT'] } },
  stroke: { $value: 1, $extensions: { 'com.figma.scopes': ['STROKE_FLOAT'] } },
  opacity50: { $value: 50, $extensions: { 'com.figma.scopes': ['OPACITY'] } },
  opacityDot: { $value: 0.45, $extensions: { 'com.figma.scopes': ['OPACITY'] } },
  weight: { $value: 400, $extensions: { 'com.figma.scopes': ['FONT_STYLE'] } },
  unknown: { $value: 3 },
}

describe('1. fromFigma：Figma 原生变量导出', () => {
  const out = fromFigma(primitive)

  it('颜色对象落成 hex / 逗号语法 rgba，整份没有一条 issue', () => {
    expect(out.issues).toEqual([])
    expect(out.tokens['color-blue-500']).toMatch(/^#[0-9a-f]{6}$/)
    // alpha<1 必须是逗号语法：空格语法 IE10 不认
    expect(out.tokens['color-white-alpha-08']).toBe('rgba(255, 255, 255, 0.08)')
    expect(out.tokens['color-transparent']).toBe('rgba(255, 255, 255, 0)')
  })

  it('路径变成短横线键', () => {
    const keys = Object.keys(out.tokens)
    expect(keys.length).toBeGreaterThan(20)
    expect(keys).toContain('color-blue-500')
    expect(keys.some((k) => k.indexOf('.') !== -1)).toBe(false)
  })

  it('裸数字按 com.figma.scopes 补单位：间距/圆角补 px，字重不补', () => {
    const s = fromFigma(scopes).tokens
    expect(s['gap']).toBe('8px')
    expect(s['radius']).toBe('4px')
    expect(s['size']).toBe('24px')
    expect(s['font-size']).toBe('14px')
    expect(s['weight']).toBe('400')
  })

  it('字距保留负值，Figma 的浮点噪声截到 3 位', () => {
    expect(fromFigma(scopes).tokens['letter-spacing']).toBe('-1.56px')
  })

  it('没有 scope 也没有路径线索时保持裸数字，不硬安一个单位', () => {
    expect(fromFigma(scopes).tokens['unknown']).toBe('3')
  })

  it('颜色对象既没有 components 也没有 hex 时报一条，不写空串', () => {
    const out = fromFigma({ a: { $value: { colorSpace: 'srgb' } } })
    expect(out.tokens['a']).toBeUndefined()
    expect(out.issues[0].path).toBe('a')
  })

  it('只有 hex 没有 components 时退回 hex；通道越界会夹到 0-255', () => {
    const out = fromFigma({
      onlyHex: { $value: { hex: '#1677ff' } },
      wild: { $value: { components: [1.5, -0.2, 'x'], alpha: 1 } },
      noAlpha: { $value: { components: [0, 0, 0] } },
    }).tokens
    expect(out['only-hex']).toBe('#1677ff')
    expect(out['wild']).toBe('#ff0000')
    expect(out['no-alpha']).toBe('#000000')
  })

  it('布尔值落成 true / false 字符串', () => {
    expect(fromFigma({ a: { $value: true }, b: { $value: false } }).tokens).toEqual({
      a: 'true',
      b: 'false',
    })
  })

  it('scope 认不出来（ALL_SCOPES 之类）也不硬安单位', () => {
    const out = fromFigma({
      a: { $value: 3, $extensions: { 'com.figma.scopes': ['ALL_SCOPES'] } },
    })
    expect(out.tokens['a']).toBe('3')
  })

  it('根字号给 0 / 非法值就退回 16', () => {
    expect(fromFigma(semantic, { unit: 'rem', rootFontSize: 0 }).tokens['space-lg']).toBe('1rem')
    expect(pxToRem('16px', { rootFontSize: 0 })).toBe('1rem')
  })

  it('prefix 给所有键加前缀', () => {
    const prefixed = fromFigma(primitive, { prefix: 'acme', include: ['radius'] })
    expect(Object.keys(prefixed.tokens).every((k) => k.indexOf('acme-radius-') === 0)).toBe(true)
  })

  it('include / exclude 按点分路径前缀挑子树', () => {
    expect(
      Object.keys(fromFigma(primitive, { include: ['radius'] }).tokens).length
    ).toBeGreaterThan(0)
    expect(
      Object.keys(fromFigma(primitive, { include: ['radius'] }).tokens).every(
        (k) => k.indexOf('radius') === 0
      )
    ).toBe(true)
    expect(
      Object.keys(fromFigma(primitive, { exclude: ['color'] }).tokens).some(
        (k) => k.indexOf('color') === 0
      )
    ).toBe(false)
  })
})

describe('2. 单位：px 还是 rem', () => {
  it('默认 px —— Figma 给的就是 px，不擅自换单位', () => {
    expect(fromFigma(semantic).tokens['space-lg']).toBe('16px')
  })

  it('unit:rem 按根字号换算，且保住 1/16 的精度', () => {
    const rem = fromFigma(semantic, { unit: 'rem' }).tokens
    expect(rem['space-lg']).toBe('1rem')
    expect(rem['space-xs']).toBe('0.25rem')
    expect(rem['space-1']).toBe('0.0625rem')
  })

  it('根字号可以给别的（10px 根字号下 16px 是 1.6rem）', () => {
    expect(fromFigma(semantic, { unit: 'rem', rootFontSize: 10 }).tokens['space-lg']).toBe('1.6rem')
  })

  it('目标单位不限于 px / rem：pt 是 CSS 绝对单位，不需要任何系数', () => {
    expect(fromFigma(semantic, { unit: 'pt' }).tokens['space-lg']).toBe('12pt')
  })

  it('vw / cqw 这类单位要给 factors，否则按 px 输出并记一条 issue', () => {
    const missing = fromFigma(semantic, { unit: 'vw' })
    // 没系数就换不了 —— 退回 px，而不是把 16 换个单位符号冒充换算过
    expect(missing.tokens['space-lg']).toBe('16px')
    expect(missing.issues.some((i) => i.reason.indexOf('vw') > -1)).toBe(true)

    // 视口 375 宽：1vw = 3.75px，16px = 4.26667vw
    const wide = fromFigma(semantic, { unit: 'vw', factors: { vw: 3.75 } })
    expect(wide.tokens['space-lg']).toBe('4.26667vw')
    expect(wide.issues).toEqual([])
  })

  it('描边宽度是 hairline：切到 rem 也保持 px（1px 边框不该跟着根字号缩放）', () => {
    const rem = fromFigma(semantic, { unit: 'rem' }).tokens
    expect(rem['border-width-thin']).toBe('1px')
    expect(rem['stroke-icon-default']).toBe('1.5px')
  })

  it('透明度按 scope 落成 0-1：源里既有 50 也有 0.45 两种写法', () => {
    const s = fromFigma(scopes).tokens
    expect(s['opacity50']).toBe('0.5')
    expect(s['opacity-dot']).toBe('0.45')
  })

  it('阴影那几个浮点（EFFECT_FLOAT）跟着长度一起换算', () => {
    const s = fromFigma(scopes, { unit: 'rem' }).tokens
    expect(s['effect']).toBe('1.5rem')
    expect(s['line-height']).toBe('1.40625rem')
  })

  it('remify 事后换算：整串里的 px 都换，阴影串也认', () => {
    const out = remify({
      'space-1': '4px',
      'shadow-sm': '0 1px 2px rgba(15, 23, 42, 0.06)',
      'motion-base': '200ms',
    })
    expect(out['space-1']).toBe('0.25rem')
    expect(out['shadow-sm']).toBe('0 0.0625rem 0.125rem rgba(15, 23, 42, 0.06)')
    expect(out['motion-base']).toBe('200ms')
  })

  it('remify 的 keep 前缀保持 px，且只看完整前缀（border 不会误伤 bordered）', () => {
    const out = remify(
      { 'border-width-thin': '1px', bordered: '2px', 'space-1': '4px', 'space-1-x': '8px' },
      undefined,
      ['border-width', 'space-1']
    )
    expect(out['border-width-thin']).toBe('1px')
    expect(out['bordered']).toBe('0.125rem')
    expect(out['space-1']).toBe('4px')
    // 'space-1' 是 'space-1-x' 的完整前缀，所以整支都保留
    expect(out['space-1-x']).toBe('8px')
  })

  it('pxToRem 单项换算，没有 px 就原样返回', () => {
    expect(pxToRem('16px', { rootFontSize: 16 })).toBe('1rem')
    expect(pxToRem('1.5')).toBe('1.5')
  })
})

describe('3. 别名引用 {a.b.c}', () => {
  it('Component 那份里的别名接上了，值与目标一致', () => {
    const out = fromFigma(component)
    expect(out.aliases).toBeGreaterThan(0)
    expect(out.tokens['button-icon-neutral-outlined-default']).toBe(
      out.tokens['button-text-neutral-outlined-default']
    )
    expect(out.tokens['button-icon-neutral-outlined-default']).toMatch(/^#/)
  })

  it('指向不存在的令牌不会静默丢掉，会记进 issues', () => {
    const out = fromFigma({
      button: { bg: { $value: '{button.missing.token}' } },
    })
    expect(out.tokens['button-bg']).toBeUndefined()
    expect(out.issues).toEqual([
      { path: 'button.bg', reason: '别名指向的令牌不存在：button.missing.token' },
    ])
  })

  it('别名指向 $root（组默认值）也能接上', () => {
    const out = fromFigma({
      input: { height: { $root: { $value: 32 }, large: { $value: 40 } } },
      select: { height: { $value: '{input.height.$root}' } },
    })
    expect(out.tokens['select-height']).toBe('32px')
    expect(out.issues).toEqual([])
  })

  it('关掉解析就保留 {…} 原文', () => {
    const out = fromFigma(
      { a: { $value: '{b.c}' }, b: { c: { $value: '1px' } } },
      {
        resolveAlias: false,
      }
    )
    expect(out.tokens['a']).toBe('{b.c}')
    expect(out.aliases).toBe(0)
  })

  it('循环引用不会把进程挂死，报一条 issue 收工', () => {
    const out = fromFigma({ a: { $value: '{b}' }, b: { $value: '{a}' } })
    expect(out.issues.length).toBeGreaterThan(0)
    expect(out.issues[0].reason).toMatch(/循环/)
  })
})

describe('4. fromW3C：标准 DTCG（没有 Figma 扩展）', () => {
  it('组上的 $type 会被子节点继承', () => {
    const out = fromW3C(w3c)
    expect(out.tokens['color-brand']).toBe('#4f46e5')
    expect(out.tokens['space-1']).toBe('4px')
  })

  it('dimension 字符串按目标单位换算', () => {
    expect(fromW3C(w3c, { unit: 'rem' }).tokens['space-2']).toBe('0.5rem')
  })

  it('复合类型摊平成子键：typography / shadow 都能拆出来', () => {
    const out = fromW3C(w3c).tokens
    expect(out['typography-body-font-family']).toBe('Inter')
    expect(out['typography-body-font-size']).toBe('14px')
    expect(out['typography-body-font-weight']).toBe('400')
    expect(out['shadow-card-blur']).toBe('8px')
    // 复合值里的颜色对象也认（DTCG 允许 color 字段写成对象），$ 开头的字段不当令牌
    expect(out['shadow-card-color']).toBe('#0f172a')
    expect(out['shadow-card-description']).toBeUndefined()
  })

  it('别名照常解析', () => {
    expect(fromW3C(w3c).tokens['space-ref']).toBe('8px')
  })

  it('dimension 写成裸数字也按长度补单位（有些工具就是这么导的）', () => {
    expect(fromW3C({ a: { $type: 'dimension', $value: 8 } }).tokens['a']).toBe('8px')
  })

  it('颜色写成对象（不只是字符串）也认', () => {
    const out = fromW3C({ a: { $type: 'color', $value: { components: [0, 0, 0], alpha: 1 } } })
    expect(out.tokens['a']).toBe('#000000')
  })

  it('值是标量的，即使类型不认识也照收（标量本身能用，只是没单位可推断）', () => {
    expect(fromW3C(w3c).tokens['weird-thing']).toBe('???')
  })

  it('值还是对象又不认识：默认跳过并记一条，可以改成抛错或原样留着', () => {
    const skipped = fromW3C(w3c)
    expect(skipped.tokens['weird-blob']).toBeUndefined()
    expect(skipped.issues.some((i) => i.path === 'weird.blob')).toBe(true)

    expect(() => fromW3C(w3c, { onUnknown: 'throw' })).toThrow(/weird\.blob/)
    expect(fromW3C(w3c, { onUnknown: 'keep' }).tokens['weird-blob']).toBe('{"a":1}')
  })

  it('Tokens Studio 那种写法（value/type + 集合分组、别名不带集合名）也能吃', () => {
    const studio = {
      global: {
        colors: { blue: { value: '#1677ff', type: 'color' } },
        space: { md: { value: '16px', type: 'dimension' } },
      },
      light: {
        bg: { value: '{colors.blue}', type: 'color' },
      },
    }
    const out = fromW3C(studio)
    expect(out.tokens['light-bg']).toBe('#1677ff')
    expect(out.tokens['global-space-md']).toBe('16px')
  })

  it('$root 是 Figma 的组默认值：它是一条真令牌，不是元数据', () => {
    const out = fromFigma({
      input: {
        height: {
          $root: { $value: 32, $extensions: { 'com.figma.scopes': ['WIDTH_HEIGHT'] } },
          large: { $value: 40, $extensions: { 'com.figma.scopes': ['WIDTH_HEIGHT'] } },
        },
      },
    })
    expect(out.tokens['input-height-root']).toBe('32px')
    expect(out.tokens['input-height-large']).toBe('40px')
  })

  it('组里恰好有个子令牌叫 value 时不会被当成「旧写法的令牌节点」', () => {
    const out = fromFigma({
      input: {
        text: {
          placeholder: { $value: '#8092ab', $type: 'color' },
          value: { $value: '#0f172a', $type: 'color' },
        },
      },
    })
    expect(out.tokens['input-text-value']).toBe('#0f172a')
    expect(out.tokens['input-text-placeholder']).toBe('#8092ab')
    expect(out.issues).toEqual([])
  })

  it('复合类型里解析不了的子字段报一条，不会连累同组其他子字段', () => {
    const out = fromW3C({
      a: { $type: 'typography', $value: { fontSize: {}, fontWeight: 500 } },
    })
    expect(out.tokens['a-font-weight']).toBe('500')
    expect(out.tokens['a-font-size']).toBeUndefined()
    expect(out.issues[0].path).toBe('a.font-size')
  })

  it('components 不足三个又没有 hex：报一条，不写空串', () => {
    const out = fromFigma({ a: { $value: { components: [1, 2] } } })
    expect(out.tokens['a']).toBeUndefined()
    expect(out.issues[0].path).toBe('a')
  })

  it('值是 null / 数组这类非标量时报「值无法解析」', () => {
    const out = fromFigma({ a: { $value: null }, b: { $value: [1, 2] } })
    expect(out.tokens['a']).toBeUndefined()
    expect(out.issues).toEqual([
      { path: 'a', reason: '值无法解析：$type=无' },
      { path: 'b', reason: '值无法解析：$type=无' },
    ])
  })

  it('没写 $type 的对象值，报错里如实说「无 $type」；开 throw 就抛', () => {
    const out = fromFigma({ a: { $value: { x: 1 } } })
    expect(out.issues[0].reason).toContain('无 $type')
    expect(() => fromFigma({ a: { $value: { x: 1 } } }, { onUnknown: 'throw' })).toThrow(
      /无 \$type/
    )
  })

  it('复合类型里断链的别名只报一条（别名那条），不再补一条「子字段无法解析」', () => {
    const out = fromW3C({ a: { $type: 'typography', $value: { fontSize: '{nope}' } } })
    expect(out.issues).toEqual([{ path: 'a.font-size', reason: '别名指向的令牌不存在：nope' }])
  })

  it('值解析不了又开了 throw 时抛错，而不是默默少一条', () => {
    expect(() => fromFigma({ a: { $value: null } }, { onUnknown: 'throw' })).toThrow(/值无法解析/)
  })

  it('别名断链又开了 throw 时抛错，而不是默默少一条', () => {
    expect(() => fromFigma({ a: { $value: '{nope}' } }, { onUnknown: 'throw' })).toThrow(
      /别名解析失败/
    )
  })

  it('组里的非对象成员（备注之类）跳过，不当事令牌', () => {
    const out = fromFigma({ a: { note: '这是备注', b: { $value: 1 } } })
    expect(out.tokens['a-b']).toBe('1')
    expect(out.tokens['a-note']).toBeUndefined()
    expect(out.issues).toEqual([])
  })

  it('输入不是对象时返回空表并报一条', () => {
    const out = fromW3C('not a json')
    expect(out.tokens).toEqual({})
    expect(out.issues[0].reason).toMatch(/不是对象/)
  })
})

describe('5. 翻完能直接喂给下游', () => {
  it('语义层颜色 -> CSS 变量', () => {
    const { tokens } = fromFigma(semantic, {
      include: ['color.action.primary', 'color.text'],
      prefix: '',
    })
    const css = toCssVars(tokens, { selector: ':root', prefix: prefixOf('ds') })
    expect(css.indexOf(':root{')).toBe(0)
    expect(css).toContain('--ds-color-action-primary-default:')
    expect(css).toContain('--ds-color-text-primary:')
  })

  it('组件层那套也能整份翻完（2000+ 条里没有一条翻不出来）', () => {
    const { tokens, issues } = fromFigma(component)
    expect(Object.keys(tokens).length).toBeGreaterThan(50)
    expect(issues).toEqual([])
  })
})
