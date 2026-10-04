---
name: ds-token-import
description: 把 W3C DTCG / Figma 导出的令牌 JSON 转成 ds-foundation 的扁平令牌表——fromW3C / fromFigma 的选项、CLI 用法、别名 {a.b.c} 解析、$root 是组默认值不是元数据、com.figma.scopes 决定单位语义、STROKE_FLOAT 恒为 px、给 vw/cqw 必须传 factors、issues 为空才算干净。当用户问"怎么导入 figma tokens""转换出来的键名太长了""别名没接上""为什么 vw 没换算""unit 怎么选""结果里一堆 xxx-raw-value 是怎么来的"时使用。
agent_created: true
---

# 导入设计稿令牌

## 何时使用

- 手上有一份 Figma / Tokens Studio 导出的 `*.tokens.json`
- 想把 W3C DTCG 格式的令牌接进本库
- 转换结果的键名、单位、别名不对，要排查
- 结果里出现一堆 `xxx-raw-value` / `xxx-css-value` 这种带后缀的键（形状喂错入口，见下）

## 先判形状：树，还是扁平映射

两个入口都只认**树形的 DTCG**：一层组一层令牌嵌套，令牌的值写在 `$value` / `value` 里。

另一种常见交付是**扁平映射**：顶层键本身就是 `color/bg/container` 这种路径，值是
一段带若干描述字段的记录。它**不是** DTCG，喂给 `fromW3C` / `fromFigma` 会出这种事：

- 记录里除 `value` 外还有别的对象型子键，正好撞上「除 value 外还有对象型子键 → 是组」
  那条判据 → 每条令牌被当成组继续往下摊平
- 于是产出 `'xxx-raw-value'`、`'xxx-css-value'` 这种把字段名拼进路径的键
- **而 `issues` 是空的** —— 它没有「错」可报，全程合法，只是结果全是垃圾

所以：看到一堆带字段名后缀的键，就是进口用错了，不要去修键值。**本库目前不认这种形状**
（要不要为它加一个入口，取决于它是不是真有多个独立来源 —— 只有一份私有样本驱动的需求
不该进公共 API）。真要消费，先在调用方把它折成 DTCG 树，再走 `fromW3C`。

## 心智模型

```
源：{ "$type": "color", "$value": {...} } 树形，值可能是对象 / 裸数字 / {a.b.c} 引用
   ↓ fromW3C / fromFigma（只做格式翻译，不做语义映射）
{ tokens: { 'color-blue-500': '#4096ff' }, issues: [], aliases: 365 }
   ↓ 可选：rescaleTokens / remify 换单位
进 createTheme 或扁平令牌表
```

## 工作流

1. **先跑一次看体检报告**：
   ```js
   const { tokens, issues, aliases } = fromFigma(json)   // 或 fromW3C
   ```
   `issues` 是空数组才算干净；断链别名、未知类型逐条都在里面
2. **用 `include` / `exclude` 挑子树**（点分路径前缀），别整棵吞：
   ```js
   fromFigma(json, { include: ['color'], exclude: ['deprecated'] })
   ```
3. **改键名** —— 转换器不会猜语义，`button-bg-brand-solid-default` 翻出来还是同名。
   它该叫 `color-brand` 是你的设计决策
4. **定单位**：默认 px（源就是 px）；要 rem 就 `unit: 'rem'`；
   要 vw / cqw 必须同时给 `factors`
5. **可选命令行**：`node scripts/convert-tokens.mjs Default.tokens.json --unit=rem --include=color,space > tokens.json`

## 选项

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `unit` | `'px'` | 长度落地单位，任意 CSS 单位 |
| `rootFontSize` | `16` | rem 的系数 |
| `factors` | — | `vw` / `cqw` 之类依赖环境的单位系数 |
| `prefix` | — | 键前缀，不给就用路径本身 |
| `include` / `exclude` | — | 点分路径前缀，挑子树 |
| `resolveAlias` | `true` | 解析 `{a.b.c}` 引用 |
| `onUnknown` | `'skip'` | 认不出的类型：`skip` / `keep` / `throw` |

## 硬规则

1. **只做格式翻译，不做语义映射** —— 别期待它帮你把设计稿命名对齐到本库的
   `category-role`；那是你的设计决策
2. **`$root` 是一条真令牌，不是元数据**：`input.height.$root` 会翻成 `input-height-root`，
   别名里写 `{input.height.$root}` 也能接上
3. **组里恰好有子令牌叫 `value` 时不能误判**：判据是「除 `value` 外还有对象型子键 → 是组」
4. **数值单位由 `com.figma.scopes` 决定，不靠猜**：
   GAP / CORNER_RADIUS / FONT_SIZE / WIDTH_HEIGHT / LINE_HEIGHT / EFFECT_FLOAT 按长度处理；
   OPACITY 落成 0–1（源里 `50` 与 `0.45` 两种写法都见过）；FONT_STYLE 是字重不带单位
5. **`STROKE_FLOAT`（描边宽度）恒为 px** —— 1px 跟着根字号缩放会变糊，这是物理限制不是偏好
6. **换不了单位就原样保留，不伪造**：只写 `unit: 'vw'` 不给 `factors`，结果还是 px，
   并在 `issues` 里记一条。换个单位符号冒充换算过的值，比老实说「换不了」糟得多
7. **半透明色落成逗号语法 `rgba(r, g, b, a)`**（IE10 认，空格斜杠语法会丢声明）

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 一堆 `input-height-root` 这种键 | `$root` 是组默认值，是真令牌 | 用 `exclude` 挑掉，或改名 |
| 别名值没接上 | 引用链断了，或 `$root` 被当元数据跳过了 | 看 `issues`；确认没把 `$root` 过滤掉 |
| 要 vw 但出来的还是 px | 没给 `factors` | `factors: { vw: 3.75 }`（视口 375） |
| 键名太长 | 转换器不会猜语义 | 用 `include` 挑完自己改名 |
| `1px` 被折成 `0.0625rem` | 描边不该换算 | `STROKE_FLOAT` 已写死为 px；别自己再跑一次 `remify` |
| 重复换算（1px → 0.0625rem → 再折） | CLI 之后又跑了一次 remify | 单位只在转换这一步落地 |

## 检查清单

- [ ] `issues` 是空数组
- [ ] 键名已按本库的 `category-role` 对齐（转换器不会替你做）
- [ ] 单位选择已确定，环境相关单位给了 `factors`
- [ ] 描边宽度仍是 px
- [ ] 半透明色是逗号语法
- [ ] 三份真实样本（Primitive 274 / Semantic 250 / Component 2160 条）能 0 问题跑完
