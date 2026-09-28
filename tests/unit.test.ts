/**
 * 长度单位（响应式单位）
 * -------------------------------------------------------------
 * @vitest-environment jsdom
 * 第 4 组要验「注入到 DOM 的 CSS 也是 rem」，所以整份跑 jsdom。
 * 前 3 组是纯函数，在哪个环境都一样。
 * -------------------------------------------------------------
 * 三条断言的主线：
 *   1. 单位原语：入口一律折成 px，出口按目标单位落成字符串
 *   2. 派生链：给 rem 种子就出 rem 令牌，且「减 2px」这类差值要跟着折过去
 *   3. @ds/dom：出口一次换算，手写令牌（不过派生链的那部分）也跟着响应式
 *
 * 第 2 条里那条 `sizeSm` 的断言是全文件最关键的一条：
 * 只看 username「能不能出 rem」是抓不到回归的 —— 差值是 literal 叠加还是按根字号折，
 * 输出都长得像 rem。所以要断言**具体数值**，让 0.75rem 和 0px 区分得开。
 */

import { describe, it, expect } from 'vitest'
import {
  numOf,
  unitOf,
  toPx,
  length,
  pxToRem,
  remify,
  remifyTree,
  rescale,
  rescaleTokens,
  toUnit,
  factorOf,
  canConvert,
  deriveTokens,
  flattenTokens,
  defaultAlgorithm,
  compactAlgorithm,
  darkAlgorithm,
  ABSOLUTE_UNITS,
  DEFAULT_KEEP_PX,
  DEFAULT_ROOT_FONT_SIZE,
} from '@ds/core'
import type { UnitSpace } from '@ds/core'
import { createThemeManager } from '@ds/dom'
import { baseOpts, seed } from './fixtures'

/** 官方那份种子换成 rem 写法：单位这件事由「值」决定，不由开关决定 */
const remSeed = remifyTree(seed, { rootFontSize: 16 })

/** 视口 375 宽：1vw = 3.75px；容器 600 宽：1cqw = 6px */
const wide: UnitSpace = { rootFontSize: 16, factors: { vw: 3.75, cqw: 6 } }

function flatRem(options?: { rootFontSize?: number }) {
  return flattenTokens(deriveTokens(remSeed, null, 'light', options))
}

describe('1. 单位原语：入口认各种写法，出口按目标单位落成字符串', () => {
  it('numOf / unitOf 能从任意写法里拆出数与单位', () => {
    expect(numOf('14px')).toBe(14)
    expect(numOf('0.875rem')).toBe(0.875)
    expect(numOf(14)).toBe(14)
    // 色值不是长度：拆不出数字就是 0，单位空串 —— 不会把 #f8fafc 的头几个字符当数字
    expect(numOf('#f8fafc')).toBe(0)
    expect(unitOf('#f8fafc')).toBe('')
    expect(unitOf('16PX')).toBe('px')
  })

  it('单位符号没有认字清单：容器查询 / 动态视口天生就能用', () => {
    // 判据是「整个字符串 = 数字 + 一串字母」，不是「结尾是不是见过的单位」
    expect(unitOf('10cqw')).toBe('cqw')
    expect(unitOf('50dvh')).toBe('dvh')
    expect(unitOf('2cqmax')).toBe('cqmax')
    // 认不出来才给空串：这是保护色值不被当成长度的那条规则，不能松
    expect(unitOf('0 2px 8px rgba(0, 0, 0, 0.08)')).toBe('')
    expect(unitOf('#0f172a')).toBe('')
  })

  it('toPx 把 rem 按根字号折回 px，不给根字号按 16', () => {
    expect(toPx('14px')).toBe(14)
    expect(toPx('1rem')).toBe(16)
    expect(toPx('1rem', { rootFontSize: 10 })).toBe(10)
    expect(toPx('1rem', { rootFontSize: 0 })).toBe(16)
  })

  it('length 落成目标单位：px 取整，rem 留够小数位', () => {
    expect(length(14.4, 'px')).toBe('14px')
    expect(length(16, 'rem')).toBe('1rem')
    // 1/16 = 0.0625：截三位会变成 0.063（差 1.2%），这里必须精确
    expect(length(2, 'rem')).toBe('0.125rem')
    expect(length(16, 'rem', { rootFontSize: 10 })).toBe('1.6rem')
  })

  it('长度不允许负值，两个单位都夹到 0', () => {
    expect(length(-4, 'px')).toBe('0px')
    expect(length(-4, 'rem')).toBe('0rem')
  })

  it('length 不写单位就是 px —— UMD 直引时不给也得有默认', () => {
    expect(length(16)).toBe('16px')
  })

  it('pxToRem 换整串里的每一个 px，没有 px 就原样返回', () => {
    expect(pxToRem('0 2px 8px rgba(15, 23, 42, 0.08)')).toBe(
      '0 0.125rem 0.5rem rgba(15, 23, 42, 0.08)'
    )
    expect(pxToRem('200ms')).toBe('200ms')
    expect(pxToRem('16px', { rootFontSize: 0 })).toBe('1rem')
  })
})

describe('1b. 系数表：能不能换算不靠认字，靠查不查得到系数', () => {
  it('CSS 绝对单位是物理定义，永远换得了', () => {
    expect(ABSOLUTE_UNITS.px).toBe(1)
    // 1pt = 96/72 px：这组是规范写死的，不像「会不会出新单位」那样会一直长
    expect(factorOf('pt')).toBe(96 / 72)
    expect(factorOf('PT')).toBe(96 / 72)
    expect(length(14, 'pt')).toBe('10.5pt')
    expect(toPx('10.5pt')).toBe(14)
  })

  it('rem 靠根字号，em 靠元素自身的字号（没给退回根字号）', () => {
    expect(factorOf('rem')).toBe(16)
    expect(factorOf('rem', { rootFontSize: 10 })).toBe(10)
    expect(factorOf('em', { fontSize: 20 })).toBe(20)
    expect(factorOf('em', {})).toBe(16)
  })

  it('vw / cqw 的系数只有页面知道：不给就是换不了，不被当成 px', () => {
    expect(factorOf('vw')).toBe(0)
    expect(canConvert('vw')).toBe(false)
    expect(factorOf('vw', wide)).toBe(3.75)
    expect(canConvert('cqw', wide)).toBe(true)
    // 认不出 '.' 空单位也不能换算，否则色值会被当成长度
    expect(factorOf('')).toBe(0)
    expect(factorOf('fafc')).toBe(0)
  })

  it('自定义系数优先于内置：你那个场景才知道 1vw 是多少', () => {
    expect(factorOf('px', { factors: { px: 2 } })).toBe(2)
    expect(factorOf('vw', { factors: { vw: 0 } })).toBe(0)
  })

  it('length 到查不到系数的单位时不捏造换算，原样带出单位', () => {
    // 认不出 vw 值多少 px，就别假装算过 —— 10vw 冒充成 10px 比报错难查
    expect(length(10, 'vw')).toBe('10vw')
    expect(length(10, 'vw', wide)).toBe('2.66667vw')
  })

  it('toUnit 两端都要换得了，任何一端断链就原样返回', () => {
    expect(toUnit('16px', 'rem')).toBe('1rem')
    // 4vw × 3.75 = 15px，选个整数跟 length 的取整对着：这里不能有浮点噪声
    expect(toUnit('4vw', 'px', wide)).toBe('15px')
    // 源单位换不了：不能把 10vw 变成 10px
    expect(toUnit('10vw', 'rem')).toBe('10vw')
    // 目标单位换不了：也不能换个单位符号冒充换算过
    expect(toUnit('10px', 'vw')).toBe('10px')
    // 压根不是长度
    expect(toUnit('#f8fafc', 'rem')).toBe('#f8fafc')
  })

  it('rescale 逐段换算：阴影里的每个 px 都换，色值十六进制尾巴不会被动', () => {
    expect(rescale('0 2px 8px rgba(15, 23, 42, 0.08)', 'rem')).toBe(
      '0 0.125rem 0.5rem rgba(15, 23, 42, 0.08)'
    )
    expect(rescale('#f8fafc', 'rem')).toBe('#f8fafc')
    expect(rescale('2147483647', 'rem')).toBe('2147483647')
    expect(rescale('100%', 'px')).toBe('100%')
    // 目标换不了就整串原样
    expect(rescale('0 2px 8px', 'vw')).toBe('0 2px 8px')
  })

  it('rescaleTokens / remify 是同一套：任意目标单位都走得通', () => {
    const flat = { 'radius-md': '4px', 'shadow-md': '0 2px 8px rgba(0, 0, 0, 0.08)' }
    // pt：CSS 绝对单位，不需要额外系数
    expect(rescaleTokens(flat, 'pt')['radius-md']).toBe('3pt')
    // vw：给了系数就按系数折（4px / 3.75 = 1.06667vw）
    expect(rescaleTokens(flat, 'vw', wide)['radius-md']).toBe('1.06667vw')
    // keep 前缀保持原样
    expect(rescaleTokens(flat, 'rem', undefined, ['shadow'])['shadow-md']).toBe(
      '0 2px 8px rgba(0, 0, 0, 0.08)'
    )
    // remify 是它的 rem 特例
    expect(remify(flat)['radius-md']).toBe('0.25rem')
  })
})

describe('2. remify / remifyTree：整表换算', () => {
  it('remify 不给 keep 是谁都不放过；给了就按完整前缀放过', () => {
    expect(remify({ 'shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.4)' })['shadow-sm']).toBe(
      '0 0.0625rem 0.125rem rgba(0, 0, 0, 0.4)'
    )
    expect(
      remify({ 'shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.4)' }, undefined, ['shadow'])['shadow-sm']
    ).toBe('0 1px 2px rgba(0, 0, 0, 0.4)')
  })

  it('默认保持 px 的那两项是描边宽度与阴影 —— 都不属于排版尺度', () => {
    expect(DEFAULT_KEEP_PX).toEqual(['border-width', 'shadow'])
    expect(DEFAULT_ROOT_FONT_SIZE).toBe(16)
  })

  it('remifyTree 走嵌套树，前缀规则跟扁平表是同一套', () => {
    const tree = { radius: { md: '4px' }, shadow: { md: '0 2px 8px rgba(0, 0, 0, 0.08)' } }
    const out = remifyTree(tree, { rootFontSize: 16 }, DEFAULT_KEEP_PX) as {
      radius: { md: string }
      shadow: { md: string }
    }
    expect(out.radius.md).toBe('0.25rem')
    // shadow 是被放过的那一支
    expect(out.shadow.md).toBe('0 2px 8px rgba(0, 0, 0, 0.08)')
  })

  it('键名一个字符都不能动：sizeMd 不能被 kebab 成 size-md', () => {
    // 早先这版走 flatten/unflatten，sizeMd 会被还原成 font.size.md ——
    // 种子的键是 camelCase，kebab 是有损的。断言这里就是防止再走回那条路。
    const out = remifyTree({ font: { sizeMd: '14px' } }) as { font: { sizeMd: string } }
    expect(out.font.sizeMd).toBe('0.875rem')
  })

  it('裸数字没有单位信息，原样留着不猜', () => {
    const out = remifyTree({ radius: { md: 4 }, space: { 1: '4px' } }) as {
      radius: { md: unknown }
      space: { 1: string }
    }
    expect(out.radius.md).toBe(4)
    expect(out.space[1]).toBe('0.25rem')
  })
})

describe('3. 派生链继承种子的单位', () => {
  it('给 rem 种子就出 rem 令牌', () => {
    const t = flatRem()
    expect(t['radius-md']).toBe('0.25rem')
    expect(t['radius-sm']).toBe('0.125rem')
    expect(t['radius-lg']).toBe('0.5rem')
    // 行高本来就是无单位比值，跟配色/单位无关
    expect(t['font-line-normal']).toBe('1.5')
  })

  it('关键一条：档位差跟着折过去，不是拿 1rem 去减 2', () => {
    const t = flatRem()
    // base 0.875rem(14px) - 2px = 12px = 0.75rem。
    // 单位感知写错的话这里会算成 0.875 - 2（负数夹到 0），断言必须具体到数值才抓得住。
    expect(t['font-size-md']).toBe('0.875rem')
    expect(t['font-size-sm']).toBe('0.75rem')
    expect(t['font-size-lg']).toBe('1rem')
  })

  it('full 是哨兵值不是尺度，rem 下也不折', () => {
    expect(flatRem()['radius-full']).toBe('9999px')
  })

  it('动效是时间，跟长度单位没关系', () => {
    expect(flatRem()['motion-base']).toBe('200ms')
    expect(flatRem()['motion-fast']).toBe('120ms')
  })

  it('种子里写裸数字（JSON 里常见）也认', () => {
    const t = flattenTokens(deriveTokens({ ...seed, motion: { base: 200 } }))
    expect(t['motion-base']).toBe('200ms')
  })

  it('动效基数不是数字时退化成 0，而不是往 CSS 里写 NaN', () => {
    const t = flattenTokens(deriveTokens({ ...seed, motion: { base: 'soon' } }))
    expect(t['motion-base']).toBe('0ms')
    expect(t['motion-base']).not.toContain('NaN')
  })

  it('px 种子照旧出 px —— 这次改动不能碰坏老种子', () => {
    const t = flattenTokens(deriveTokens(seed))
    expect(t['radius-md']).toBe('4px')
    expect(t['font-size-sm']).toBe('12px')
  })

  it('根字号决定「减 2px」折成多少 rem', () => {
    // sizeMd = 1rem：root=10 时是 10px，减 2px 得 8px = 0.8rem（root=16 时是 0.875rem）
    const smallRoot = flattenTokens(
      deriveTokens({ ...seed, font: { ...(seed.font as object), sizeMd: '1rem' } }, null, 'light', {
        rootFontSize: 10,
      })
    )
    expect(smallRoot['font-size-md']).toBe('1rem')
    expect(smallRoot['font-size-sm']).toBe('0.8rem')

    const defRoot = flattenTokens(
      deriveTokens({ ...seed, font: { ...(seed.font as object), sizeMd: '1rem' } }, null, 'light', {
        rootFontSize: 16,
      })
    )
    expect(defRoot['font-size-sm']).toBe('0.875rem')
  })

  it('给了 options 但没写 rootFontSize 时回到默认 16', () => {
    const explicit = flattenTokens(
      deriveTokens(
        { ...seed, font: { ...(seed.font as object), sizeMd: '1rem' } },
        null,
        'light',
        {}
      )
    )
    expect(explicit['font-size-sm']).toBe('0.875rem')
  })

  it('compactAlgorithm 收紧的也是 px 语义的量，落到种子单位上', () => {
    const t = flattenTokens(deriveTokens(remSeed, compactAlgorithm, 'light'))
    // 0.25rem = 4px，×0.75 = 3px = 0.1875rem
    expect(t['radius-md']).toBe('0.1875rem')
    // 0.875rem = 14px，-1px = 13px = 0.8125rem
    expect(t['font-size-md']).toBe('0.8125rem')
  })

  it('darkAlgorithm 翻暗不动单位，rem 令牌还是 rem', () => {
    const t = flattenTokens(deriveTokens(remSeed, [defaultAlgorithm, darkAlgorithm], 'dark'))
    expect(t['radius-md']).toBe('0.25rem')
    expect(t['font-size-sm']).toBe('0.75rem')
  })
})

describe('4. @ds/dom：出口 Unit 一次换算，手写令牌也跟着响应式', () => {
  it('unit 不写就是 px（默认行为不能改）', () => {
    const ds = createThemeManager({ ...baseOpts })
    ds.init()
    expect(ds.tokens()['radius-md']).toBe('4px')
    ds.destroy()
  })

  it('unit: rem 时官方那套手写令牌整体换到 rem', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'rem' })
    ds.init()
    const t = ds.tokens()
    expect(t['radius-md']).toBe('0.25rem')
    expect(t['font-size-md']).toBe('0.875rem')
    expect(t['font-size-sm']).toBe('0.75rem')
    // 时间单位不受影响
    expect(t['motion-base']).toBe('200ms')
    ds.destroy()
  })

  it('描边宽度与阴影默认保持 px —— 跟着根字号缩放会糊', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'rem' })
    ds.init()
    const t = ds.tokens()
    expect(t['shadow-md']).toBe('0 2px 8px rgba(15, 23, 42, 0.08)')
    ds.destroy()
  })

  it('keepPx 能整体覆盖默认：给空表就是谁都不放过', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'rem', keepPx: [] })
    ds.init()
    expect(ds.tokens()['shadow-md']).toBe('0 0.125rem 0.5rem rgba(15, 23, 42, 0.08)')
    ds.destroy()
  })

  it('自定义主题里的 border-width 也默认保持 px', () => {
    const ds = createThemeManager({
      ...baseOpts,
      unit: 'rem',
      themes: {
        custom: {
          mode: 'light',
          tokens: { 'border-width': { thin: '1px', thick: '2px' }, radius: { md: '4px' } },
        },
      },
      theme: 'custom',
    })
    ds.init()
    const t = ds.tokens()
    expect(t['border-width-thin']).toBe('1px')
    expect(t['border-width-thick']).toBe('2px')
    expect(t['radius-md']).toBe('0.25rem')
    ds.destroy()
  })

  it('rootFontSize 换值时同一份令牌按新根字号折', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'rem', rootFontSize: 10 })
    ds.init()
    expect(ds.tokens()['radius-md']).toBe('0.4rem')
    ds.destroy()
  })

  it('注入到 DOM 的 CSS 与 tokens()、get() 三处口径一致', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'rem' })
    ds.init()
    const css = document.getElementById('ds-tokens')
    expect(css && css.textContent).toContain('--ds-radius-md:0.25rem')
    expect(ds.get('radius-md')).toBe('0.25rem')
    ds.destroy()
  })

  it('unit 换成 CSS 绝对单位：pt 不需要任何系数就能换', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'pt' })
    ds.init()
    expect(ds.tokens()['radius-md']).toBe('3pt')
    expect(ds.tokens()['motion-base']).toBe('200ms')
    ds.destroy()
  })

  it('unit 换成容器查询单位：给 factors 就按视口 / 容器尺寸折', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'vw', factors: { vw: 3.75 } })
    ds.init()
    // 4px / 3.75 = 1.06667vw
    expect(ds.tokens()['radius-md']).toBe('1.06667vw')
    // shadow 在 keepPx 里：它就是不该跟视口缩放
    expect(ds.tokens()['shadow-md']).toBe('0 2px 8px rgba(15, 23, 42, 0.08)')
    ds.destroy()
  })

  it('unit 给的系数查不到时保持原样，不做「换个单位符号」的假换算', () => {
    const ds = createThemeManager({ ...baseOpts, unit: 'cqw' })
    ds.init()
    expect(ds.tokens()['radius-md']).toBe('4px')
    ds.destroy()
  })
})

describe('5. 任意单位跑通派生链：种子写什么单位就出什么单位', () => {
  const fontPtx = { ...(seed.font as object), sizeMd: '14pt' }

  it('pt 种子：档位差「减 2px」先折进同一量纲，出口落回 pt', () => {
    const t = flattenTokens(deriveTokens({ ...seed, font: fontPtx, radius: { md: '4pt' } }))
    expect(t['radius-md']).toBe('4pt')
    expect(t['radius-sm']).toBe('2pt')
    // 18.667px - 2px = 16.667px = 12.5pt
    expect(t['font-size-md']).toBe('14pt')
    expect(t['font-size-sm']).toBe('12.5pt')
  })

  it('vw 种子 + factors：算完之后落回 vw', () => {
    const t = flattenTokens(
      deriveTokens({ ...seed, font: { ...fontPtx, sizeMd: '2vw' } }, null, 'light', {
        factors: { vw: 3.75 },
      })
    )
    // 2vw = 7.5px，减 2px 得 5.5px = 1.46667vw
    expect(t['font-size-md']).toBe('2vw')
    expect(t['font-size-sm']).toBe('1.46667vw')
  })

  it('vw 种子但没给 factors：算术落在该单位自身的量纲上（所以要给 factors）', () => {
    // 这是「查不到系数」的退化形态：库不认识 vw 是多少 px，
    // 于是 2vw 里的 -2 被当成 2vw 而不是 2px。给 factors 就回到上一条。
    const t = flattenTokens(deriveTokens({ ...seed, font: { ...fontPtx, sizeMd: '2vw' } }))
    expect(t['font-size-md']).toBe('2vw')
    expect(t['font-size-sm']).toBe('0vw')
  })

  it('em 种子按元素字号折到 px 再落回去', () => {
    const t = flattenTokens(
      deriveTokens({ ...seed, font: { ...fontPtx, sizeMd: '1em' } }, null, 'light', {
        factors: {},
      })
    )
    // 1em 在默认容器字号（16px）下是 16px，减 2px 得 14px = 0.875em
    expect(t['font-size-md']).toBe('1em')
    expect(t['font-size-sm']).toBe('0.875em')
  })
})
