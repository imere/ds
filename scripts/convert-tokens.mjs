/**
 * 把 DTCG / Figma 导出的 token.json 翻成本库的扁平令牌表
 * -------------------------------------------------------------
 * 用法：
 *   node scripts/convert-tokens.mjs <file> [选项]
 *
 * 选项：
 *   --source=figma|w3c   输入格式，默认 figma（Figma 原生导出就是 DTCG + com.figma 扩展）
 *   --unit=px            长度落地单位，默认 px。**任意 CSS 单位都能写**（rem / vw / cqw / pt …），
 *                        px 换不过去的（比如没给系数的 vw）会在 issues 里说明并退回 px
 *   --root=16            rem 的根字号，默认 16
 *   --factor=vw:3.6      依赖环境的单位系数，可重复：
 *                        --factor=vw:3.6 --factor=cqw:2.4（1vw = 3.6px，即视口宽 360）
 *   --prefix=acme        给所有键加前缀
 *   --include=color,space       只收这几棵子树（点分路径前缀）
 *   --exclude=button,table      排除这几棵子树
 *   --on-unknown=skip|keep|throw
 *
 * 输出到 stdout（令牌 JSON），诊断信息走 stderr，方便重定向：
 *   node scripts/convert-tokens.mjs Default.tokens.json --unit=rem > tokens.json
 *
 * 单位只在转换这一步落地：描边宽度（STROKE_FLOAT）恒为 px，这里不会动它。
 * 想把整张表（含 hairline）都换成 rem，自己在代码里调 remify(tokens, { rootFontSize: 16 })。
 *
 * 先 build 过才有 dist：本脚本直接引 packages/core/dist/index.js。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromFigma, fromW3C } from '../packages/core/dist/index.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

/**
 * argv -> 选项对象。只认 --key=value / --key 两种写法，其余当位置参数
 * @param {Array<string>} argv process.argv.slice(2)
 * @returns {{_: string[]} & Record<string, string>} 位置参数放 _，命名键值对平铺
 */
function parseArgv(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.indexOf('--') !== 0) {
      out._.push(a)
      continue
    }
    const eq = a.indexOf('=')
    const key = eq === -1 ? a.slice(2) : a.slice(2, eq)
    const value = eq === -1 ? 'true' : a.slice(eq + 1)
    // 同名选项可重复（--factor=vw:3.6 --factor=cqw:2.4）：第二次起攒成数组
    if (out[key] !== undefined) {
      if (Array.isArray(out[key])) out[key].push(value)
      else out[key] = [out[key], value]
    } else {
      out[key] = value
    }
  }
  return out
}

/**
 * 逗号分隔的字符串切数组
 * @param {string} [value] 'color,space'
 * @returns {Array<string>|undefined} 空输入返回 undefined，好让默认值生效
 */
function list(value) {
  return value ? String(value).split(',').filter(Boolean) : undefined
}

/**
 * 单位系数：'vw:3.6' 或重复传多份 -> { vw: 3.6 }
 * @param {string|Array<string>|undefined} value --factor 的原始值
 * @returns {Record<string, number>|undefined} 没有就 undefined
 */
function factors(value) {
  if (!value) return undefined
  const items = Array.isArray(value) ? value : [value]
  const out = {}
  for (let i = 0; i < items.length; i++) {
    const pair = String(items[i]).split(':')
    const unit = pair[0].trim()
    const px = parseFloat(pair[1])
    if (unit && px > 0) out[unit] = px
  }
  return Object.keys(out).length ? out : undefined
}

const args = parseArgv(process.argv.slice(2))
const [file] = args._

if (!file) {
  process.stderr.write(
    '用法：node scripts/convert-tokens.mjs <file> [--unit=rem] [--prefix=acme]\n'
  )
  process.exit(1)
}

const target = path.resolve(process.cwd(), file)
if (!fs.existsSync(target)) {
  process.stderr.write(`找不到文件：${target}\n`)
  process.exit(1)
}

const src = JSON.parse(fs.readFileSync(target, 'utf8'))
const options = {
  unit: args.unit || 'px',
  rootFontSize: args.root ? parseFloat(args.root) : 16,
  factors: factors(args.factor),
  prefix: args.prefix,
  include: list(args.include),
  exclude: list(args.exclude),
  onUnknown: args['on-unknown'],
}

const run = args.source === 'w3c' ? fromW3C : fromFigma
const result = run(src, options)

process.stdout.write(`${JSON.stringify(result.tokens, null, 2)}\n`)

const keys = Object.keys(result.tokens)
process.stderr.write(
  `转换 ${path.relative(root, target)}：${keys.length} 条令牌，别名解析 ${result.aliases} 条，问题 ${result.issues.length} 条\n`
)
result.issues.slice(0, 20).forEach((issue) => {
  process.stderr.write(`  · ${issue.path} —— ${issue.reason}\n`)
})
if (result.issues.length > 20) {
  process.stderr.write(`  · …… 另有 ${result.issues.length - 20} 条\n`)
}
