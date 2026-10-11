---
name: ds-uniappx
description: 把令牌接到 uni-app x（uvue）——三个包各端可用性矩阵、为什么推荐构建期生成、gen-tokens.mjs 四个产物分别给谁、manifest 各平台都要开 darkmode + themeLocation、运行时用 uni.setAppTheme 与 uni.setStorageSync、ucss 只能用 class 选择器且文本样式必须写在 text 上、App 端变量穿透要先验证、退回静态工具类路线。当用户问"uni-app x 怎么用这个库""App 端能用 @ds/dom 吗""theme.json 怎么生成""暗黑模式怎么接"时使用。
metadata:
  pattern: pipeline
---

# uni-app x 接入

严格按 Step 1 → Step 5 走。**每步都有通过条件，不达标不要往下走。**

**别指望在 App 端把这个包当运行时库用。** 推荐做法：构建期用 `@ds/core` 算出来落成文件，
uni-app x 侧只消费这些文件。

## 触发条件

- 要在 uni-app x（uvue）工程里用本库的令牌
- 要给 App 端 / 小程序 / Web 端做换肤
- 要判断某个包在某一端能不能用

## Step 1 — 判端：这个包在这一端能不能用

| 包 | App 端（uvue） | 小程序 | Web |
| --- | --- | --- | --- |
| `@ds/core` | △ 只能构建期（Node）跑，**运行时不可引入** | ✅ | ✅ |
| `@ds/dom` | ❌ | ❌ | ✅（有真 DOM） |
| `@ds/vue2` | ❌ uvue 是 Vue 3 组合式 | ❌ | ❌ |

三条硬约束决定了上面这个矩阵：

1. **App 端没有 `document`** —— uvue 的 `UniElement` 是 `uni.getElementById` / `$refs` 拿到的
   元素对象，不是 `@ds/dom` 操作的 `document.documentElement`。注入 CSS 变量那条主通道从根上不成立
2. **VDOM 模式没有 JS 引擎** —— 逻辑层是 UTS，编译成 Kotlin / Swift / ArkTS，`build/*.js` 没地方执行
3. **CSS 是 web 的子集（ucss）** —— 不能用 `#id` / `[attr]` / 标签选择器，**只能用 class 选择器**；
   文本样式不继承，必须写在 `<text>` 上

- **通过条件：App 端只用「构建期生成」这条路，不在运行时 import 任何一个包。**

## Step 2 — 构建期生成

```bash
node examples/uniappx/gen-tokens.mjs
```

脚本在 Node 里直接 import `packages/core/build/index.js`，产出四个文件到
`examples/uniappx/generated/`：

| 产物 | 给谁用 |
| --- | --- |
| `theme.json` | uni-app 的暗黑通道，`{ light: {...}, dark: {...} }`，值是实值 |
| `ds-tokens.web.css` | Web / 小程序：`:root` + `[data-ds-theme="dark"]` + `prefers-color-scheme` |
| `ds-tokens.app.css` | uvue App 端：换成 `.ds-theme-light` / `.ds-theme-dark` 类作用域 |
| `ds-tokens.uts` | UTS 逻辑层：`export const dsColorBg = '#ffffff'`，canvas / Draw API 传值用 |

- **通过条件：四个产物都生成了**（脚本报找不到模块就是没 `pnpm run build`）
- 产物里标了来源和版本号，可以放心提交

## Step 3 — 落地到工程

1. **把 `theme.json` 拷到项目根目录**
2. **manifest.json 各平台节点都要开**（漏一个那一端就不注入）：
   ```json
   {
     "app-plus":    { "darkmode": true, "themeLocation": "theme.json" },
     "app-harmony": { "darkmode": true, "themeLocation": "theme.json" },
     "mp-weixin":   { "darkmode": true, "themeLocation": "theme.json" },
     "h5":          { "darkmode": true, "themeLocation": "theme.json" }
   }
   ```
3. **样式里用变量**（ucss 支持 `var()` / `url()` / `rgb()` / `rgba()` / `env()`）：
   ```vue
   <view class="card"><text class="title">标题</text></view>
   <style>
   .card  { background-color: var(--ds-color-surface); }
   .title { color: var(--ds-color-fg); }
   </style>
   ```

- **通过条件：四个平台节点都写了，`theme.json` 在根目录，样式只用 class 选择器。**

## Step 4 — 验证 App 端变量穿透（gate）

App 端自定义属性能否**沿节点树向下穿透**，官方文档没写。用一个页面试：

```vue
<view class="ds-theme-dark host">
  <text class="probe">文字变白了吗</text>
</view>
```

`.probe { color: var(--ds-color-fg) }`。写在 `.host` 上的变量如果 `text` 能拿到，方案成立。

- **通过 → Step 5**
- **不通过 → 退回静态工具类路线**：不在 App 端用变量，而是用 `@ds/core` 的 `class.ts`
  在构建期生成 `.ds-bg-surface { background-color: #f8fafc }` 这类实值工具类，运行时只切 class。
  这条路一定成立，代价是换主题得换一批 class 名

## Step 5 — 运行时接线

- **切换走 uni 的 API**，不要自己操心「往哪注入」：
  ```ts
  uni.getAppBaseInfo().appTheme        // 'light' | 'dark' | 'auto'
  uni.setAppTheme({ theme: 'dark' })   // 自动按 theme.json 注入
  uni.onAppThemeChange(() => {})
  ```
- **持久化用 `uni.setStorageSync('ds-theme', 'dark')`**，别碰 `@ds/dom` 的 `storage.ts`

## 硬规则

1. **只用 class 选择器** —— ucss 没有 `#id` / `[attr]` / 标签选择器，
   `:root` + `[data-theme]` 那套换肤写法在 App 端两样都不成立
2. **文本样式写在 `<text>` 上** —— App 端样式不继承，写在 `<view>` 上不生效
3. **不要用 `@ds/dom` / `@ds/vue2`** —— 这两包在 App 端与小程序端一个都用不了
4. **持久化用 uni 的存储** —— `@ds/dom` 的 localStorage / cookie 适配器在 App 端全是空的
5. **改令牌就重跑生成脚本**
6. **别把 `@ds/core` 当 UTS 编译**（见下）

## 别把 core 源码当 UTS 编译

真要付的代价（这些都会被 UTS 拒绝）：`unknown` / `Record` / `keyof` / `(string & {})` / `infer`；
结构性类型是雷区（要求显式继承，对象字面量会被推导成 `UTSJSONObject`）；
`for...in` 在 Web 上给索引、原生上给元素值；`undefined` / `void` 一律换 `null`。

好消息是 core 的**运行时代码**极干净（有 IE10 约束守着：纯 ES5、无 Promise/Map/Set），
卡点几乎全在类型层。但这仍然是一次重写加双份维护，不值得。

## 坑表

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| App 端样式完全没生效 | 用了 `:root` / `[data-theme]` / `#id` | 换成 class 作用域 |
| 文字颜色不变 | 样式写在 `<view>` 上 | 写在 `<text>` 上 |
| 某一端不注入暗黑 | manifest 漏了那个平台节点 | 四个节点都写 |
| 刷新后主题跳回默认 | 用了 `@ds/dom` 的 storage | 用 `uni.setStorageSync` |
| 生成脚本报找不到模块 | 没 `pnpm run build` | 先 build |
| 想 `npm i @ds/core` | private workspace 包，`workspace:*` 装不到 | 走构建期生成 |

## 检查清单

- [ ] Step 1 判过端，令牌是构建期生成的，不是运行时引入的
- [ ] manifest 四个平台节点都开了 `darkmode` + `themeLocation`
- [ ] `theme.json` 在项目根目录
- [ ] 样式只用 class 选择器，文本样式在 `<text>` 上
- [ ] 持久化走 `uni.setStorageSync`
- [ ] Step 4 的穿透验证做过（不能就退回工具类路线）
