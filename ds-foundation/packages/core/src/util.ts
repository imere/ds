/**
 * 内部小工具
 * -------------------------------------------------------------
 * 本包最低支持 IE10，因此：
 *   · 不使用 Object.assign / Array.prototype.includes / Object.entries
 *   · 不使用 Set / Map / Promise / WeakMap
 *   · 语法层面（const、箭头函数、模板字符串、解构）交给 SWC 转译
 * 这样产物无需 core-js 即可在 IE10 上运行，也不污染宿主全局。
 *
 * 注意：tsc 的 target: ES5 在 TS 6 已废弃、TS 7 起移除，
 * 所以它只负责类型检查与产出 .d.ts，真正的 ES5 降级由 SWC 完成（见 swc.config.js）。
 */

/** 任意字典，令牌表、规则表都用它 */
export type Dict<T = unknown> = Record<string, T>

/** 遍历回调：数组时 key 是下标，对象时 key 是属性名 */
export type EachCallback<T> = (value: T, key: string | number) => void

/**
 * 判断一个值是不是「纯对象」。
 * 用 Object.prototype.toString 的结果而不是 typeof / instanceof，是因为跨 iframe
 * 时两边构造函数不同，instanceof 会误判；而 [object Object] 这一串始终可靠。
 * 数组、Date、null 在这里都不算纯对象——令牌合并时只有纯对象才值得往里递归。
 * @param {unknown} v 任意值
 * @returns {boolean} 是纯对象返回 true，否则 false
 */
export function isPlainObject(v: unknown): boolean {
  return Object.prototype.toString.call(v) === '[object Object]'
}

/**
 * Object.assign 的零依赖实现。
 * 本包要跑在 IE10 上，Object.assign 用不了，自己写一份还顺手把 null/undefined
 * 的来源跳过去，调用方就不用在每个合并点判空。
 * 只拷自有属性：原型链上的东西不跟着走，令牌表不允许被继承污染。
 * @param {object} target 目标对象，原地修改
 * @param {...object} sources 来源对象序列，null / undefined 会被跳过
 * @returns {object} 返回 target 本身，方便链式调用
 */
export function assign<T extends Dict>(target: T, ...sources: Array<object | null | undefined>): T {
  for (let i = 0; i < sources.length; i++) {
    // 入参放宽成 object：带具体字段的接口（没有索引签名）也能传进来，
    // 但 for-in 读属性得先断言成 Dict
    const src = sources[i] as Dict | null | undefined
    if (!src) continue
    for (const k in src) {
      // 泛型 T 只能读、不能直接写，这里断言成 Dict 再赋值
      if (Object.prototype.hasOwnProperty.call(src, k)) (target as Dict)[k] = src[k]
    }
  }
  return target
}

/**
 * 驼峰转短横线：bgSubtle -> bg-subtle。
 * 令牌名和 CSS 属性名都是短横线风格，但写 TS 对象时驼峰更顺手，
 * 所以转换统一放在这里，外部只管按驼峰声明。
 * 先 String() 再处理，数字下标之类的非字符串入参也不会炸。
 * @param {string} str 驼峰字符串
 * @returns {string} 短横线形式的字符串
 */
export function kebab(str: string): string {
  return String(str).replace(/[A-Z]/g, (m) => {
    return `-${m.toLowerCase()}`
  })
}

/**
 * 统一遍历数组与对象。
 * 令牌表既有数组形式也有字典形式，若每个遍历点都写两套循环，迟早有一处漏掉；
 * 收敛成一个入口后，调用方只管传，不必先判断容器类型。
 * 只走自有属性：避免把被污染的 Object.prototype 上的键一起带出来。
 * @param {Array<T>|object} list 数组或字典；传 null / undefined 时静默跳过
 * @param {Function} fn 每项的回调，收到 (值, 数组下标或对象键名)
 */
export function each<T = unknown>(
  list: T[] | Dict<T> | null | undefined,
  fn: EachCallback<T>
): void {
  if (!list) return
  if (Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) fn(list[i], i)
    return
  }
  for (const k in list) {
    if (Object.prototype.hasOwnProperty.call(list, k)) fn(list[k], k)
  }
}

/**
 * 遍历并收集映射结果。
 * 与 each 同源，区别只是把回调的返回值攒起来；返回值固定是数组，
 * 下游因此不必关心输入原本是数组还是字典。
 * @param {Array<T>|object} list 数组或字典；传 null / undefined 时得到空数组
 * @param {Function} fn 映射回调，收到 (值, 数组下标或对象键名)，返回新值
 * @returns {Array<R>} 映射结果组成的新数组
 */
export function map<T = unknown, R = unknown>(
  list: T[] | Dict<T> | null | undefined,
  fn: (value: T, key: string | number) => R
): R[] {
  const out: R[] = []
  each(list, (item, key) => {
    out.push(fn(item, key))
  })
  return out
}

/**
 * 遍历并按条件筛选。
 * 返回值一律是数组，即便输入是字典——筛选结果丢掉键名后本来就没有容器语义，
 * 保持一种返回类型能让调用方少写一层类型收窄。
 * @param {Array<T>|object} list 数组或字典；传 null / undefined 时得到空数组
 * @param {Function} fn 判定回调，收到 (值, 数组下标或对象键名)，返回 true 表示留下
 * @returns {Array<T>} 命中项组成的新数组
 */
export function filter<T = unknown>(
  list: T[] | Dict<T> | null | undefined,
  fn: (value: T, key: string | number) => boolean
): T[] {
  const out: T[] = []
  each(list, (item, key) => {
    if (fn(item, key)) out.push(item)
  })
  return out
}

/**
 * 数组去重（不依赖 Set）。
 * IE10 没有 Set，而这里处理的是几十个量级的令牌名，indexOf 扫一遍的开销可以忽略。
 * 保留首次出现的顺序：去重结果稳定，生成的 CSS 顺序才可预测、便于快照对比。
 * @param {Array<T>|object} list 数组或字典；传 null / undefined 时得到空数组
 * @returns {Array<T>} 去重后的新数组
 */
export function unique<T = unknown>(list: T[] | Dict<T> | null | undefined): T[] {
  const out: T[] = []
  each(list, (item) => {
    if (out.indexOf(item) === -1) out.push(item)
  })
  return out
}

/**
 * 简单路径取值：get(obj, 'color.brand')。
 * 只认点号，不支持下标和通配符——令牌表的层级本来就浅，够用就好，
 * 做成通用路径解析反而要背一整套语法负担。
 * 任一层取不到就返回 undefined 而不是抛错：配置缺项应当安静地退化，不该让整页挂掉。
 * @param {unknown} obj 被取值的对象，非对象直接返回 undefined
 * @param {string} path 以点号分隔的路径
 * @returns {unknown} 命中的值，取不到时为 undefined
 */
export function get(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined
  const parts = String(path).split('.')
  let cur: unknown = obj
  for (let i = 0; i < parts.length; i++) {
    if (cur === null || cur === undefined) return undefined
    cur = (cur as Dict)[parts[i]]
  }
  return cur
}

/**
 * 浅比较，用于判断令牌是否真的变了。
 * 主题切换前先比一层，没变就不重写 <style>——省掉一次无意义的重排与重绘。
 * 只比一层：令牌值都是原始值或已解析好的字符串，做深比较纯属浪费。
 * 非纯对象直接交给 === 判定，函数、数组之类按引用比更符合直觉。
 * @param {unknown} a 左值
 * @param {unknown} b 右值
 * @returns {boolean} 浅层相等返回 true
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!isPlainObject(a) || !isPlainObject(b)) return false
  const left = a as Dict
  const right = b as Dict
  const ka = Object.keys(left)
  if (ka.length !== Object.keys(right).length) return false
  for (let i = 0; i < ka.length; i++) {
    if (left[ka[i]] !== right[ka[i]]) return false
  }
  return true
}

/**
 * CSS 属性名驼峰转短横线：backgroundColor -> background-color。
 * 目前只是 kebab 的转发，但单独留一个名字：内联样式的属性名将来可能要处理
 * 少数驼峰特例（如 cssFloat），有这一层就可以只改一个点。
 * @param {string} name 驼峰形式的 CSS 属性名
 * @returns {string} 可直接写进 style 的短横线属性名
 */
export function cssProp(name: string): string {
  return kebab(name)
}
