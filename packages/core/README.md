# @ds/core

Design System 底层的**纯逻辑层**：令牌、主题、class 规则、CSS 文本。

- **不碰 DOM**，不依赖任何框架 —— 浏览器、Node、Web Worker 都能跑
- **全 ES5**，源码层面就避开 `Object.assign` / `Array.includes` / `Set` / `Map` / `Promise`
- 产物 `build/index.js`（ESM）+ `build/index.umd.cjs`（UMD，自带 CommonJS 分支）

包是 `"type": "module"`，所以 UMD 那份必须叫 `.cjs`：Node 见到 `.js` 会按 ESM 解析，UMD 里的 `module.exports` 会直接报 `require() of ES Module`。

## 安装

```bash
pnpm add @ds/core
```

```js
import { createRegistry, buildClassSheet, toCssVars } from '@ds/core'
// 或
const { createRegistry } = require('@ds/core')
```

## 模块

| 模块     | 职责                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `util`   | ES5 安全的基础工具：`assign` `kebab` `each` `map` `filter` `unique` `get` `shallowEqual` `cssProp`                     |
| `color`  | 色值换算：`parseHex` `parseRgb` `toChannels` `toRgba` `toHex` `mix` `luminance` `contrast` `resolveVarValue`           |
| `prefix` | 前缀归一化：`normalizePrefix` `prefixOf` `isPrefix`                                                                    |
| `token`  | 令牌表：`defineTokens` `flattenTokens` `unflattenTokens` `mergeTokens` `mergeTree` `pickTokens`，以及可扩展的 `TokenKey` |
| `theme`  | 主题注册中心：`createTheme` `createRegistry` `resolveTokens`（`ThemeDef` 接受 `tokens` 或 `seed` + `algorithm`）        |
| `derive` | 派生层：`deriveTokens` `defaultAlgorithm` `darkAlgorithm` `compactAlgorithm` `brandTokens` `DEFAULT_SEED`              |
| `class`  | 两层 class 规则：`primitiveRules` `semanticRules` `buildClassSheet` `defineScales`                                     |
| `output` | CSS 文本：`cssVarName` `cssVarRef` `toCssVars` `toScopedCss` `resolveVars` `rulesToCss` `toStyleTag` `renderStyleTags` |
| `preset` | 开箱预设：`lightTokens` `darkTokens` `lightTheme` `darkTheme` `makeAccent` `accents`                                   |

## 三层令牌

```
原始层  blue-500 / #4f46e5        业务不该直接用
语义层  --ds-color-brand          组件消费这一层
组件层  --ds-button-bg-hover      可选，组件内部细节
```

`flattenTokens()` 把嵌套对象拍平成 `{ 'color-bg-brand': '#4f46e5' }`，这是所有输出函数的输入格式。

## 派生层：Seed → Algorithm → Map

主题解析原本只有一条**覆盖链**：`theme.tokens → accent.tokens → overrides`，后者盖前者。
这意味着改一个 `color-brand`，`brandHover` / `brandActive` 不会跟着动 —— 想让整套派生跟着变只能逐个手写。

`derive` 补上一条**派生链**，对标 Ant Design 的 Seed → Map：

```js
import { createRegistry, defaultAlgorithm, darkAlgorithm, compactAlgorithm } from '@ds/core'

const registry = createRegistry()
registry.theme('brand', {
  label: '品牌',
  seed: { color: { brand: '#4f46e5' }, radius: { md: '8px' } }, // 稀疏：填什么改什么
  algorithm: [defaultAlgorithm, darkAlgorithm, compactAlgorithm], // 从左到右依次执行
})
```

算法的唯一约定是**入参与出参形状相同**（都是嵌套令牌树），所以能像管道一样串联，
前一个的输出是后一个的输入：

| 算法                | 作用                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `defaultAlgorithm`  | 稀疏 seed → 完整 map（中性色阶、圆角/字号/动效档位）               |
| `darkAlgorithm`     | 底与前景互换后重算中性派生；已经是暗底则直接返回，重复跑不会更暗   |
| `compactAlgorithm`  | 收紧尺度（圆角 ×0.75、字号 -1px、动效 ×0.8），复用同一套档位规则   |

`seed` 与 `tokens` 可以一起给：先跑派生，再让手写的盖上去（对齐 antd 的约定，
`theme.token` 优先于 `map token`），合并走 `mergeTree` 深合并。

内置 `preset` 仍然是手写的 —— 那套色值是人工挑过的（接近 Tailwind slate 色阶），
线性插值得不到一模一样的结果。派生留给「新主题」。

## TokenKey 可以扩展

`TokenKey = keyof TokenMap | (string & {})`，两半缺一不可：

- `keyof TokenMap` —— 写字面量时给自动补全，拼错能在编译期发现
- `(string & {})` —— 留逃生舱。运行时拼出来的键、使用方自己加的键都能过

只留 interface 会把使用方锁死（自定义令牌一律类型报错），直接放宽成 `string` 又退回
`Dict<string>`，补全和拼错检查全丢。使用方可以这样往上加键：

```ts
declare module '@ds/core' {
  interface TokenMap {
    'brand-gradient': string
  }
}
```

加完 `'brand-gradient'` 就会出现在自动补全里，跟内置键同等对待。

## 自定义令牌前缀

一处设置，CSS 变量 / class / DOM 属性 / style id / 存储 key 全部跟着换：

```js
import { normalizePrefix, buildClassSheet, toCssVars } from '@ds/core'

normalizePrefix('acme')
// {
//   ns: 'acme',
//   var: '--acme-',                  // CSS 变量
//   cls: 'acme-',                    // class 名
//   attr: 'data-acme-theme',         // DOM 属性
//   modeAttr: 'data-acme-mode',
//   accentAttr: 'data-acme-accent',
//   ids:  { tokens:'acme-tokens', primitive:'acme-class-primitive', ... },
//   keys: { theme:'acme-theme', accent:'acme-accent' },
// }
```

**四种写法等价**，内部统一归一化：

```js
normalizePrefix('acme') // 命名空间
normalizePrefix('--acme-') // CSS 变量形式
normalizePrefix('acme-') // class 形式
normalizePrefix({ ns: 'acme' }) // 已归一化对象，原样透传
```

所有接受前缀的函数（`toCssVars` / `resolveVars` / `rulesToCss` / `cssVarName` / `buildClassSheet` …）都吃这四种写法，老调用形式完全兼容。

```js
toCssVars({ 'color-bg': '#fff' }, { prefix: 'acme' })
// ':root{--acme-color-bg:#fff;}'

buildClassSheet({ tokens: flat, prefix: 'acme' })
// primitive: .acme-p-4{padding:16px}
// semantic:  .acme-bg-subtle{background-color:var(--acme-color-bg-subtle)}
```

> 非法前缀（空、数字开头、含空格）一律**退回 `ds` 而不是抛错** —— 前缀会被拼进 CSS 选择器，抛错会让整页样式挂掉，兜底更安全。

## 两层 class

拆两层的唯一理由是 IE10 没有 CSS 自定义属性：

| 层        | 例子                                  | 是否与主题相关         | 生成份数    |
| --------- | ------------------------------------- | ---------------------- | ----------- |
| primitive | `.ds-p-4` `.ds-rounded-md` `.ds-flex` | 否，值来自固定 scale   | 1           |
| semantic  | `.ds-bg-brand` `.ds-text-muted`       | 是，值是 `var(--ds-*)` | N（主题数） |

不拆的话 IE10 下体积是 `全部 class × 主题数`；拆开后是 `primitive(1) + semantic(N)`。

```js
var sheet = buildClassSheet({ tokens: flat })
sheet.primitive // 8.5 KB，只写一次
sheet.semantic // 0.9 KB，每个主题一份
```

## 双通道输出

```js
// 现代通道：一套规则，换主题只改变量值
toCssVars(flat, { selector: ':root' })
// ':root{--ds-color-bg:#fff;...}'

// IE10 通道：先把 var() 求值，再写成静态规则
var resolved = resolveVars(flat, { prefix: 'ds' })
buildClassSheet({ tokens: flat, resolve: resolved })
// '.ds-bg-subtle{background-color:#f8fafc}'
```

`resolveVars()` 迭代 5 轮，能解开 `A -> B -> C` 的链式引用；解不开时保留 `var()` 的 fallback。

## IE10 硬约束（写进源码的）

| 约束                | 后果                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| 无 CSS 自定义属性   | `var()` 整条声明被丢弃，必须预求值                                                    |
| 无 `Object.assign`  | 自带 `assign()` 实现                                                                  |
| 无 `Array.includes` | 一律 `indexOf(...) > -1`                                                              |
| 无 `Set` / `Map`    | `unique()` 用数组去重                                                                 |
| 无 `Promise`        | 全程同步                                                                              |
| 半透明色            | **只用 `rgba(r, g, b, a)` 逗号语法**；`rgb(r g b / a)` 空格斜杠语法 IE10 会丢整条声明 |
| 单样式表规则上限    | IE9 是 4095，超出静默丢失 —— 由 `@ds/dom` 按 4000 条切片                              |

## 测试

```bash
pnpm test          # 45 项 core 自检（含 19 项前缀相关）
```
