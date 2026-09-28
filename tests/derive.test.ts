/**
 * @ds/core 派生层（Seed -> Algorithm[] -> Map）
 * -------------------------------------------------------------
 * 覆盖三件事：
 *   1. 三个内置算法各自的行为，以及「入出同形」带来的可串联性
 *   2. deriveTokens 管道的边界（无 seed / 无 algorithm / 数组顺序）
 *   3. createTheme 接上 seed / algorithm 后，与手写 preset 的共存关系
 *
 * 断言刻意不写死插值算出来的具体色值 —— 那些是算法实现细节，
 * 调一次 mix 的权重就会全变。这里只断言「结构性」事实：
 * 键补全了、暗底确实比亮底暗、收紧后确实变小、组合后两者同时成立。
 */

import { describe, it, expect } from 'vitest'
import {
  deriveTokens,
  defaultAlgorithm,
  darkAlgorithm,
  compactAlgorithm,
  brandTokens,
  createTheme,
  createRegistry,
  flattenTokens,
  luminance,
  mergeTree,
} from '@ds/core'
import type { TokenTree } from '@ds/core'
import { darkTheme, lightTheme } from '@ds/tokens'
import { seed } from './fixtures'

/**
 * 跑完管道再拍平，断言一律对着扁平键写。
 * patch 是「在完整种子上改哪几项」—— 派生链不接受残缺种子，
 * 所以这里总是先拿官方 seed 垫底，再合并调用方要覆盖的部分。
 */
function flat(patch?: Record<string, unknown> | null, algorithm?: unknown): Record<string, string> {
  const base: TokenTree = patch ? mergeTree(seed, patch as TokenTree) : seed
  return flattenTokens(deriveTokens(base, algorithm as never))
}

function px(value: string): number {
  return parseFloat(value)
}

describe('1. defaultAlgorithm：稀疏种子补全成完整 map', () => {
  it('在完整种子上覆盖 brand，其余照旧补全', () => {
    const out = flat({ color: { brand: '#ff0000' } })
    expect(out['color-brand']).toBe('#ff0000')
    expect(Object.keys(out).length).toBeGreaterThan(30)
  })

  it('不给 patch 时就是官方 defaultSeed 那一套', () => {
    const out = flat(null)
    expect(out['color-brand']).toBe('#4f46e5')
    expect(out['radius-md']).toBe('4px')
    expect(out['font-size-md']).toBe('14px')
    expect(out['motion-base']).toBe('200ms')
  })

  it('派生出来的品牌色一族互不相同，且 hover 比主色暗', () => {
    const out = flat({ color: { brand: '#4f46e5' } })
    expect(out['color-brand-hover']).not.toBe(out['color-brand'])
    expect(out['color-brand-active']).not.toBe(out['color-brand-hover'])
    expect(luminance(out['color-brand-hover'])).toBeLessThan(luminance(out['color-brand']))
  })

  it('圆角/字号/动效按基数成比例展开', () => {
    const out = flat({ radius: { md: '8px' }, font: { sizeMd: '16px' }, motion: { base: '300ms' } })
    expect(out['radius-md']).toBe('8px')
    expect(px(out['radius-sm'])).toBeLessThan(px(out['radius-md']))
    expect(px(out['radius-lg'])).toBeGreaterThan(px(out['radius-md']))
    expect(out['radius-full']).toBe('9999px')
    expect(out['font-size-md']).toBe('16px')
    expect(px(out['font-size-sm'])).toBe(14)
    expect(px(out['font-size-lg'])).toBe(18)
    expect(out['motion-base']).toBe('300ms')
    expect(px(out['motion-fast'])).toBeLessThan(px(out['motion-base']))
    expect(px(out['motion-slow'])).toBeGreaterThan(px(out['motion-base']))
  })

  it('brandTokens 被 makeAccent 与 defaultAlgorithm 共用：同一主色结果一致', () => {
    const one = brandTokens('#4f46e5', '#0f172a', '#ffffff')
    const out = flat({ color: { brand: '#4f46e5', fg: '#0f172a', bg: '#ffffff' } })
    expect(out['color-brand-hover']).toBe(String(one.brandHover))
    expect(out['color-brand-subtle']).toBe(String(one.brandSubtle))
  })
})

describe('2. darkAlgorithm：翻暗且幂等', () => {
  it('底变暗、前景变亮', () => {
    const light = flat({ color: { bg: '#ffffff', fg: '#0f172a' } })
    const dark = flat({ color: { bg: '#ffffff', fg: '#0f172a' } }, [
      defaultAlgorithm,
      darkAlgorithm,
    ])
    expect(luminance(dark['color-bg'])).toBeLessThan(luminance(light['color-bg']))
    expect(luminance(dark['color-fg'])).toBeGreaterThan(luminance(light['color-fg']))
  })

  it('已经是暗底就不重复翻（组合成 [dark,dark] 不会越翻越离谱）', () => {
    const once = flat({ color: { bg: '#ffffff', fg: '#0f172a' } }, [
      defaultAlgorithm,
      darkAlgorithm,
    ])
    const twice = flat({ color: { bg: '#ffffff', fg: '#0f172a' } }, [
      defaultAlgorithm,
      darkAlgorithm,
      darkAlgorithm,
    ])
    expect(twice['color-bg']).toBe(once['color-bg'])
    expect(twice['color-fg']).toBe(once['color-fg'])
  })

  it('暗色阴影换成纯黑叠加，不再用浅色', () => {
    const dark = flat({ color: { bg: '#ffffff', fg: '#0f172a' } }, [
      defaultAlgorithm,
      darkAlgorithm,
    ])
    expect(dark['shadow-md']).toContain('rgba(0, 0, 0,')
  })
})

describe('3. compactAlgorithm：收紧尺度', () => {
  it('只动基数，派生规则照旧（比例关系保持）', () => {
    const normal = flat()
    const compact = flat(null, [defaultAlgorithm, compactAlgorithm])
    expect(px(compact['radius-md'])).toBeLessThan(px(normal['radius-md']))
    expect(px(compact['font-size-md'])).toBeLessThan(px(normal['font-size-md']))
    expect(px(compact['motion-base'])).toBeLessThan(px(normal['motion-base']))
    // 各档位之间的大小关系不变
    expect(px(compact['radius-sm'])).toBeLessThan(px(compact['radius-lg']))
    expect(px(compact['font-size-sm'])).toBeLessThan(px(compact['font-size-lg']))
  })
})

describe('4. 管道组合', () => {
  it('数组从左到右依次执行，前者输出是后者输入', () => {
    const out = flat({ color: { bg: '#ffffff', fg: '#0f172a' } }, [
      defaultAlgorithm,
      darkAlgorithm,
      compactAlgorithm,
    ])
    // 暗色成立
    expect(luminance(out['color-bg'])).toBeLessThan(luminance('#ffffff'))
    // 紧凑同时成立
    expect(px(out['radius-md'])).toBe(3)
    expect(px(out['font-size-md'])).toBe(13)
    expect(px(out['motion-base'])).toBe(160)
  })

  it('单个算法也能直接传，不必包成数组', () => {
    const one = flat({ color: { brand: '#123456' } }, defaultAlgorithm)
    expect(one['color-brand']).toBe('#123456')
  })

  it('算法数组里的非函数项被跳过，不会炸管道', () => {
    const out = flat({ color: { brand: '#123456' } }, [null, defaultAlgorithm] as never)
    expect(out['color-brand']).toBe('#123456')
  })

  it('不给 algorithm 时默认跑 defaultAlgorithm', () => {
    const out = flat({ color: { brand: '#123456' } })
    expect(out['color-brand']).toBe('#123456')
    expect(Object.keys(out).length).toBeGreaterThan(30)
  })

  it('seed 缺项直接抛错，不拿库里的颜色补齐', () => {
    expect(() => deriveTokens({} as never)).toThrow(/种子缺/)
  })

  it('主色解析不了时不抛错：派生值退回种子值，绝不写 null', () => {
    const bad = mergeTree(seed, { color: { brand: 'not-a-color' } } as TokenTree)
    expect(() => deriveTokens(bad)).not.toThrow()
    const out = flattenTokens(deriveTokens(bad))
    expect(out['color-brand']).toBe('not-a-color')
    expect(out['color-brand-hover']).toBe('not-a-color')
    expect(out['color-brand-subtle']).toBe('not-a-color')
  })
})

describe('5. createTheme 接上 seed / algorithm', () => {
  it('只给 seed 的主题也能注册并解析', () => {
    const registry = createRegistry()
    registry.theme('brand', {
      label: '品牌',
      seed: mergeTree(seed, { color: { brand: '#ff0000' } } as TokenTree),
      algorithm: [defaultAlgorithm, darkAlgorithm],
    })
    registry.use('brand')
    const out = registry.resolve()
    expect(out['color-brand']).toBe('#ff0000')
    expect(luminance(out['color-bg'])).toBeLessThan(luminance('#ffffff'))
  })

  it('seed + tokens 一起给时，手写的优先（对齐 antd 的 theme.token > map token）', () => {
    const registry = createRegistry()
    registry.theme('mixed', {
      seed: mergeTree(seed, { color: { brand: '#ff0000' } } as TokenTree),
      tokens: { color: { brand: '#00ff00' } },
    })
    registry.use('mixed')
    expect(registry.resolve()['color-brand']).toBe('#00ff00')
  })

  it('tokens 与 seed 都没给会抛，避免静默建出一个空主题', () => {
    expect(() => createTheme({ label: '空' })).toThrow(TypeError)
  })

  it('只给 seed 时 mode 仍然生效（dark 的阴影基色翻成黑）', () => {
    const dark = createTheme({
      mode: 'dark',
      seed: mergeTree(seed, { color: { brand: '#4f46e5' } } as TokenTree),
    })
    expect(dark.mode).toBe('dark')
    expect(dark.shadowColor).toBe('0 0 0')
  })
})

describe('7. 解析不了的入参：宁可退回种子值，也不把令牌写成空', () => {
  /**
   * 派生链上 mix / toRgba / parseColor 都可能因为色值写法不认识而返回 null。
   * 令牌值不允许是 null —— 写进去就是一个空变量，页面上表现为颜色消失。
   */
  it('非关键色解析不了时退回种子值 —— 关键色会被直接拒绝，见 4', () => {
    const out = flat({ color: { success: 'nope' } })
    expect(out['color-success']).toBe('nope')
    expect(out['color-success-subtle']).toBe('nope')
  })

  it('阴影基色解析不了时退回前景色通道', () => {
    const out = flat({ color: { shadow: 'nope' } })
    expect(out['shadow-sm']).toContain('rgba(15, 23, 42')
    expect(out['shadow-focus']).toContain('rgba(79, 70, 229')
  })

  it('阴影种子填空串时走前景色通道（逗号语法）', () => {
    const out = flat({ color: { shadow: '' } })
    expect(out['shadow-sm']).toContain('rgba(15, 23, 42')
  })

  it('数字也能当种子值（String 一遍再用）', () => {
    expect(flat({ color: { success: 0 } })['color-success']).toBe('0')
    expect(flat({ radius: { md: 8 } })['radius-md']).toBe('8px')
  })

  it('带单位 / 无单位的字符串都能读成数字', () => {
    expect(flat({ radius: { md: '10px' } })['radius-md']).toBe('10px')
    expect(flat({ radius: { md: 'big' } })['radius-md']).toBe('0px') // 读不出来就是 0
  })
})

describe('8. 品牌色明暗决定其上的文字色', () => {
  it('浅色品牌上用深字', () => {
    expect(flat({ color: { brand: '#facc15' } })['color-on-brand']).toBe('#0f172a')
  })

  it('深色品牌上用浅字', () => {
    expect(flat({ color: { brand: '#1e1b4b' } })['color-on-brand']).toBe('#ffffff')
  })

  it('填充色上的前景色同规则', () => {
    expect(flat({ color: { brand: '#facc15' } })['color-fg-on-fill']).toBe('#0f172a')
  })
})

describe('9. 管道的防御', () => {
  it('算法返回非对象时保留上一步的结果', () => {
    const out = deriveTokens(mergeTree(seed, { color: { brand: '#123456' } } as TokenTree), [
      () => 'nope' as never,
      defaultAlgorithm,
    ])
    expect(flattenTokens(out)['color-brand']).toBe('#123456')
  })

  it('暗色算法下阴影基色解析不了也退回前景色', () => {
    const out = flat({ color: { shadow: 'nope' } }, [defaultAlgorithm, darkAlgorithm])
    expect(out['shadow-focus']).toContain('rgba(79, 70, 229')
  })
})

describe('6. 手写 preset 不受派生影响', () => {
  it('内置 light / dark 的解析结果保持原样', () => {
    const registry = createRegistry()
    registry.theme('light', lightTheme)
    registry.theme('dark', darkTheme)
    registry.use('dark')
    expect(registry.resolve()['color-bg']).toBe('#0b1220')
    registry.use('light')
    expect(registry.resolve()['color-bg']).toBe('#ffffff')
  })

  it('强调色覆盖仍然排在主题之后、手动覆盖之前', () => {
    const registry = createRegistry()
    registry.theme('light', lightTheme)
    registry.accent('green', { tokens: { color: { brand: '#16a34a' } } })
    registry.use('light')
    registry.useAccent('green')
    expect(registry.resolve()['color-brand']).toBe('#16a34a')
  })
})
