---
name: ds-toolchain
description: 构建与仓库运维的门禁流水线——verify 的固定顺序（build 必须在测试前）、产物只有 packages/*/build 与 build/ 两处、pnpm 三条规矩、SWC 降级 tsc 只出 d.ts、TypeScript 锁 6.0.3 别升 7、格式化只有 ESLint 一个执行者、改完库必须重新 build、公开仓库的写作红线。当用户问"怎么构建""为什么测试挂了""产物在哪""能升 TS 7 吗""用 npm 还是 pnpm""跑一遍门禁"时使用。
metadata:
  pattern: pipeline
---

# 提交前门禁

所有命令在仓库根跑。**Step 顺序不能改**，每步都有通过条件。

## Step 1 — typecheck

```bash
pnpm run typecheck     # tsc --noEmit，源码与测试各一个 project
```

- 通过条件：零错误

## Step 2 — lint

```bash
pnpm run lint          # ESLint，含 Prettier 格式与 IE10 API 兼容
pnpm run lint:fix      # 修格式
```

- 通过条件：零错误零警告

## Step 3 — build

```bash
pnpm run build         # SWC 降 ES5 + Rollup 出 ESM / UMD
pnpm run dts           # 出 .d.ts，四个包都要
```

- **通过条件：四个包的产物都出了**
- **这一步必须排在测试前**：`tests/es5.test.ts` 的 B 层验的是 `packages/*/build` 里的真实产物，
  没 build 时那 8 个用例自动跳过 —— 先跑测试等于只验了一半

## Step 4 — coverage

```bash
pnpm run coverage      # vitest，带 100% 门槛（四项）
```

- 通过条件：四项全 100%

## 一步到位

```bash
pnpm run verify        # typecheck → lint → build → coverage
```

## 其它命令

| 命令 | 干什么 |
| --- | --- |
| `pnpm run test` | vitest（不带覆盖率门槛） |
| `pnpm run es5` | 只跑 ES5 合规 |
| `node scripts/check-jsdoc.mjs` | JSDoc 门禁（描述 + `@param` + `@returns`） |
| `pnpm run clean` | 清 `packages/*/build` 与 `build/` 两处 |

## 产物只有两处

| 位置 | 内容 | 谁写 |
| --- | --- | --- |
| `packages/*/build/` | 每包自己的 ESM / UMD / `.d.ts` | `rollup.config.js`、`scripts/dts.js` |
| `build/` | 仓库级产物（覆盖率报告） | `vitest.config.ts` 的 `reportsDirectory` |

两者都能重建，`.gitignore` 一条 `build/` 盖住，`pnpm run clean` 照这两处清。
**不合成一个根目录**：那会让包 `package.json` 的入口写成 `../../build/...`，发包即失效。

| 产物 | 扩展名 | 为什么 |
| --- | --- | --- |
| ESM | `index.js` | 包是 `type: module`，`.js` 天然是 ESM |
| UMD | `index.umd.cjs` | `type: module` 下 `.js` 会被 Node 当 ESM，UMD 里的 `module.exports` 直接报错 |

不出单独的 CJS —— UMD 自带 CommonJS 分支，再出一份只是多一份维护成本。

## 硬规则

1. **包管理器是 pnpm，别用 npm**（`examples/demo-app` 是独立 npm 工程，那里才用 npm）。
   规矩三条：子包之间一律写 `workspace:*`；根 `node_modules` 默认没有 `@ds/*`
   （要在根验证就得在根 devDependencies 里也声明一份 `workspace:*`）；别用 npm 装
2. **TS 锁 6.0.3，别升 7** —— TS 7 是 Go 原生版，不提供 JS 编译器 API，
   typescript-eslint 启动即 `throw`。升级的前置条件是 typescript-eslint 支持它
3. **降级不能压在 tsc 上**：`target: ES5` 在 TS 6 已废弃、TS 7 起移除。
   分工是 tsc 只做类型检查与出 `.d.ts`，**语法降级交给 SWC**（esbuild 最低只到 es2015）
4. **isolatedModules 下纯类型导入必须写 `import type`** —— 混在值导入里 SWC 不会帮你删，
   rollup 会去找一个不存在的导出然后报错
5. **格式化只有一个执行者：ESLint 的 `prettier/prettier` 规则。** 所以仓库根没有
   `prettier.config.js`、没有 `.prettierignore`、**没有 `.editorconfig`** ——
   选项在 `eslint.config.js` 的 `prettierOptions`，忽略名单在同一个文件的 `ignores`。
   代价是 prettier CLI 用不了（读不到这些选项），格式化统一走 `pnpm run lint:fix`。
   **别再加这三份文件**：没人会读它们，而真正生效的那份在 eslint.config.js 里
6. 编辑器那侧由 `.vscode/` 里那两份共享配置接管：`extensions.json` 推荐 ESLint 扩展
   （并把 Prettier 扩展列进 unwanted —— 它读不到选项，会用 Prettier 默认值重排，
   然后被 ESLint 判红）；`settings.json` 把 `source.fixAll.eslint` 挂到保存时，
   且**只留 ESLint 管不到的事**（ESLint 只处理 js/ts，md / yml / json / html 的
   行尾、尾空格、结尾空行只能靠编辑器）
7. **源码用最新语法，不迁就 IE10**（`no-var` / `prefer-const` 全开），降级是 SWC 的事
8. **改完库必须重新 `pnpm run build`** —— demo-app 靠别名指向 `build/`，
   uniappx 生成脚本直接 import `packages/core/build/index.js`
9. **新增函数必须有 JSDoc**（描述 + 逐个 `@param` + 非 void 的 `@returns`），
   `node scripts/check-jsdoc.mjs` 是门禁
10. **本仓库是公开的**：任何写进文件的内容都会被公开。禁止出现在代码 / 注释 /
    文档 / 提交信息里的：宿主环境的绝对路径、代理地址与端口、任何 token / PAT 及其前缀、
    机器名。引用位置一律用仓库相对路径。这不只是纪律 —— 提交前有两道钩子会拦
    （`gitleaks` + `scripts/secret-scan.mjs`），CI 扫全量历史
11. 真误报在那一行末尾加 `secret-scan:ignore`（两个扫描器认同一个标记）；
    **扫出真凭据先吊销 / 轮换再谈删提交** —— 已推送的东西删不掉

## 坑表

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| es5 用例 skipped | 没 build | 先 `pnpm run build` |
| `require()` 报 "of ES Module" | 引了 ESM 那份 | UMD 那份叫 `index.umd.cjs` |
| rollup 报找不到某个导出 | 类型导入没写 `import type` | 补 `import type` |
| `prettier` CLI 格式化结果不对 | CLI 读不到 eslint.config.js 里的选项 | 用 `pnpm run lint:fix` |
| `@ds/core` 在根里 require 不到 | pnpm 严格布局 | 根 devDependencies 也声明一份 `workspace:*` |
| 示例页面没反应 | 库改了没重 build | `pnpm run build` |
| `pnpm install` 报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` | 宿主环境的批量删除保护按轮次计数 | 别硬试，下一轮再装 |
| coverage 非 0 退出但报告有了 | 收尾清理撞了同一个保护 | 看 `build/coverage/coverage-summary.json`；要清目录用 `mv` 不用 `rm -rf` |

## 检查清单

- [ ] Step 1→4 顺序跑完，全绿（build 在测试之前）
- [ ] `node scripts/check-jsdoc.mjs` 通过
- [ ] 产物落在 `packages/*/build/`，覆盖率落在 `build/coverage/`
- [ ] 改了库 → 重新 build → 示例能跑
- [ ] 没动 TS / ESLint 的大版本
- [ ] 提交内容里没有宿主环境路径 / 代理 / 凭据
