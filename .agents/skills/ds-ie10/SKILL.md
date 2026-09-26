---
name: ds-ie10
description: 保证 ds-foundation 产物在 IE10 上能跑的检查流程——语法交给 acorn 解析器（ecmaVersion 5）、运行时 API 交给 eslint-plugin-compat（browsers ie 10 + BCD 数据）、降级后才引入依赖的语法靠手写 4 条；CSS 层的逗号语法 rgba、4095 规则上限切片、flex 前缀；SWC 实测能降与不能降的清单。当用户问"这段能上 IE10 吗""能不能用 Object.assign / for-of / Promise""ES5 检查怎么跑""要不要手写兼容清单""半透明色怎么写"时使用。
agent_created: true
---

# IE10 合规检查

基线 **IE10**（与 Element UI 2 同一基线），产物必须纯净 ES5。

## 何时使用

- 写 / 改 `packages/*/src` 里的代码
- 改 SWC / ESLint / 构建配置
- 怀疑某个 API 或语法在 IE10 上会炸
- `pnpm run verify` 的 ES5 或 lint 环节红了

## 心智模型：三层，各管一件事

| 层 | 谁判 | 判什么 |
| --- | --- | --- |
| 语法是不是 ES5 | `acorn.parse(code, { ecmaVersion: 5 })`，在 `tests/es5.test.ts` | 不认识的特性一律算不合格 |
| 运行时 API 有没有 | `eslint-plugin-compat` + `settings.browsers: ['ie 10']` | MDN BCD 数据，会跟标准更新 |
| 降级后才引入依赖的语法 | 手写 4 条 `no-restricted-syntax` / `no-restricted-globals` | `for-of` / `yield` / `await` / `globalThis` |

前两层**都不手写清单**。判据：要防的集合会不会继续增长？
「开发者可能写出哪些 IE10 不支持的 API」每年都在长，手写清单守不住 ——
实测清单内老 API 30/30，清单外新 API 只有 **3/14**；compat 是 29/30 与 13/14。

## 工作流

1. **源码随便写**：箭头、模板串、解构、展开、class、`?. ?? ||= **` 都能用，SWC 会降
2. **写完后跑门禁**：
   ```bash
   pnpm run es5        # 源码层（A 层），改一行就能验，报错精确到行列
   pnpm run build      # 产物层（B 层）需要它，8 个用例没 build 会自动跳过
   pnpm run es5
   pnpm run lint       # 运行时 API 层
   ```
3. **A 层用的是真正生效的那份 `swc.config.js`** —— 测试里另写一套配置就等于白验
4. **撞了红线就按下面的表改写法**

## 能用什么 / 不能用什么

**降级干净，随便用**：`let/const`（含循环闭包 → `_loop` IIFE）、箭头、模板串（→ `"".concat`）、
解构、展开、`?.` `??` `||=` `**`（→ `Math.pow`）、class/extends、getter、计算属性名、
标签模板、`catch {}`、参数尾逗号。

**禁止（运行时 API，SWC 不注入 polyfill）**：
`Object.assign`、`Set` / `Map` / `WeakMap` / `WeakSet`、`Promise`、`Symbol`、
`Array.from` / `Array.find` / `Array.flat`、`String.includes` / `replaceAll`、
`fetch`、`globalThis`、`structuredClone`、`queueMicrotask`。
core 里 `assign` 是手写实现，`unique` 不依赖 Set。

**禁止（降级后才引入依赖）**：

| 语法 | 降级产物 | 为什么不行 |
| --- | --- | --- |
| `for...of` | `l[Symbol.iterator]()` | IE10 没有 `Symbol` |
| `generator/yield` | 依赖 `Symbol` + `Iterator` | 同上 |
| `async/await` | 依赖 `Promise` | IE10 没有 `Promise` |
| `globalThis` | — | BCD 有数据，是 compat 的 inferer 不认这个标识符（工具盲区） |

## CSS 层

- 半透明色必须**逗号语法** `rgba(79, 70, 229, 0.12)`；`rgb(79 70 229 / 0.12)` 会丢整条声明
- 不能写 `var()`（除现代通道）
- 单个样式表规则上限（IE9 = 4095），`@ds/dom` 按 4000 切片；撞线表现是「后面的样式静默丢失」
- flex 要 `-ms-flexbox` 前缀

## 硬规则

1. **不注入 polyfill**（SWC `externalHelpers: false`）—— 避免污染宿主全局
2. **不手写 API 清单**，新 API 一律靠 compat 数据发现
3. **`ssr.ts` 里那段防闪烁脚本必须手写 ES5**（用 `var`）—— 它是**字符串**，SWC 不转字符串内容，
   而它要内联进 HTML 直接在 IE10 上跑。这是全仓库唯一保留 `var` 的地方
4. **jsdom 测不出兼容性**，真机 / 虚拟机才作数
5. **这层防守是全静默的**：构建配置一失效，现代浏览器全正常，只有 IE10 会炸——
   所以 ES5 检查是常驻门禁，且必须 build 之后再验 B 层

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| `Symbol` / `Promise` undefined | 用了依赖它们的语法或 API | 换成 `for` 循环 + 回调；需要异步就自己写 ES5 等价物 |
| `Object.assign` 报 ReferenceError | 同上 | 用 core 的 `assign` |
| 半透明层在 IE10 消失 | 空格斜杠语法 | 改 `rgba(r, g, b, a)` |
| IE10 上后面一批样式没了 | 撞 4095 规则上限 | 确认走的是 `writeStyle()`（自带 4000 切片） |
| 本地全绿但 IE10 白屏 | B 层没跑（没 build）或 A/B 用不同 SWC 配置 | 先 `pnpm run build` 再 `pnpm run es5`；别在测试里另写配置 |
| `for...of` 被放行 | 它语法上完全合法，acorn ES5 也认 | 靠那 4 条手写规则拦，别指望解析器 |

## 检查清单

- [ ] `pnpm run build && pnpm run es5` 全绿（B 层没被跳过）
- [ ] 新增代码没引入运行时 API（lint 的 compat 层过了）
- [ ] 半透明色全是逗号语法
- [ ] 新增的内联脚本字符串是手写 ES5
- [ ] 改过 SWC / rollup 配置的话，确认 A 层与 B 层共用同一份 `swcOptions`
