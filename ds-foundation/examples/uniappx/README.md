# uni-app x 接入指南

## 一句话结论

**别指望在 App 端把这个包当运行时库用。** 推荐做法是：**构建期用 `@ds/core` 把令牌算出来，落成文件，uni-app x 侧只消费这些文件。**

`@ds/dom` / `@ds/vue2` 在 uni-app x 里一个都用不了（原因见下）。

## 三个包能不能用

| 包 | App 端（uvue） | 小程序 | Web |
| --- | --- | --- | --- |
| `@ds/core` | △ 只能构建期（Node）跑，**运行时不可引入** | ✅ | ✅ |
| `@ds/dom` | ❌ | ❌ | ✅（有真 DOM） |
| `@ds/vue2` | ❌ uvue 是 Vue 3 组合式 | ❌ | ❌ |

三条硬约束，决定了上面的矩阵：

1. **App 端没有 `document`。** uvue 有自己的 DOM 模型（`UniElement`），但那是 `uni.getElementById` / `$refs` 拿到的元素对象，不是 `@ds/dom` 操作的 `document.documentElement`。注入 CSS 变量那条主通道从根上不成立。
2. **uni-app x 的 VDOM 模式没有 JS 引擎。** 逻辑层是 UTS，编译成 Kotlin / Swift / ArkTS。 `@ds/core` 的 `build/*.js`（ESM / UMD）在这台虚拟机里没地方执行。
3. **CSS 是 web 的子集（ucss）。** 不能用 `#id`、`[attr]`、标签选择器，**只能用 class 选择器**；文本样式不继承，必须写在 `<text>` 上；蒸汽模式下连关系选择器都不支持。我们默认走的 `:root` + `[data-theme]` 换肤写法，在 App 端两样都不成立。

补充：`@ds/core` 是 private workspace 包，依赖写的是 `workspace:*`，**npm 里装不到**。uni-app x 工程一般也不在这个 workspace 里 —— 所以连"安装"这一步都不存在，更应该在构建期解决问题。

## 方案 A：构建期生成（推荐）

```bash
node examples/uniappx/gen-tokens.mjs
```

脚本在 Node 里直接 import `packages/core/build/index.js`（不走 npm 安装），产出四个文件到 `generated/`：

| 产物 | 给谁用 | 说明 |
| --- | --- | --- |
| `theme.json` | uni-app 的暗黑通道 | `{ light: {...}, dark: {...} }`，值是实值 |
| `ds-tokens.web.css` | Web / 小程序 | `:root` + `[data-ds-theme="dark"]` + `prefers-color-scheme` |
| `ds-tokens.app.css` | uvue App 端 | 换成 `.ds-theme-light` / `.ds-theme-dark` 类作用域 |
| `ds-tokens.uts` | UTS 逻辑层 | `export const dsColorBg = '#ffffff'`，canvas / Draw API 传值用 |

改令牌只需重新跑脚本，产物里标了来源和版本号，可以放心提交。

### Web / 小程序端

这两端有完整 DOM，`@ds/dom` 那套直接就能用 —— `@import` 生成的 CSS 变量文件即可：

```css
/* src/ds-tokens.css 里 @import 或直接粘贴 ds-tokens.web.css */
.card { background-color: var(--ds-color-surface); }
.title { color: var(--ds-color-fg); }
```

### App 端（uvue）

**第 1 步｜manifest.json 开启暗黑模式**（各平台节点都要写，漏一个那一端就不注入）

```json
{
  "app-plus": { "darkmode": true, "themeLocation": "theme.json" },
  "app-harmony": { "darkmode": true, "themeLocation": "theme.json" },
  "mp-weixin": { "darkmode": true, "themeLocation": "theme.json" },
  "h5": { "darkmode": true, "themeLocation": "theme.json" }
}
```

`theme.json` 放在**项目根目录**，把生成的 `theme.json` 拷过去即可。

**第 2 步｜运行时切换走 uni 的 API**，不要自己操心"往哪注入"：

```ts
// 读当前主题
const current = uni.getAppBaseInfo().appTheme // 'light' | 'dark' | 'auto'

// 切换（会自动按 theme.json 注入对应那套变量）
uni.setAppTheme({ theme: 'dark' })

// 监听变化
uni.onAppThemeChange(() => { /* ... */ })
```

**第 3 步｜样式里用变量。** ucss 明确支持 `var()`（以及 `url()` / `rgb()` / `rgba()` / `env()`）：

```vue
<template>
  <view class="page">
    <view class="card"><text class="title">标题</text></view>
  </view>
</template>
<style>
.page { background-color: var(--ds-color-bg); }
.card { background-color: var(--ds-color-surface); }
.title { color: var(--ds-color-fg); }
</style>
```

> 注意：文本样式必须写在 `<text>` 上，写在 `<view>` 上不生效 —— App 端样式不继承。

**第 4 步｜持久化用 uni 的存储**，不要碰 `@ds/dom` 的 `storage.ts`：那个模块的 `localStorage` / cookie 适配器在 App 端全是空的。用 `uni.setStorageSync('ds-theme', 'dark')`。

### ⚠️ 动手前先花三分钟验证

App 端自定义属性能否**沿节点树向下穿透**，官方文档没写，我这里也没有真机可以验。用一个页面试：

```vue
<view class="ds-theme-dark host">
  <text class="probe">文字变白了吗</text>
</view>
```

`.probe { color: var(--ds-color-fg) }`。写在 `.host` 上的变量如果 `text` 能拿到，方案 A 成立。

**不成立的话退回静态工具类路线**：不在 App 端用变量，而是用 `@ds/core` 的 `class.ts` 在构建期生成 `.ds-bg-surface { background-color: #f8fafc }` 这类实值工具类，运行时只切 class。这条路一定成立，代价是换主题得换一批 class 名。

## 方案 B：运行时 import `@ds/core`

只在**蒸汽模式**（HBuilderX 5.21+ Android / 5.11+ iOS / 5.0+ 鸿蒙）下有讨论价值 —— 逻辑层改成了普通 js/ts。前提是你并不需要 App 端，或者只用它做纯计算（比如动态算一个强调色的 hover 态），并且自己负责把结果绑到 `UniElement.style` 上：

```ts
import { uniElementStyleApplier } from './xxx' // 自己写
const root = uni.getElementById('root') as UniElement
root?.style?.setProperty('--ds-color-brand', brand)
```

要把 `@ds/core` 弄进 uni-app x 工程，三条路：把 `packages/core/build/index.js` 拷成项目内的一个普通 ts 文件；或 `npm pack` 打包后走 `file:` 依赖（前提是先在 `packages/*/package.json` 里把 `workspace:*` 改成具体版本号）；或发到私有 registry。三条都不优雅 —— 这也反证了为什么推荐方案 A。

## 其它需要注意的 UTS 限制

如果哪天真打算把 core 源码当 UTS 编译，先知道要付多少代价（这些都会被 UTS 拒绝）：

- `unknown`、`Record<K,V>`、`keyof`、`(string & {})`、`infer` 这些类型体操 —— `TokenKey` 和 `Dict<T = unknown>` 全受影响
- 结构性类型是 UTS 的雷区：它要求显式继承关系，`type A = {...}` 之间互不兼容；对象字面量在 Kotlin/Swift 下会被推导成 `UTSJSONObject`
- `for...in` 在 Web 上给索引、原生上给元素值，语义不一致
- `undefined` / `void` 建议一律换成 `null`，可选属性必须写 `?: T | null`

好消息是 core 的**运行时代码**极干净（有 IE10 约束守着：纯 ES5、无 Promise/Map/Set），真要移植卡点几乎全在类型层。但这仍然是一次重写加双份维护，不值得。

## 文件清单

```
examples/uniappx/
├── gen-tokens.mjs      构建期生成脚本（Node，直接跑）
├── generated/          产物，建议提交进版本库
└── README.md           本文件
```
