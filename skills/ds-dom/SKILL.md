---
name: ds-dom
description: 使用 @ds/dom 做运行时主题注入——双通道（现代写 CSS 变量 / IE10 注入静态 CSS）如何选与如何强制、createThemeManager 的六个必传参数、自定义令牌前缀一次设置五处生效、SSR 防闪烁脚本、localStorage 降级 cookie、IE 样式表 4095 规则上限切片、出口单位换算。当用户提到"@ds/dom""createThemeManager""bootstrap""主题切不动""IE10 换肤""首屏闪白 FOUC""data-ds-theme""channel vars/static""前缀换成 acme""刷新后主题跳回默认"时使用。
agent_created: true
---

# @ds/dom 使用指南

唯一判断浏览器的层。`@ds/core` 与业务都对通道无感。**它不知道 `@ds/tokens` 存在** ——
主题、强调色、尺度都是参数传进来的。

## 心智模型

```
createThemeManager(options)
  └─ pickChannel()  ── 能力检测
        ├─ vars   :root{--ds-*}   ── class 用 var() 引用，换主题只改值
        └─ static <style> 写死色值 ── 换主题整段重写
```

**业务 API 完全一致**，调用方不需要知道自己在哪条通道上。`get()` / `style()` 会自动返回该通道该给的东西。

## 何时用哪条通道

| 场景 | 选择 |
| --- | --- |
| 默认 | `channel: 'auto'`（按 `supportsCssVars()` 自动判） |
| 测试 IE10 行为 | 手动锁 `channel: 'static'` |
| 测试现代行为 | 手动锁 `channel: 'vars'` |
| 强制全站静态（极老 WebView） | `channel: 'static'` |

## 工作流

1. **定前缀** —— `prefix: 'acme'`，一次设置五处生效
2. **建 manager** —— 六个参数**必传**：
   `themes` / `accents` / `scales` / `rules` / `utilities` / `map`。
   官方那套值在 `@ds/tokens`，自己写一份也行 —— 本层一套都不自带
3. **`init()`** —— 写初始样式
4. **要持久化就显式接** —— `readTheme()` → 建 manager 时带上 `theme: saved.theme || 'light'`
   → `bindTheme(ds)`。**核心不碰存储**
5. **SSR 场景** —— `getInitScript({ restore: restoreScript() })` 内联进 `<head>`
6. **订阅** —— `subscribe(fn)` 同步外部状态（比如 Vue 的响应式句柄）

## 自定义令牌前缀

```js
createThemeManager({ prefix: 'acme' })
```

一次设置，五处同时生效：

| 位置 | 默认 | `prefix: 'acme'` |
| --- | --- | --- |
| CSS 变量 | `--ds-color-brand` | `--acme-color-brand` |
| class | `.ds-bg-brand` | `.acme-bg-brand` |
| `<html>` 属性 | `data-ds-theme` | `data-acme-theme` |
| `<style>` id | `ds-tokens` | `acme-tokens` |
| 存储 key | `ds-theme` | `acme-theme` |

`'acme'` / `'--acme-'` / `'acme-'` / `{ ns:'acme' }` 四种写法等价。

**必须和 SSR 脚本用同一个值**：

```js
getInitScript({ restore: restoreScript(), prefix: 'acme' })
// 脚本写 data-acme-theme，CSS 才等得到
```

## 出口单位换算

大部分令牌**不过派生链**（官方主题是手工挑的静态值），所以单位在出口 `currentFlat()` 换一次：

```js
createThemeManager({
  ...baseOpts,
  unit: 'rem',                    // 任意 CSS 单位
  rootFontSize: 16,
  factors: { vw: 3.75, cqw: 6 },  // 依赖环境的单位系数，不给就原样保留
  keepPx: ['border-width', 'shadow'],
})
```

## 硬规则

1. **前缀归一化一次，之后一路传对象** —— 各处写字符串必漏，漏一处就是变量名错位
2. **SSR 脚本与运行时必须同前缀** —— 否则首屏颜色错一帧
3. **IE10 必须预求值** —— `var()` 所在整条声明会被丢弃，不是降级是消失
4. **样式表要切片** —— IE9 上限 4095，撞线表现为「后面的样式静默丢失」，极难查
5. **六个参数必传，一套都不自带** —— 不传编译期就红，不会出现「以为在用自己的设计，
   实际悄悄用了库的」
6. **官方主题不含 brand 一族** —— 不传 `accents`，品牌色在界面上直接消失（不是 bug）
7. **持久化要双重降级** —— localStorage 失败退 cookie，cookie 也失败就当没存
8. **别在 `static` 通道指望局部换肤** —— 没有自定义属性就没有继承覆盖，只能整站切

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 换前缀后主题色没变 | 只有 class 换了，变量没换 | 传统一的 `prefix`，不要只改 `classPrefix` |
| 首屏闪一下白底 | JS 异步才注入主题 | `getInitScript()` 内联同步脚本到 `<head>` |
| IE10 上部分样式消失 | 撞了 4095 规则上限 | `writeStyle()` 已按 4000 切片，确认没绕过它 |
| 刷新后主题跳回默认值 | 没接持久化 | 核心不碰存储，要记就得 `readTheme()` + `bindTheme(ds)` |
| `file://` 下主题不记忆 | localStorage 被禁 | 用 `autoStorage()`：先探一次，写不进去自动退 cookie |
| 品牌色突然不见了 | 没给 `accents` | 官方主题不含 brand 一族，品牌色只由 accent 提供 |
| 局部深色区无效 | 在 static 通道 | 能力边界，退化为整站切换并告警 |
| 换了 `unit` 但令牌还是 px | 换不了（缺 factors / 命中 keepPx） | 见 `ds-units` |
| `require()` 报 "of ES Module" | 包是 `type: module` | UMD 产物叫 `index.umd.cjs` |

## 检查清单

- [ ] 前缀是否在入口统一设置，并和 SSR 脚本一致
- [ ] 六个参数是否都传了
- [ ] IE10 通道是否验证过（手动锁 `channel: 'static'` 跑一遍）
- [ ] 持久化是否在 `file://` 下验证过
- [ ] 订阅是否在 `destroy()` 时清理
- [ ] 样式表是否走了 `writeStyle()`（自带切片）
