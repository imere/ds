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
import { createThemeManager, readTheme, bindTheme } from '@ds/dom'

var saved = readTheme()
var ds = createThemeManager({ theme: saved.theme || 'light', followSystem: true })
bindTheme(ds)   // init 之前接上，首帧状态也会落盘
ds.init()
ds.use('dark')
```

不喜欢分三步就 `bootstrap({ ... })` 一步走痛快，持久化随后 `bindTheme(ds)` 接上即可 ——
它会立刻同步一次当前状态，绑在 init 前后都不丢数据。

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
  followSystem: false,    // 是否跟随系统深色（显式切换过主题后自动停止跟随）
  preset: true,           // false = 不用内置明暗主题与强调色
})

// persist 不在选项里 —— 核心不碰存储，详见「持久化」一节
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

一次设置同时改掉：CSS 变量、class 名、`<html>` 上的 `data-acme-theme` / `data-acme-mode` / `data-acme-accent`、注入的 `<style id="acme-tokens">`，以及持久化的 key（`acme-theme` / `acme-accent`）。

`'acme'` / `'--acme-'` / `'acme-'` / `{ ns:'acme' }` 四种写法等价。

## 持久化（可选，默认关闭）

**核心一行存储代码都没有。** `createThemeManager()` 不读 localStorage、不写 cookie，
SSR 下也不会去摸 `document`。也就是说，`import` 这个包本身不会对你的页面产生任何副作用。

这么做不是洁癖，有三个实打实的理由：

1. **隐私合规**。GDPR / 个保法要求「先同意再存储」。库在没被问过的情况下就写用户磁盘，
   合规评审时这是个要解释的问题 —— 而持久化本来就该由业务在拿到同意后显式开启。
2. **介质不该写死**。想换 sessionStorage、想把偏好存到服务端跟账号走、
   想在测试里塞内存实现，都不该需要改库源码。
3. **SSR 安全**。服务端渲染时 `document` 都不存在，凭空多一条访问它的分支就是凭空多一类 bug。

要用就这样显式接上：

```js
import { createThemeManager, readTheme, bindTheme } from '@ds/dom'

var saved = readTheme()                                   // ① 建之前读回来
var ds = createThemeManager({ theme: saved.theme || 'light' })
bindTheme(ds)                                             // ② 订阅变化，写回去
ds.init()
```

`bindTheme` 返回退订函数，调用即断开同步。

### 存储适配器

`KeyValueStore` 只有三个方法（`get` / `set` / `remove`），所以随便换：

| 适配器 | 用途 |
|---|---|
| `webStorage()` | localStorage；`{ session: true }` 换 sessionStorage |
| `cookieStorage()` | cookie，`{ days, path }` 可调，默认 180 天 |
| `memoryStorage()` | 内存。测试、SSR、明确不想留痕时用 |
| `autoStorage()` | **IE10 场景推荐**：localStorage 优先，写不进去自动退 cookie |

```js
import { autoStorage, bindTheme } from '@ds/dom'

// 完全自定义介质也是三个方法的事
bindTheme(ds, { store: myRemoteStore })

// 想观察降级（排查「主题记不住」很有用）
var store = autoStorage({ onFallback: () => console.warn('localStorage 不可用，已退到 cookie') })
bindTheme(ds, { store })
```

`webStorage` 第一次访问时会先写再删探一次：IE 隐私模式、`file://`、
Safari 无痕都属于「对象在但写不了」，提前探出来比每次 `get/set` 都抛要好处理。

### key 与前缀

不指定就用 `localStorage.getItem('ds-theme')` / `'ds-accent'`；
manager 带了前缀，`bindTheme` 会跟着用 `acme-theme` / `acme-accent` —— 不用重复传一遍前缀。

```js
var m = createThemeManager({ prefix: 'acme', theme: 'light' })
bindTheme(m)            // 存到 acme-theme
bindTheme(m, { themeKey: 'my-theme' })   // 也可以直接指定
```

`readTheme()` 在建 manager **之前**调用，拿不到 manager 的前缀，
所以自定义前缀时要自己传：`readTheme({ prefix: 'acme' })`。

## SSR / 防闪烁

主题是运行时注入的，等 JS 下载完再决定明暗，用户会先看到一帧白底（FOUC）。解法是把一段同步脚本内联进 `<head>`：

```js
import { getInitScript, renderHead, restoreScript } from '@ds/dom'

res.head += renderHead(m.cssText({ theme: 'dark' }).all, {
  prefix: 'acme',
  // 想让首屏也读回上次的主题，把这段注进去；不注就只用 options.theme
  restore: restoreScript({ prefix: 'acme' }),
})
```

`getInitScript()` 返回的脚本自己也能在 IE10 上跑：全 `var`、零依赖。
**它默认不碰存储** —— 存储介质的选择留给 `restoreScript()`，跟运行时的 `bindTheme` 对齐。

## IE10 兜底清单

| 项 | 处理 |
|---|---|
| 无 CSS 自定义属性 | 走 static 通道，预求值后写死 |
| 无 `matchMedia` | `supportsMatchMedia()` 检测，不支持就不跟随系统 |
| 无 `localStorage`（`file://`） | 用 `autoStorage()`：先探一次，写不进去自动退 cookie |
| 样式表规则上限（IE9 4095 / IE10 65534） | `writeStyle()` 按 4000 条自动切片，超出再开一个 `<style>` |
| 半透明色 | 预设里一律 `rgba(r, g, b, a)` 逗号语法 |

## 测试

```bash
pnpm test   # dom 26 项 + storage 30 项（vitest + jsdom 实跑）
```

其中「核心默认不碰存储」是一组专门的回归测试：
建 manager、`init()`、`use()` / `useAccent()` / `toggle()` 一套走下来，
断言 localStorage 仍是空的、也没写任何 cookie。
