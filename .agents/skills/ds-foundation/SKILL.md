---
name: ds-foundation
description: ds-foundation 总览与分层决策——新东西该放哪个包（core 只有算法没有值 / tokens 只有值没有算法）、令牌从拾取到落地的五步、覆盖优先级、持久化与 SSR 为什么在边界、怎么路由到其它 ds-* Skill。当用户问"这个功能该加在哪""能不能给个默认值""换主题时哪些值会动""为什么拿不到 color-brand""这个仓库怎么上手"时使用。
agent_created: true
---

# ds-foundation

Design System 底层包，兼容基线 **IE10**。代码都在 `ds-foundation/` 下，命令都在这个目录跑。

## 何时使用

- 要判断一个新能力 / 一个默认值该落在哪个包
- 要改令牌、主题、强调色、尺度，不确定改哪一层
- 排查「令牌算出来了但页面上没变」
- 需要路由：`@ds/core` 用法 → `ds-core`；单位 → `ds-units`；IE10 → `ds-ie10`；
  导入设计稿 → `ds-token-import`；构建 → `ds-toolchain`；测试 → `ds-testing`；
  DOM 注入 → `ds-dom`；Vue 2 → `ds-vue2`；值包 → `ds-tokens`；uni-app x → `ds-uniappx`

## 心智模型

```
三种等价来源：设计稿 fromW3C/fromFigma · 手写 defineTokens · 种子 defaultSeed
   ↓ deriveTokens(seed, algorithm[], mode)   可选，纯函数，数组从左到右
createTheme(def) → Theme.tokens
   ↓ createRegistry().resolve()   覆盖链：theme.tokens → accent.tokens → overrides
rescaleTokens(flat, unit, space, keep)      出口换算，只有一处
   ↓ pickChannel()
vars 通道 :root{--ds-*}   |   static 通道 <style> 写死实值（IE10）
```

## 工作流：新东西放哪一层

1. **问一句「换一套设计语言时它要不要改」** —— 要改的是值，不用改的是机制
2. 是**值**（色值 / 断点数字 / 尺度表 / 语义映射 / 种子）→ `@ds/tokens`，或调用方自己那份
3. 是**机制**（怎么合并、怎么派生、怎么换算、怎么输出 CSS）→ `@ds/core`
4. 要碰 DOM / 存储 / 媒体查询 → `@ds/dom`；要接 Vue 2 → `@ds/vue2`
5. **想加默认值兜底时先停下来** —— 见硬规则 1，多半不该加

## 覆盖优先级

```
theme.tokens  →  accent.tokens  →  overrides         （后者盖前者）
```

第二条是**覆盖不是派生**：改 `color-brand` 不会让 `color-brand-hover` 跟着动。

## 硬规则

1. **不替用户做设计决策。** 宁可参数必传、宁可抛错。反例：「accent 为空就套 indigo」
   表现为所有主题品牌色一样（accent 盖在 theme.tokens 之上），而在默认组合上
   light+indigo 恰好也是那个靛蓝 —— 从界面上完全看不出来。修法是删掉兜底，不是加开关
2. **core 里不许出现具体色值 / 断点数字 / 尺度表。** 例外只有两个：
   `DEFAULT_NS = 'ds'`（前缀兜底，错了整张样式表出不来）、`DEFAULT_ROOT_FONT_SIZE = 16`
   （浏览器默认值）—— 它们属于「算法能不能跑」，不是「长什么样」
3. **dom 不知道 tokens 存在。** 官方主题是**参数**传进去的，不是 import 进来的
4. **合并只能深合并**（`mergeTree`）—— `unflattenTokens(mergeTokens(...))` 会让
   `color-brand` 与 `color-brand-hover` 抢同一个 `color.brand`，短键被冲掉
5. **持久化与存储不许进核心**。`createThemeManager` 没有 `persist` 选项（刻意 breaking），
   要存就 `readTheme()` → 建 manager → `bindTheme(ds)` → `ds.init()`
6. **集合会长大的就别手写清单**（IE10 API 用 compat 数据、ES5 语法用 acorn、CSS 单位用
   `factorOf`）。判据是「要防的集合会不会增长」，不是「被防的东西是不是冻结了」

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 令牌表里没有 `color-brand` | 官方主题不含 brand 一族，品牌色只由 accent 提供 | 传 `accents`，不是缺漏 |
| 改了 `color-brand`，hover 没跟着变 | 覆盖不是派生 | 要联动就把 brand 写进 seed 走 `deriveTokens` |
| 换了主题但页面没变 | 改了库没重新 build（示例走别名指向 `build/`） | `pnpm run build` |
| 读注入的 CSS 是空的 | 用了 `el.style.cssText` | 读 `#ds-tokens` 的 **textContent** |
| `accents: {}` 时界面品牌色消失 | 同上，brand 一族本就不存在 | 传 accent 或自建主题 |
| SSR 首屏闪白 | JS 异步才注入 | `getInitScript({ restore: restoreScript() })` 内联进 `<head>` |

## 检查清单

- [ ] 新增的值类东西是否落在 `@ds/tokens` 或调用方，而不是 core
- [ ] 有没有顺手加默认值兜底（有 → 删掉）
- [ ] 令牌改动是否走了深合并
- [ ] 需要持久化时是否显式走 `readTheme` + `bindTheme`
- [ ] 改完库是否重新 `pnpm run build`
