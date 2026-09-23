/**
 * @vitest-environment node
 *
 * ES5 合规检查
 * -------------------------------------------------------------
 * 「最低支持 IE10」是硬约束，但构建链路出问题时是静默的：
 * SWC 的配置写错层级会被插件无视，产物里留着箭头函数或展开运算符，
 * 现代浏览器全部正常，一上 IE10 才炸 —— 而且很难定位。
 *
 * 所以这道检查做进 vitest，分两层：
 *
 *   A. 源码层（必跑）—— 拿 swc.config.js 里那份真正生效的配置，
 *      直接转译各包 src 下的每个 .ts，扫转译结果里有没有 ES6+ 残留。
 *      不依赖 build，改一行代码就能验，这是主要防线。
 *
 *   B. 产物层（build 后才有）—— 扫 dist 里 6 份真实产物。
 *      打包器自己也会往里塞东西（UMD wrapper、helper 内联），
 *      只验源码盖不住这一层。没 build 时自动跳过，不会让 pnpm test 变红。
 *
 *   C. 扫描器自检 —— 拿已知违规的源码过一遍，断言「确实被抓出来」。
 *      没有这一层，patterns 清单被误删几条也不会有人知道：
 *      被删的那条恰好是要防的东西时，A / B 两层会一路绿灯。
 *
 * 三层用的是同一份 swcOptions，不存在「检查验的是另一套配置」的问题。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from '@swc/core'
import { describe, it, expect } from 'vitest'
import { swcOptions } from '../swc.config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 注意最后三项：TS -> JS 这一步如果没跑干净（isolatedModules 下最容易出），
 * 浏览器会直接语法错误，属于「看起来构建成功了」但一运行就崩的类型。
 */
const patterns: Array<[string, RegExp]> = [
  ['箭头函数', /=>/],
  ['const 声明', /(^|[;{(])\s*const\s/],
  ['let 声明', /(^|[;{(])\s*let\s/],
  ['模板字符串', /`/],
  ['展开运算符', /\.\.\./],
  ['class 声明', /(^|[;{(])\s*class\s/],
  ['可选链', /\?\./],
  ['空值合并', /\?\?/],
  ['for-of', /for\s*\(\s*var[^)]*\sof\s/],
  ['Object.assign', /Object\.assign/],
  ['Array.includes', /\.includes\(/],
  ['Promise', /\bPromise\b/],
  ['Set/Map 构造', /\bnew\s+(Set|Map|WeakMap)\b/],
  ['import type 残留', /^\s*import\s+type\s/m],
  ['interface 残留', /(^|[;{(])\s*interface\s+\w/],
  ['类型注解残留', /\)\s*:\s*[A-Z]\w+\s*\{/],
  // —— 下面这几条是「降级之后才暴露」的，光看源码关键字会漏 ——
  // for-of / generator / async 经 SWC 降级后关键字会消失，但会变成对
  // Symbol.iterator / Promise 的引用；IE10 两样都没有，照样是运行时崩。
  // 所以真正要防的不是那个关键字，是它降级后引出来的东西。
  ['Symbol', /\bSymbol\b/],
  ['Array.from', /Array\.from/],
  ['Object.entries / values / fromEntries', /Object\.(entries|values|fromEntries)/],
  ['String.padStart / padEnd', /\.padStart\(|\.padEnd\(/],
  ['Array.find / findIndex', /\.find\(|\.findIndex\(/],
]

/** 剥掉注释再查，避免注释里的示例代码造成误报 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function scan(code: string): string[] {
  const clean = stripComments(code)
  const hits: string[] = []
  patterns.forEach((p) => {
    const all = clean.match(new RegExp(p[1].source, 'g'))
    if (all) hits.push(`${p[0]} 命中 ${all.length} 处`)
  })
  return hits
}

/** 收集某个包 src 下的所有 .ts（不含 .d.ts） */
function srcFiles(pkg: string): string[] {
  const dir = path.resolve(root, 'packages', pkg, 'src')
  return fs
    .readdirSync(dir)
    .filter((f) => {
      return /\.ts$/.test(f) && !/\.d\.ts$/.test(f)
    })
    .map((f) => {
      return path.join('packages', pkg, 'src', f)
    })
}

const allSrc = ['core', 'dom', 'vue2'].reduce((acc: string[], pkg) => {
  return acc.concat(srcFiles(pkg))
}, [])

describe('A. 源码转译后应为纯净 ES5（不依赖构建）', () => {
  it('源码文件数量符合预期，收集逻辑没悄悄失效', () => {
    expect(allSrc.length).toBeGreaterThanOrEqual(19)
  })

  allSrc.forEach((rel) => {
    it(`${path.basename(rel)}  ${rel}`, () => {
      const abs = path.resolve(root, rel)
      const out = transformSync(fs.readFileSync(abs, 'utf8'), {
        ...swcOptions,
        filename: rel,
        // 单文件转译，sourceMaps 只会拖慢，这里不需要
        sourceMaps: false,
      })
      const hits = scan(out.code)
      expect(hits, `ES6+ 残留：\n  ${hits.join('\n  ') || ''}\n  文件：${rel}`).toEqual([])
    })
  })
})

const distFiles = [
  'packages/core/dist/index.js',
  'packages/core/dist/index.umd.cjs',
  'packages/dom/dist/index.js',
  'packages/dom/dist/index.umd.cjs',
  'packages/vue2/dist/index.js',
  'packages/vue2/dist/index.umd.cjs',
]

function distReady(): boolean {
  return distFiles.every((f) => {
    return fs.existsSync(path.resolve(root, f))
  })
}

// 没构建就跳过 —— pnpm test 不该因为没有 dist 而变红。
// pnpm run verify 的顺序是 build 在 test 之前，那时这一层一定会真跑。
describe.skipIf(!distReady())('B. 构建产物应为纯净 ES5', () => {
  distFiles.forEach((rel) => {
    it(rel, () => {
      const s = fs.readFileSync(path.resolve(root, rel), 'utf8')
      const hits = scan(s)
      expect(hits, `ES6+ 残留：\n  ${hits.join('\n  ') || ''}\n  产物：${rel}`).toEqual([])
    })
  })
})

/**
 * 探针只挑「降级之后仍有痕迹」的写法。箭头函数、模板串这类降完就没了，
 * 拿它当探针只会得到「扫不出来 = 正常」的假信号。
 */
const violations: Array<[string, string]> = [
  [
    'for-of：降级后变成对 Symbol.iterator 的调用',
    'export function f(arr) {\n  for (var x of arr) {\n    console.log(x)\n  }\n}',
  ],
  ['async：降级后引用 Promise', 'export async function f() {\n  await g()\n}'],
  ['Array.from', 'export function f(x) {\n  return Array.from(x)\n}'],
  ['Object.values', 'export function f(o) {\n  return Object.values(o)\n}'],
  ['Symbol', 'export var s = Symbol("x")'],
]

describe('C. 扫描器自检：已知违规必须被扫出来', () => {
  violations.forEach(([label, source]) => {
    it(label, () => {
      const out = transformSync(source, {
        ...swcOptions,
        filename: 'violation-probe.ts',
        sourceMaps: false,
      })
      const hits = scan(out.code)
      expect(
        hits,
        `${label} 没被扫出来 —— patterns 清单缺这一条，A / B 两层对它是睁眼瞎。\n转译结果：\n${out.code}`
      ).not.toEqual([])
    })
  })
})
