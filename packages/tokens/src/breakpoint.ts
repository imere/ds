/**
 * 断点宽度
 * -------------------------------------------------------------
 * 数值是设计决策，所以在 tokens 包；up / down / between 这些查询函数是机制，
 * 在 @ds/core，而且断点表是必传参数 —— 不传就编译不过，不会静默拿一份默认表。
 */

import type { Breakpoints } from '@ds/core'

/** 一套够用的默认值。xs 取 0 是为了让 up('xs') 得到 (min-width: 0px)，语义上等于不限制 */
export const defaultBreakpoints: Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
}
