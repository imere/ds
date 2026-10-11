---
name: ds-tokens
description: 使用或自建 @ds/tokens 的指南——它只有值没有算法（主题/强调色/种子/断点/尺度/语义映射 + 从 core 转出的转换与单位原语）、六个必传参数分别对应什么、怎么照它的形状写一份自己的设计语言、官方主题为什么不含 brand 一族、defaultSeed 必须完整不能稀疏。当用户问"官方令牌有哪些""怎么换成自己的配色""themes/accents/scales 该传什么""能不能只引 core 不引 tokens""brand 色为什么没有"时使用。
agent_created: true
---

# @ds/tokens

**只有值没有算法。** 中性色用 slate 还是 gray、强调色是靛蓝还是品牌红、断点取 768 还是 750、
间距走 4px 还是 8px —— 全在这里；算法一个都不在这里。

## 何时使用

- 要起一套新设计语言（照它的形状写一份）
- 要给 `createThemeManager` / `Vue.use(DsVue2, …)` 凑齐六个必传参数
- 想知道官方那套令牌里到底有什么
- 从 core 转出的转换 / 单位原语（本包也转出了一份，方便按包取用）

## 心智模型

```
@ds/tokens ──> 六个必传参数 ──> createThemeManager / Vue.use(DsVue2, …)
  themes    { light, dark }       官方两套主题（不含 brand 一族）
  accents   { indigo, green,… }   品牌色只由这里提供
  scales    defaultScales         primitive class 的尺度
  rules     defaultScaleRules
  utilities defaultUtilities
  map       defaultSemanticMap    semantic class 的令牌映射
```

依赖方向是 **tokens → core**，而 **dom 不知道 tokens 存在** —— 这些值是**参数传进去**的，
不是 import 进来的。所以换设计语言不用改 dom / vue2。

## 导出清单

| 导出 | 说明 |
| --- | --- |
| `lightTokens` / `darkTokens` | 令牌表 |
| `lightTheme` / `darkTheme` / `themes` | `createTheme()` 出来的成品 |
| `accents` / `defaultAccent` | 强调色表（靛蓝为默认项，但**不会自动套用**） |
| `defaultSeed` | 派生用的种子，必须是完整的 |
| `defaultBreakpoints` | 断点表（数值是设计决策，算法在 core） |
| `defaultScales` / `defaultScaleRules` / `defaultUtilities` / `defaultSemanticMap` | class 层四件套 |
| `fromW3C` / `fromFigma` / `remify` / `pxToRem` / 单位原语 | 从 `@ds/core` 转出的一份 |

## 工作流：换成自己的设计语言

1. **起一份最省事的办法是拿官方垫底再改**，别从零写：
   ```js
   deriveTokens(mergeTree(defaultSeed, { color: { brand: '#0ea5e9' } }))
   ```
2. **改主题** → 复制 `lightTokens` / `darkTokens` 的形状改值，走 `createTheme()`
3. **改品牌色** → 用 `makeAccent('#0ea5e9')`（工厂在 core，它是算法）生成一族，塞进 `accents`
4. **改尺度** → 复制 `defaultScales` / `defaultScaleRules` / `defaultUtilities`
5. **改语义映射** → `defaultSemanticMap` 决定 `color-bg-*` 怎么变成 `.ds-bg-*`
6. **凑齐六个参数传进去**，一个都不能少（不传编译期就红）

## 硬规则

1. **官方两套主题不含 brand 一族** —— 品牌色只由 accent 提供。所以 `accents: {}` 时
   令牌表里就是没有 `color-brand`，**不是缺漏**
2. **没有「不给 accent 就套 defaultAccent」的兜底** —— 那个兜底已彻底删除。
   它表现为所有主题品牌色一样（accent 盖在 theme.tokens 之上）
3. **`defaultSeed` 必须是完整的**，`deriveTokens` 缺项直接抛错，不拿库里的颜色补齐 ——
   补出来的令牌看着齐整，实际是别人的设计混进了你的主题，而且看不出哪几个是补的
4. **别把值写进 core**：判断标准是「换一套设计语言时它要不要改」
5. **不引这个包也行** —— 照它的形状自己写一份，`@ds/core` 与 `@ds/dom` 完全不依赖它

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 令牌表里没有 `color-brand` | 官方主题不含 brand 一族 | 传 `accents` |
| 所有主题的品牌色一样 | 曾经是 accent 兜底干的 | 兜底已删；检查是不是自己给所有主题塞了同一个 accent |
| `deriveTokens` 抛「种子缺项」 | 用了稀疏 seed | 拿 `defaultSeed` 垫底再改 |
| 改了 tokens 但页面没变 | 没重新 build（示例走别名指向 `build/`） | `pnpm run build` |
| 想改断点数值找不到地方 | 在 `defaultBreakpoints`，算法在 core 的 `up` / `down` | 改值，别改算法 |

## 检查清单

- [ ] 六个参数（themes / accents / scales / rules / utilities / map）都传了
- [ ] 需要品牌色时传了 `accents`
- [ ] 派生用的 seed 是完整的
- [ ] 自定义值没写进 core
- [ ] 改完重新 build
