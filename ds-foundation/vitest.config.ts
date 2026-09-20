/**
 * vitest 配置
 * -------------------------------------------------------------
 * 关键点：
 *   1. @ds/* 直接别名到 src —— 测试跑源码而不是 dist，
 *      省掉「先 build 再 test」的顺序依赖，改一行代码就能验。
 *   2. 默认跑 node 环境（core 是纯逻辑）；
 *      需要 DOM 的测试文件自己加文档块注释 @vitest-environment jsdom，
 *      比 environmentMatchGlobs 稳，也不受版本更替影响。
 *   3. include 只认 tests/*.test.ts，examples 里的东西不会被误当测试。
 */

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

function r(p: string): string {
  return fileURLToPath(new URL(p, import.meta.url))
}

export default defineConfig({
  resolve: {
    alias: {
      '@ds/core': r('./packages/core/src/index.ts'),
      '@ds/dom': r('./packages/dom/src/index.ts'),
      '@ds/vue2': r('./packages/vue2/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // vue2 是 CommonJS 产物，交给 vite 做 interop，不要 prebundle 掉
    server: {
      deps: {
        inline: ['vue'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      /**
       * 跑完不删临时目录。默认是删的，但本机的删除钩子会去调外部回收站二进制，
       * 偶发超时会让整个 coverage 命令在「已经跑完、只差清理」这一步失败。
       * 临时目录留在 coverage/ 下即可，已在 .gitignore 里。
       */
      clean: false,
      cleanOnRerun: false,
      /**
       * 门槛钉在 100，而且是四项全钉。
       *
       * 为什么连分支都要 100：这个库的价值几乎全在「降级路径」上 ——
       * IE10 无 CSS 变量、localStorage 被隐私模式禁掉、matchMedia 不存在。
       * 那些分支平时根本跑不到，覆盖了才说明它们真的能跑，
       * 而不是「写的时候觉得应该能跑」。
       *
       * 100 也能挡住一种常见的偷懒：为了过 95% 给整段代码贴 ignore 注释。
       * 真有测不到的（比如 IE 私有 API），应当单独说明理由，见各测试文件。
       */
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
