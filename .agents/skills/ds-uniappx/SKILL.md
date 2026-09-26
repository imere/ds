---
name: ds-uniappx
description: 把 ds-foundation 的令牌接到 uni-app x（uvue）——三个包各端可用性矩阵、为什么推荐构建期生成、gen-tokens.mjs 的四个产物分别给谁、manifest 各平台都要开 darkmode + themeLocation、运行时用 uni.setAppTheme 与 uni.setStorageSync、ucss 只能用 class 选择器且文本样式必须写在 text 上、App 端变量穿透要先花三分钟验证、退回静态工具类路线。当用户问"uni-app x 怎么用这个库""App 端能用 @ds/dom 吗""theme.json 怎么生成""暗黑模式怎么接"时使用。
agent_created: true
---

# uni-app x 接入

## 何时使用

- 要在 uni-app x（uvue）工程里用本库的令牌
- 要给 App 端 / 小程序 / Web 端做换肤
- 判断某个包在某一端能不能用

## 心智模型

**别指望在 App 端把这个包当运行时库用。** 推荐做法：**构建期用 `@ds/core` 把令牌算出来，
落成文件，uni-app x 侧只消费这些文件。**

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
   文本样式不继承，必须写在 `<text>` 上；蒸汽模式下连关系选择器都不支持

## 工作流（推荐：构建期生成）

1. **跑生成脚本**：
   ```bash
   node examples/uniappx/gen-tokens.mjs
   ```
   脚本在 Node 里直接 import `packages/core/build/index.js`（**先 `pnpm run build`**），
   产出四个文件到 `examples/uniappx/generated/`：

   | 产物 | 给谁用 |
   | --- | --- |
   | `theme.json` | uni-app 的暗黑通道，`{ light: {...}, dark: {...} }`，值是实值 |
   | `ds-tokens.web.css` | Web / 小程序：`:root` + `[data-ds-theme="dark"]` + `prefers-color-scheme` |
   | `ds-tokens.app.css` | uvue App 端：换成 `.ds-theme-light` / `.ds-theme-dark` 类作用域 |
   | `ds-tokens.uts` | UTS 逻辑层：`export const dsColorBg = '#ffffff'`，canvas / Draw API 传值用 |

2. **把 `theme.json` 拷到项目根目录**
3. **manifest.json 各平台节点都要开**（漏一个那一端就不注入）：
   ```json
   {
     "app-plus":    { "darkmode": true, "themeLocation": "theme.json" },
     "app-harmony": { "darkmode": true, "themeLocation": "theme.json" },
     "mp-weixin":   { "darkmode": true, "themeLocation": "theme.json" },
     "h5":          { "darkmode": true, "themeLocation": "theme.json" }
   }
   ```
4. **运行时切换走 uni 的 API**，不要自己操心「往哪注入」：
   ```ts
   uni.getAppBaseInfo().appTheme        // 'light' | 'dark' | 'auto'
   uni.setAppTheme({ theme: 'dark' })   // 自动按 theme.json 注入
   uni.onAppThemeChange(() => {})
   ```
5. **样式里用变量**（ucss 支持 `var()` / `url()` / `rgb()` / `rgba()` / `env()`）：
   ```vue
   <view class="card"><text class="title">标题</text></view>
   <style>
   .card  { background-color: var(--ds-color-surface); }
   .title { color: var(--ds-color-fg); }
   </style>
   ```
6. **持久化用 `uni.setStorageSync('ds-theme', 'dark')`**，别碰 `@ds/dom` 的 `storage.ts`

## ⚠️ 动手前先花三分钟验证

App 端自定义属性能否**沿节点树向下穿透**，官方文档没写。用一个页面试：

```vue
<view class="ds-theme-dark host">
  <text class="probe">文字变白了吗</text>
</view>
```

`.probe { color: var(--ds-color-fg) }`。写在 `.host` 上的变量如果 `text` 能拿到，方案成立。

**不成立就退回静态工具类路线**：不在 App 端用变量，而是用 `@ds/core` 的 `class.ts`
在构建期生成 `.ds-bg-surface { background-color: #f8fafc }` 这类实值工具类，运行时只切 class。
这条路一定成立，代价是换主题得换一批 class 名。

## 硬规则

1. **只用 class 选择器** —— ucss 没有 `#id` / `[attr]` / 标签选择器，
   `:root` + `[data-theme]` 那套换肤写法在 App 端两样都不成立
2. **文本样式写在 `<text>` 上** —— App 端样式不继承，写在 `<view>` 上不生效
3. **不要用 `@ds/dom` / `@ds/vue2`** —— 这两包在 App 端与小程序端一个都用不了
4. **持久化用 uni 的存储** —— `@ds/dom` 的 localStorage / cookie 适配器在 App 端全是空的
5. **改令牌就重跑生成脚本**，产物里标了来源和版本号，可以放心提交
6. **别把 `@ds/core` 当 UTS 编译**（见下）

## 别把 core 源码当 UTS 编译

真要付的代价（这些都会被 UTS 拒绝）：`unknown` / `Record` / `keyof` / `(string & {})` / `infer`；
结构性类型是雷区（要求显式继承，对象字面量会被推导成 `UTSJSONObject`）；
`for...in` 在 Web 上给索引、原生上给元素值；`undefined` / `void` 一律换 `null`。

好消息是 core 的**运行时代码**极干净（有 IE10 约束守着：纯 ES5、无 Promise/Map/Set），
卡点几乎全在类型层。但这仍然是一次重写加双份维护，不值得。

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| App 端样式完全没生效 | 用了 `:root` / `[data-theme]` / `#id` | 换成 class 作用域 |
| 文字颜色不变 | 样式写在 `<view>` 上 | 写在 `<text>` 上 |
| 某一端不注入暗黑 | manifest 漏了那个平台节点 | 四个节点都写 |
| 刷新后主题跳回默认 | 用了 `@ds/dom` 的 storage | 用 `uni.setStorageSync` |
| 生成脚本报找不到模块 | 没 `pnpm run build`（脚本 import 的是 `build/index.js`） | 先 build |
| 想 `npm i @ds/core` | private workspace 包，`workspace:*` 装不到 | 走构建期生成（方案 A） |

## 检查清单

- [ ] 令牌是构建期生成的，不是运行时引入的
- [ ] manifest 四个平台节点都开了 `darkmode` + `themeLocation`
- [ ] `theme.json` 在项目根目录
- [ ] 样式只用 class 选择器，文本样式在 `<text>` 上
- [ ] 持久化走 `uni.setStorageSync`
- [ ] 已验证 App 端变量能否沿节点树穿透（不能就退回工具类路线）
