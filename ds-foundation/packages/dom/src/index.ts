/**
 * @ds/dom —— 双通道主题适配层
 * -------------------------------------------------------------
 * 依赖 @ds/core，负责把令牌真正落到页面上。
 * 唯一需要判断浏览器的地方就在这一层，core 与业务都对通道无感。
 */

export * from './env'
export * from './emitter'
export * from './store'
export * from './style'
export * from './theme'
export * from './ssr'

import { createThemeManager } from './theme'
import type { ThemeManagerOptions, ThemeManager } from './theme'

/**
 * 一行启动：createBootstrap({ themes, accents }).init()
 * 适合 UMD 直引场景，省去手动建注册中心。
 */
export function bootstrap(options?: ThemeManagerOptions): ThemeManager {
  return createThemeManager(options).init()
}

export { createThemeManager as default }

export var version: string = '0.1.0'
