---
name: ds-units
description: 把 ds-foundation 的令牌从 px 换成 rem / vw / cqw 等任意单位的工作流——单位由「值」决定不由开关决定、先用 remifyTree 换种子写法、vw/cqw 必须传 factors、keepPx 保住 1px 描边与阴影、@ds/dom 出口再换一次、查不到系数就原样保留不伪造。当用户问"全是 px 怎么换成 rem""支持 vw/cqw 吗""为什么换了单位没生效""1px 边框怎么不被缩放""rootFontSize 设多少"时使用。
agent_created: true
---

# 令牌单位换算

## 何时使用

- 令牌全是 px，要响应式单位（rem / vw / cqw / dvh …）
- 换了单位但没生效，或某些键没跟着换
- 要给容器查询 / 视口单位配系数
- 判断某个键该不该被换算（描边、阴影、时间、行高）

## 心智模型

```
种子写什么单位，派生就出什么单位（内部一律在 px 空间算差值，出口才落单位）
   ↓
不过派生链的静态令牌（官方两套主题是手工挑的值）
   ↓ 在 @ds/dom 的 currentFlat() 出口统一换一次
tokens() / get() / 注入的 CSS / SSR 导出 —— 四处口径一致
```

**唯一的换算是系数查询**：`factorOf(unit, space)` → 「1 单位 = 多少 px」，
查不到返回 **0**（意思是「不认识」）。库里没有「认得的单位」清单。

## 工作流

1. **先判断这条令牌走不走派生链**
   - 走（`deriveTokens`）→ 第 2 步；不走（手写静态值、导入的）→ 第 4 步
2. **换种子写法**，不是给算法加开关：
   ```js
   deriveTokens(remifyTree(defaultSeed, { rootFontSize: 16 }))
   // font-size-md: 0.875rem  font-size-sm: 0.75rem（= 14px − 2px，差值跟着折过去）
   ```
   也可以直接写别的单位：
   ```js
   deriveTokens({ ...defaultSeed, font: { sizeMd: '1em' } })                    // sizeSm: 0.875em
   deriveTokens({ ...defaultSeed, font: { sizeMd: '2vw' } }, null, 'light', {
     factors: { vw: 3.75 },                                                      // 视口 375 宽
   })
   ```
3. **设 `rootFontSize`** —— 它是唯一决定「2px 折成多少 rem」的旋钮
   （root=16 → 0.125rem，root=10 → 0.2rem）
4. **静态令牌在出口换一次**：
   ```js
   createThemeManager({
     ...baseOpts,
     unit: 'rem',                    // 任意 CSS 单位，不限 'px' | 'rem'
     rootFontSize: 16,
     factors: { vw: 3.75, cqw: 6 },  // 依赖环境的单位系数
     keepPx: ['shadow'],             // 默认 ['border-width', 'shadow']
   })
   ```
5. **验收** —— 四处口径必须一致：`ds.get(k)`、`ds.tokens()`、`#ds-tokens` 的 textContent、
   SSR 导出。有键没换就查是不是命中 `keepPx`

## 决策表：这个键要不要换算

| 值类型 | 处理 | 理由 |
| --- | --- | --- |
| 长度（`4px`） | 换 | — |
| `border-width` | **默认保持 px** | 1px 跟着根字号缩放会变糊甚至消失（hairline 是设备像素级） |
| `shadow` | **默认保持 px** | 固定视觉深度，不属于排版尺度 |
| 时间（`200ms`） | 不换 | 换算只认 `px` 出现的地方 |
| 无单位比值（行高 `1.5`） | 不换 | 同上 |
| 色值 | 不换 | 同上 |
| 哨兵值（`9999px`） | 不换 | 不是尺度，rem 下会变成 `624.9375rem` |

`keepPx` 是**策略不是算法**，所以挂在 dom 的入参上，不写进 `rescaleTokens`。

## 硬规则

1. **换单位从「值」那一头换**（`remifyTree`），不给 `deriveTokens` 加「我要 rem」开关 ——
   开关一开，`sizeMd − 2` 的 2px 差值就不知道折多少
2. **查不到系数就原样保留**，不猜成 px、不抛错。只写 `unit: 'vw'` 不给 `factors`，
   结果就是令牌里还是 `4px` —— 数字看着正常但尺度错了，比看一眼就知道没换难查得多
3. **`vw` / `cqw` / `ex` / `cap` 这类依赖环境的单位必须传 `factors`**，库在 SSR 与构建期拿不到
4. **`remify` 不能走 flatten/unflatten** —— kebab 有损，会把种子的 `sizeMd` 还原成 `size.md`；
   换整棵树用 `remifyTree`（递归保键名）
5. **`unitOf` 只白名单匹配单位**，否则 `#f8fafc` 的尾巴会被当成单位

## 原语

```js
factorOf('rem')                             // 16
canConvert('vw')                            // false
length(14, 'pt')                            // '10.5pt'
toPx('0.875rem')                            // 14
toUnit('16px', 'rem')                       // '1rem' —— 两端都换得了才换，否则原值
rescale('0 2px 8px rgba(0,0,0,.4)', 'rem')  // '0 0.125rem 0.5rem rgba(0,0,0,.4)'
rescaleTokens(flat, 'vw', { factors: { vw: 3.75 } }, ['shadow'])
remify(flat, { rootFontSize: 16 }, keep)    // rescaleTokens 的 rem 特例
remifyTree(tree, { rootFontSize: 16 }, keep)
```

## 常见坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 换了 `unit: 'rem'` 但令牌还是 px | 单位换不了（没给 factors / 命中 keepPx） | 查 `canConvert`，查 `keepPx` |
| 种子的 `sizeMd` 变成 `size.md` | 用了 flatten/unflatten 做换算 | 改用 `remifyTree` |
| 1px 边框在高缩放下变糊 | 被折成 rem 了 | 加回 `border-width` 到 `keepPx` |
| rem 数值对不上（0.063 而不是 0.0625） | 小数位数截太早 | `length()` 内部已保留足够精度，别自己 `toFixed` |
| 读了 CSS 变量却是空串 | 用了 `el.style.cssText` | 读 `#ds-tokens` 的 **textContent** |

## 检查清单

- [ ] 是改种子写法，还是给算法加开关（必须是前者）
- [ ] `rootFontSize` 是否与项目实际根字号一致
- [ ] 环境相关单位是否都给了 `factors`
- [ ] `keepPx` 是否覆盖了 hairline 与阴影
- [ ] 四处出口（`get` / `tokens` / 注入 CSS / SSR）口径是否一致
