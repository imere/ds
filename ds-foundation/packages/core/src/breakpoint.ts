/**
 * 断点：屏幕宽度分档
 * -------------------------------------------------------------
 * 断点跟间距、圆角一样属于「基础尺度」，三方要用同一份定义：
 *   CSS 媒体查询、JS 里的条件渲染、文档站上的展示表。
 * 各写一份的结果就是改一个断点要翻三个地方。
 *
 * 这一层只有**纯数据 + 纯函数**，不碰 window / matchMedia：
 * 怎么监听 resize、怎么接进框架的响应式系统，是绑定层的事
 * （Vue 就该写成 composable，React 就该写成 hook，不该塞进核心）。
 *
 * 之所以做到 degressive 的值最小为 0：xs 代表「所有宽度」，
 * `up('xs')` 得到 `(min-width: 0px)`，语义上等价于不做限制。
 */

import { each } from './util'
import type { Dict } from './util'

/** 断点名 -> 最小宽度（px） */
export interface Breakpoints {
  [name: string]: number
}

/** 一套够用的默认值 */
export const defaultBreakpoints: Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
}

function resolve(screens?: Breakpoints | null): Breakpoints {
  return screens || defaultBreakpoints
}

/** 取断点宽度。名字不存在就抛错 —— 静默拿到 NaN 会拼出 `(min-width: NaNpx)`，比报错难查得多 */
function widthOf(name: string, screens?: Breakpoints | null): number {
  const table = resolve(screens)
  if (!Object.prototype.hasOwnProperty.call(table, name)) {
    throw new Error(`[ds/core] 未知断点：'${name}'，可用的是 ${breakpointOrder(table).join(' / ')}`)
  }
  return table[name]
}

/** 按宽度升序排列的断点名 */
export function breakpointOrder(screens?: Breakpoints | null): string[] {
  const table = resolve(screens)
  const names = Object.keys(table)
  names.sort((a, b) => table[a] - table[b])
  return names
}

/** 当前宽度落在哪一档：从最宽的往下找，第一个满足的就是答案 */
export function currentBreakpoint(width: number, screens?: Breakpoints | null): string {
  const table = resolve(screens)
  const names = breakpointOrder(table)
  let hit = names[0] || ''
  each(names, (name: string) => {
    if (width >= table[name]) hit = name
  })
  return hit
}

/** ≥ 该断点 */
export function up(name: string, screens?: Breakpoints | null): string {
  return `(min-width: ${widthOf(name, screens)}px)`
}

/** < 该断点。减 1 是为了不和 up 在同一像素上同时命中 */
export function down(name: string, screens?: Breakpoints | null): string {
  return `(max-width: ${widthOf(name, screens) - 1}px)`
}

/** 区间：>= from 且 < to */
export function between(from: string, to: string, screens?: Breakpoints | null): string {
  const table = resolve(screens)
  return `(min-width: ${widthOf(from, table)}px) and (max-width: ${widthOf(to, table) - 1}px)`
}

/**
 * 一次性拿到全部媒体查询字符串，省得调用方逐个拼：
 *   mediaOf().lg  // '@media (min-width: 1024px)'
 * 适合往 <style> 里手写媒体查询时当参考。
 */
export function mediaOf(screens?: Breakpoints | null): Dict<string> {
  const table = resolve(screens)
  const out: Dict<string> = {}
  each(table, (value: number, name: string | number) => {
    out[name as string] = `@media (min-width: ${value}px)`
  })
  return out
}
