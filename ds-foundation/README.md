# ds-foundation

Design System 底层包：**token / class / theme**，最低支持 **IE10**（与 Element UI 2 同一基线）。

三个包按"能不能碰 DOM / 要不要框架"切开，业务可以只用其中一层：

| 包         | 职责                                     | 依赖                 | 产物                         |
| ---------- | ---------------------------------------- | -------------------- | ---------------------------- |
| `@ds/core` | 令牌、主题、class 规则、CSS 文本。纯函数 | 无                   | `index.js` + `index.umd.cjs` |
| `@ds/dom`  | 能力检测、双通道注入、持久化、SSR        | `@ds/core`           | 同上                         |
| `@ds/vue2` | `Vue.use()`、响应式令牌、`v-ds-theme`    | `@ds/core` `@ds/dom` | 同上                         |

三个包都是 `"type": "module"`，ESM 产物叫 `index.js`、UMD 产物叫 `index.umd.cjs`（原因见文末）。
每个子包自带 `README.md` 与 `skills/<包名>/SKILL.md`。

---

## 一、为什么要分三条通道

IE10 **不支持 CSS 自定义属性**。这意味着 `var(--ds-color-brand)` 在 IE10 上不是"取不到值"，
而是**整条声明被丢弃**——写得再规范也没用。所以"运行时改一个变量、全站跟着变"这套玩法在 IE10 上不存在。

于是有了两条输出通道，由 `@ds/dom` 在运行时按能力检测二选一：

```
tokens ──┬─ 现代通道  toCssVars()  →  :root { --ds-color-brand: #4f46e5 }
         │                            换主题 = 改几十个变量值，规则一份都不动
         │
         └─ IE10 通道 resolveVars() →  .ds-bg-brand { background-color: #4f46e5 }
                                      换主题 = 替换整段 <style> 内容
```

**两条通道对业务暴露的 API 完全一致**，`ds.get()` / `ds.style()` 会自动返回当前通道该给的东西
（vars 通道给 `var(--ds-x)`，static 通道给实值）。业务不需要知道自己在哪条通道上。

---

## 二、class 为什么要拆两层

IE10 通道下，"主题相关"的 class 必须每个主题复制一份。如果所有 class 都跟主题绑死，
体积就是 `全部 class × 主题数`。所以拆开：

| 层            | 例子                                                | 值从哪来             | 份数                   |
| ------------- | --------------------------------------------------- | -------------------- | ---------------------- |
| **primitive** | `.ds-p-4` `.ds-rounded-md` `.ds-flex`               | 固定 scale，主题无关 | **1 份**               |
| **semantic**  | `.ds-bg-brand` `.ds-text-muted` `.ds-border-subtle` | `var(--ds-*)`        | **N 份**（N = 主题数） |

实测：primitive 8.5 KB × 1 + semantic 0.7 KB × N。主题越多省得越多。

semantic class 不是手写清单，而是**从令牌表自动派生**——`color-bg-*` 下的每个令牌自动变成 `.ds-bg-*`，
新增令牌就自动多一个 class，不需要改代码。

---

## 三、令牌结构

三层，越往下越具体：

```
Tier 1 原始层   blue-500 / gray-200        （本包不提供，Tailwind / UnoCSS 的落点）
Tier 2 语义层   --ds-color-bg-subtle       （本包落点，业务主要用这层）
Tier 3 组件层   --ds-button-bg-hover       （组件内部用）
```

命名公式：`--{prefix}-{category}-{role}{Modifier}` → `--ds-color-bg-subtle`

两根正交的轴，叠加顺序固定为 **主题 → 强调色 → 手动覆盖**：

- **主题**换明暗底（bg / fg / border / shadow）
- **强调色**换品牌色（brand 一族），`makeAccent('#0ea5e9')` 一行生成 hover / active / subtle / 前景色

这两根轴都是**覆盖**关系：后者盖前者，改 `color-brand` 不会让 `brand-hover` 跟着动。

> ⚠️ **自建 `accents` 表时要显式 `defaultAccent: false`**
> `@ds/dom` 有个兜底：不给 `accent`（或给空串）且 `accents` 表里有 `indigo` 时，
> 会自动把它套上 —— 初衷是「别让 brand 一族空着」。但强调色盖在主题之上，
> 于是**每套主题的 brand 都会被按成同一个靛蓝**，换主题时品牌色纹丝不动。
> 只想让品牌色跟随主题的话：
>
> ```js
> createThemeManager({ themes, accents, theme: 'light', accent: '', defaultAccent: false })
> ```
>
> 这个坑的现象很有迷惑性：内置 `light` 的 `color-brand` 恰好也是 `#4f46e5`，
> 所以「所有主题品牌色一样」在默认主题上完全看不出来。

需要「改一个种子，整套派生跟着变」时用 `derive`：

```js
registry.theme('brand', {
  seed: { color: { brand: '#4f46e5' } }, // 稀疏，填什么改什么
  algorithm: [defaultAlgorithm, darkAlgorithm, compactAlgorithm], // 管道，从左到右
})
```

`seed` 与 `tokens` 可同时给，先派生再让手写的盖上去。详见 `@ds/core` 的「派生层」一节。

### 断点

```js
import { defaultBreakpoints, breakpointOrder, currentBreakpoint, up, down, mediaOf } from '@ds/core'

currentBreakpoint(1024) // 'lg'
up('md') // '(min-width: 768px)'
down('md') // '(max-width: 767px)' —— 与 up 相邻但不重叠
mediaOf().lg // '@media (min-width: 1024px)'
```

断点跟间距、圆角一样属于**基础尺度**，三方要共用同一份定义：CSS 媒体查询、JS 的条件渲染、文档里的展示表。

这一层只有纯数据 + 纯函数，**不碰 `window` / `matchMedia`**：
怎么监听 resize、怎么接进框架的响应式系统，是绑定层的事 —— Vue 里该写成 composable，
React 里该写成 hook，塞进核心只会让 SSR 和单测多一份副作用。
未知断点名直接抛错，不静默拼出 `(min-width: NaNpx)`。

### 自定义令牌前缀

默认前缀是 `ds`。换成 `acme` 只需要在入口传一次：

```js
createThemeManager({ prefix: 'acme' })
// 或 Vue.use(DsVue2, { prefix: 'acme' })
```

**一次设置，五处同时生效**：

| 位置          | 默认                                                     | `prefix: 'acme'`             |
| ------------- | -------------------------------------------------------- | ---------------------------- |
| CSS 变量      | `--ds-color-brand`                                       | `--acme-color-brand`         |
| class         | `.ds-bg-brand`                                           | `.acme-bg-brand`             |
| `<html>` 属性 | `data-ds-theme` / `data-ds-mode` / `data-ds-accent`      | `data-acme-theme` / …        |
| `<style>` id  | `ds-tokens` / `ds-class-primitive` / `ds-class-semantic` | `acme-*`                     |
| 存储 key      | `ds-theme` / `ds-accent`                                 | `acme-theme` / `acme-accent` |

**四种写法完全等价**，内部由 `normalizePrefix()` 归一化：

```js
'acme' // 命名空间
'--acme-' // CSS 变量形式
'acme-' // class 形式
{
  ns: 'acme'
} // 已归一化对象，原样透传
```

所有接受前缀的函数（`toCssVars` / `resolveVars` / `rulesToCss` / `cssVarName` / `buildClassSheet` / `getInitScript` …）都吃这四种写法，历史调用形式完全兼容。

> 非法前缀（空、数字开头、含空格）**退回 `ds` 而不是抛错** —— 前缀会被拼进 CSS 选择器，抛错会让整页样式挂掉。

---

## 四、四种开箱即用的用法

### 1. UMD 直引（IE10 可跑，双击 HTML 就行）

```html
<script src=".../core/dist/index.umd.cjs"></script>
<script src=".../dom/dist/index.umd.cjs"></script>
<script>
  const ds = DsDom.createThemeManager({ channel: 'auto' })
  DsDom.bindTheme(ds) // 可选：接上持久化（不调就完全不碰 localStorage）
  ds.init()
  ds.use('dark') // 换主题
  ds.useAccent('green') // 换强调色
  ds.get('color-brand') // 读令牌
</script>
<div class="ds-p-4 ds-rounded-md ds-bg-subtle ds-text-muted">…</div>
```

示例：`examples/umd/index.html`。页面脚本本身也是 ES5——产物转了 ES5，页面脚本不转照样白屏。

### 2. ESM（现代工程）

```js
import { createThemeManager } from '@ds/dom'
import { buildClassSheet, resolveVars } from '@ds/core'

const ds = createThemeManager({ themes: { light, dark }, accents })
ds.init()
```

示例：`examples/esm/`（需 `pnpm run serve`，ESM 在 `file://` 下会被 CORS 拦）。

### 3. Vue 2 绑定层

```js
import Vue from 'vue'
import DsVue2, { readTheme, bindTheme } from '@ds/vue2'

const saved = readTheme()
Vue.use(DsVue2, { channel: 'auto', theme: saved.theme || 'light' })
bindTheme(Vue.ds.manager) // 可选：不调就不碰存储
```

之后业务拿到三样东西：

```html
<button @click="$ds.use('dark')">深色</button>
<div :style="$ds.style({ color: 'color-fg-muted' })">…</div>
<section v-ds-theme="'dark'">局部深色区</section>
<code>{{ $ds.t('color-brand') }}</code>
```

- `$ds.state` 是 `Vue.observable` 的，模板里直接用就是响应式的
- `v-ds-theme` 在 vars 通道下把令牌写成元素内联变量，实现**局部换肤**；
  IE10 通道下做不到（没有变量继承），会退化成整站切换并给一次性告警
- 也能通过 `this.dsContext`（provide/inject）拿同一份句柄

`$ds` 上还有几个 UI 直接要用的：

| 用法                        | 说明                                                              |
| --------------------------- | ----------------------------------------------------------------- |
| `$ds.override(k, v)`        | 覆盖单个令牌。传对象则按组合并（`override('color', { brand })`）  |
| `$ds.overrideMap({ ... })`  | 批量覆盖，只重绘一次 —— 拖滑块改圆角那种场景                      |
| `$ds.resetOverrides()`      | 撤销全部覆盖                                                      |
| `$ds.followSystem(true)`    | 运行时开关「跟随系统明暗」；打开会清掉「用户手动选过」的标记      |
| `$ds.state.followSystem`    | 当前是否还在跟随（手动切过主题后为 false）                        |
| `$ds.manager.registry`      | 要列 UI 就用它：`listThemes()` / `getTheme()` / `listAccents()` …  |

示例：`examples/vue2/index.html`（Vue 2 UMD + script 标签，无构建步骤）。

### 4. 只用 `@ds/core`（SSR / 构建期预生成）

core 不碰 DOM，Node 里直接跑：

```js
const flat = registry.resolve()
const sheet = buildClassSheet({ tokens: flat, resolve: resolveVars(flat, { prefix: 'ds' }) })
res.write('<style>' + sheet.primitive + sheet.semantic + '</style>')
```

配合 `getInitScript()` 内联到 `<head>`，首屏就是最终配色，不会闪白。

---

## 五、IE10 硬约束清单

**语言层**（源码是 TypeScript，由 SWC 转 ES5）：
不用 `Object.assign` / `Array.includes` / `Set` / `Map` / `Promise` / 模板字符串 / 解构 / class。
core 里 `assign` 是手写实现，`unique` 不依赖 Set。

**不注入 polyfill**（SWC `externalHelpers: false`）：避免 `@swc/helpers` 或 core-js 污染宿主全局，
缺失的运行时 API 由各包内部用 ES5 写法兜底（`assign` 手写、不用 `CustomEvent`、不用 `classList` 多参、不用 `dataset`）。

> 这层防守是全静默的：构建配置一旦失效（SWC 选项写错层级等），产物里会留着箭头函数，
> 现代浏览器全都正常，**只有 IE10 会炸**。所以 ES5 合规是常驻检查，而且做进了 vitest —— 详见「测试」一章。

**CSS 层**：

- 不能写 `var()`（除现代通道）
- 半透明色必须用**逗号语法** `rgba(79, 70, 229, 0.12)`，
  空格斜杠语法 `rgb(79 70 229 / 0.12)` IE10 直接丢声明
- 单个样式表规则数有上限（IE9 是 4095），`@ds/dom` 默认按 4000 条切片，
  超出自动再开一个 `<style>`——撞线的表现是"后面的样式静默丢失"，极难排查
- flex 需要 `-ms-flexbox` 前缀，primitive class 里已经按数组顺序两条都输出

**能力边界**：

- IE10 下没有局部换肤（`v-ds-theme` 退化）
- IE10 下 `:root` 选择器可用但自定义属性不可用，所以走静态通道
- jsdom 测不出兼容性，真实 IE10 必须真机或虚拟机验证

---

## 六、目录与脚本

```
ds-foundation/
├─ packages/
│  ├─ core/src/    util / color / prefix / token / breakpoint / theme / class / output / preset (.ts)
│  ├─ dom/src/     env / style / emitter / theme / ssr / storage                     (.ts)
│  ├─ vue2/        state / directive / index                                         (.ts)
│  └─ */skills/    每个包一个 SKILL.md，讲自己这层的用法与踩坑
├─ examples/       umd / esm / vue2（最小用法）+ demo-app/（完整演示项目，见下）
├─ tests/          一个模块一个 .test.ts（vitest，584 项；门槛 100% 覆盖率）
├─ scripts/        clean / serve / dts / inline-examples
├─ rollup.config.js   打包
├─ swc.config.js      SWC 转译配置 —— 构建和 ES5 检查共用这一份
├─ vitest.config.ts   @ds/* 别名到 src，测试直接跑源码
├─ eslint.config.js   flat config；Prettier 的选项也写在里面（不单独放 config）
├─ tsconfig.json      源码：类型检查（含 strict）
├─ tsconfig.test.json 测试：单独一份，把 tests 也纳入 tsc 管辖
├─ tsconfig.build.json  只出 .d.ts
├─ pnpm-workspace.yaml  workspace 声明（pnpm 不读 package.json 的 workspaces 字段）
└─ pnpm-lock.yaml
```

### 包管理器是 pnpm

```bash
pnpm install        # 约 100s 冷启动，之后走 store 硬链接，秒级
```

选它有三个实打实的理由，都在这仓库里验过：

1. **严格 node_modules**。子包的 `node_modules` 里只有自己声明过的依赖，没声明就解析不到，
   而不是像 npm 那样悄悄用提升上来的那一份 —— "忘了写依赖"这种只在别人机器上炸的问题会被提前暴露。
2. **optional 依赖按平台正确解析**。npm 的 optional dependencies bug（npm/cli#4828）
   会让 vitest/rolldown 的平台二进制装不上，pnpm 没这毛病（详见文末）。
3. **装得快、磁盘省**。依赖进全局 store，workspace 内硬链接复用。

代价是两条必须记住的规则：

- **子包之间一律写 `workspace:*`**，不能写死版本号，也不能省略。
- **根 `node_modules` 里默认没有 `@ds/*`**。要在根手工 `require('@ds/core')` 做验证，
  就得像现在这样在根 `devDependencies` 里也声明一份 `workspace:*` —— 这不是冗余，是 pnpm 的规矩。

> tests 也要过 `tsc`。这不是形式主义——把 `tests/*.test.ts` 纳入类型检查的第一轮，
> 就抓出 `getInitScript({ defaultTheme })` 这个早就写错的参数名：
> 运行时会被静默忽略，脚本照常生成，只有"防闪烁"这件事悄悄失效了。

```bash
pnpm install
pnpm run build      # 三个包各出 ESM + UMD（SWC 转 ES5，约 1.8s）
pnpm run dts        # 逐个包 emit .d.ts
pnpm run rebuild    # clean + build
pnpm test           # vitest，584 项：core 自检 + DOM 双通道 + Vue 2 + 存储 + 断点 + ES5 合规
pnpm run coverage   # 跑测试 + 覆盖率，门槛 100%（未达标直接失败）
pnpm run typecheck  # tsc --noEmit
pnpm run lint       # eslint .（含格式检查 —— prettier 是里面的一条规则）
pnpm run lint:fix   # 能自动修的先修掉，格式也一起修
pnpm run es5        # 只跑 ES5 那一项（已在 pnpm test 里，单独调方便）
pnpm run verify     # typecheck → lint → build → coverage，串起来跑
                    # 注意 build 在 test 前：ES5 检查里有 6 项验的是 dist 产物，
                    # 没构建时它们会自动跳过，构建后再跑才验得全
pnpm run serve      # http://localhost:5199
pnpm run examples:standalone   # 生成自包含单文件示例（见下）
```

### ESLint + Prettier

工具链是**最新的**：ESLint 10（flat config）、typescript-eslint 8（`strict` 档）、Prettier 3，
`eslint-plugin-prettier` + `eslint-config-prettier` 一起用（后者关掉跟 Prettier 冲突的格式化规则）。

**没有 `prettier.config.js`** —— Prettier 的选项直接写在 `eslint.config.js` 里的 `prettierOptions`。
因为仓库里 Prettier 只通过 `prettier/prettier` 这条规则跑，再留一份独立配置就是两个源头。
代价是 `prettier` CLI 读不到这些选项，所以格式化也走 ESLint：`pnpm run lint` 查、`pnpm run lint:fix` 修。

**源码一律用最新语法，不迁就 IE10** —— 降级是 SWC 的事。
所以 `no-var` / `prefer-const` / `object-shorthand` / `prefer-template` / `prefer-arrow-callback` /
`prefer-spread` / `prefer-rest-params` / `prefer-destructuring` / `logical-assignment-operators`
对**所有文件**一视同仁地开着，没有"产物层放宽"这种例外。

规则只剩一处分层，而且只加在 `packages/*/src`：禁掉 **SWC 降不动**的两类东西。

**第一类：IE10 没有的运行时 API。** SWC 只转语法不注入 polyfill，
写一个 `Object.assign` 或 `Set` 就原样进产物、在 IE10 上直接 ReferenceError，
而 `tests/es5.test.ts` 扫语法是扫不出来的。`no-restricted-globals` 拦 `Set`/`Map`/`Promise`/`Symbol`，
`no-restricted-properties` 拦 `Object.assign` / `Array.from` / `.includes()` 等。

**第二类：降级后反而引入运行时依赖的语法。** 这三条是实测出来的，不是猜的：

| 语法              | SWC 降级产物               | 为什么不行          |
| ----------------- | -------------------------- | ------------------- |
| `for...of`        | `l[Symbol.iterator]()`     | IE10 没有 `Symbol`  |
| `generator/yield` | 依赖 `Symbol` + `Iterator` | 同上                |
| `async/await`     | 依赖 `Promise`             | IE10 没有 `Promise` |

反过来，下面这些实测降级干净，随便用：

`let/const`（含循环闭包 → `_loop` IIFE，语义正确）、箭头函数、模板字符串（→ `"".concat`）、
解构、数组/对象展开、可选链 `?.`、`??`、`||=`、`**`（→ `Math.pow`）、class/extends、
getter/setter、计算属性名、标签模板、`catch {}`（→ `catch (unused)`）、函数参数尾逗号。

> 全仓库唯一刻意保留 `var` 的地方是 `ssr.ts` 里那段防闪烁脚本 ——
> 它是**字符串**，SWC 不转译字符串内容，而它要内联进 HTML 直接在 IE10 上跑，只能手写 ES5。
> 源码里已经没有 `var` 了。

> **TS 版本锁在 6.0.3，别升 7**。typescript-eslint 8 的 peer 是 `>=4.8.4 <6.1.0`，
> 而 TS 7 是 Go 原生版，npm 包里只有 `getExePath.js` / `tsc.js`，**不提供 JS 编译器 API**，
> typescript-eslint 启动时直接 `throw 'does not support TS 7.0'`。
> 曾经试过官方的 side-by-side 方案（`.pnpmfile.cjs` 给 typescript-eslint 单独喂一份 TS 6），
> 能用，但代价是仓库里同时存在两个 TS 版本、还要靠 pnpm 的 readPackage 钩子改依赖类型 ——
> 太脆，已移除。现在就一个版本，等 typescript-eslint 支持 TS 7 再一起升。

### TypeScript 与 ES5 是两条独立的流水线

`tsc` 的 `target: ES5` 在 TS 6 就已标记废弃（报 TS5107，要加 `"ignoreDeprecations": "6.0"` 才不报错），
TS 7 起直接移除。所以职责必须拆开 —— 降级不能压在 tsc 身上，
何况 rollup 打包本来就需要一个转译器插件，SWC 顺手把这件事也做了：

| 环节         | 工具                        | 干什么                                                                                                           |
| ------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 类型检查     | `tsc --noEmit`              | 只验类型，不产物                                                                                                 |
| 声明文件     | `tsc --emitDeclarationOnly` | 只出 `.d.ts`                                                                                                     |
| **语法降级** | **SWC**                     | `.ts` → ES5。这也是选它的唯一理由：esbuild 的 target 最低只到 es2015，明确不支持 ES5；Babel 能做到但慢一个数量级 |

源码里该写箭头函数、模板字符串就正常写，SWC 都会转，**不必为了迁就 IE10 放弃现代 TS 语法**。
真正的约束只有一条：产物里不能出现运行时 API（`Object.assign` / `Promise` / `Set` / `Map` 等），
因为转译只管语法、不管 polyfill —— 这正是 `pnpm run es5` 要盯的东西。

> 唯一的硬性写法约束：isolatedModules 下，**纯类型导入必须写 `import type`**。
> 混在值导入里 SWC 不会帮你删，rollup 会去找一个根本不存在的导出然后报错。

### 自包含单文件示例

`pnpm run examples:standalone` 会把本地 `<script src>` 全部内联，产出
`examples/umd/standalone.html`（72 KB）和 `examples/vue2/standalone.html`（503 KB）。
双击即可打开，不依赖服务、可以直接发给别人。

内联时会把 JS 字符串里的 `</script` 转义成 `<\/script`——
`getInitScript()` 的返回值里就含这个字符串，不转义会把标签提前闭合，后面的代码全变成文本。

ESM 那一页不生成单文件：原生 ES Module 在 `file://` 下必被 CORS 拦，只能走 `pnpm run serve`。

### 完整演示项目 `examples/demo-app/`

上面三组是「最小用法」，只看一个 API 怎么调。真正的样子在 `examples/demo-app/` ——
一个 Vue 2 组件库 + 文档站，把库的三层能力全用上了：多主题、强调色正交、
令牌微调、局部换肤、SSR 防闪烁、持久化、断点栅格。

```bash
pnpm build          # 先出库产物：demo-app 靠 vite 别名指向 ../../packages/*/dist
cd examples/demo-app && npm install
pnpm run example    # 等价于 npm --prefix examples/demo-app run dev
```

三个入口：`pnpm run example` / `example:build` / `example:test`。

它**不进库的 lint / typecheck / test**：

- `eslint.config.js` 里 `ignores` 加了 `examples/demo-app/**` —— 它是另一个工程，
  有自己的依赖和构建配置，不该被库的 IE10 规则和产品层规则扫
- `tsconfig.json` 的 `include` 只有 `packages/*/src/**/*.ts`
- `vitest.config.ts` 的 `include` 只有 `tests/**/*.test.ts`，demo-app 的测试是 `*.spec.js`

反过来，**改完库一定要重新 `pnpm build`**，demo-app 才会看到新产物 ——
它用的是 `dist` 不是 `src`（三个包 private + `workspace:` 协议，装不进 node_modules，只能走别名）。

## 七、产物格式与扩展名

全部包都是 `"type": "module"`，所以：

| 产物 | 扩展名          | 为什么                                                                                                                                      |
| ---- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ESM  | `index.js`      | 包里已经写了 `"type": "module"`，`.js` 天然就是 ESM，不需要再靠 `.mjs` 扩展名去告诉 Node 怎么解析                                           |
| UMD  | `index.umd.cjs` | **`type: module` 下 `.js` 会被 Node 当 ESM 解析**，UMD 里的 `module.exports` 会直接报 `require() of ES Module`。`.cjs` 强制按 CommonJS 解析 |

浏览器只认 MIME 不认扩展名，`<script src=".../index.umd.cjs">` 照常工作。

**为什么只有 ESM + UMD，没有单独的 CJS**：

- 现代工程走 `module` / `exports.import` → `index.js`，tree-shaking 才有效
- 老工程、`<script>` 直引走 `main` → `index.umd.cjs`，**UMD 自带 CommonJS 分支**，
  所以 Node / Jest / Vue CLI 4 这类 `require` 场景一样能用
- 再单独出一份 CJS 只是多一个产物、多一份维护成本，没有新增能力

两条入口都实测过：`require('@ds/core')` 与 `import '@ds/core'` 都能拿到完整导出。

---

## 八、测试

全部用 **vitest**（`tests/*.test.ts`），取代了原先手写的 `scripts/*-smoke.mjs`。

```bash
pnpm test          # 单次跑完，CI 用
pnpm run test:watch
pnpm run coverage  # 带覆盖率，门槛 100%
```

一个源文件一个（或一组）测试文件，按被测模块命名，不再是「一个大文件里揉所有东西」：

| 被测模块         | 测试文件                                              | 环境  |
| ---------------- | ----------------------------------------------------- | ----- |
| `core/util`      | `util.test.ts`                                        | node  |
| `core/token`     | `token.test.ts`                                       | node  |
| `core/color`     | `color.test.ts`                                       | node  |
| `core/prefix`    | `prefix.test.ts`                                      | node  |
| `core/output`    | `output.test.ts`                                      | node  |
| `core/class`     | `class.test.ts`                                       | node  |
| `core/theme`     | `theme.test.ts`                                       | node  |
| `core/derive`    | `derive.test.ts`                                      | node  |
| `core/preset`    | `preset.test.ts`                                      | node  |
| `core/breakpoint`| `breakpoint.test.ts`                                  | node  |
| `core` 主干      | `core.test.ts`（跨模块的端到端断言：解析 → class → CSS） | node  |
| `dom/theme`      | `dom.test.ts`（主干）+ `manager.test.ts`（边角）+ `manager-node.test.ts`（无 DOM） | jsdom / node |
| `dom/env`        | `env.test.ts`（能力检测的三种结果：有 / 没有 / 抛异常） | jsdom |
| `dom/emitter`    | `emitter.test.ts`                                     | jsdom |
| `dom/style`      | `style.test.ts`（切片、复用、清理、IE 老分支）        | jsdom |
| `dom/ssr`        | `ssr.test.ts`                                         | jsdom |
| `dom/storage`    | `storage.test.ts` + `storage-edge.test.ts`（降级路径） | jsdom |
| `vue2/state`     | `vue2-state.test.ts`                                  | jsdom |
| `vue2/directive` | `vue2-directive.test.ts` + `vue2-directive-warn.test.ts` | jsdom |
| `vue2/install`   | `vue2-install.test.ts`（模块级单例，必须独立文件）    | jsdom |
| `vue2` 主干      | `vue2.test.ts`                                        | jsdom |
| 全仓库           | `es5.test.ts`：**IE10 硬约束**，源码与产物各扫一遍    | node  |

`vue2-directive-warn.test.ts` 与 `vue2-install.test.ts` 之所以要单独成文件：
前者测的是「告警只打一次」里的那一次（模块级 flag 会被同文件里先跑的用例吃掉），
后者测的是 `install` 的模块级单例（第二次安装会被幂等判断挡掉）。
这类**模块级状态**没法在同一个文件里既测「首次」又测「再次」。

两个容易踩的点，写新测试时注意：

1. **环境靠文件头的 `@vitest-environment jsdom` 文档块声明**，而不是 `environmentMatchGlobs`。
   后者在新版本里已经废弃，而前者跨版本稳定。
2. **`vitest.config.ts` 把 `@ds/*` 别名到了 `src`**，测试跑的是源码不是 `dist`，
   省掉"先 build 再 test"的顺序依赖 —— 改一行代码立刻能验，CI 里也不会因为没构建而假失败。

### 覆盖率：门槛为什么钉在 100

`pnpm run coverage` = vitest + v8 覆盖率，四项（语句 / 分支 / 函数 / 行）**全部要求 100**，
写在 `vitest.config.ts` 的 `thresholds` 里，达不到就直接失败（`verify` 里跑的也是它）。

理由是这个库的价值几乎全在**降级路径**上：IE10 没有 CSS 变量、localStorage 被隐私模式禁掉、
matchMedia 不存在、单个样式表撞规则上限。这些分支在本地开发时永远跑不到 ——
覆盖了才说明它们真的能跑，而不是「写的时候觉得应该能跑」。
100 还能挡住一种偷懒：为了过 95% 给整段代码贴 ignore 注释。

补到 100 的过程里总结的三条经验：

1. **先补拒绝分支，再补主干**。空名字、不存在的主题、一个主题都没注册时的 `resolve()` ——
   平时不会走，但一旦走到必须是确定行为而不是崩。
2. **不可达的分支要么删掉，要么写明理由**。100% 会逼出真正的死代码，本次删掉了两处：
   `writeStyle` 清理循环里的 `j === 0` 那一支（`j` 从 `chunks.length` 起，而它至少是 1，
   该分支恒不成立），以及 `normalizePrefix` 里 `strip(null)` 的防御（调用点保证传字符串）。
   留着它们只会让人以为「这里还有个情况没测」。
3. **模块级状态必须拆文件测**。一次性的告警 flag、`install` 的单例、env 的探测缓存 ——
   同一个文件里只能测到第一条路径，第二条会被状态挡住。

覆盖率还顺带查出一个真缺陷：`paint()` 通知订阅者时用的是 `registry.state()`，
里面没有 `channel` 与 `followSystem`，所以 Vue 绑定层的「跟随系统」开关永远是关的。
主干测试（换主题 → 视图更新）发现不了它 —— 只有盯着「这个字段为什么没被覆盖」才会发现。

### ES5 合规为什么做进 vitest

原本是独立脚本 `scripts/es5-check.mjs`，只能扫 `dist` 产物 —— 于是**必须先 build 才有东西可扫**，
而"SWC 选项写错层级被静默忽略"这类问题，恰恰应该在改代码的当下就被发现，不该等构建完。

现在拆成两层，都在 `es5.test.ts` 里：

| 层       | 扫什么                                                                   | 要 build 吗 | 说明                                                                                                                          |
| -------- | ------------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A 源码层 | 拿 `swc.config.js` 那份**真正生效的配置**转译每个 `src/*.ts`，扫转译结果 | 否          | 主要防线，改一行就能验，报错精确到文件                                                                                        |
| B 产物层 | `dist` 里 6 份真实产物                                                   | 是          | 打包器会自己往里塞东西（UMD wrapper、helper 内联），只验源码盖不住；没 build 时自动跳过（6 skipped），不会让 `pnpm test` 变红 |
| C 扫描器自检 | 拿已知违规的源码过一遍，断言「确实被抓出来」                         | 否          | 验的是扫描器自己，见下                                                                                                        |

关键在于**三层共用 `swc.config.js` 里那一份 `swcOptions`**。
如果测试里另写一套配置，它验的就是"测试自己的配置"，rollup 那边写错了照样漏 —— 那就白验了。

有效性实测过：把 `target` 从 `es5` 改成 `es2015`，`token.ts` 和 `util.ts` 立刻报出展开运算符残留，
正是当初踩过的那个坑，定位直接给到文件名。

#### C 层为什么必须有

扫描清单是手写的正则表，**被删掉几条不会有人察觉** —— 而被删的那条恰好是要防的东西时，
A / B 两层会一路绿灯，检查形同虚设。C 层把「这几样违规必须被抓出来」变成断言。

这件事不是假设。加 C 层之前实测过一遍：

| 违规写法            | 转译后                            | 旧清单 | 现在  |
| ------------------- | --------------------------------- | ------ | ----- |
| `for (var x of arr)` | `for-of` 关键字消失，变成调 `Symbol.iterator` | **漏** | 命中 Symbol |
| `Array.from(x)`     | 原样保留                          | **漏** | 命中 |
| `Object.values(o)`  | 原样保留                          | **漏** | 命中 |
| `async / await`     | 引用 `Promise`                    | 命中   | 命中 |

也就是说，ESLint 那边早就写明了「for-of 降级后会调 `Symbol.iterator()`，IE10 没有 Symbol」
（`eslint.config.js` 的 `ie10UnsafeSyntax`），但测试这层只盯着**降级前的关键字** ——
降级完关键字就没了，于是 IE10 上唯一会自动崩的那一类写法，恰恰是检查看不见的。
现在补的是降级后引出来的东西：`Symbol` / `Array.from` / `Object.entries|values|fromEntries` /
`padStart` / `find`，与 ESLint 的 `ie10MissingMethods` 对齐。

顺带把这条写进习惯：**加一条禁用规则，就要在扫描清单里加对应的模式，并给 C 层补一个探针** ——
否则禁令只是"写给人看的"，自动化那边并不知情。

> `typecheck` 没往 vitest 里塞，是刻意的：vitest 的 `--typecheck` 是另一条管线
> （只认 `*.test-d.ts`，且要跑两遍），而这里要的是"源码 + 测试全量过一遍 tsc"，
> `tsc --noEmit` 两个 project 直给就够了。两者都是门禁，分开跑反而一眼看得出红在哪一步。

### vitest 的原生二进制，换 pnpm 后不用再操心

`vitest 5` 依赖 `rolldown` 的原生二进制，按平台分发行包。
npm 的 optional dependencies 有已知 bug（npm/cli#4828），Windows 上经常不装对应的 binding，
启动时报 `Cannot find native binding`，得手工 `npm i @rolldown/binding-win32-x64-msvc` 补。

**pnpm 没这个问题**：`pnpm install` 会按平台正确解析可选依赖，
`@rolldown/binding-win32-x64-msvc` 直接就装上了，所以那个 `optionalDependencies` 的 pin 已经删掉。

万一换架构后仍然缺（Linux 是 `-linux-x64-gnu`，macOS ARM 是 `-darwin-arm64`）：

```bash
pnpm add -D @rolldown/binding-<平台>@<rolldown 版本>
```
