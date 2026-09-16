/**
 * pnpm 钩子：给 typescript-eslint 单独喂一份 TypeScript 6
 * -------------------------------------------------------------
 * 为什么需要这个：
 *
 *   typescript-eslint 8.70 的 peer 是 typescript >=4.8.4 <6.1.0，
 *   而本仓库用的是 TypeScript 7.0.2（Go 原生版）。TS 7 的 npm 包只是个薄壳：
 *   lib/ 下只有 getExePath.js / tsc.js / version.cjs，没有 typescript.js，
 *   也就是说它**不提供 JS 编译器 API**，而 typescript-eslint 全靠那套 API 工作。
 *   它启动时直接 throw 'typescript-eslint does not support TS 7.0.'
 *
 *   官方给的出路是 side-by-side：让 typescript-eslint 用 TS 6 的 API，
 *   TS 7 继续负责类型检查。见
 *   https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
 *
 * 为什么不用 pnpm.overrides：
 *
 *   overrides 能改 peer 的**范围**，但 pnpm 对一个不匹配的 peer 只是告警，
 *   不会额外装一份。实测后 .pnpm 里依然只有 typescript@7.0.2，解析器照样崩。
 *
 *   所以这里把 peer 换成真实 dependencies —— 真依赖 pnpm 一定会装，
 *   且装在 @typescript-eslint/* 自己的 node_modules 下。
 *   Node 的解析规则是「就近优先」，于是 require('typescript') 拿到的是 6.0.3。
 *
 *   pnpm 用硬链接 + 内容寻址，多这一份 TS 6 在磁盘上只存一次。
 *   根上的 typescript 仍是 7.0.2，tsc / 类型检查不受影响。
 */

const TYPESCRIPT_FOR_ESLINT = '6.0.3'

function readPackage(pkg) {
  const isTsEslint =
    pkg.name === 'typescript-eslint' || (pkg.name && pkg.name.indexOf('@typescript-eslint/') === 0)

  if (isTsEslint && pkg.peerDependencies && pkg.peerDependencies.typescript) {
    delete pkg.peerDependencies.typescript
    pkg.dependencies = pkg.dependencies || {}
    pkg.dependencies.typescript = TYPESCRIPT_FOR_ESLINT
  }

  return pkg
}

module.exports = { hooks: { readPackage } }
