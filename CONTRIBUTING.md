# 贡献指南

本仓库是 `ds-foundation` —— 一套以 **IE10 为兼容基线**的 Design System 底层包。
所有代码都在 `ds-foundation/` 下，本文提到的命令都在这个目录里跑。

给 Agent 看的同一份经验在 [`.agents/skills/`](.agents/skills/) 下，按主题拆成了若干
Skill（架构、单位、IE10、测试、工具链、令牌导入、四个包各一份）。**两边改一个就要改另一个。**

---

## 一、先把环境跑通

需要 **Node 22+**（jsdom 30 依赖 undici 8，后者要用 Node 22 才有的
`webidl.util.markAsUncloneable`；在 Node 20 上 jsdom 直接加载失败，
所有 jsdom 用例一起挂，表现出来是「覆盖率暴跌」而不是「版本不对」）。
包管理器是 pnpm 10+，`.nvmrc` 里写着 22。

```bash
cd ds-foundation
pnpm install          # 冷启动约 100s，之后走 store 硬链接
pnpm run verify       # typecheck → lint → build → coverage
```

`verify` 是 CI 跑的同一串命令，本地绿了基本就能合。**顺序不能改**：
`tests/es5.test.ts` 里有 8 个用例验的是 `packages/*/build` 里的真实产物，
没 build 时它们自动跳过 —— 先跑测试等于只验了一半。

| 命令 | 干什么 |
| --- | --- |
| `pnpm run typecheck` | `tsc --noEmit`，源码与测试各一个 project |
| `pnpm run lint` | ESLint（含 Prettier 格式 + IE10 API 兼容） |
| `pnpm run lint:fix` | 能自动修的先修掉 |
| `pnpm run build` | SWC 降 ES5 + Rollup 出 ESM / UMD |
| `pnpm run dts` | 出 `.d.ts`（四个包都要，`scripts/dts.js`） |
| `pnpm run test` | vitest 全量 |
| `pnpm run coverage` | 带覆盖率，四项门槛 100% |
| `pnpm run es5` | 只跑 ES5 合规那一项 |
| `node scripts/check-jsdoc.mjs` | JSDoc 门禁 |
| `pnpm run example` | 起 demo-app（先 `pnpm run build`） |

包管理器是 **pnpm**，别用 npm（`examples/demo-app` 是独立的 npm 工程，那里才用 npm）。
原因写在本仓库 README 的「包管理器是 pnpm」一节。

---

## 二、四条硬规则

### 1. 机制归 `@ds/core`，值归 `@ds/tokens`

core 里不许出现具体色值、具体断点数字、具体尺度表。唯一的例外是 `DEFAULT_NS = 'ds'`
（前缀兜底）与 `DEFAULT_ROOT_FONT_SIZE = 16`（浏览器默认值）—— 那两个属于「算法能不能跑」，
不是「长什么样」。

判断方法：换一套设计语言时它要不要改？要改的是值，不用改的是机制。

### 2. 不替用户做设计决策

宁可让参数必传、宁可抛错，也不要加默认值兜底。历史教训记在这：

> 早期「accent 为空就套 indigo」的兜底，因为强调色盖在主题之上，
> 表现为**所有主题的品牌色一样**。而官方 light 主题配 indigo 出来的 `color-brand`
> 恰好也是那个靛蓝，所以这个坑在默认组合上完全看不出来。

修法不是加个 `defaultAccent: false` 开关，是**把兜底整个删掉**。
同理，`deriveTokens` 的 seed 缺项直接抛错，不拿库里的颜色补齐。

### 3. 产物必须是纯净 ES5

源码随便写（箭头、模板串、解构、class 都行，SWC 会降），但产物里不能出现：

- 运行时 API：`Object.assign` / `Set` / `Map` / `Promise` / `WeakMap` / `Array.from` /
  `Array.find` / `String.includes` / `fetch` / `globalThis`
- 降级后才引入依赖的语法：`for...of` / `yield` / `async await`
- 空格斜杠语法的半透明色：必须 `rgba(r, g, b, a)`

这层是**全静默**的：构建配置一失效，现代浏览器全正常，只有 IE10 会炸。所以它是常驻检查。

### 4. 覆盖率四项 100%，且不许用假测试凑

门槛写在 `vitest.config.ts`，达不到直接失败。补缺时先分清两种成因：

- **真没测到** → 补测试；
- **根本走不到** → **改代码删掉**，不许写替身去凑。经典案例：用
  `registry.getTheme(name)` 判「有没有这套主题」永远为真（查不到会兜回当前主题），
  得换成在 `listThemes()` 里找名字。定式：**见到不可达分支，先想是不是 API 语义用错了。**

100% 也不等于「行为被验证」。要验守护强度就用变异测试：故意改坏源码跑全量，
红 = 真守着，绿 = 形同虚设。

---

## 三、全部函数都要有 JSDoc

`node scripts/check-jsdoc.mjs` 是门禁：每个函数（含模块内私有的、对象方法、箭头常量）
都要有中文描述 + 逐个 `@param` + 非 void 的 `@returns`。

描述写「**为什么这样设计**」，不写「这个函数干了什么」—— 后者看签名就知道。

---

## 四、提交与 PR

- 提交信息走 Conventional Commits：`type(scope): 小写正文`。
  scope 用 `core` / `tokens` / `dom` / `vue2` / `unit` / `convert` / `tests` / `scripts` /
  `examples` / `deps` / `repo`。
- PR 标题同样受检查（`.github/workflows/pr-title.yml`）。
- PR 模板里的自检清单请逐条过，尤其是「有没有把设计决策写进 core」和「有没有新增运行时 API」。

---

## 五、改完库记得重新构建

`examples/demo-app` 靠 vite 别名指向 `packages/*/build/index.js`
（四个包是 private + `workspace:`，装不进 node_modules），所以**改完库不 build 就看不到变化**。
`examples/uniappx` 同理，它的生成脚本直接 import `packages/core/build/index.js`。

---

## 六、目录地图

```
.github/            CI / Dependabot / issue 与 PR 模板 / labeler
.agents/skills/     给 Agent 看的操作指南（本文件的结构化版本）
packages/core/      算法：token / theme / derive / class / output / unit / convert
packages/tokens/    值：theme / accent / seed / breakpoint / scale
packages/dom/       运行时：注入 / 双通道 / SSR / 存储
packages/vue2/      框架绑定：插件 / 响应式状态 / 指令
docs/               架构文档（含设计决策记录）
examples/           umd / esm / vue2 最小示例 + demo-app + uniappx
tests/              一个模块一个 .test.ts
scripts/            clean / serve / dts / inline-examples / convert-tokens / check-jsdoc
```
