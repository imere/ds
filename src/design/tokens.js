/**
 * 设计令牌（Design Tokens）
 * -------------------------------------------------------------
 * 文件职责：
 *  1. `scale` —— 与主题无关的基础尺度（间距 / 圆角 / 字号 / 动效 / 层级 / 控件高度）
 *  2. `createTheme()` —— 用「颜色 + 阴影」快速派生一个完整主题，复用基础尺度
 *  3. `flattenTokens()` —— 把嵌套对象拍平成 `color-bg` 形式的键，供 CSS 变量使用
 *
 * 所有令牌最终会以 `--ds-<kebab-key>` 的形式注入到 <html> 上，
 * 组件样式只消费 CSS 变量，因此改一处令牌即可全站生效。
 */

/** 与主题无关的基础尺度 */
export const scale = {
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
}

/** 浅色 / 深色两套阴影，避免深色主题下阴影“消失” */
export const shadowPresets = {
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
}

/** 驼峰转短横线：bgSubtle -> bg-subtle */
export const kebab = (str) =>
  String(str).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

/** 嵌套对象拍平：{ color: { bg: '#fff' } } -> { 'color-bg': '#fff' } */
export function flattenTokens(obj, prefix = '', out = {}) {
  Object.keys(obj || {}).forEach((key) => {
    const value = obj[key]
    const next = prefix ? `${prefix}-${kebab(key)}` : kebab(key)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenTokens(value, next, out)
    } else if (value !== undefined && value !== null) {
      out[next] = String(value)
    }
  })
  return out
}

/**
 * 派生主题：颜色 + 阴影 + 基础尺度
 * @param {{ label: string, mode: 'light'|'dark', color: object, shadowColor?: string }} definition
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
