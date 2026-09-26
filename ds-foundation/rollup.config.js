/**
 * 构建配置：每个包只产 ESM + UMD 两份，不产 CJS。
 * -------------------------------------------------------------
 * 为什么没有 CJS：
 *   · 现代工程走 ESM（module / exports.import），tree-shaking 才有效
 *   · 老工程、<script> 直引走 UMD（main），UMD 自带 CommonJS 分支，
 *     所以 Node / Jest / Vue CLI 4 这类 require 场景一样能用
 *   · 再单独出一份 CJS 只会多一个产物、多一份维护成本，没有新增能力
 *
 * 转译配置不在本文件里，在 swc.config.js —— 构建和 ES5 合规检查共用同一份，
 * 免得两边各写一套、检查验的还不是真正生效的那个。细节见该文件。
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { swc } from '@rollup/plugin-swc'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { swcOptions } from './swc.config.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const only = process.env.PKG || ''

const packages = [
  {
    name: 'core',
    input: 'packages/core/src/index.ts',
    umd: 'DsCore',
    external: [],
    globals: {},
    banner: '@ds/core - token / class / theme 纯逻辑层',
  },
  {
    // tokens 只有值，但它要用 core 的 createTheme / makeAccent 造对象，所以依赖 core
    name: 'tokens',
    input: 'packages/tokens/src/index.ts',
    umd: 'DsTokens',
    external: ['@ds/core'],
    globals: { '@ds/core': 'DsCore' },
    banner: '@ds/tokens - 官方设计令牌集（值）',
  },
  {
    name: 'dom',
    input: 'packages/dom/src/index.ts',
    umd: 'DsDom',
    external: ['@ds/core'],
    globals: { '@ds/core': 'DsCore' },
    banner: '@ds/dom - 双通道主题适配层',
  },
  {
    name: 'vue2',
    input: 'packages/vue2/src/index.ts',
    umd: 'DsVue2',
    external: ['vue', '@ds/core', '@ds/dom'],
    globals: { vue: 'Vue', '@ds/core': 'DsCore', '@ds/dom': 'DsDom' },
    banner: '@ds/vue2 - Vue 2 绑定层',
  },
]

function build(pkg) {
  return {
    input: path.resolve(root, pkg.input),
    external: pkg.external,
    plugins: [
      nodeResolve({ extensions: ['.ts', '.js'] }),
      // 注意：SWC 的配置必须放在 swc 子字段里。
      // 写在外层（和 include 平级）会被插件当成未知选项静默忽略，
      // 结果就是 SWC 用默认配置跑 —— 不降级。这个坑很隐蔽：
      // 源码本身是 ES5 风格时看不出来，等有人写了箭头函数才会在 IE10 上炸。
      // tests/es5.test.ts 会直接拿这份配置转译源码复检，改错了立刻红。
      swc({
        include: /\.[jt]s$/,
        swc: swcOptions,
      }),
    ],
    output: [
      {
        // 包名声明了 "type": "module"，所以 .js 在这里就是 ESM，
        // 不需要再靠 .mjs 扩展名去告诉 Node 该怎么解析。
        file: path.resolve(root, `packages/${pkg.name}/dist/index.js`),
        format: 'es',
        sourcemap: true,
        banner: `/* ${pkg.banner} (esm) */`,
      },
      {
        // 必须是 .cjs：包声明了 "type": "module"，.js 会被 Node 当 ESM 解析，
        // UMD 里的 module.exports 会直接报 "require() of ES Module"。
        // .cjs 强制按 CommonJS 解析，Node / Jest / Vue CLI 4 的 require 才通。
        // 浏览器只认 MIME 不认扩展名，<script src="...umd.cjs"> 照常工作。
        file: path.resolve(root, `packages/${pkg.name}/dist/index.umd.cjs`),
        format: 'umd',
        name: pkg.umd,
        globals: pkg.globals,
        exports: 'named',
        sourcemap: true,
        banner: `/* ${pkg.banner} (umd) */`,
      },
    ],
  }
}

const list = only
  ? packages.filter((p) => {
      return p.name === only
    })
  : packages

if (only && !list.length) {
  throw new Error(`[build] 未知的包名：${only}`)
}

export default list.map(build)
