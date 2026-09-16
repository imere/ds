/**
 * ESLint 10 flat config
 * -------------------------------------------------------------
 * 两套尺度，这是本配置唯一需要解释清楚的设计：
 *
 *   产物层 packages/*\/src —— 这些代码要被 SWC 降到 ES5 跑在 IE10 上。
 *     这里[不]强制现代语法（不开 no-var / prefer-const）：
 *       1. 存量的 var 是刻意写的，改成 let/const 会改变循环里的闭包语义，
 *          这种改动风险远大于收益
 *       2. 语法现代化由 SWC 负责（tests/es5.test.ts 守住产物），
 *          ESLint 该管的是 SWC 管不了的东西 —— 运行时 API
 *     所以这一层的核心规则是「禁用 IE10 没有的全局和静态方法」。
 *
 *   工具层 tests / scripts / 各种 config —— 不进浏览器产物，
 *     在 Node 22 上跑，于是放开用最新语法：no-var / prefer-const /
 *     object-shorthand / prefer-template 全开。
 *
 *   一句话：SWC 管语法降级，ESLint 管运行时 API，两者互补，不重叠。
 *
 * 关于 TypeScript：根上是 TS 7（Go 原生版，不提供 JS 编译器 API），
 * typescript-eslint 跑在单独一份 TS 6 上，见 .pnpmfile.cjs。
 */

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

/** IE10 不存在的全局构造器 / 对象 */
const ie10MissingGlobals = [
  { name: 'Set', message: 'IE10 没有 Set，用数组 + indexOf' },
  { name: 'Map', message: 'IE10 没有 Map，用普通对象' },
  { name: 'WeakMap', message: 'IE10 没有 WeakMap' },
  { name: 'WeakSet', message: 'IE10 没有 WeakSet' },
  { name: 'Promise', message: 'IE10 没有 Promise，改回调' },
  { name: 'Symbol', message: 'IE10 没有 Symbol' },
  { name: 'Proxy', message: 'IE10 没有 Proxy' },
  { name: 'Reflect', message: 'IE10 没有 Reflect' },
  { name: 'BigInt', message: 'IE10 没有 BigInt' },
  { name: 'globalThis', message: 'IE10 没有 globalThis，用 window' },
]

/** IE10 不存在的静态方法 */
const ie10MissingMethods = [
  {
    object: 'Object',
    property: 'assign',
    message: 'IE10 没有 Object.assign，用 core 里的手写 assign()',
  },
  {
    object: 'Object',
    property: 'entries',
    message: 'IE10 没有 Object.entries，用 Object.keys 自己取',
  },
  {
    object: 'Object',
    property: 'values',
    message: 'IE10 没有 Object.values，用 Object.keys 自己取',
  },
  { object: 'Object', property: 'fromEntries', message: 'IE10 没有 Object.fromEntries' },
  {
    object: 'Object',
    property: 'getOwnPropertySymbols',
    message: 'IE10 没有 Object.getOwnPropertySymbols',
  },
  { object: 'Array', property: 'from', message: 'IE10 没有 Array.from，用 slice 或手写循环' },
  { object: 'Array', property: 'of', message: 'IE10 没有 Array.of' },
  { object: 'Number', property: 'isNaN', message: 'IE10 没有 Number.isNaN，用 value !== value' },
  { object: 'Number', property: 'isInteger', message: 'IE10 没有 Number.isInteger' },
  { object: 'Number', property: 'isFinite', message: 'IE10 没有 Number.isFinite，用 isFinite()' },
  { object: 'String', property: 'raw', message: 'IE10 没有 String.raw' },
]

/** 任意对象上的实例方法（数组 / 字符串都算） */
const ie10MissingInstanceMethods = [
  { property: 'includes', message: 'IE10 没有 includes()，用 indexOf() !== -1' },
  { property: 'startsWith', message: 'IE10 没有 startsWith()，用 indexOf() === 0' },
  { property: 'endsWith', message: 'IE10 没有 endsWith()，用 indexOf 自己算' },
  { property: 'padStart', message: 'IE10 没有 padStart()' },
  { property: 'padEnd', message: 'IE10 没有 padEnd()' },
  { property: 'trimStart', message: 'IE10 没有 trimStart()，用正则' },
  { property: 'trimEnd', message: 'IE10 没有 trimEnd()，用正则' },
  { property: 'entries', message: 'IE10 没有 entries()' },
  { property: 'findIndex', message: 'IE10 没有 Array.prototype.findIndex()，用循环' },
  { property: 'find', message: 'IE10 没有 Array.prototype.find()，用循环' },
]

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      // 第三方源码，不归我们管
      'examples/**/vendor/**',
      // 脚本生成的自包含示例
      '**/standalone.html',
      'pnpm-lock.yaml',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 这一条同时做了两件事：把 prettier 当 ESLint 规则跑，并关掉与之冲突的格式化规则
  prettierRecommended,

  // ---- 产物层：进浏览器，要跑在 IE10 上 ----
  {
    files: ['packages/*/src/**/*.{js,ts}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-restricted-globals': ['error', ...ie10MissingGlobals],
      'no-restricted-properties': ['error', ...ie10MissingMethods, ...ie10MissingInstanceMethods],
      // 注释里写清楚为什么这一层不强制现代语法
      'no-var': 'off',
      'prefer-const': 'off',
      'object-shorthand': 'off',
      'prefer-template': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // ES5 里要保住 this 只能 `var self = this`，ESLint 这条规则是给箭头函数时代写的
      '@typescript-eslint/no-this-alias': 'off',
    },
  },

  // ---- 工具层：Node 22，不进产物，放开用最新语法 ----
  {
    files: [
      'tests/**/*.ts',
      'scripts/**/*.{js,mjs,cjs}',
      'eslint.config.js',
      'prettier.config.js',
      '.pnpmfile.cjs',
      'rollup.config.js',
      'swc.config.js',
      'vitest.config.ts',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-destructuring': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // ---- 测试文件：browser + node 全局都要（jsdom 环境） ----
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // ---- 示例：浏览器里跑，环境同产物层但不做 IE10 限制（示例本身用现代浏览器看）----
  {
    files: ['examples/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // ---- 全局：catch 参数允许不使用 ----
  // 本仓库到处是 try/catch 兜底（localStorage 探测、CSS.supports 探测都要吞异常）。
  // 现代写法是 `catch {}`（可选捕获绑定），但那是 ES2019 —— IE10 不认，
  // 产物为了它必须保留 `catch (e)` 而 e 用不上。改规则而不是让代码迁就规则。
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  }
)
