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
  lightTheme,
  darkTheme,
} from '@ds/core'

/** 跑完管道再拍平，断言一律对着扁平键写 */
function flat(seed?: Record<string, unknown> | null, algorithm?: unknown): Record<string, string> {
  return flattenTokens(deriveTokens(seed, algorithm as never))
}

function px(value: string): number {
  return parseFloat(value)
}

describe('1. defaultAlgorithm：稀疏种子补全成完整 map', () => {
  it('只给一个 brand 也能补全出全套令牌', () => {
    const out = flat({ color: { brand: '#ff0000' } })
    expect(out['color-brand']).toBe('#ff0000')
    expect(Object.keys(out).length).toBeGreaterThan(30)
  })

  it('没给 seed 时走 DEFAULT_SEED 的默认品牌色', () => {
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

  it('不传 seed 也不会抛，得到一份默认 map', () => {
    expect(() => deriveTokens()).not.toThrow()
    expect(Object.keys(flat()).length).toBeGreaterThan(30)
  })
})

describe('5. createTheme 接上 seed / algorithm', () => {
  it('只给 seed 的主题也能注册并解析', () => {
    const registry = createRegistry()
    registry.theme('brand', {
      label: '品牌',
      seed: { color: { brand: '#ff0000' } },
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
      seed: { color: { brand: '#ff0000' } },
      tokens: { color: { brand: '#00ff00' } },
    })
    registry.use('mixed')
    expect(registry.resolve()['color-brand']).toBe('#00ff00')
  })

  it('tokens 与 seed 都没给会抛，避免静默建出一个空主题', () => {
    expect(() => createTheme({ label: '空' })).toThrow(TypeError)
  })

  it('只给 seed 时 mode 仍然生效（dark 的阴影基色翻成黑）', () => {
    const dark = createTheme({ mode: 'dark', seed: { color: { brand: '#4f46e5' } } })
    expect(dark.mode).toBe('dark')
    expect(dark.shadowColor).toBe('0 0 0')
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
