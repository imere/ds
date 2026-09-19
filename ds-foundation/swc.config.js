/**
 * SWC 转译配置（构建与检查共用的唯一来源）
 * -------------------------------------------------------------
 * 为什么要单独抽一个文件：
 *   之前配置直接内联在 rollup.config.js 里，ES5 合规检查只能去扫 dist 产物。
 *   这就有个盲区 —— 检查脚本得先等 build 跑完才有东西可扫，
 *   而「SWC 配置写错层级被静默忽略」这类问题，恰恰应该在改代码的当下就被发现。
 *
 *   抽出来之后，tests/es5.test.ts 拿同一份配置直接转译源码做检查，
 *   不用 build、不用等，而且验的是真正生效的那份配置，不是副本。
 *
 * 为什么是 SWC 而不是 tsc / Babel：
 *   · tsc 的 target: ES5 在 TS 6 已被标记废弃（用它会报 TS5107，要加
 *     "ignoreDeprecations": "6.0" 才不报错），TS 7 起直接移除。
 *     把降级压在 tsc 上等于把自己钉在一条即将消失的路上
 *   · rollup 打包本来就要一个 JS 转译器插件，SWC 顺手把降级也做了；
 *     同样能降到 ES5，比 Babel 快一个数量级
 *   · esbuild 的 target 最低只到 es2015，明确不支持 ES5 —— 直接出局
 *
 * 只转语法不注入 polyfill，避免污染宿主全局；
 * 缺失的运行时 API 由各包内部用 ES5 写法兜底（见 packages/core/src/util.ts）。
 *
 * externalHelpers 保持 false：helper 内联进产物。
 * 设成 true 能显著减小体积，但会强制消费方安装 @swc/helpers —— 不值得。
 */

/**
 * @type {import('@swc/core').Options}
 */
export const swcOptions = {
  jsc: {
    target: 'es5',
    parser: { syntax: 'typescript' },
    // helper 内联：不能让消费方为了用这个包去装 @swc/helpers
    externalHelpers: false,
    loose: false,
  },
  module: { type: 'es6' },
  sourceMaps: true,
}
