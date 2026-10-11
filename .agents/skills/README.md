# Agent Skills（维护本仓库）

给 AI Agent / 新人用的操作指南，**范围是维护 ds 仓库本身**：包怎么分层、构建与工具链、
测试门禁、IE10 检查、仓库运维。每一份都是「触发条件 + 工作流 + 决策表 + 硬规则 + 坑表 +
检查清单」，不是说明文 —— 目标是照着做完一件事，不是读完懂一个设计。

**用 ds 的项目**该看的是仓库根的 `skills/`，那边是 `@ds/*` 的用法；本目录是改这个库的人才需要的。

出处是本仓库的 `README.md`、`docs/architecture.md` 与 `CONTRIBUTING.md`。
**改了那些文档，对应的 Skill 也要跟着改。**

## 索引

| Skill | 什么时候读 |
| --- | --- |
| [ds-foundation](ds-foundation/SKILL.md) | **先读这份。** 判断新东西该放哪个包、令牌怎么流、覆盖优先级、为什么不做某些功能 |
| [ds-toolchain](ds-toolchain/SKILL.md) | 构建与仓库运维：verify 顺序、产物在哪、工具链版本红线 |
| [ds-testing](ds-testing/SKILL.md) | 写测试 / 补覆盖率：100% 门槛、不可达分支、变异测试 |
| [ds-ie10](ds-ie10/SKILL.md) | 保证产物在 IE10 上能跑：三层检查怎么跑、什么能用什么不能用 |
| [github-api-fallback](github-api-fallback/SKILL.md) | `github.com` 推不动时走 Git Data API 推送、用 contents 权限关 PR / 清告警、清查清单 |

## 三条总纲

1. **机制归 `@ds/core`，值归 `@ds/tokens`。** 换一套设计语言时要改的是值。
2. **不替用户做设计决策。** 宁可参数必传、宁可抛错，不要加默认值兜底。
3. **集合会长大的，就别手写清单。** 语法用解析器、API 用 compat 数据、单位用系数查询。
