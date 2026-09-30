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
 *   1. IE10 没有的运行时 API。`Object.assign` / `.includes()` 之类的用了就
 *      ReferenceError，但 MDN 的 compat 数据知道答案，不需要我们手写清单 ——
 *      交给 eslint-plugin-compat（目标浏览器 `ie 10`），数据是活的，会跟着更新。
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
import compat from 'eslint-plugin-compat'

/**
 * Prettier 的选项直接写在这里，不单独放 prettier.config.js。
 * -------------------------------------------------------------
 * 理由：仓库里 Prettier 只通过 eslint-plugin-prettier 跑（格式化错误 = lint 错误），
 * 再留一份独立配置就等于有两个源头，改一处漏一处。
 * 代价是 prettier CLI 用不了了（它读不到这些选项），所以没有独立的 format 脚本，
 * 格式化统一走 ESLint：
 *   pnpm run lint     检查（含格式）
 *   pnpm run lint:fix 修（含格式）
 *
 * 同一个理由，也没有 `.prettierignore`：该忽略的东西全在本文件下面的 `ignores` 里
 * （构建产物、依赖、第三方源码、脚本生成的自包含示例、lock 文件、demo-app），
 * 那是唯一生效的一份忽略名单 —— 留一份给一个根本不会被调用的 prettier CLI 看，
 * 只会改一处漏一处。
 *
 * 同一个理由，仓库根也没有 `.editorconfig`。编辑器那侧靠 `.vscode/` 里那两份
 * 共享配置（`extensions.json` 推荐 ESLint 扩展、`settings.json` 把 fixAll.eslint
 * 挂到保存时）：ESLint 扩展保存时就把 `prettier/prettier` 这条规则跑完了，
 * 缩进、引号、行宽这些没必要再有一份第二来源。`.vscode/settings.json` 里剩下的
 * 只有 ESLint 真的管不到的事 —— 它只处理 js / ts，而 md / yml / json / html 的
 * 行尾、尾空格、结尾空行没人兜。
 *
 * 这些值是在「迁就既有代码」和「用最新默认」之间取的结果：
 *
 *   semi / singleQuote —— 迁就。仓库现有代码全是单引号 + 无分号，
 *     按 Prettier 默认（双引号 + 分号）跑一遍会改动几百行，
 *     那种规模的重排会淹没掉真正有意义的 diff。
 *
 *   printWidth 100 —— 迁就。源码里有大量长注释和长参数行，80 会被拆得很难读。
 *
 *   trailingComma 'es5' —— 只给「对象 / 数组字面量」加尾逗号，函数参数不加。
 *     前者是 ES5 语法，后者要 ES2017 才合法。虽然进 IE10 的是 SWC 产物
 *     （实测 `function t(a, b,) {}` → `function t(a, b) {}`，尾逗号到不了 build），
 *     但源码这一层也没必要靠这个兜底 —— 函数参数尾逗号对可读性没帮助，
 *     还会让老一点的解析器（含部分构建链里的中间工具）直接报错。取最小值。
 */
const prettierOptions = {
  semi: false,
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  // 仓库在 Windows 上开发，但产物和源码统一 LF，避免 diff 里混进 CRLF 改动
  endOfLine: 'lf',
}

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
      '**/build/**',
      '**/node_modules/**',
      // 第三方源码，不归我们管
      'examples/**/vendor/**',
      // 完整演示项目：自带 package.json / 依赖 / 构建配置，是另一个工程，
      // 不是库源码 —— 它自己跑自己的，不进 eslint .
      'examples/demo-app/**',
      // 脚本生成的自包含示例
      '**/standalone.html',
      'pnpm-lock.yaml',
    ],
  },

  // Node 脚本（构建期生成器等）：跑在 Node 上，给它一套 Node 的全局变量。
  // 注意它不在 ignores 里 —— 是我们自己的代码，该守的规则一样要守。
  {
    files: ['examples/**/*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  js.configs.recommended,
  // strict（不含类型感知那一层）：比 recommended 严，比如 no-explicit-any 直接 error
  ...tseslint.configs.strict,
  // 这一条同时做了两件事：把 prettier 当 ESLint 规则跑，并关掉与之冲突的格式化规则
  prettierRecommended,

  // ==== 现代语法：全仓库一视同仁，源码不为 IE10 让步 ====
  {
    rules: {
      // 把上面那份选项喂给 eslint-plugin-prettier
      'prettier/prettier': ['error', prettierOptions],
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
    plugins: { compat },
    // 目标浏览器写在这里，跟 Prettier 选项一个道理：配置只有一处，
    // 不再另开 .browserslistrc —— 两个源头改一处漏一处。
    settings: { browsers: ['ie 10'] },
    rules: {
      // 「IE10 有没有这个 API」交给 MDN 的 compat 数据答，不手写清单。
      // 数据会跟着浏览器 / 标准更新，手写清单只会越来越漏 —— 见 README。
      'compat/compat': 'error',
      // BCD 里 globalThis 的 IE 条目是「不支持」，但 compat 插件的 ast-metadata-inferer
      // 不认识这个标识符（插件与 inferer 源码里都没有它），查不到 —— 这一条得手写补上。
      'no-restricted-globals': [
        'error',
        { name: 'globalThis', message: 'IE10 没有 globalThis，用 window' },
      ],
      // 降级后才引入运行时依赖的语法。这件事没有任何数据源记录
      // （它取决于 SWC 怎么降，不是 API 支不支持），只能手写。
      'no-restricted-syntax': ['error', ...ie10UnsafeSyntax],
    },
  },

  // ==== 工具层：Node 22，不进产物 ====
  {
    files: [
      'tests/**/*.ts',
      'scripts/**/*.{js,mjs,cjs}',
      'eslint.config.js',
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
