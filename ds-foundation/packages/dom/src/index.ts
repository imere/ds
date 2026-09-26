/**
 * @ds/dom —— 双通道主题适配层
 * -------------------------------------------------------------
 * 依赖 @ds/core，负责把令牌真正落到页面上。
 * 唯一需要判断浏览器的地方就在这一层，core 与业务都对通道无感。
 */

export * from './env'
export * from './emitter'
export * from './style'
export * from './theme'
export * from './ssr'
// 持久化辅助。核心一行都不引用它，只有你主动调才会碰 localStorage / cookie
export * from './storage'

import { createThemeManager } from './theme'
import type { ThemeManagerOptions, ThemeManager } from './theme'

/**
 * 一行启动：bootstrap({ themes, accents }).init()
 * 适合 UMD 直引场景，省去手动建注册中心。
 *
 * themes 是必传的 —— 这一层不自带主题，官方那两套在 @ds/tokens。
 * @param {object} options 与 createThemeManager 完全相同的入参
 * @returns {ThemeManager} 已 init() 过的 manager：
 *   返回的这一刻样式已经写在页面上了
 */
export function bootstrap(options: ThemeManagerOptions): ThemeManager {
  return createThemeManager(options).init()
}

export { createThemeManager as default }

export const version: string = '0.1.0'
