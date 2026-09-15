/**
 * 色值工具
 * -------------------------------------------------------------
 * 这套设计系统里颜色有四种写法（见 README）：
 *   hex   #4f46e5                 实色
 *   rgba  rgba(15,23,42,.045)     半透明叠层
 *   通道  '79 70 229'             用于 rgb(var(--x) / alpha)
 *   派生  color-mix(...)          现代浏览器专用，IE10 会退化
 *
 * 本模块负责在它们之间换算，并保证「带 alpha 的值」在 IE10 上也能用
 * —— IE10 不认 CSS 变量，所以运行时把 var() 求值是 @ds/dom 的职责，
 * 这里只做纯计算。
 */

import type { Dict } from './util'

/** 解析出的 RGB 三通道 */
export interface Rgb {
  r: number
  g: number
  b: number
}

/** 带透明度的 RGBA */
export interface Rgba extends Rgb {
  a: number
}

/** #rgb / #rrggbb -> { r, g, b } */
export function parseHex(hex: string): Rgb | null {
  if (typeof hex !== 'string') return null
  var s = hex.trim().replace(/^#/, '')
  if (s.length === 3) {
    s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2)
  }
  if (s.length !== 6 || /[^0-9a-fA-F]/.test(s)) return null
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  }
}

/** rgb()/rgba()/空格语法 -> { r, g, b, a } */
export function parseRgb(str: string): Rgba | null {
  if (typeof str !== 'string') return null
  var m = str.match(/rgba?\(\s*([^)]+)\)/i)
  if (!m) return null
  // 同时兼容 "15, 23, 42, .045" 与 "15 23 42 / .045"
  var parts = m[1]
    .replace(/\//g, ' ')
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
  if (parts.length < 3) return null
  var out = {
    r: parseInt(parts[0], 10),
    g: parseInt(parts[1], 10),
    b: parseInt(parts[2], 10),
    a: parts.length > 3 ? parseFloat(parts[3]) : 1,
  }
  if (isNaN(out.r) || isNaN(out.g) || isNaN(out.b)) return null
  if (isNaN(out.a)) out.a = 1
  return out
}

/** 任意写法 -> { r, g, b, a }；解析不了返回 null（上游应保留原值） */
export function parseColor(value: string): Rgba | null {
  if (typeof value !== 'string') return null
  var v = value.trim()
  if (v.charAt(0) === '#') {
    var h = parseHex(v)
    return h ? { r: h.r, g: h.g, b: h.b, a: 1 } : null
  }
  return parseRgb(v)
}

/** 通道串：'#4f46e5' -> '79 70 229'，用于 rgb(var(--x) / alpha) */
export function toChannels(value: string): string | null {
  var c = parseColor(value)
  if (!c) return null
  return c.r + ' ' + c.g + ' ' + c.b
}

/** 任意写法 -> 'rgba(r,g,b,a)'，IE10 也认（IE10 支持 rgba，不支持 CSS 变量） */
export function toRgba(value: string, alpha?: number | null): string | null {
  var c = parseColor(value)
  if (!c) return null
  var a = alpha === undefined || alpha === null ? c.a : alpha
  return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + a + ')'
}

/** 任意写法 -> '#rrggbb' */
export function toHex(value: string): string | null {
  var c = parseColor(value)
  if (!c) return null
  var hex = function (n: number): string {
    var s = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return s.length === 1 ? '0' + s : s
  }
  return '#' + hex(c.r) + hex(c.g) + hex(c.b)
}

/** 两色按权重混合，weight=0 取 a，1 取 b */
export function mix(a: string, b: string, weight?: number): string | null {
  var ca = parseColor(a)
  var cb = parseColor(b)
  if (!ca || !cb) return null
  var w = weight === undefined ? 0.5 : weight
  var ch = function (x: number, y: number): number {
    return Math.round(x + (y - x) * w)
  }
  return 'rgb(' + ch(ca.r, cb.r) + ', ' + ch(ca.g, cb.g) + ', ' + ch(ca.b, cb.b) + ')'
}

/** 相对亮度，WCAG 2.1 */
export function luminance(value: string): number {
  var c = parseColor(value)
  if (!c) return 0
  var chan = function (v: number): number {
    var s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b)
}

/** 对比度，用于校验文字/底色是否达标（AA 正文需 >= 4.5） */
export function contrast(a: string, b: string): number {
  var la = luminance(a)
  var lb = luminance(b)
  var hi = Math.max(la, lb)
  var lo = Math.min(la, lb)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

/**
 * 把一个可能带 var() 的值在具体主题里求值。
 * IE10 通道下调用方会传入已解析好的令牌表，这里把 var(--ds-color-x)
 * 换成真实值；解析不了就原样返回（浏览器会自行忽略无效声明）。
 */
export function resolveVarValue(value: string, tokenMap: Dict<string>, prefix?: string): string {
  if (typeof value !== 'string' || value.indexOf('var(') === -1) return value
  var p = prefix || 'ds'
  return value.replace(/var\(\s*--([^),]+)\s*(?:,\s*([^)]+))?\)/g, function (all, name, fallback) {
    var key = String(name).trim()
    var bare = key.indexOf(p + '-') === 0 ? key.slice(p.length + 1) : key
    var hit = tokenMap[key] !== undefined ? tokenMap[key] : tokenMap[bare]
    if (hit !== undefined) return hit
    return fallback ? fallback.trim() : all
  })
}

/** 判断一个对象是否是颜色令牌分组（供 class 生成时识别） */
export function isColorToken(v: unknown): boolean {
  return typeof v === 'string' && (v.charAt(0) === '#' || v.indexOf('rgb') === 0)
}
