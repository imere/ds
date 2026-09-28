/**
 * 明暗两套基础令牌
 * -------------------------------------------------------------
 * 色值接近 Tailwind 的 slate 色阶，是手工挑过的 —— 不是从种子线性插值算出来的，
 * 所以没走 @ds/core 的派生链。派生的定位是「新主题快速起稿」，
 * 官方这套要的是确定的观感，宁可一行行写死。
 *
 * dark 里 font / motion 直接复用 light 的：这两组跟明暗无关，
 * 写两份只会导致改字号时漏改一边。
 */

import { createTheme } from '@ds/core'

/** 浅色：中性底 + 语义色 + 圆角 / 字体 / 阴影 / 动效 */
export const lightTokens = {
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

/** 深色：底翻暗，前景翻亮；阴影换成更重的纯黑（浅色叠加在暗底上会发灰） */
export const darkTokens = {
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

export const lightTheme = createTheme({ label: '浅色', mode: 'light', tokens: lightTokens })
export const darkTheme = createTheme({ label: '深色', mode: 'dark', tokens: darkTokens })

/** 注册时最常用的一组，省得每个业务都手写一遍 { light, dark } */
export const themes = { light: lightTheme, dark: darkTheme }
