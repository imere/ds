---
name: ds-foundation
description: 决定一个新能力 / 一个默认值该落在哪个包，以及路由到其它 ds-* Skill。当用户问"这个功能该加在哪""能不能给个默认值""换主题时哪些值会动""为什么拿不到 color-brand""这个仓库怎么上手"时使用。
metadata:
  pattern: inversion
---

# 新东西放哪一层

Design System 底层包，兼容基线 **IE10**。代码都在仓库根（仓库名 ds，workspace 名 ds-foundation），
命令也在根跑。

**DO NOT 直接开写。先把 Phase 1 / Phase 2 的问题问完，再进 Phase 3。**
一次问一个，等回答再问下一个 —— 跳过一个阶段，落点大概率选错。

## Phase 1 — 它是什么

一个一个问，拿到答案再问下一个：

- **Q1：换一套设计语言时它要不要改？**
  要改的是**值**，不用改的是**机制**
- **Q2：它要碰 DOM / 存储 / 媒体查询吗？**
  要 → 只能是浏览器层；不要 → 纯逻辑层
- **Q3：它是给 Vue 2 用的吗？**
  是 → 框架适配层

## Phase 2 — 它会不会替用户做决定

- **Q4：实现它需要一个默认值兜底吗？**
  需要 → **停下来**。多半不该加，见硬规则 1
- **Q5：它是靠一份私有样本才成立的吗？**
  是 → 见硬规则 7，可能是「不该进公共 API」

## Phase 3 — 落点

| 判定 | 落点 |
| --- | --- |
| 是**值**（色值 / 断点数字 / 尺度表 / 语义映射 / 种子） | `@ds/tokens`，或调用方自己那份 |
| 是**机制**（怎么合并、怎么派生、怎么换算、怎么输出 CSS） | `@ds/core` |
| 要碰 DOM / 存储 / 媒体查询 | `@ds/dom` |
| 要接 Vue 2 | `@ds/vue2` |

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

## 覆盖优先级

```
theme.tokens  →  accent.tokens  →  overrides         （后者盖前者）
```

第二条是**覆盖不是派生**：改 `color-brand` 不会让 `color-brand-hover` 跟着动。

## 路由到其它 Skill

| 要做什么 | 去哪 |
| --- | --- |
| `@ds/core` 用法 | `ds-core` |
| 运行时注入 / SSR / 持久化 | `ds-dom` |
| 值包 / 换成自己的设计语言 | `ds-tokens` |
| 单位换算 | `ds-units` |
| 导入设计稿令牌 | `ds-token-import` |
| Vue 2 接入 | `ds-vue2` |
| uni-app x 接入 | `ds-uniappx` |
| 构建与门禁 | `ds-toolchain` |
| 写测试 / 补覆盖率 | `ds-testing` |
| IE10 合规 | `ds-ie10` |
| push 不通 / PR 与告警 | `github-api-fallback` |

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
7. **只有一份私有样本驱动的能力不进公共 API。** 三条同时成立就别做：
   ① 实现依赖的是某条私有管线自定的字段约定，不是公开标准；
   ② 因为数据不能进仓，夹具只能自己编 —— 于是拿昨天的实现验证今天的实现，自证循环；
   ③ 通用与否找不到第二个独立来源证实（没有公开规范、没有别的产出处）。
   把「现有入口为什么认不出它」记进 Skill 就够了 —— 那段失败模式才是通用知识。
   同理：**API 名不许带来源方的产品名 / 工具名**，它既是泄漏，也等于把外部命名焊进自己的抽象层

## 坑表

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 令牌表里没有 `color-brand` | 官方主题不含 brand 一族，品牌色只由 accent 提供 | 传 `accents`，不是缺漏 |
| 改了 `color-brand`，hover 没跟着变 | 覆盖不是派生 | 要联动就把 brand 写进 seed 走 `deriveTokens` |
| 换了主题但页面没变 | 改了库没重新 build（示例走别名指向 `build/`） | `pnpm run build` |
| 读注入的 CSS 是空的 | 用了 `el.style.cssText` | 读 `#ds-tokens` 的 **textContent** |
| `accents: {}` 时界面品牌色消失 | 同上，brand 一族本就不存在 | 传 accent 或自建主题 |
| SSR 首屏闪白 | JS 异步才注入 | `getInitScript({ restore: restoreScript() })` 内联进 `<head>` |

## 检查清单

- [ ] Phase 1 / Phase 2 的问题都问过并拿到答案
- [ ] 新增的值类东西落在 `@ds/tokens` 或调用方，而不是 core
- [ ] 没有顺手加默认值兜底（有 → 删掉）
- [ ] 令牌改动走了深合并
- [ ] 需要持久化时显式走 `readTheme` + `bindTheme`
- [ ] 改完库重新 `pnpm run build`
