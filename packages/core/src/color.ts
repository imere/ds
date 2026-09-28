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

/**
 * #rgb / #rrggbb -> { r, g, b }。
 * 三位简写先展开成六位再解析，省掉两段几乎一样的取值逻辑。
 * 返回值里不带 alpha：hex 本身就是实色，补 alpha 是调用方的事，
 * 这样 Rgb 与 Rgba 两个接口才不至于混成一团。
 * 解析不了返回 null 而不是抛错，好让上游保留原始值、静默退化。
 * @param {string} hex 带或不带 # 的十六进制色值
 * @returns {Rgb|null} 三通道对象；格式不合法时返回 null
 */
export function parseHex(hex: string): Rgb | null {
  if (typeof hex !== 'string') return null
  let s = hex.trim().replace(/^#/, '')
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

/**
 * rgb() / rgba() / 空格语法 -> { r, g, b, a }。
 * 先把逗号和斜杠都换成空格再切分，是为了同时吃下 '15, 23, 42, .045' 与
 * '15 23 42 / .045' —— 设计稿和浏览器 devtools 两种写法都会流进来，
 * 与其要求调用方预处理，不如在这里一次性兼容。
 * 缺 alpha 时按 1 补：不透明是这个体系里的默认语义。
 * @param {string} str rgb() / rgba() 形式的字符串
 * @returns {Rgba|null} 四通道对象；匹配不上或通道非数字时返回 null
 */
export function parseRgb(str: string): Rgba | null {
  if (typeof str !== 'string') return null
  const m = str.match(/rgba?\(\s*([^)]+)\)/i)
  if (!m) return null
  // 同时兼容 "15, 23, 42, .045" 与 "15 23 42 / .045"
  const parts = m[1].replace(/\//g, ' ').replace(/,/g, ' ').trim().split(/\s+/)
  if (parts.length < 3) return null
  const out = {
    r: parseInt(parts[0], 10),
    g: parseInt(parts[1], 10),
    b: parseInt(parts[2], 10),
    a: parts.length > 3 ? parseFloat(parts[3]) : 1,
  }
  if (isNaN(out.r) || isNaN(out.g) || isNaN(out.b)) return null
  if (isNaN(out.a)) out.a = 1
  return out
}

/**
 * 任意写法 -> { r, g, b, a }；解析不了返回 null（上游应保留原值）。
 * 走 # 开头分派给 parseHex，其余交给 parseRgb：颜色在本系统里有四种写法，
 * 需要一个统一入口，否则每个调用点都得自己猜值长什么样。
 * 返回 null 而不是抛错，是因为色值多半来自用户配置，
 * 一条配错的令牌不该让整份样式表构建失败。
 * @param {string} value 任意写法的色值
 * @returns {Rgba|null} 四通道对象；认不出来时返回 null
 */
export function parseColor(value: string): Rgba | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.charAt(0) === '#') {
    const h = parseHex(v)
    return h ? { r: h.r, g: h.g, b: h.b, a: 1 } : null
  }
  return parseRgb(v)
}

/**
 * 通道串：'#4f46e5' -> '79 70 229'，用于 rgb(var(--x) / alpha)。
 * 把空格分隔的三通道存进 CSS 变量，同一份令牌就能在运行时配任意 alpha，
 * 不必为每个透明度再生成一个变量——这是令牌表能保持扁平的关键。
 * @param {string} value 任意写法的色值
 * @returns {string|null} 'r g b' 形式的通道串；解析不了返回 null
 */
export function toChannels(value: string): string | null {
  const c = parseColor(value)
  if (!c) return null
  return `${c.r} ${c.g} ${c.b}`
}

/**
 * 任意写法 -> 'rgba(r,g,b,a)'，IE10 也认（IE10 支持 rgba，不支持 CSS 变量）。
 * 这是老浏览器通道的兜底表示：变量求不了值，就把结果直接写成字面量 rgba。
 * alpha 省略或传 null 时沿用色值自带的透明度，调用方只想改颜色、不想管透明度的
 * 场景不必先把 alpha 读出来再传回去。
 * @param {string} value 任意写法的色值
 * @param {number} [alpha] 覆盖用的透明度 0~1；不传则沿用原值
 * @returns {string|null} rgba() 字符串；解析不了返回 null
 */
export function toRgba(value: string, alpha?: number | null): string | null {
  const c = parseColor(value)
  if (!c) return null
  const a = alpha === undefined || alpha === null ? c.a : alpha
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`
}

/**
 * 任意写法 -> '#rrggbb'。
 * 归一化到 hex 是为了让同一个颜色在快照、缓存键、mixin 计算里都长一个样，
 * 比较色值时就不必再区分 #fff 与 #ffffff。
 * @param {string} value 任意写法的色值
 * @returns {string|null} 小写六位 hex；解析不了返回 null
 */
export function toHex(value: string): string | null {
  const c = parseColor(value)
  if (!c) return null
  /**
   * 单通道转两位十六进制。
   * 单独抽出来是因为 r/g/b 三段逻辑完全一致，写成三份只会增加笔误的机会；
   * 先夹到 0~255 再四舍五入，混入时算出的越界值也不会产出畸形色值。
   * @param {number} n 通道数值，可能越界或带小数
   * @returns {string} 两位十六进制字符串
   */
  const hex = function (n: number): string {
    const s = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return s.length === 1 ? `0${s}` : s
  }
  return `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`
}

/**
 * 两色按权重混合，weight=0 取 a，1 取 b。
 * 在通道上做线性插值而不是交给 CSS color-mix()：后者 IE10 不认，
 * 这里算出来的 rgb() 在所有通道下都是同一个结果，主题快照才对得上。
 * 两端任一解析不了就返回 null —— 混色失败给不出有意义的替代值，宁可让上游保留原值。
 * @param {string} a 起始色
 * @param {string} b 结束色
 * @param {number} [weight] 0~1 的混合权重，省略时取 0.5
 * @returns {string|null} rgb() 字符串；任一端解析不了返回 null
 * @example
 * mix('#000000', '#ffffff', 0.5) // => 'rgb(128, 128, 128)'
 */
export function mix(a: string, b: string, weight?: number): string | null {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return null
  const w = weight === undefined ? 0.5 : weight
  /**
   * 按权重在两个通道值之间插值。
   * 抽出来只为少写三遍同一个公式，四舍五入放在最后，
   * 避免中间取整把误差累积到最终色值上。
   * @param {number} x 起始通道值
   * @param {number} y 结束通道值
   * @returns {number} 插值并取整后的通道值
   */
  const ch = function (x: number, y: number): number {
    return Math.round(x + (y - x) * w)
  }
  return `rgb(${ch(ca.r, cb.r)}, ${ch(ca.g, cb.g)}, ${ch(ca.b, cb.b)})`
}

/**
 * 相对亮度，WCAG 2.1。
 * 先做 gamma 展开再按人眼敏感度加权（绿最亮、蓝最暗），
 * 直接用通道平均值判断明暗会把黄色和蓝色判成一样亮。
 * 解析不了时返回 0（当作纯黑）：对比度计算宁可给出保守的「不合格」，
 * 也不要因为一条坏数据报出虚高的对比度。
 * @param {string} value 任意写法的色值
 * @returns {number} 0（黑）到 1（白）之间的相对亮度
 */
export function luminance(value: string): number {
  const c = parseColor(value)
  if (!c) return 0
  /**
   * 单通道的 gamma 展开。
   * 阈值 0.03928 是 WCAG 规定的线性段拐点，低于它走线性、高于它走幂函数；
   * 抽成内部函数是为了让上面那行加权公式读起来只剩三个通道。
   * @param {number} v 0~255 的通道值
   * @returns {number} 线性化后的 0~1 数值
   */
  const chan = function (v: number): number {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b)
}

/**
 * 对比度，用于校验文字/底色是否达标（AA 正文需 >= 4.5）。
 * 取两端里较亮者做分子，结果恒 >= 1，调用方不必关心传入顺序。
 * 保留两位小数：够判 AA / AAA，也避免浮点尾巴让快照 diff 抖动。
 * @param {string} a 色值之一，顺序无所谓
 * @param {string} b 另一个色值
 * @returns {number} 对比度比值，范围 1~21
 */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

/**
 * 把一个可能带 var() 的值在具体主题里求值。
 * IE10 通道下调用方会传入已解析好的令牌表，这里把 var(--ds-color-x)
 * 换成真实值；解析不了就原样返回（浏览器会自行忽略无效声明）。
 * 键名先按带前缀查、再按去前缀的裸名查：令牌表的写法历史上有两种，
 * 都认一遍就不用强迫调用方先统一。
 * @param {string} value 可能含 var() 的 CSS 值
 * @param {object} tokenMap 已解析好的令牌表，键是变量名（带前缀或裸名皆可）
 * @param {string} [prefix] 命名空间，用于剥掉键名上的前缀；不传按 'ds' 处理
 * @returns {string} 替换后的值；命中不了时保留 var() 原文或其兜底值
 * @example
 * resolveVarValue('var(--ds-color-brand, #000)', { 'color-brand': '#4f46e5' }, 'ds')
 * // => '#4f46e5'
 */
export function resolveVarValue(value: string, tokenMap: Dict<string>, prefix?: string): string {
  if (typeof value !== 'string' || value.indexOf('var(') === -1) return value
  const p = prefix || 'ds'
  return value.replace(/var\(\s*--([^),]+)\s*(?:,\s*([^)]+))?\)/g, (all, name, fallback) => {
    const key = String(name).trim()
    const bare = key.indexOf(`${p}-`) === 0 ? key.slice(p.length + 1) : key
    const hit = tokenMap[key] !== undefined ? tokenMap[key] : tokenMap[bare]
    if (hit !== undefined) return hit
    return fallback ? fallback.trim() : all
  })
}

/**
 * 判断一个对象是否是颜色令牌分组（供 class 生成时识别）。
 * 只认 # 开头和 rgb 开头的字符串，不解析值是否合法——
 * 这里要的是「这一支是不是颜色」的结构判断，合法性留给真正解析的地方校验，
 * 免得同一份值被解析两遍。
 * @param {unknown} v 待判断的值
 * @returns {boolean} 看着像颜色令牌返回 true
 */
export function isColorToken(v: unknown): boolean {
  return typeof v === 'string' && (v.charAt(0) === '#' || v.indexOf('rgb') === 0)
}
