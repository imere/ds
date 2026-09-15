---
name: ds-dom
description: 使用 @ds/dom 做运行时主题注入的指南——双通道（现代写 CSS 变量 / IE10 注入静态 CSS）如何选与如何强制、createThemeManager 的完整选项、自定义令牌前缀一次设置五处生效、SSR 防闪烁脚本、localStorage 降级 cookie、IE 样式表 4095 规则上限切片。当用户提到"@ds/dom""createThemeManager""bootstrap""主题切不动""IE10 换肤""首屏闪白 FOUC""data-ds-theme""channel vars/static""前缀换成 acme"时使用。
agent_created: true
---

# @ds/dom 使用指南

唯一判断浏览器的层。`@ds/core` 与业务都对通道无感。

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
|---|---|
| 默认 | `channel: 'auto'`（按 `supportsCssVars()` 自动判） |
| 测试 IE10 行为 | 手动锁 `channel: 'static'` |
| 测试现代行为 | 手动锁 `channel: 'vars'` |
| 强制全站静态（比如要兼容极老 WebView） | `channel: 'static'` |

## 工作流

1. **定前缀** —— `prefix: 'acme'`，一次设置五处生效
2. **建 manager** —— 传 `themes` / `accents`，不传就用内置明暗两套
3. **`init()`** —— 写初始样式
4. **SSR 场景** —— `renderHead(m.cssText().all, { prefix })` 内联进 `<head>`
5. **订阅** —— `subscribe(fn)` 同步外部状态（比如 Vue 的响应式句柄）

## 自定义令牌前缀

```js
var m = createThemeManager({ prefix: 'acme' })
```

一次设置，五处同时生效：

| 位置 | 默认 | `prefix: 'acme'` |
|---|---|---|
| CSS 变量 | `--ds-color-brand` | `--acme-color-brand` |
| class | `.ds-bg-brand` | `.acme-bg-brand` |
| `<html>` 属性 | `data-ds-theme` | `data-acme-theme` |
| `<style>` id | `ds-tokens` | `acme-tokens` |
| localStorage | `ds-theme` | `acme-theme` |

`'acme'` / `'--acme-'` / `'acme-'` / `{ ns:'acme' }` 四种写法等价。

**必须和 SSR 脚本用同一个值**：

```js
renderHead(css, { prefix: 'acme' })   // 脚本写 data-acme-theme，CSS 才等得到
```

## 硬规则

1. **前缀归一化一次，之后一路传对象** —— 各处写字符串必漏，漏一处就是变量名错位
2. **SSR 脚本与运行时必须同前缀** —— 否则首屏颜色错一帧
3. **IE10 必须预求值** —— `var()` 所在整条声明会被丢弃，不是降级是消失
4. **样式表要切片** —— IE9 上限 4095，撞线表现为"后面的样式静默丢失"，极难查
5. **不给默认强调色，brand 一族是 undefined** —— 界面上品牌色直接消失
6. **持久化要双重降级** —— localStorage 失败退 cookie，cookie 也失败就当没存
7. **别在 `static` 通道指望局部换肤** —— 没有自定义属性就没有继承覆盖，只能整站切

## 常见坑

| 现象 | 原因 | 解法 |
|---|---|---|
| 换前缀后主题色没变 | 只有 class 换了，变量没换 | 传统一的 `prefix`，不要只改 `classPrefix` |
| 首屏闪一下白底 | JS 异步才注入主题 | `renderHead()` 内联同步脚本到 `<head>` |
| IE10 上部分样式消失 | 撞了 4095 规则上限 | `writeStyle()` 已按 4000 切片，确认没绕过它 |
| `file://` 下主题不记忆 | localStorage 被禁 | `store.js` 已退 cookie，确认 `persist: true` |
| 品牌色突然不见了 | 没给默认强调色 | `defaultAccent !== false` 时会默认 `indigo`，或显式传 `accent` |
| 局部深色区无效 | 在 static 通道 | 能力边界，退化为整站切换并告警 |
| `require()` 报 "of ES Module" | 包是 `type: module` | UMD 产物叫 `index.umd.cjs` |

## 检查清单

- [ ] 前缀是否在入口统一设置，并和 SSR 脚本一致
- [ ] IE10 通道是否验证过（手动锁 `channel: 'static'` 跑一遍）
- [ ] 是否给了默认强调色
- [ ] 持久化是否在 `file://` 下验证过
- [ ] 订阅是否在 `destroy()` 时清理
- [ ] 样式表是否走了 `writeStyle()`（自带切片）
