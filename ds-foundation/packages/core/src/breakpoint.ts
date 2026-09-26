/**
 * 断点：屏幕宽度分档
 * -------------------------------------------------------------
 * 断点跟间距、圆角一样属于「基础尺度」，三方要用同一份定义：
 *   CSS 媒体查询、JS 里的条件渲染、文档站上的展示表。
 * 各写一份的结果就是改一个断点要翻三个地方。
 *
 * 这一层只有纯函数，不碰 window / matchMedia，也不自带断点数值 ——
 * 断点表是必传参数（官方那一套在 @ds/tokens），不传编译不过，
 * 不会出现「以为在用自己的断点、实际悄悄用了库的」。
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

/**
 * 取断点宽度。名字不存在就抛错 ——
 * 静默拿到 NaN 会拼出 `(min-width: NaNpx)`，那种 media query 既不生效也不报错，
 * 排查时要一路追到拼字符串的地方；直接抛错反而便宜。
 *
 * @param name 断点名
 * @param screens 断点表，必传（不自带默认值）
 * @returns 该断点的最小宽度（px）
 */
function widthOf(name: string, screens: Breakpoints): number {
  const table = screens
  if (!Object.prototype.hasOwnProperty.call(table, name)) {
    throw new Error(`[ds/core] 未知断点：'${name}'，可用的是 ${breakpointOrder(table).join(' / ')}`)
  }
  return table[name]
}

/**
 * 按宽度升序排列的断点名。手写 media query 时的书写顺序依赖它。
 *
 * @param screens 断点表
 * @returns 升序排列的断点名数组
 */
export function breakpointOrder(screens: Breakpoints): string[] {
  const table = screens
  const names = Object.keys(table)
  names.sort((a, b) => table[a] - table[b])
  return names
}

/**
 * 当前宽度落在哪一档：从窄到宽扫，最后一个「够得着」的就是答案。
 *
 * @param width 视口宽度（px）
 * @param screens 断点表
 * @returns 命中的断点名；表为空时返回空串
 */
export function currentBreakpoint(width: number, screens: Breakpoints): string {
  const table = screens
  const names = breakpointOrder(table)
  let hit = names[0] || ''
  each(names, (name: string) => {
    if (width >= table[name]) hit = name
  })
  return hit
}

/**
 * ≥ 该断点。
 *
 * @param name 断点名
 * @param screens 断点表
 * @returns 媒体查询条件串，如 '(min-width: 1024px)'
 */
export function up(name: string, screens: Breakpoints): string {
  return `(min-width: ${widthOf(name, screens)}px)`
}

/**
 * < 该断点。减 1 是为了不和 up 在同一像素上同时命中 ——
 * 两端都含等号的话，1024px 这个宽度会同时满足「≥ lg」与「< lg」，样式先后取决于书写顺序。
 *
 * @param name 断点名
 * @param screens 断点表
 * @returns 媒体查询条件串，如 '(max-width: 1023px)'
 */
export function down(name: string, screens: Breakpoints): string {
  return `(max-width: ${widthOf(name, screens) - 1}px)`
}

/**
 * 区间：>= from 且 < to。
 *
 * @param from 下界断点名
 * @param to 上界断点名
 * @param screens 断点表
 * @returns 媒体查询条件串，如 '(min-width: 768px) and (max-width: 1023px)'
 */
export function between(from: string, to: string, screens: Breakpoints): string {
  const table = screens
  return `(min-width: ${widthOf(from, table)}px) and (max-width: ${widthOf(to, table) - 1}px)`
}

/**
 * 一次性拿到全部媒体查询字符串，省得调用方逐个拼：
 *   mediaOf().lg  // '@media (min-width: 1024px)'
 * 适合往 <style> 里手写媒体查询时当参考。
 *
 * @param screens 断点表
 * @returns 断点名 -> '@media (min-width: Npx)'
 */
export function mediaOf(screens: Breakpoints): Dict<string> {
  const table = screens
  const out: Dict<string> = {}
  each(table, (value: number, name: string | number) => {
    out[name as string] = `@media (min-width: ${value}px)`
  })
  return out
}
