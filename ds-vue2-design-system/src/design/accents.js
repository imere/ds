/**
 * 强调色（Accent）预设
 * -------------------------------------------------------------
 * 与主题正交：换主题是换明暗底，换强调色是换品牌色。
 * 两者可自由组合，因此 5 主题 × 6 强调色 = 30 种外观。
 * 用 rgba 表达 subtle / border，保证在浅色与深色底上都成立。
 */

const brand = (main, hover, active, focus, rgb) => ({
  brand: main,
  brandHover: hover,
  brandActive: active,
  brandSubtle: `rgba(${rgb}, 0.12)`,
  brandBorder: `rgba(${rgb}, 0.32)`,
  brandFg: hover,
  focus: main,
})

export const accents = {
  indigo: {
    label: '靛蓝 Indigo',
    swatch: '#4f46e5',
    tokens: brand('#4f46e5', '#4338ca', '#3730a3', '#6366f1', '79 70 229'),
  },
  cyan: {
    label: '青碧 Cyan',
    swatch: '#0891b2',
    tokens: brand('#0891b2', '#0e7490', '#155e75', '#06b6d4', '8 145 178'),
  },
  emerald: {
    label: '翡翠 Emerald',
    swatch: '#059669',
    tokens: brand('#059669', '#047857', '#065f46', '#10b981', '5 150 105'),
  },
  amber: {
    label: '琥珀 Amber',
    swatch: '#d97706',
    tokens: brand('#d97706', '#b45309', '#92400e', '#f59e0b', '217 119 6'),
  },
  rose: {
    label: '玫瑰 Rose',
    swatch: '#e11d48',
    tokens: brand('#e11d48', '#be123c', '#9f1239', '#fb7185', '225 29 72'),
  },
  violet: {
    label: '紫罗兰 Violet',
    swatch: '#7c3aed',
    tokens: brand('#7c3aed', '#6d28d9', '#5b21b6', '#8b5cf6', '124 58 237'),
  },
}

/** 空字符串 = 跟随主题自带品牌色 */
export const DEFAULT_ACCENT = ''
