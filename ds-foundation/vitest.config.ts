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
    },
  },
})
