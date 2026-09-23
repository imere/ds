/**
 * @vitest-environment node
 *
 * ES5 合规检查
 * -------------------------------------------------------------
 * 「最低支持 IE10」是硬约束，但构建链路出问题是静默的：SWC 的配置写错层级会被插件无视，
 * 产物里留着箭头函数或展开运算符，现代浏览器全正常，上了 IE10 才炸，而且很难定位。
 *
 * 这道检查只回答一个问题：**转译 / 打包之后，产物是不是合法的 ES5 语法**。
 * 判定交给解析器（acorn 以 `ecmaVersion: 5` 解析），不手写特征清单 ——
 * 手写清单是在追着语法特性补条目，补不全的那部分恰好就是漏洞所在。
 *
 * 这里**不验** IE10 缺哪些运行时 API（`Object.assign` / `Symbol` / `Array.from` …）。
 * 那是「有没有这个全局对象」，不是语法问题，归 ESLint 用 AST 拦
 * （`eslint.config.js` 的 `ie10MissingMethods` / `ie10UnsafeSyntax`）。
 * AST 比正则准得多，同一件事做两遍、第二遍还更弱，只会让两边都难维护。
 *
 * 两层：
 *
 *   A. 源码层（必跑）—— 拿 `swc.config.js` 里那份真正生效的配置，
 *      直接转译各包 src 下的每个 .ts，解析转译结果。
 *      不依赖 build，改一行代码就能验，报错精确到文件，这是主要防线。
 *
 *   B. 产物层（build 后才有）—— 解析 dist 里 6 份真实产物。
 *      打包器自己也会往里塞东西（UMD wrapper、helper 内联），只验源码盖不住这一层。
 *      没 build 时自动跳过，不会让 pnpm test 变红。
 *
 * 两层共用同一份 swcOptions，不存在「检查验的是另一套配置」的问题。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'acorn'
import { transformSync } from '@swc/core'
import { describe, it, expect } from 'vitest'
import { swcOptions } from '../swc.config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 返回解析错误，`null` 表示是合法 ES5。
 * acorn 的报错自带行列号，原样交出去比自己拼信息更好定位。
 */
function es5Error(code: string, sourceType: 'script' | 'module'): string | null {
  try {
    parse(code, { ecmaVersion: 5, sourceType })
    return null
  } catch (e) {
    return (e as Error).message
  }
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

const allSrc = ['core', 'dom', 'vue2'].reduce<string[]>((acc, pkg) => {
  return acc.concat(srcFiles(pkg))
}, [])

describe('A. 源码转译后应为合法 ES5（不依赖构建）', () => {
  it('收集到源码文件，扫描范围没悄悄变成空', () => {
    expect(allSrc.length).toBeGreaterThanOrEqual(19)
  })

  allSrc.forEach((rel) => {
    it(rel, () => {
      const abs = path.resolve(root, rel)
      const out = transformSync(fs.readFileSync(abs, 'utf8'), {
        ...swcOptions,
        filename: rel,
        // 单文件转译，sourceMaps 只会拖慢，这里不需要
        sourceMaps: false,
      })
      expect(es5Error(out.code, 'module'), `${rel} 含 ES5 以上的语法`).toBeNull()
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
describe.skipIf(!distReady())('B. 构建产物应为合法 ES5', () => {
  distFiles.forEach((rel) => {
    it(rel, () => {
      const code = fs.readFileSync(path.resolve(root, rel), 'utf8')
      const sourceType = /\.cjs$/.test(rel) ? 'script' : 'module'
      expect(es5Error(code, sourceType), `${rel} 含 ES5 以上的语法`).toBeNull()
    })
  })
})
