/**
 * 外部令牌格式 -> 本库令牌表
 * -------------------------------------------------------------
 * 设计稿里的令牌不会按本库的形状来：Figma 导出的是 W3C Design Tokens（DTCG）
 * 格式，数值是**不带单位的裸数字**（单位语义藏在 `com.figma.scopes` 里），
 * 颜色是 `{colorSpace, components, alpha}` 对象而不是 `#1677FF`。
 * 手工搬一遍既慢又容易抄错，这一层负责把它机械地翻过来。
 *
 * 只做**格式翻译**，不做语义映射：
 *   `button.bg.brand.solid.default` 翻出来还是 `button-bg-brand-solid-default`，
 *   到底该叫 `color-brand` 还是 `color-action-primary`，是本库不知道、
 *   也不该猜的设计决策 —— 用 `include` / `exclude` 挑，或翻完自己改名。
 *
 * 为什么放在 core：这是纯算法（遍历 + 单位换算 + 别名解析），一行设计决策都没有。
 * `com.figma.scopes` 那张映射表是**格式规范的一部分**（Figma 定义 GAP 就是间距），
 * 不是我们挑的设计，所以它可以写死在这里。@ds/tokens 转出一份方便按包取用。
 *
 * IE10 约束同包内其余文件：不用 startsWith / includes / Object.assign / Set / Map，
 * 语法降级交给 SWC。
 */

import { isPlainObject, kebab } from './util'
import type { Dict } from './util'
import type { FlatTokens } from './token'
// 单位换算的原语在 unit.ts：`/convert` 用它，@ds/dom 的 unit 选项也用它，一份实现。
// remify / pxToRem / rescale 由 index 从 unit 统一转出，这里不再重复导出。
import { trimNum, toUnit, canConvert, length } from './unit'
import type { UnitId, UnitSpace } from './unit'

/** 任意一份 DTCG / Figma 导出的 JSON */
export type TokenSource = Dict<unknown>

/** 认不出来的类型怎么处理 */
export type UnknownMode = 'skip' | 'keep' | 'throw'

export interface ConvertOptions {
  /** 输出键前缀：'acme' -> 'acme-color-blue-500'。不给就用路径本身 */
  prefix?: string
  /**
   * 长度落地的目标单位，默认 'px'。
   *
   * **任意单位都能写**（'rem' / 'vw' / 'cqw' / 'ex' …），不是为了兼容两个值而列的联合：
   * px 能换过去的前提是查得到该单位的 px 系数（见 unit.ts 的 factorOf），
   * 绝对单位（pt / cm / q）与 rem 天然可换；vw / cqw 这类依赖环境的，
   * 要给 factors 才换得了，换不了时保持 px 并在 issues 里说明原因。
   */
  unit?: UnitId
  /** rem 的根字号，默认 16（浏览器默认根字号，不是设计决策） */
  rootFontSize?: number
  /** 依赖运行环境的单位系数：{ vw: 视口宽/100, cqw: 容器宽/100 } */
  factors?: Dict<number>
  /** 是否解析 `{a.b.c}` 别名引用，默认 true */
  resolveAlias?: boolean
  /** 只收这几棵子树，按点分路径前缀匹配：['color', 'space'] */
  include?: string[]
  /** 排除这几棵子树，规则同上 */
  exclude?: string[]
  /** 认不出的类型怎么处理，默认 'skip'（记进 issues，不进结果） */
  onUnknown?: UnknownMode
}

export interface ConvertIssue {
  /** 源码里的点分路径 */
  path: string
  /** 为什么没进来 / 怎么处理的 */
  reason: string
}

export interface ConvertResult {
  /** 扁平令牌表，键是短横线形式（'color-blue-500'） */
  tokens: FlatTokens
  /** 跳过、别名断链、未知类型的逐条记录。空的才是干净的转换 */
  issues: ConvertIssue[]
  /** 解析掉的别名条数 */
  aliases: number
}

/**
 * Figma scope -> 数值语义。
 * 这张表来自 Figma 的变量规范（GAP 就是间距、FONT_SIZE 就是字号），不是我们的设计决策。
 */
const FIGMA_SCOPE: Dict<string> = {
  GAP: 'length',
  WIDTH_HEIGHT: 'length',
  CORNER_RADIUS: 'length',
  FONT_SIZE: 'length',
  LINE_HEIGHT: 'length',
  LETTER_SPACING: 'length',
  EFFECT_FLOAT: 'length',
  // 描边宽度是 hairline：跟着根字号缩放会让 1px 边框在高缩放下变粗/消失
  STROKE_FLOAT: 'hair',
  OPACITY: 'opacity',
  FONT_STYLE: 'weight',
  FONT_FAMILY: 'text',
}

/** 复合类型：值是对象，要摊平成子键 */
const COMPOSITE = {
  typography: true,
  shadow: true,
  border: true,
  transition: true,
  gradient: true,
  strokeStyle: true,
}

/** 复合类型里子字段的数值语义 */
const FIELD_KIND: Dict<string> = {
  fontSize: 'length',
  lineHeight: 'length',
  letterSpacing: 'length',
  paragraphSpacing: 'length',
  offsetX: 'length',
  offsetY: 'length',
  blur: 'length',
  spread: 'length',
  width: 'length',
  thickness: 'length',
  fontWeight: 'weight',
  opacity: 'opacity',
  color: 'color',
}

/** 路径里出现这些词，就当长度处理（scope 缺失时的兜底推断） */
const LENGTH_HINT = [
  'radius',
  'space',
  'spacing',
  'size',
  'dimension',
  'width',
  'height',
  'gap',
  'padding',
  'margin',
  'blur',
  'spread',
  'offset',
  'font-size',
  'line-height',
  'letter-spacing',
]

/**
 * 一位十六进制补成两位。不用 padStart：IE10 没有这个方法。
 *
 * @param {number} n 0~255 的通道值
 * @returns {string} 两位十六进制
 */
function pad2(n: number): string {
  return `0${n.toString(16)}`.slice(-2)
}

/**
 * 夹到 0~255 并取整。
 *
 * 先取整再夹，顺序不能反：0.6 夹完再取整会变成 1，而设计稿里的 0.6/255
 * 本来就该落到 0，先取整才符合「肉眼看到的那个色」。
 *
 * @param {number} n 任意数字
 * @returns {number} 0~255 的整数
 */
function clamp255(n: number): number {
  const v = Math.round(n)
  return v < 0 ? 0 : v > 255 ? 255 : v
}

/**
 * Figma 的通道是 0~1 的小数，CSS 要 0~255 的整数。
 *
 * 非数字一律当 0：设计稿里某个通道缺了，取 0 得到的是一个可辨别的错色，
 * 比抛错中断整份令牌的转换要好定位。
 *
 * @param {unknown} c 通道值（0~1）
 * @returns {number} 0~255 的整数
 */
function channel(c: unknown): number {
  return clamp255((typeof c === 'number' ? c : 0) * 255)
}

/**
 * Figma 的颜色对象 -> CSS 色值。
 * alpha < 1 时输出**逗号语法**的 rgba：空格语法 IE10 不认（见 README 的 IE10 一节）。
 *
 * 认不出颜色对象时不抛错、返回空串：这一层是批量转换，
 * 一条坏色值不该让整份令牌翻不过来，交给调用方按 issues 处理。
 *
 * @param {Dict} value Figma 的颜色对象，至少要有 components 或 hex
 * @returns {string} '#rrggbb' 或 'rgba(r, g, b, a)'；认不出就是空串
 */
export function figmaColor(value: Dict): string {
  const comp = value.components
  if (!Array.isArray(comp) || comp.length < 3) {
    return typeof value.hex === 'string' ? value.hex : ''
  }
  const r = channel(comp[0])
  const g = channel(comp[1])
  const b = channel(comp[2])
  const alpha = typeof value.alpha === 'number' ? value.alpha : 1
  if (alpha >= 1) return `#${pad2(r)}${pad2(g)}${pad2(b)}`
  return `rgba(${r}, ${g}, ${b}, ${trimNum(alpha)})`
}

/**
 * include / exclude 的前缀匹配。调用点已经判过空，这里不再判一次 ——
 * 判空放在一起做，省得每个辅助函数都长出一个「list 可能是 undefined」的分支。
 *
 * 按**路径段**匹配而不是字符串前缀：'border' 不该命中 'bordered'，
 * 否则想挑边框的人会连带收进一堆名字里带 border 的东西。
 *
 * @param {string} path 点分路径
 * @param {Array<string>} list 路径前缀清单
 * @returns {boolean} 命中就是 true
 */
function hasPrefix(path: string, list: string[]): boolean {
  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    // 空前缀靠「后面必须是 .」自然排除，不会变成匹配一切的通配符
    if (path === p || path.indexOf(`${p}.`) === 0) return true
  }
  return false
}

/**
 * 取类型名。`$type` 优先于 `type`：DTCG 定稿用的是 $ 前缀，
 * 早期草稿与 Figma 导出用的是不带 $ 的写法，两种都得认。
 *
 * @param {Dict} node 令牌或组节点
 * @returns {string} 类型名；没有或不是字符串就是空串
 */
function typeOf(node: Dict): string {
  const t = '$type' in node ? node.$type : node.type
  return typeof t === 'string' ? t : ''
}

/**
 * 取值，理由同 typeOf：`$value` 优先于 `value`。
 *
 * 用 `in` 而不是取属性判 undefined：值本身可能就是 undefined（设计稿里空着的令牌），
 * 只有「键在不在」才能区分「写了」和「没写」。
 *
 * @param {Dict} node 令牌节点
 * @returns {unknown} 节点上的值；没有就是 undefined
 */
function valueOf(node: Dict): unknown {
  return '$value' in node ? node.$value : node.value
}

/**
 * 判断这个节点是一条令牌还是一个组。只会被 collect 调用，入参一定是对象。
 *
 * 用「除了 value 还有没有别的**对象型**子键」来判，而不是看有没有子键：
 * 组里常常混着写死的元数据（$type / $description / 字符串型的扩展字段），
 * 只有子键还是对象，才说明下面还有一层令牌。
 *
 * @param {Dict} node 待判节点
 * @returns {boolean} 是令牌就是 true
 */
function isTokenNode(node: Dict): boolean {
  if ('$value' in node) return true
  if (!('value' in node)) return false
  // 旧写法的 `value` 与「组里恰好有个子令牌叫 value」天生有歧义。
  // 判据：除了 value，还有别的**对象型**子键，那就是个组而不是令牌。
  // 实测 Figma 导出的 input.text = { placeholder, value, disabled } 正是这种组。
  const keys = Object.keys(node)
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (k === 'value' || k.charAt(0) === '$') continue
    if (isPlainObject(node[k])) return false
  }
  return true
}

/**
 * 长成颜色对象的就是颜色对象：带 `components`（Figma）或 `hex` 即认。
 * 不再看 $type —— 复合类型里某个子字段是颜色时，它的 $type 是父级的复合类型名。
 *
 * @param {Dict} value 待判的值
 * @returns {boolean} 长成颜色对象就是 true
 */
function isColorObject(value: Dict): boolean {
  return 'components' in value || 'hex' in value
}

/**
 * 路径段归一化：Figma 用 $root 表示「这一组的默认值」。
 *
 * 它是一条真令牌，不能当元数据跳过 —— 但 `$` 开头的键在本库的键名里没有意义，
 * 而且 CSS 变量名带 $ 是麻烦，所以落成 'root'。
 *
 * @param {string} key 原始键名
 * @returns {string} 归一化后的键名
 */
function segmentOf(key: string): string {
  return key === '$root' ? 'root' : key
}

/**
 * 整条路径过一遍 segmentOf。
 *
 * 索引里的路径与别名里的路径必须**用同一套写法**才对得上，
 * 所以别名解析前先归一化，而不是只在建索引时处理一次。
 *
 * @param {string} path 点分路径
 * @returns {string} 归一化后的路径
 */
function normalizePath(path: string): string {
  return path
    .split('.')
    .map((seg) => segmentOf(seg))
    .join('.')
}

/** 一条原始令牌：点分路径 + 节点 + 继承来的类型 */
interface Raw {
  path: string
  node: Dict
  type: string
}

/** 标量解析的结果。`reported` 为真表示失败原因已经记进 issues */
interface Resolved {
  value: string | null
  reported: boolean
}

/** 已记过 issue 的失败，共用一份，省得每次新建对象 */
const FAILED: Resolved = { value: null, reported: true }

/**
 * 递归收集所有令牌节点，摊平成一维的 Raw[]。
 *
 * 先摊平再逐条处理，而不是边遍历边转换：别名解析要能**按路径回查任意一条**，
 * 一次遍历时后面的令牌还没收进来，引用它必然断链。
 *
 * 组上的 $type 往下继承（DTCG 允许只写一次），所以 `inherited` 要一路传下去。
 *
 * @param {Dict} node 当前节点
 * @param {string} prefix 到当前节点为止的点分路径
 * @param {string} inherited 从祖先组继承来的类型
 * @param {Array<Raw>} out 收集结果的数组，就地追加
 * @returns {void} 无返回值
 */
function collect(node: Dict, prefix: string, inherited: string, out: Raw[]): void {
  const keys = Object.keys(node)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (key.charAt(0) === '$' && key !== '$root') continue
    const child = node[key]
    if (!isPlainObject(child)) continue
    const seg = segmentOf(key)
    const path = prefix ? `${prefix}.${seg}` : seg
    // 组上的 $type 会被子节点继承（DTCG 允许只在组上写一次）
    const type = typeOf(child as Dict) || inherited
    if (isTokenNode(child as Dict)) out.push({ path, node: child as Dict, type })
    else collect(child as Dict, path, type, out)
  }
}

/**
 * 判断一个裸数字的语义（length / opacity / hair / weight / none）。
 *
 * 优先级是 scope > $type > 路径关键词：Figma 的 scope 是显式声明，
 * 路径关键词只是没有 scope 时的兜底猜测，不能让猜测盖过声明。
 *
 * @param {string} path 点分路径，关键词兜底时看它
 * @param {string} type 节点的 $type
 * @param {Dict} node 节点本身，用来读 com.figma.scopes
 * @returns {string} 语义名；判不出来就是 'none'
 */
function kindOf(path: string, type: string, node: Dict): string {
  // Figma 的扩展字段是平铺在 $extensions 下的：'com.figma.scopes' / 'com.figma.codeSyntax'，
  // 不是 { com: { figma: { scopes } } } 这种嵌套
  const ext = node.$extensions || node.extensions
  const scopes = isPlainObject(ext) ? (ext as Dict)['com.figma.scopes'] : null
  if (Array.isArray(scopes)) {
    for (let i = 0; i < scopes.length; i++) {
      const kind = FIGMA_SCOPE[String(scopes[i])]
      if (kind) return kind
    }
  }
  if (type === 'dimension') return 'length'
  const lower = path.toLowerCase()
  for (let i = 0; i < LENGTH_HINT.length; i++) {
    if (lower.indexOf(LENGTH_HINT[i]) !== -1) return 'length'
  }
  if (lower.indexOf('opacity') !== -1) return 'opacity'
  if (lower.indexOf('weight') !== -1) return 'weight'
  return 'none'
}

/**
 * 把裸数字按语义落成字符串。
 *
 * 这里的数字是**设计稿的 px**（Figma 的数值不带单位，单位语义在 scope 里），
 * 所以任何目标单位都得先从 px 折过去 —— 能折多少取决于 unit.ts 查不查得到系数。
 *
 * @param {number} n 设计稿里的 px 数字
 * @param {string} kind 数值语义：length / opacity / hair / …（见 kindOf）
 * @param {UnitId} unit 目标单位。调用前已经确认过它换得了
 * @param {UnitSpace} space 换算上下文
 * @returns {string} 落成字符串的值
 */
function formatNumber(n: number, kind: string, unit: UnitId, space: UnitSpace): string {
  if (kind === 'opacity') {
    // Figma 的 opacity 变量既见过 0.45 也见过 45 —— 大于 1 的当百分数
    return String(trimNum(n > 1 ? n / 100 : n))
  }
  if (kind === 'length') return unit === 'px' ? `${trimNum(n)}px` : length(n, unit, space)
  // hair（描边宽度）恒为 px；字重、裸数字一类则不加单位
  if (kind === 'hair') return `${trimNum(n)}px`
  return String(trimNum(n))
}

/**
 * 带单位的字符串（DTCG 的 dimension 是 '4px' 这种）按目标单位换算。
 * 换不了就原样返回 —— 半个换算出来的值比不换算糟得多。
 *
 * @param {string} value 原值
 * @param {UnitId} unit 目标单位
 * @param {UnitSpace} space 换算上下文
 * @returns {string} 换算后的字符串
 */
function retarget(value: string, unit: UnitId, space: UnitSpace): string {
  if (unit === 'px') return value
  return toUnit(value, unit, space)
}

/**
 * 点分路径 -> 短横线扁平键（'color.blue.500' -> 'color-blue-500'）。
 *
 * 不复用 Object.keys 直接 join：每段都要单独 kebab（'fontSize' -> 'font-size'），
 * 并且统一小写 —— 键名大小写不一致时 CSS 变量名会变成两个不同的变量。
 *
 * @param {string} path 点分路径
 * @param {string|undefined} prefix 输出键前缀；不给就不加
 * @returns {string} 扁平键
 */
function toKey(path: string, prefix: string | undefined): string {
  const parts = path.split('.')
  let out = ''
  for (let i = 0; i < parts.length; i++) {
    const seg = kebab(parts[i]).toLowerCase()
    out = out ? `${out}-${seg}` : seg
  }
  return prefix ? `${kebab(prefix).toLowerCase()}-${out}` : out
}

/**
 * 通用转换。fromW3C 与 fromFigma 都走这里 —— **今天两者实现完全相同**。
 *
 * 一开始设计成 `figma` 开关（只给 Figma 认颜色对象与 scopes），写着写着发现没必要：
 * 认不认 `{components}` 看值长什么样就行，单位看 `com.figma.scopes` 的数据就行，
 * 都是数据驱动，没有需要按来源分流的分支。留一个用不上的布尔开关反而是负担 ——
 * 哪天 Figma 再出私有约定（比如 $root 这种），加进这里，入口名字已经把意图说清了。
 *
 * @param {unknown} src DTCG / Figma 导出的 JSON
 * @param {ConvertOptions|undefined} options 转换选项；不给就全用默认值
 * @returns {ConvertResult} 扁平令牌表 + issues + 解析掉的别名条数
 */
function convert(src: unknown, options: ConvertOptions | undefined): ConvertResult {
  const o = options || {}
  const root = typeof o.rootFontSize === 'number' && o.rootFontSize > 0 ? o.rootFontSize : 16
  const space: UnitSpace = { rootFontSize: root, factors: o.factors }
  const doAlias = o.resolveAlias !== false
  const unknown: UnknownMode = o.onUnknown || 'skip'

  const tokens: FlatTokens = {}
  const issues: ConvertIssue[] = []
  let aliases = 0

  let unit: UnitId = o.unit || 'px'
  if (unit !== 'px' && !canConvert(unit, space)) {
    // 目标单位换不了 —— 多半是给了一批 vw / cqw 却没给 factors。
    // 记一条并退回 px，而不是把数字换个单位符号冒充换算过。
    issues.push({
      path: '',
      reason: `目标单位 ${unit} 换算不了 px -> ${unit}，需要 factors（例如 factors: { ${unit}: 视口宽/100 }），已按 px 输出`,
    })
    unit = 'px'
  }

  if (!isPlainObject(src)) {
    return { tokens, issues: [{ path: '', reason: '输入不是对象' }], aliases }
  }

  const rootNode = src as Dict
  const raws: Raw[] = []
  collect(rootNode, '', '', raws)

  // 别名索引：点分路径 -> 原始节点。Tokens Studio 的别名不带集合名，
  // 所以解析时另外把顶层组名逐个当前缀试一遍。
  const index: Dict<Raw> = {}
  for (let i = 0; i < raws.length; i++) {
    index[raws[i].path] = raws[i]
  }
  const rootKeys = Object.keys(rootNode)

  /**
   * 按别名里的路径回查令牌。
   *
   * 查不到时再逐个顶层组名当前缀试一遍：Tokens Studio 的别名不带集合名，
   * 而导出的 JSON 顶层就是集合（如 'primitives.color.blue.500' 被写成
   * '{color.blue.500}'），不补这一层几乎全部别名都会断链。
   *
   * @param {string} ref 别名里的点分路径
   * @returns {Raw|null} 命中的原始令牌；没有就是 null
   */
  function lookup(ref: string): Raw | null {
    // 别名里可能带着 Figma 的 $root（组默认值），先归一成和索引一致的写法
    const path = normalizePath(ref)
    if (index[path]) return index[path]
    for (let i = 0; i < rootKeys.length; i++) {
      const hit = index[`${rootKeys[i]}.${path}`]
      if (hit) return hit
    }
    return null
  }

  /**
   * 解析一个标量值（可能是别名、颜色对象、数字、字符串）。
   * `reported` 用来避免同一条记两遍：别名断链的原因在这一层就写进 issues 了，
   * 调用方拿到的 null 不该再补一条「值无法解析」。
   *
   * 递归深度卡在 8 层：别名互相引用成环时，靠这个上限停下来并报「怀疑循环引用」，
   * 而不是让调用栈溢出 —— 溢出信息里看不出是哪条令牌成的环。
   *
   * @param {unknown} value 待解析的值：别名 / 颜色对象 / 数字 / 字符串 / 布尔
   * @param {string} path 当前点分路径，用于记 issue 与推断数值语义
   * @param {string} type 当前节点的 $type
   * @param {Dict} node 当前节点，用于读 figma scopes
   * @param {number} depth 别名递归层数
   * @returns {Resolved} 解析结果；value 为 null 表示没解析出来
   */
  function resolveScalar(
    value: unknown,
    path: string,
    type: string,
    node: Dict,
    depth: number
  ): Resolved {
    if (typeof value === 'string') {
      // '{a.b.c}' 别名：前后空白无所谓，整串只有一个引用才认
      const ref = value.trim()
      if (ref.charAt(0) === '{' && ref.charAt(ref.length - 1) === '}') {
        const target = ref.slice(1, -1).trim()
        if (!doAlias) return { value: ref, reported: false }
        if (depth > 8) {
          issues.push({ path, reason: `别名解析超过 8 层，怀疑循环引用：${target}` })
          return FAILED
        }
        const hit = lookup(target)
        if (!hit) {
          issues.push({ path, reason: `别名指向的令牌不存在：${target}` })
          return FAILED
        }
        aliases++
        return resolveScalar(valueOf(hit.node), hit.path, hit.type || type, hit.node, depth + 1)
      }
      return { value: type === 'dimension' ? retarget(value, unit, space) : value, reported: false }
    }
    if (typeof value === 'number') {
      return {
        value: formatNumber(value, kindOf(path, type, node), unit, space),
        reported: false,
      }
    }
    if (typeof value === 'boolean') {
      return { value: value ? 'true' : 'false', reported: false }
    }
    if (isPlainObject(value) && isColorObject(value as Dict)) {
      const color = figmaColor(value as Dict)
      // 既没有 components 也没有 hex —— 记一条而不是写个空串进去
      return color ? { value: color, reported: false } : { value: null, reported: false }
    }
    return { value: null, reported: false }
  }

  /**
   * 把一条结果写进令牌表。写出的唯一入口，键名的规则只在这里定一次。
   *
   * @param {string} path 原始点分路径
   * @param {string} value 已解析成字符串的值
   * @returns {void} 无返回值
   */
  function push(path: string, value: string): void {
    tokens[toKey(path, o.prefix)] = value
  }

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i]
    if (o.include && !hasPrefix(raw.path, o.include)) continue
    if (o.exclude && hasPrefix(raw.path, o.exclude)) continue

    const value = valueOf(raw.node)
    // 颜色对象（Figma 的 {components, alpha} 或只有 hex）不是复合类型，别往那边走
    const isColor = isPlainObject(value) && isColorObject(value as Dict)

    if (isPlainObject(value) && !isColor) {
      // 复合类型（typography / shadow / border…）：摊平成子键
      const composite = COMPOSITE[raw.type as keyof typeof COMPOSITE]
      if (!composite) {
        if (unknown === 'throw') {
          throw new Error(
            `[ds/core] ${raw.path} 的值还是对象，但不是已知复合类型（${raw.type || '无 $type'}）`
          )
        }
        if (unknown === 'keep') push(raw.path, JSON.stringify(value))
        else
          issues.push({ path: raw.path, reason: `值还是对象且类型未知：${raw.type || '无 $type'}` })
        continue
      }
      const children = value as Dict
      const childKeys = Object.keys(children)
      for (let j = 0; j < childKeys.length; j++) {
        const ck = childKeys[j]
        if (ck.charAt(0) === '$') continue
        const cv = children[ck]
        const kind = FIELD_KIND[ck] || ''
        const childPath = `${raw.path}.${kebab(ck)}`
        const childType = kind === 'color' ? 'color' : kind === 'length' ? 'dimension' : raw.type
        const out = resolveScalar(cv, childPath, childType, raw.node, 0)
        if (out.value === null) {
          if (!out.reported) {
            issues.push({ path: childPath, reason: '复合类型的子字段值无法解析' })
          }
          continue
        }
        push(childPath, out.value)
      }
      continue
    }

    const out = resolveScalar(value, raw.path, raw.type, raw.node, 0)
    if (out.value === null) {
      if (!out.reported) {
        if (unknown === 'throw') {
          throw new Error(`[ds/core] ${raw.path} 的值无法解析（$type=${raw.type || '无'}）`)
        }
        issues.push({ path: raw.path, reason: `值无法解析：$type=${raw.type || '无'}` })
      } else if (unknown === 'throw') {
        throw new Error(`[ds/core] ${raw.path} 的别名解析失败`)
      }
      continue
    }
    push(raw.path, out.value)
  }

  return { tokens, issues, aliases }
}

/**
 * W3C Design Tokens（DTCG）-> 本库扁平令牌表。
 * 认 `$value` / `$type`，也认早期写法的 `value` / `type`；
 * `{a.b.c}` 别名会解析；组上的 `$type` 会被子节点继承；
 * 复合类型（typography / shadow / border…）摊平成子键。
 *
 * @param {unknown} src DTCG 格式的 JSON
 * @param {ConvertOptions} [options] 转换选项
 * @returns {ConvertResult} 扁平令牌表 + issues + 别名条数
 */
export function fromW3C(src: unknown, options?: ConvertOptions): ConvertResult {
  return convert(src, options)
}

/**
 * Figma 原生导出（Variables -> Export）-> 本库扁平令牌表。
 *
 * 和 fromW3C 走同一套逻辑（原因见 convert 的注释），区别只在**它保证认得的东西**：
 *   1. 颜色是 `{colorSpace, components, alpha, hex}` —— alpha<1 落成逗号语法的 rgba
 *      （IE10 不认空格语法），没有 components 时退回 hex
 *   2. 数值没有单位，靠 `com.figma.scopes` 判断是间距 / 圆角 / 字号 / 描边 / 透明度
 *   3. 描边宽度（STROKE_FLOAT）恒为 px —— hairline 不该跟着根字号缩放
 *   4. `$root` 是组默认值，是一条真令牌
 *
 * @param {unknown} src Figma Variables 导出的 JSON
 * @param {ConvertOptions} [options] 转换选项
 * @returns {ConvertResult} 扁平令牌表 + issues + 别名条数
 */
export function fromFigma(src: unknown, options?: ConvertOptions): ConvertResult {
  return convert(src, options)
}

/*
 * 单位换算（`pxToRem` / `remify` / `remifyTree`）统一住在 ./unit，不在这一层。
 * 原因是它们不只导入令牌时用：`@ds/core` 的派生链和 `@ds/dom` 的 unit 选项
 * 都要用同一份实现，写在这里等于让 derive 反向依赖 convert。
 *
 * 「为什么是事后换算而不是让派生链直接产 rem」这个结论也已经作废了一半：
 * 见 unit.ts 文件头 —— derive 现在会把 px 差值折到种子的单位里，
 * 所以「给 rem 种子」这条路是不需要事后换算的。剩下的另一半（描边保持 px）
 * 是策略，由 DEFAULT_KEEP_PX 表达。
 */
