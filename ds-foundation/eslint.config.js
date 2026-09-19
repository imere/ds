/**
 * ESLint 10 flat config
 * -------------------------------------------------------------
 * 一句话：**源码一律用最新语法，不迁就 IE10 —— 降级是 SWC 的事。**
 *
 * 所以规则不再按「能不能用现代语法」分层，全仓库一视同仁开到最严：
 *   no-var / prefer-const / object-shorthand / prefer-template /
 *   prefer-arrow-callback / prefer-spread / prefer-rest-params /
 *   prefer-destructuring / logical-assignment-operators ...
 *
 * 分层只剩一条，而且只加在产物层（packages/*\/src）：
 *   **禁掉 SWC 降不动的东西**，就两类：
 *
 *   1. IE10 没有的运行时 API —— Set / Map / Promise / Object.assign /
 *      .includes() 等。SWC 只转语法不注入 polyfill，写了就原样进产物，
 *      在 IE10 上直接 ReferenceError。
 *
 *   2. 降级后反而引入运行时依赖的语法 —— 这三条是实测出来的，不是猜的：
 *        · for-of          → `l[Symbol.iterator]()`        （IE10 没有 Symbol）
 *        · generator/yield → 依赖 Symbol + Iterator        （同上）
 *        · async/await     → 依赖 Promise                  （IE10 没有）
 *      反过来，下面这些实测降级干净，随便用：
 *        let/const（含循环闭包 → `_loop` IIFE，语义正确）、箭头函数、
 *        模板字符串（→ `"".concat`）、解构、数组/对象展开、可选链 `?.`、
 *        `??`、`||=`、`**`（→ `Math.pow`）、class/extends、getter/setter、
 *        计算属性名、标签模板、`catch {}`（→ `catch (unused)`）、函数参数尾逗号。
 *
 * 工具层（tests / scripts / 各 config）不进浏览器产物，自然不受上面两条限制。
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
  { name: 'Symbol', message: 'IE10 没有 Symbol（for-of / generator 降级后也会用到它）' },
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

/** 降级后会在产物里引入 IE10 没有的运行时依赖的语法 */
const ie10UnsafeSyntax = [
  {
    selector: 'ForOfStatement',
    message: 'for-of 降级后会调 Symbol.iterator()，IE10 没有 Symbol —— 用普通 for 循环',
  },
  {
    selector: 'YieldExpression',
    message: 'generator 降级后依赖 Symbol + Iterator，IE10 没有 —— 用普通函数',
  },
  {
    selector: 'AwaitExpression',
    message: 'await 降级后依赖 Promise，IE10 没有 —— 改回调',
  },
  {
    selector: ':function[async=true]',
    message: 'async 函数降级后依赖 Promise，IE10 没有 —— 改回调',
  },
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
  // strict（不含类型感知那一层）：比 recommended 严，比如 no-explicit-any 直接 error
  ...tseslint.configs.strict,
  // 这一条同时做了两件事：把 prettier 当 ESLint 规则跑，并关掉与之冲突的格式化规则
  prettierRecommended,

  // ==== 现代语法：全仓库一视同仁，源码不为 IE10 让步 ====
  {
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-destructuring': 'error',
      'prefer-object-spread': 'error',
      'logical-assignment-operators': ['error', 'always'],
      'operator-assignment': ['error', 'always'],
      'no-useless-rename': 'error',
      'no-useless-concat': 'error',
      // == null 是同时判 null 和 undefined 的惯用写法，其余一律 ===
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-exponentiation-operator': 'error',
      'no-else-return': 'error',
      // 用法错了要报错，但 catch 参数用不上是常态 —— 现代写法就是 `catch {}`
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'all' }],
    },
  },

  // ==== 产物层：只加 SWC 降不动的那两类禁令 ====
  {
    files: ['packages/*/src/**/*.{js,ts}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-restricted-globals': ['error', ...ie10MissingGlobals],
      'no-restricted-properties': ['error', ...ie10MissingMethods, ...ie10MissingInstanceMethods],
      'no-restricted-syntax': ['error', ...ie10UnsafeSyntax],
    },
  },

  // ==== 工具层：Node 22，不进产物 ====
  {
    files: [
      'tests/**/*.ts',
      'scripts/**/*.{js,mjs,cjs}',
      'eslint.config.js',
      'prettier.config.js',
      'rollup.config.js',
      'swc.config.js',
      'vitest.config.ts',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // ==== 测试文件：browser + node 全局都要（jsdom 环境） ====
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // ==== 示例：浏览器里跑，用现代浏览器看，不做 IE10 限制 ====
  {
    files: ['examples/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': 'off',
    },
  }
)
