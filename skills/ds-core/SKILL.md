---
name: ds-core
description: 用 @ds/core 构建或改造 Design Token 体系——三层令牌与两层 class、前缀的四种等价写法、双通道 CSS 输出（现代变量 / IE10 预求值）、色值换算与 WCAG 对比度、种子派生管道。当用户提到"@ds/core""令牌前缀怎么改""--ds- 换成 --acme-""生成 class 规则""toCssVars / resolveVars / buildClassSheet""deriveTokens""IE10 怎么写半透明色""token 拍平"时使用。
metadata:
  pattern: tool-wrapper
---

# @ds/core 约定

纯逻辑层：不碰 DOM、不依赖框架、纯 ES5。浏览器 / Node / SSR / 构建期预生成都能跑。
**只有算法没有值** —— 具体色值、断点数字、尺度表都在 `@ds/tokens`（或你自己那份）。

## 触发条件

- 定义或改造一套 Design Token，要输出成 CSS（变量形式或静态形式）
- 要生成原子 class（primitive + semantic 两层）
- 要用种子派生一整套令牌，或换掉默认的 `ds` 前缀
- 要做 IE10 / 老浏览器兼容的令牌输出

## 约定

### 数据流：先拍平再输出

```
令牌（嵌套对象）
  └─ flattenTokens() ──> 扁平表 { 'color-bg-brand': '#4f46e5' }
        ├─ toCssVars()       ──> :root{--ds-color-bg-brand:#4f46e5}   现代通道
        ├─ resolveVars()     ──> { 'color-bg-brand': '#4f46e5' }      IE10 预求值
        └─ buildClassSheet() ──> primitive CSS + semantic CSS
```

扁平表是**唯一输入格式** —— 别把嵌套对象直接喂给 `toCssVars()` / `buildClassSheet()`。

### 前缀：四种写法等价，一次设置五处生效

```js
normalizePrefix('acme')         // 命名空间
normalizePrefix('--acme-')      // CSS 变量形式
normalizePrefix('acme-')        // class 形式
normalizePrefix({ ns: 'acme' }) // 已归一化对象，原样透传
```

返回 `{ ns, var, cls, attr, modeAttr, accentAttr, ids, keys }`：CSS 变量、class 名、DOM 属性、
`<style>` id、存储 key 五处同源。**拿到对象一路传下去，不要各处写字符串。**

### 派生：入出同形所以能串联

```js
deriveTokens(seed, [defaultAlgorithm, darkAlgorithm, compactAlgorithm], 'dark')
```

`defaultAlgorithm` 补全 / `darkAlgorithm` 翻暗（幂等）/ `compactAlgorithm` 收紧。

## 应用方式

### 写代码时

1. **定前缀** —— 默认 `ds`；要换就一处传 `prefix`。这是第一步，不是补丁
2. **定义令牌** —— 嵌套对象按 `category.role` 组织；半透明色一律逗号语法
3. **建主题与强调色** —— `createTheme({ label, mode, tokens })`；两者正交，可自由组合
4. **需要联动就派生** —— `deriveTokens(seed, algorithm[], mode)`；seed 必须完整，缺项直接抛错
5. **拍平** —— `flattenTokens(tokens)`
6. **选通道输出** —— 现代 `toCssVars()`；IE10 `resolveVars()` + `buildClassSheet({ resolve })`
7. **校验** —— `contrast(fg, bg) >= 4.5` 才算过 WCAG AA

### 改 / 查代码时

按下面的硬规则逐条核对。发现违规要**引用规则编号、说明为什么、给出具体改法** ——
只说「这样写不对」等于没说。

## 硬规则

1. **先定前缀再动手** —— 前缀会被拼进 CSS 选择器，中途改等于改所有选择器
2. **非法前缀兜底不抛错** —— 空、数字开头、含空格一律退回 `ds`；CSS 选择器挂了整页样式都没了
3. **半透明色只用 `rgba(r, g, b, a)` 逗号语法** —— `rgb(r g b / a)` 在 IE10 会丢整条声明
4. **IE10 通道必须过 `resolveVars()`** —— 不预求值，`var()` 所在整条声明会被直接丢弃
5. **class 拆两层** —— primitive（scale 派生，1 份）+ semantic（令牌派生，N 份）；
   不拆的话 IE10 下体积是 `全部 × 主题数`
6. **`var()` 的第二参数就是 fallback** —— 用 `cssVarRef(key, prefix, fallback)`，别手写三元
7. **`resolveVars()` 最多解 5 层链式引用** —— 再深要拆令牌
8. **不替用户做设计决策** —— core 里不出现具体色值 / 断点 / 尺度；seed 缺项抛错而不是补默认值

## 坑表

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 换了前缀，class 生效但变量没换 | 只改了其中一项 | 传统一的 `prefix`，一路传归一化对象 |
| `--ds-` 和 `--acme-` 同时出现 | 部分调用点漏传前缀 | 同上 |
| IE10 上某个色块没颜色 | 值里含 `var()` 没被求值 | 走 `resolveVars()`，或 `buildClassSheet({ resolve })` |
| 半透明层在 IE10 消失 | 用了空格斜杠语法 | 改回 `rgba(15, 23, 42, 0.45)` |
| 派生结果里有别人的颜色 | seed 稀疏被补齐了 | seed 必须完整（拿 `defaultSeed` 垫底再改） |
| 对比度不达标 | 深色模式下阴影和边框都要重给 | `contrast()` 实测，别凭眼睛 |
| `require()` 报 "of ES Module" | 包是 `type: module` | UMD 那份叫 `index.umd.cjs`，用 `.cjs` |

## 检查清单

- [ ] 前缀在入口统一归一化，并一路传对象（不是各处写字符串）
- [ ] 半透明色全是逗号语法
- [ ] IE10 通道过了 `resolveVars()`
- [ ] class 拆成 primitive / semantic 两层
- [ ] 每个主题的前景色 / 背景色对比度 ≥ 4.5
- [ ] 令牌有 `category-role` 完整命名，没有裸色值
- [ ] 派生用的 seed 是完整的
