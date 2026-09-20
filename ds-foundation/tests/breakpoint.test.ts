/**
 * @ds/core 断点模块
 * -------------------------------------------------------------
 * 断点全是纯数据 + 纯计算，不需要 DOM，也没什么好 mock 的：
 * 重点验证「分档边界」和「自定义断点表」两条，以及未知名字要抛错而不是拼出 NaN。
 */

import { describe, it, expect } from 'vitest'
import {
  defaultBreakpoints,
  breakpointOrder,
  currentBreakpoint,
  up,
  down,
  between,
  mediaOf,
} from '@ds/core'

describe('断点：默认表', () => {
  it('分档边界落在各自区间内', () => {
    expect(currentBreakpoint(0)).toBe('xs')
    expect(currentBreakpoint(639)).toBe('xs')
    expect(currentBreakpoint(640)).toBe('sm')
    expect(currentBreakpoint(767)).toBe('sm')
    expect(currentBreakpoint(768)).toBe('md')
    expect(currentBreakpoint(1024)).toBe('lg')
    expect(currentBreakpoint(1280)).toBe('xl')
    expect(currentBreakpoint(1536)).toBe('xxl')
    expect(currentBreakpoint(9999)).toBe('xxl')
  })

  it('顺序按宽度升序 —— down() 依赖这个顺序往前推一像素', () => {
    expect(breakpointOrder()).toEqual(['xs', 'sm', 'md', 'lg', 'xl', 'xxl'])
  })

  it('up / down 相邻两档互不重叠', () => {
    expect(up('md')).toBe('(min-width: 768px)')
    expect(down('md')).toBe('(max-width: 767px)')
  })

  it('between 是左闭右开区间', () => {
    expect(between('md', 'lg')).toBe('(min-width: 768px) and (max-width: 1023px)')
  })

  it('mediaOf 一次给出全部 @media 串', () => {
    const media = mediaOf()
    expect(media.sm).toBe('@media (min-width: 640px)')
    expect(Object.keys(media).length).toBe(Object.keys(defaultBreakpoints).length)
  })
})

describe('断点：自定义表', () => {
  const custom = { mobile: 0, tablet: 700, desktop: 1200 }

  it('用自己的断点表判定档位', () => {
    expect(currentBreakpoint(500, custom)).toBe('mobile')
    expect(currentBreakpoint(700, custom)).toBe('tablet')
    expect(currentBreakpoint(1200, custom)).toBe('desktop')
  })

  it('自定义表的顺序也按宽度排，不按书写顺序', () => {
    expect(breakpointOrder({ desktop: 1200, mobile: 0, tablet: 700 })).toEqual([
      'mobile',
      'tablet',
      'desktop',
    ])
  })

  it('up / down 跟着自定义表走', () => {
    expect(up('tablet', custom)).toBe('(min-width: 700px)')
    expect(down('desktop', custom)).toBe('(max-width: 1199px)')
    expect(between('tablet', 'desktop', custom)).toBe('(min-width: 700px) and (max-width: 1199px)')
  })
})

describe('断点：空表', () => {
  it('一张空表不会崩，落在空串上', () => {
    expect(currentBreakpoint(1024, {})).toBe('')
    expect(breakpointOrder({})).toEqual([])
    expect(mediaOf({})).toEqual({})
  })
})

describe('断点：非法输入', () => {
  it('未知断点名抛错，而不是拼出 NaNpx 的媒体查询', () => {
    expect(() => up('nope')).toThrow(/未知断点/)
    expect(() => down('nope')).toThrow(/未知断点/)
    expect(() => between('sm', 'nope')).toThrow(/未知断点/)
  })

  it('错误信息里带上可用档位，方便改 typo', () => {
    expect(() => up('mdium')).toThrow(/xs \/ sm \/ md \/ lg \/ xl \/ xxl/)
  })
})
