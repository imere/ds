/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))
const ds = (pkg) => r(`../ds-foundation/packages/${pkg}/dist/index.js`)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': r('./src'),
      // ds-foundation 是同仓库的另一个项目，用 pnpm workspace + rollup 自行构建，
      // 产物（ESM）直接指过来。三个包各自 private 且依赖里写的是 workspace: 协议，
      // npm 的 file: 依赖解析不了那个协议，所以不走 node_modules，走别名。
      // 代价：改完库要重新 pnpm build，这里才会生效。
      '@ds/core': ds('core'),
      '@ds/dom': ds('dom'),
      '@ds/vue2': ds('vue2'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // 上面三个别名指向项目根目录之外，dev server 默认不放行
    fs: { allow: [r('.'), r('../ds-foundation')] },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: false,
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'vuex'],
          element: ['element-ui'],
        },
      },
    },
  },
  // element-ui 只发布 CJS（lib/），必须交给 esbuild 预构建后才能被浏览器加载
  optimizeDeps: {
    include: [
      'element-ui',
      'element-ui/lib/utils/vue-popper',
      'element-ui/lib/utils/resize-event',
      'element-ui/lib/mixins/emitter',
      'element-ui/lib/mixins/migrating',
      'element-ui/lib/utils/merge',
      'element-ui/lib/utils/dom',
      'element-ui/lib/utils/util',
      'element-ui/lib/utils/shared',
      'element-ui/lib/transitions/collapse-transition',
      'element-ui/lib/locale',
      'element-ui/lib/locale/lang/zh-CN',
    ],
  },
  test: {
    // Vitest 下同样需要把 CJS 依赖转成 ESM
    server: {
      deps: {
        inline: [/element-ui/, /async-validator/, /throttle-debounce/, /normalize-wheel/, /deepmerge/],
      },
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.spec.js', 'src/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/theme/**', 'src/components/**', 'src/utils/**'],
    },
  },
})
