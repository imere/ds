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

export function isPlainObject(v: unknown): boolean {
  return Object.prototype.toString.call(v) === '[object Object]'
}

/** Object.assign 的零依赖实现 */
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

/** 驼峰转短横线：bgSubtle -> bg-subtle */
export function kebab(str: string): string {
  return String(str).replace(/[A-Z]/g, (m) => {
    return `-${m.toLowerCase()}`
  })
}

/** 统一遍历数组与对象 */
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

/** 数组去重（不依赖 Set） */
export function unique<T = unknown>(list: T[] | Dict<T> | null | undefined): T[] {
  const out: T[] = []
  each(list, (item) => {
    if (out.indexOf(item) === -1) out.push(item)
  })
  return out
}

/** 简单路径取值：get(obj, 'color.brand') */
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

/** 浅比较，用于判断令牌是否真的变了 */
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

/** CSS 属性名驼峰转短横线：backgroundColor -> background-color */
export function cssProp(name: string): string {
  return kebab(name)
}
