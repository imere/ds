/**
 * 内置主题：每个主题只声明「颜色」，其余尺度由 createTheme 自动补齐。
 * 想加新主题：运行时调 manager.registry.theme('name', createTheme({...})) 即可，
 * 支持从后台下发 JSON 直接灌入（见 DesignTokens 页的示例）。
 *
 * 注意 index.html 里的防闪烁脚本也维护了一份 themeName -> mode 映射，
 * 这里新增主题时记得同步（那是一段内联 <script>，没法 import）。
 */
import { createTheme } from './tokens'

export const themes = {
  light: createTheme({
    label: '晨光 Light',
    mode: 'light',
    color: {
      bg: '#ffffff',
      bgSubtle: '#f7f9fc',
      bgElevated: '#ffffff',
      bgInset: '#f1f5f9',
      bgHover: 'rgba(15, 23, 42, 0.045)',
      bgActive: 'rgba(15, 23, 42, 0.085)',
      bgDisabled: 'rgba(15, 23, 42, 0.04)',

      fg: '#0f172a',
      fgMuted: '#4a5768',
      fgSubtle: '#94a3b8',
      fgDisabled: '#b6c0cd',
      fgOnBrand: '#ffffff',

      border: '#e3e8ef',
      borderStrong: '#cbd5e1',
      borderSubtle: '#eef2f7',

      brand: '#4f46e5',
      brandHover: '#4338ca',
      brandActive: '#3730a3',
      brandSubtle: '#eef2ff',
      brandBorder: '#c7d2fe',
      brandFg: '#4338ca',

      success: '#16a34a',
      successSubtle: '#e7f8ee',
      successFg: '#15803d',
      warning: '#d97706',
      warningSubtle: '#fef4e2',
      warningFg: '#b45309',
      danger: '#dc2626',
      dangerSubtle: '#fdecec',
      dangerFg: '#b91c1c',
      info: '#0284c7',
      infoSubtle: '#e5f4fd',
      infoFg: '#0369a1',

      overlay: 'rgba(15, 23, 42, 0.46)',
      focus: '#4f46e5',
      skeleton: 'rgba(15, 23, 42, 0.08)',
    },
    shadowColor: '15 23 42',
  }),

  dark: createTheme({
    label: '夜幕 Dark',
    mode: 'dark',
    color: {
      bg: '#0b0f17',
      bgSubtle: '#111827',
      bgElevated: '#161d29',
      bgInset: '#0e141d',
      bgHover: 'rgba(255, 255, 255, 0.065)',
      bgActive: 'rgba(255, 255, 255, 0.11)',
      bgDisabled: 'rgba(255, 255, 255, 0.04)',

      fg: '#e6edf6',
      fgMuted: '#9aa8bd',
      fgSubtle: '#6b7a91',
      fgDisabled: '#4b586b',
      fgOnBrand: '#ffffff',

      border: '#232c3b',
      borderStrong: '#33415a',
      borderSubtle: '#1a222e',

      brand: '#6366f1',
      brandHover: '#818cf8',
      brandActive: '#a5b4fc',
      brandSubtle: 'rgba(99, 102, 241, 0.16)',
      brandBorder: 'rgba(99, 102, 241, 0.42)',
      brandFg: '#a5b4fc',

      success: '#22c55e',
      successSubtle: 'rgba(34, 197, 94, 0.16)',
      successFg: '#4ade80',
      warning: '#f59e0b',
      warningSubtle: 'rgba(245, 158, 11, 0.16)',
      warningFg: '#fbbf24',
      danger: '#ef4444',
      dangerSubtle: 'rgba(239, 68, 68, 0.16)',
      dangerFg: '#f87171',
      info: '#38bdf8',
      infoSubtle: 'rgba(56, 189, 248, 0.16)',
      infoFg: '#7dd3fc',

      overlay: 'rgba(2, 6, 15, 0.68)',
      focus: '#818cf8',
      skeleton: 'rgba(255, 255, 255, 0.08)',
    },
    shadowColor: '0 0 0',
  }),

  midnight: createTheme({
    label: '深空 Midnight',
    mode: 'dark',
    color: {
      bg: '#060b16',
      bgSubtle: '#0a1120',
      bgElevated: '#101a2b',
      bgInset: '#070d18',
      bgHover: 'rgba(255, 255, 255, 0.06)',
      bgActive: 'rgba(255, 255, 255, 0.1)',
      bgDisabled: 'rgba(255, 255, 255, 0.035)',

      fg: '#dbe7f5',
      fgMuted: '#8ea3c0',
      fgSubtle: '#5b6f8c',
      fgDisabled: '#42546d',
      fgOnBrand: '#04222b',

      border: '#1b2942',
      borderStrong: '#2a3d5c',
      borderSubtle: '#131e30',

      brand: '#06b6d4',
      brandHover: '#22d3ee',
      brandActive: '#67e8f9',
      brandSubtle: 'rgba(6, 182, 212, 0.16)',
      brandBorder: 'rgba(6, 182, 212, 0.4)',
      brandFg: '#67e8f9',

      success: '#10b981',
      successSubtle: 'rgba(16, 185, 129, 0.16)',
      successFg: '#34d399',
      warning: '#f59e0b',
      warningSubtle: 'rgba(245, 158, 11, 0.16)',
      warningFg: '#fbbf24',
      danger: '#f43f5e',
      dangerSubtle: 'rgba(244, 63, 94, 0.16)',
      dangerFg: '#fb7185',
      info: '#38bdf8',
      infoSubtle: 'rgba(56, 189, 248, 0.16)',
      infoFg: '#7dd3fc',

      overlay: 'rgba(2, 6, 23, 0.74)',
      focus: '#22d3ee',
      skeleton: 'rgba(255, 255, 255, 0.07)',
    },
    shadowColor: '0 0 0',
  }),

  sunrise: createTheme({
    label: '暖阳 Sunrise',
    mode: 'light',
    color: {
      bg: '#fffaf5',
      bgSubtle: '#fdf3e9',
      bgElevated: '#ffffff',
      bgInset: '#f8ecdf',
      bgHover: 'rgba(120, 63, 20, 0.05)',
      bgActive: 'rgba(120, 63, 20, 0.09)',
      bgDisabled: 'rgba(120, 63, 20, 0.04)',

      fg: '#3b2415',
      fgMuted: '#7a5a41',
      fgSubtle: '#b39278',
      fgDisabled: '#cdb49f',
      fgOnBrand: '#ffffff',

      border: '#f0ddc9',
      borderStrong: '#e0c3a6',
      borderSubtle: '#f8ecdf',

      brand: '#ea580c',
      brandHover: '#c2410c',
      brandActive: '#9a3412',
      brandSubtle: '#fff1e7',
      brandBorder: '#fcd9bd',
      brandFg: '#c2410c',

      success: '#15803d',
      successSubtle: '#e8f6ec',
      successFg: '#15803d',
      warning: '#b45309',
      warningSubtle: '#fdf1dc',
      warningFg: '#b45309',
      danger: '#b91c1c',
      dangerSubtle: '#fdeaea',
      dangerFg: '#b91c1c',
      info: '#0369a1',
      infoSubtle: '#e6f2f9',
      infoFg: '#0369a1',

      overlay: 'rgba(59, 36, 21, 0.46)',
      focus: '#ea580c',
      skeleton: 'rgba(120, 63, 20, 0.08)',
    },
    shadowColor: '120 63 20',
  }),

  violet: createTheme({
    label: '霓紫 Violet',
    mode: 'dark',
    color: {
      bg: '#100b1a',
      bgSubtle: '#171029',
      bgElevated: '#1d1533',
      bgInset: '#130e21',
      bgHover: 'rgba(255, 255, 255, 0.07)',
      bgActive: 'rgba(255, 255, 255, 0.12)',
      bgDisabled: 'rgba(255, 255, 255, 0.04)',

      fg: '#ece6f8',
      fgMuted: '#a99cc4',
      fgSubtle: '#776a94',
      fgDisabled: '#544a6b',
      fgOnBrand: '#ffffff',

      border: '#2c2145',
      borderStrong: '#3f3068',
      borderSubtle: '#201835',

      brand: '#a855f7',
      brandHover: '#c084fc',
      brandActive: '#d8b4fe',
      brandSubtle: 'rgba(168, 85, 247, 0.18)',
      brandBorder: 'rgba(168, 85, 247, 0.44)',
      brandFg: '#d8b4fe',

      success: '#34d399',
      successSubtle: 'rgba(52, 211, 153, 0.16)',
      successFg: '#6ee7b7',
      warning: '#fbbf24',
      warningSubtle: 'rgba(251, 191, 36, 0.16)',
      warningFg: '#fcd34d',
      danger: '#fb7185',
      dangerSubtle: 'rgba(251, 113, 133, 0.16)',
      dangerFg: '#fda4af',
      info: '#60a5fa',
      infoSubtle: 'rgba(96, 165, 250, 0.16)',
      infoFg: '#93c5fd',

      overlay: 'rgba(8, 4, 18, 0.72)',
      focus: '#c084fc',
      skeleton: 'rgba(255, 255, 255, 0.08)',
    },
    shadowColor: '0 0 0',
  }),
}

export const DEFAULT_THEME = 'light'

/** 主题名 -> 明暗模式，供首屏防闪烁脚本与 color-scheme 使用 */
export const themeModes = Object.keys(themes).reduce((acc, key) => {
  acc[key] = themes[key].mode
  return acc
}, {})
