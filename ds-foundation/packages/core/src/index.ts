/**
 * @ds/core —— 纯逻辑层，不碰 DOM、不依赖框架
 * -------------------------------------------------------------
 * 职责：令牌 / 主题 / class 规则 / CSS 文本，全部是纯函数 + 纯数据。
 * 这样它既能在浏览器跑，也能在 Node（SSR、构建期预生成）跑。
 *
 * 产物只有 ESM + UMD 两种，没有 CJS：
 *   · 打包工具（webpack / vite / rollup）走 module -> ESM
 *   · <script> 直引、Vue CLI 4、老工程走 main -> UMD（自带 CommonJS 分支）
 */

export * from './util'
export * from './color'
export * from './prefix'
export * from './token'
export * from './breakpoint'
export * from './theme'
export * from './derive'
export * from './class'
export * from './output'
export * from './preset'

export const version = '0.1.0'
