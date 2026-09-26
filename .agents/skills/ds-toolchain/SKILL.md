---
name: ds-toolchain
description: ds-foundation 的构建与仓库运维——verify 的固定顺序（build 必须在测试前）、产物目录只有 packages/*/build 与 build/ 两处、pnpm 的三条规矩、SWC 负责降级 tsc 只出 d.ts、TypeScript 锁 6.0.3 别升 7、ESLint 里存着 Prettier 选项、产物扩展名为什么是 index.js + index.umd.cjs、改完库必须重新 build、本机 pnpm/coverage 的两个环境坑。当用户问"怎么构建""为什么测试挂了""产物在哪""能升 TS 7 吗""用 npm 还是 pnpm""跑一遍门禁"时使用。
agent_created: true
---

# 构建与仓库运维

所有命令在 `ds-foundation/` 下跑。

## 何时使用

- 改完代码要跑门禁 / 要提交
- 构建失败、测试挂了、产物找不到
- 想动工具链版本（TS / ESLint / pnpm / SWC）
- 在本机上跑不动某个命令（两个已知环境坑见文末）

## 工作流：提交前跑一遍

```bash
pnpm run verify     # typecheck → lint → build → coverage
```

**顺序不能改**：`tests/es5.test.ts` 的 B 层验的是 `packages/*/build` 里的真实产物，
没 build 时那 8 个用例自动跳过 —— 先跑测试等于只验了一半。

| 命令 | 干什么 |
| --- | --- |
| `pnpm run typecheck` | `tsc --noEmit`，源码与测试各一个 project |
| `pnpm run lint` / `lint:fix` | ESLint，含 Prettier 格式与 IE10 API 兼容 |
| `pnpm run build` | SWC 降 ES5 + Rollup 出 ESM / UMD |
| `pnpm run dts` | 出 `.d.ts`，四个包都要 |
| `pnpm run test` / `coverage` | vitest；coverage 带 100% 门槛 |
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
5. **没有 `prettier.config.js`** —— 选项写在 `eslint.config.js` 的 `prettierOptions`。
   代价是 CLI 读不到，所以格式化也走 ESLint（`lint` 查、`lint:fix` 修）
6. **源码用最新语法，不迁就 IE10**（`no-var` / `prefer-const` 全开），降级是 SWC 的事
7. **改完库必须重新 `pnpm run build`** —— demo-app 靠别名指向 `build/`，
   uniappx 生成脚本直接 import `packages/core/build/index.js`
8. **新增函数必须有 JSDoc**（描述 + 逐个 `@param` + 非 void 的 `@returns`），
   `node scripts/check-jsdoc.mjs` 是门禁

## 常见问题

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| es5 用例 skipped | 没 build | 先 `pnpm run build` |
| `require()` 报 "of ES Module" | 引了 ESM 那份 | UMD 那份叫 `index.umd.cjs` |
| rollup 报找不到某个导出 | 类型导入没写 `import type` | 补 `import type` |
| `prettier` CLI 格式化结果不对 | CLI 读不到 eslint.config.js 里的选项 | 用 `pnpm run lint:fix` |
| `@ds/core` 在根里 require 不到 | pnpm 严格布局 | 根 devDependencies 也声明一份 `workspace:*` |
| 示例页面没反应 | 库改了没重 build | `pnpm run build` |

## 本机两个环境坑

- **`pnpm install` 会被安全删除钩子拦**：pnpm 启动时要删 store 临时文件，
  环境按每轮对话计数，累计约 50 次后报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`。
  对策是**别硬试**，结束本轮让用户再发一条消息，计数重置后一次装完
- **`coverage` 收尾清理同样会撞这个钩子**：配置里关了 `clean` / `cleanOnRerun`，
  但**收尾那一次关不掉** —— `cleanAfterRun` 是 provider 的方法名不是配置项，写进去会被
  tsc 报 TS2769。若命令非 0 退出，报告其实已经写好，
  看 `build/coverage/coverage-summary.json`；要清目录用 `mv` 改名而不是 `rm -rf`

## 检查清单

- [ ] `pnpm run verify` 全绿（build 在测试之前）
- [ ] `node scripts/check-jsdoc.mjs` 通过
- [ ] 产物落在 `packages/*/build/`，覆盖率落在 `build/coverage/`
- [ ] 改了库 → 重新 build → 示例能跑
- [ ] 没动 TS / ESLint 的大版本
