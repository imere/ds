/** 断点系统：与组件、CSS 工具类共用同一份定义，避免三处各写一遍 */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
}

export const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']

export const breakpointLabels = {
  xs: '手机 <640px',
  sm: '大屏手机 ≥640px',
  md: '平板 ≥768px',
  lg: '笔记本 ≥1024px',
  xl: '桌面 ≥1280px',
  xxl: '大屏 ≥1536px',
}

export function currentBreakpoint(width) {
  let name = 'xs'
  breakpointOrder.forEach((key) => {
    if (width >= breakpoints[key]) name = key
  })
  return name
}

export const up = (name) => `(min-width: ${breakpoints[name]}px)`
export const down = (name) => `(max-width: ${breakpoints[name] - 1}px)`
export const between = (from, to) =>
  `(min-width: ${breakpoints[from]}px) and (max-width: ${breakpoints[to] - 1}px)`

/** 把断点映射成 CSS 媒体查询辅助对象，供 <style> 里手写媒体查询时参考 */
export const media = {
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  xxl: `@media (min-width: ${breakpoints.xxl}px)`,
}

export default breakpoints
