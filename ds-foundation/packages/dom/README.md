# @ds/dom

Design System 底层的**双通道适配层**：把令牌真正落到页面上。

这是整套里**唯一判断浏览器的地方** —— `@ds/core` 与业务代码都对通道无感。

- 产物 `dist/index.js` + `dist/index.umd.cjs`
- 全 ES5，最低 IE10
- 包是 `"type": "module"`，UMD 那份叫 `.cjs`（`.js` 会被 Node 当 ESM 解析）

## 安装

```bash
pnpm add @ds/core @ds/dom
```

## 一行启动

```js
import { bootstrap } from '@ds/dom'

var ds = bootstrap({ theme: 'light', persist: true, followSystem: true })
ds.use('dark')
```

UMD 直引：

```html
<script src=".../core/dist/index.umd.cjs"></script>
<script src=".../dom/dist/index.umd.cjs"></script>
<script>
  var ds = DsDom.bootstrap({ theme: 'light' })
</script>
```

## 两条通道

| 通道 | 条件 | 做法 | 换主题的代价 |
|---|---|---|---|
| `vars` | 支持 CSS 自定义属性 | 写 `:root { --ds-color-bg: ... }`，class 用 `var()` 引用 | 改几十个变量值，class 规则一份不动 |
| `static` | IE10（不支持自定义属性） | `resolveVars()` 预求值后写死色值，注入 `<style>` | 整段重写 `<style>`，规则数随主题数线性增长 |

`channel: 'auto'`（默认）按 `supportsCssVars()` 自动选；也可以手动锁死 `'vars'` / `'static'` 便于测试。

**业务 API 完全一致**，不需要知道自己在哪条通道上。

## API

```js
var m = createThemeManager({
  doc: document,          // 默认 document
  target: null,           // 变量写在哪，默认 <html>；传容器可做局部深色区
  themes: {},             // { light: theme, dark: theme }
  accents: {},            // { indigo: accent }
  theme: 'light',         // 默认主题
  accent: 'indigo',       // 默认强调色
  prefix: 'ds',           // 令牌前缀，见下
  channel: 'auto',        // 'auto' | 'vars' | 'static'
  withClasses: true,      // 是否注入两层 class
  persist: false,         // 是否持久化到 localStorage
  followSystem: false,    // 是否跟随系统深色
  preset: true,           // false = 不用内置明暗主题与强调色
})
```

| 方法 | 说明 |
|---|---|
| `init()` / `apply()` | 挂载、重新应用 |
| `use(name)` / `useAccent(name)` / `toggle()` | 切主题、切强调色、明暗互切 |
| `override(key, value)` / `resetOverrides()` | 临时覆盖单个令牌分组 |
| `get(key, asRef)` | 读令牌；`asRef` 在 vars 通道返回 `var(--ds-x)`，static 通道返回实值 |
| `style(map)` | 生成行内样式对象：`ds.style({ color: 'color-fg-muted' })` |
| `tokens()` / `state()` | 当前扁平令牌表 / 当前状态 |
| `subscribe(fn)` | 订阅变更，返回取消函数 |
| `cssText(opts)` | 导出 CSS 文本供 SSR 内联 |
| `varName(key)` / `className(short)` | 按当前前缀拼名字 |
| `prefix` | 归一化后的前缀对象 |
| `destroy()` | 清理所有注入的 `<style>` 与变量 |

## 自定义令牌前缀

```js
var m = createThemeManager({ prefix: 'acme' })
m.prefix.var   // '--acme-'
m.prefix.attr  // 'data-acme-theme'
m.varName('color-brand')  // '--acme-color-brand'
m.className('bg-brand')   // 'acme-bg-brand'
```

一次设置同时改掉：CSS 变量、class 名、`<html>` 上的 `data-acme-theme` / `data-acme-mode` / `data-acme-accent`、注入的 `<style id="acme-tokens">`、localStorage 的 `acme-theme` / `acme-accent`。

`'acme'` / `'--acme-'` / `'acme-'` / `{ ns:'acme' }` 四种写法等价。

## SSR / 防闪烁

主题是运行时注入的，等 JS 下载完再决定明暗，用户会先看到一帧白底（FOUC）。解法是把一段同步脚本内联进 `<head>`：

```js
import { getInitScript, renderHead } from '@ds/dom'

res.head += renderHead(m.cssText({ theme: 'dark' }).all, { prefix: 'acme' })
```

`getInitScript()` 返回的脚本自己也能在 IE10 上跑：全 `var`、零依赖、`localStorage` 读不到就退 cookie。

## IE10 兜底清单

| 项 | 处理 |
|---|---|
| 无 CSS 自定义属性 | 走 static 通道，预求值后写死 |
| 无 `matchMedia` | `supportsMatchMedia()` 检测，不支持就不跟随系统 |
| 无 `localStorage`（`file://`） | `store.js` 自动退 cookie |
| 样式表规则上限（IE9 4095 / IE10 65534） | `writeStyle()` 按 4000 条自动切片，超出再开一个 `<style>` |
| 半透明色 | 预设里一律 `rgba(r, g, b, a)` 逗号语法 |

## 测试

```bash
pnpm test   # 26 项 DOM 双通道验证（vitest + jsdom 实跑）
```
