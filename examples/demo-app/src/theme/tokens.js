/**
 * 应用自己的令牌数据
 * -------------------------------------------------------------
 * 这里只放**属于这个产品的东西**：基础尺度（间距 / 圆角 / 字号 / 动效 / 层级 / 控件尺寸）
 * 和 5 套品牌色。
 *
 * 「引擎」不在这里了 —— 注册中心、CSS 变量注入、IE10 降级、订阅、
 * 持久化全部由 @ds/core + @ds/dom + @ds/vue2 提供：
 *   · 这套数据和 @ds 的分工是「业务留品牌，库管运行时」
 *   · 换品牌色改这里的 themes.js，不该去动库
 *
 * createTheme 产出的形状就是 @ds/core 的 ThemeDef（{ label, mode, tokens }），
 * 交给 registry.theme(name, def) 注册。
 */

import { defineTokens } from '@ds/core'

/** 与主题无关的基础尺度 */
export const scale = defineTokens({
  space: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '32px',
    8: '40px',
    9: '48px',
    10: '64px',
    11: '80px',
    12: '96px',
  },
  radius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },
  font: {
    familySans:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
    familyMono:
      "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  },
  fontSize: {
    '2xs': '11px',
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '22px',
    '3xl': '28px',
    '4xl': '34px',
    '5xl': '44px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.7',
  },
  motion: {
    durationInstant: '80ms',
    durationFast: '140ms',
    durationBase: '220ms',
    durationSlow: '360ms',
    easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  z: {
    base: '0',
    dropdown: '1000',
    sticky: '1100',
    overlay: '1200',
    modal: '1300',
    drawer: '1300',
    toast: '1400',
    tooltip: '1500',
  },
  size: {
    controlSm: '28px',
    controlMd: '36px',
    controlLg: '44px',
    controlXl: '52px',
    sidebar: '264px',
    topbar: '60px',
    contentMax: '1180px',
  },
})

/** 浅色 / 深色两套阴影，避免深色主题下阴影“消失”（它们引用 --ds-shadow-color） */
export const shadowPresets = defineTokens({
  light: {
    'shadow-sm': '0 1px 2px 0 rgb(var(--ds-shadow-color) / 0.06)',
    'shadow-md': '0 4px 12px -2px rgb(var(--ds-shadow-color) / 0.10)',
    'shadow-lg': '0 12px 32px -8px rgb(var(--ds-shadow-color) / 0.16)',
    'shadow-xl': '0 24px 56px -12px rgb(var(--ds-shadow-color) / 0.22)',
    'shadow-focus': '0 0 0 3px rgb(var(--ds-shadow-color) / 0.12)',
  },
  dark: {
    'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.5)',
    'shadow-md': '0 4px 14px -2px rgb(0 0 0 / 0.6)',
    'shadow-lg': '0 14px 36px -8px rgb(0 0 0 / 0.7)',
    'shadow-xl': '0 28px 64px -12px rgb(0 0 0 / 0.8)',
    'shadow-focus': '0 0 0 3px rgb(255 255 255 / 0.10)',
  },
})

/**
 * 派生主题：颜色 + 阴影 + 基础尺度
 * @param {{ label: string, mode: 'light'|'dark', color: object, shadowColor?: string }} definition
 * @returns {import('@ds/core').ThemeDef} 交给 registry.theme() / manager 的 themes 选项
 */
export function createTheme(definition) {
  const { label, mode = 'light', color, shadowColor } = definition
  return {
    label,
    mode,
    tokens: {
      ...scale,
      color,
      shadowColor: shadowColor || (mode === 'dark' ? '0 0 0' : '15 23 42'),
      ...shadowPresets[mode],
    },
  }
}
