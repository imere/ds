/**
 * 派生链用的种子
 * -------------------------------------------------------------
 * @ds/core 的 deriveTokens 不吃默认值 —— 种子必须由调用方给全，缺一项它就直接报错，
 * 不会拿库里的颜色悄悄补上（那样产出的令牌看着齐，实际是别人的设计）。
 *
 * 所以这里是「起步用的一份完整种子」：照抄再改你要改的那几项即可。
 * 形状就是 core 要求的 seed 契约，别删键 —— 删了 deriveTokens 会拒绝跑。
 *
 * shadow 写的是通道串，会原样拼进 rgba(...)：'15 23 42' 与 '#0f172a' 是同一个颜色。
 */

import type { TokenTree } from '@ds/core'

export const defaultSeed: TokenTree = {
  color: {
    brand: '#4f46e5',
    bg: '#ffffff',
    fg: '#0f172a',
    shadow: '15 23 42',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0284c7',
  },
  radius: { md: '4px' },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    sizeMd: '14px',
  },
  motion: { base: '200ms' },
}
