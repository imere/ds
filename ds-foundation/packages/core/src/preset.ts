/**
 * 开箱即用的预设：基础令牌 + 明暗两套主题 + 强调色工厂
 * -------------------------------------------------------------
 * 颜色写法有一条硬规矩：本包最低支持 IE10，
 * IE10 认识 rgba(r, g, b, a)（逗号语法），不认识 rgb(r g b / a)（空格斜杠语法）。
 * 所以预设里所有半透明色一律用逗号写法，不要图省事改写成空格语法。
 */

import { createTheme } from './theme'
import type { AccentDef } from './theme'
import { mix, toRgba, luminance } from './color'

/** 中性色令牌（明暗两套底） */
export var lightTokens = {
  color: {
    bg: '#ffffff',
    bgSubtle: '#f8fafc',
    bgInset: '#f1f5f9',
    bgOverlay: 'rgba(15, 23, 42, 0.45)',

    fg: '#0f172a',
    fgMuted: '#64748b',
    fgSubtle: '#94a3b8',
    fgDisabled: '#cbd5e1',
    fgOnFill: '#ffffff',

    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    borderFocus: '#4f46e5',

    success: '#16a34a',
    successSubtle: 'rgba(22, 163, 74, 0.12)',
    warning: '#d97706',
    warningSubtle: 'rgba(217, 119, 6, 0.12)',
    danger: '#dc2626',
    dangerSubtle: 'rgba(220, 38, 38, 0.12)',
    info: '#0284c7',
    infoSubtle: 'rgba(2, 132, 199, 0.12)',
  },
  radius: { sm: '2px', md: '4px', lg: '8px', full: '9999px' },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    sizeSm: '12px',
    sizeMd: '14px',
    sizeLg: '16px',
    lineTight: '1.25',
    lineNormal: '1.5',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
    md: '0 2px 8px rgba(15, 23, 42, 0.08)',
    lg: '0 8px 24px rgba(15, 23, 42, 0.12)',
    focus: '0 0 0 3px rgba(79, 70, 229, 0.25)',
  },
  motion: { fast: '120ms', base: '200ms', slow: '320ms', ease: 'cubic-bezier(0.4, 0, 0.2, 1)' },
}

export var darkTokens = {
  color: {
    bg: '#0b1220',
    bgSubtle: '#111a2b',
    bgInset: '#0f172a',
    bgOverlay: 'rgba(2, 6, 23, 0.6)',

    fg: '#e2e8f0',
    fgMuted: '#94a3b8',
    fgSubtle: '#64748b',
    fgDisabled: '#475569',
    fgOnFill: '#0b1220',

    border: '#1e293b',
    borderStrong: '#334155',
    borderFocus: '#818cf8',

    success: '#22c55e',
    successSubtle: 'rgba(34, 197, 94, 0.16)',
    warning: '#f59e0b',
    warningSubtle: 'rgba(245, 158, 11, 0.16)',
    danger: '#ef4444',
    dangerSubtle: 'rgba(239, 68, 68, 0.16)',
    info: '#38bdf8',
    infoSubtle: 'rgba(56, 189, 248, 0.16)',
  },
  radius: { sm: '2px', md: '4px', lg: '8px', full: '9999px' },
  font: lightTokens.font,
  shadow: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 2px 8px rgba(0, 0, 0, 0.45)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.55)',
    focus: '0 0 0 3px rgba(129, 140, 248, 0.35)',
  },
  motion: lightTokens.motion,
}

export var lightTheme = createTheme({ label: '浅色', mode: 'light', tokens: lightTokens })
export var darkTheme = createTheme({ label: '深色', mode: 'dark', tokens: darkTokens })

/**
 * 强调色工厂：给一个主色，自动推出 hover / active / subtle / border / 前景色。
 * 业务接一个新品牌色只需要一行：registry.accent('brandA', makeAccent('#0ea5e9'))
 */
export function makeAccent(hex: string, label?: string): AccentDef {
  var subtle = toRgba(hex, 0.12)
  var darker = mix(hex, '#000000', 0.12)
  var darkest = mix(hex, '#000000', 0.24)
  var onFill = luminance(hex) > 0.45 ? '#0f172a' : '#ffffff'
  return {
    label: label || hex,
    swatch: hex,
    tokens: {
      color: {
        brand: hex,
        brandHover: darker,
        brandActive: darkest,
        brandSubtle: subtle,
        brandBorder: toRgba(hex, 0.4),
        onBrand: onFill,
        ring: toRgba(hex, 0.35),
        borderFocus: hex,
      },
      shadow: {
        focus: '0 0 0 3px ' + toRgba(hex, 0.25),
      },
    },
  }
}

export var DEFAULT_ACCENT = makeAccent('#4f46e5', '靛蓝')

export var accents = {
  indigo: DEFAULT_ACCENT,
  blue: makeAccent('#0ea5e9', '天蓝'),
  green: makeAccent('#16a34a', '青绿'),
  orange: makeAccent('#ea580c', '暖橙'),
}
