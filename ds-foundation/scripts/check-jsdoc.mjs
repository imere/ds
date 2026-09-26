/**
 * JSDoc 完整性检查
 * -------------------------------------------------------------
 * 「所有函数都要有完整 JSDoc」这条规矩，靠人眼 review 一定守不住 ——
 * 规矩本身就该机械化，跟 IE10 语法检查（acorn 解析）与 API 检查（compat 数据）同理：
 * 集合会长大的事情，不要手写清单，交给工具判。
 *
 * 判的是三件事：
 *   1. 有没有 JSDoc 块（不是 // 注释，也不是 /** 一行糊过去）
 *   2. 每个参数有没有 @param（名字对不对得上）
 *   3. 有没有 @returns（声明了 : void 的不要求）
 *
 * 用法：
 *   node scripts/check-jsdoc.mjs            全量检查 packages 各包的 src 与 scripts 下的脚本
 *   node scripts/check-jsdoc.mjs <file>     只看某个文件
 * 退出码：有问题就是 1。CI 里直接接上即可，不用再引第三方插件。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

/**
 * 递归走一个目录，把符合扩展名的文件都收上来。
 * node_modules / dist 直接跳过 —— 那里面的东西不是我们的源码。
 *
 * @param {string} dir 绝对路径
 * @param {Array<string>} exts 扩展名列表，如 ['.ts']
 * @returns {Array<string>} 文件路径列表
 */
function collectFiles(dir, exts) {
  if (!fs.existsSync(dir)) return []
  const out = []
  /**
   * 深度优先走一层目录，命中扩展名就收，是目录就继续往下钻。
   *
   * @param {string} current 当前目录绝对路径
   * @returns {void} 结果写进外层的 out
   */
  const walk = (current) => {
    const items = fs.readdirSync(current, { withFileTypes: true })
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const full = path.join(current, item.name)
      if (item.isDirectory()) {
        if (item.name === 'node_modules' || item.name === 'dist') continue
        walk(full)
        continue
      }
      if (exts.indexOf(path.extname(item.name)) !== -1) out.push(full)
    }
  }
  walk(dir)
  return out
}

/**
 * 本次要检查的全部文件：packages 下各包的 src（产物 dist 不查）+ 本仓库自己的脚本。
 *
 * @returns {Array<string>} 绝对路径列表
 */
function targets() {
  const files = collectFiles(path.join(root, 'packages'), ['.ts']).filter((f) => {
    return f.split(path.sep).indexOf('src') !== -1
  })
  return files.concat(collectFiles(path.join(root, 'scripts'), ['.mjs']))
}

/**
 * 摘出一行里声明的参数名。
 * 认得 `a`、`a?: T`、`a: T = x`、解构 `{a, b}`、`this: Vue`（略过 this）。
 * @param {string} raw 参数列表原文
 * @returns {Array<string>} 参数名列表
 */
function paramNames(raw) {
  const src = raw.trim()
  if (!src) return []
  const out = []
  let depth = 0
  let buf = ''
  let angle = 0
  for (let i = 0; i < src.length; i++) {
    const ch = src.charAt(i)
    if (ch === '<') angle++
    if (ch === '>') angle--
    if (ch === '{' || ch === '(' || ch === '[') depth++
    if (ch === '}' || ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0 && angle === 0) {
      out.push(buf)
      buf = ''
      continue
    }
    buf += ch
  }
  out.push(buf)

  const names = []
  for (let i = 0; i < out.length; i++) {
    let seg = out[i].trim()
    const destructured = seg.charAt(0) === '{' || seg.charAt(0) === '['
    // 'key: TokenKey' -> 'key'；'this: Vue' -> 略过
    const colon = seg.indexOf(':')
    if (colon !== -1 && !destructured) seg = seg.slice(0, colon)
    seg = seg.trim().replace(/^\.\.\./, '').replace(/\?$/, '').replace(/=.*$/, '').trim()
    if (!seg) continue
    if (seg === 'this') continue
    names.push(destructured ? seg.slice(0, 12) + '…' : seg)
  }
  return names
}

/**
 * 返回类型是不是 void 系（void / void | undefined / Promise<void>）。
 * 只有这类函数可以不写 @returns —— 它们没有返回值可说。
 *
 * @param {string|undefined} type 冒号后面那串类型，可能为空
 * @returns {boolean} 是 void 系就是 true
 */
function isVoidType(type) {
  const src = String(type || '').trim()
  if (!src) return false
  return /(^|[\s|])void\b/.test(src.replace(/Promise<[^>]*>/g, (m) => m.slice(8, -1)))
}

/**
 * 判断某一行是不是函数头，是的话返回它的元信息。
 * @param {string} line 去尾换行的一行源码
 * @returns {{name: string, params: Array<string>, returns: string, arrow: boolean}|null} 不是函数头返回 null
 */
function matchHeader(line) {
  const text = line.trim()
  if (text.indexOf('*') === 0 || text.indexOf('//') === 0) return null

  // function foo(a, b): Ret {   /   export function foo(...)  /   export const foo = (a) => {
  // 返回类型要能带冒号与尖括号（Promise<void>），所以这里不能用「排除冒号」的字符集
  let hit = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([\w$]+)\s*\(([^)]*)\)\s*(?::\s*([^{;]+?))?\s*\{/.exec(
    text
  )
  if (hit) {
    return {
      name: hit[1],
      params: paramNames(hit[2]),
      returns: isVoidType(hit[3]) ? 'void' : 'value',
      arrow: false,
    }
  }

  // const foo: Type = (a, b): Ret => {   /   const foo = function (a) {
  hit = /^(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*(?::[^=]+)?=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*=>/.exec(
    text
  )
  if (hit) {
    return {
      name: hit[1],
      params: paramNames(hit[2]),
      returns: isVoidType(hit[3]) ? 'void' : 'value',
      arrow: true,
    }
  }

  // 对象方法：foo(a, b): Ret {   —— 接口里的声明以 ; 结尾，不会命中这里
  hit = /^(?!return\b|if\b|for\b|while\b|switch\b|catch\b|else\b|case\b)([\w$]+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\{\s*$/.exec(
    text
  )
  if (hit) {
    return {
      name: hit[1],
      params: paramNames(hit[2]),
      returns: isVoidType(hit[3]) ? 'void' : 'value',
      arrow: false,
    }
  }

  return null
}

/**
 * 往上找函数头顶上的 JSDoc 块
 * @param {Array<string>} lines 文件全部行
 * @param {number} index 函数所在行号（0 起）
 * @returns {{text: string, start: number}|null} 没找到返回 null
 */
function docAbove(lines, index) {
  let i = index - 1
  while (i >= 0 && lines[i].trim() === '') i--
  if (i < 0) return null
  if (lines[i].trim().slice(-2) !== '*/') return null
  let start = i
  while (start > 0 && lines[start].trim().indexOf('/**') !== 0) start--
  return { text: lines.slice(start, i + 1).join('\n'), start }
}

/**
 * 检查一个文件的所有函数
 * @param {string} file 绝对路径
 * @param {Array<string>} lines 文件全部行
 * @returns {Array<string>} 问题描述列表
 */
function checkFile(file, lines) {
  const problems = []
  for (let i = 0; i < lines.length; i++) {
    const head = matchHeader(lines[i])
    if (!head) continue
    const doc = docAbove(lines, i)
    if (!doc) {
      problems.push(`${file}:${i + 1} ${head.name}() 缺 JSDoc`)
      continue
    }
    const body = doc.text
    // 判「是不是 JSDoc 块」要看去空格后的开头：对象字面量里的方法、嵌套函数，
    // 整个注释块都跟着代码缩进，`/**` 并不在行首
    if (body.trim().indexOf('/**') !== 0) problems.push(`${file}:${i + 1} ${head.name}() 缺 JSDoc`)
    // 描述 text：去掉 /** */ 与 @tag 行之后还剩内容
    const prose = body
      .split('\n')
      .slice(1)
      .filter((l) => l.trim().indexOf('*') === 0)
      .map((l) => l.trim().slice(1).trim())
      .filter((l) => l && l.indexOf('@') !== 0)
    if (!prose.length) problems.push(`${file}:${i + 1} ${head.name}() 的 JSDoc 没有描述文字`)

    for (let p = 0; p < head.params.length; p++) {
      const name = head.params[p]
      // TS 文件里类型已经在签名上，不强求再写一遍 {type}；两种写法都算数
      const has = new RegExp(`@param\\s+(?:\\{[^}]*\\}\\s*)?\\[?${name.replace(/[^\w$]/g, '')}`).test(
        body
      )
      if (!has) problems.push(`${file}:${i + 1} ${head.name}() 缺 @param ${name}`)
    }
    if (head.returns !== 'void' && body.indexOf('@returns') === -1) {
      problems.push(`${file}:${i + 1} ${head.name}() 缺 @returns`)
    }
  }
  return problems
}

/**
 * 入口：命令行给了文件就只查那几个，否则全量查。
 *
 * @returns {number} 退出码：有问题 1，没问题 0
 */
function main() {
  const only = process.argv.slice(2).filter((a) => a.indexOf('-') !== 0)
  const list = only.length ? only.map((f) => path.resolve(process.cwd(), f)) : targets()
  let problems = []
  for (let i = 0; i < list.length; i++) {
    const file = list[i]
    if (!fs.existsSync(file)) {
      problems.push(`找不到文件：${file}`)
      continue
    }
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    problems = problems.concat(checkFile(path.relative(root, file), lines))
  }

  if (!problems.length) {
    process.stdout.write(`JSDoc 检查通过：${list.length} 个文件\n`)
    return 0
  }
  const cap = parseInt(process.env.JSDOC_MAX || '80', 10)
  process.stderr.write(`JSDoc 不全，共 ${problems.length} 处：\n`)
  problems.slice(0, cap).forEach((p) => process.stderr.write(`  · ${p}\n`))
  if (problems.length > cap) process.stderr.write(`  · …… 另有 ${problems.length - cap} 处\n`)
  return 1
}

process.exit(main())
