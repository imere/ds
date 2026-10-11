# Agent Skills（维护本仓库）

给 AI Agent / 新人用的操作指南，**范围是维护 ds 仓库本身**：包怎么分层、构建与工具链、
测试门禁、IE10 检查、仓库运维。

**用 `@ds/*` 的项目**该看的是仓库根的 `skills/`，那边是用法；本目录是改这个库的人才需要的。

出处是本仓库的 `README.md`、`docs/architecture.md` 与 `CONTRIBUTING.md`。
**改了那些文档，对应的 Skill 也要跟着改。**

## 索引

每份都标了编写模式（`SKILL.md` 的 `metadata.pattern`）：

| Skill | 模式 | 什么时候读 |
| --- | --- | --- |
| [ds-foundation](ds-foundation/SKILL.md) | inversion | **先读这份。** 新东西该放哪个包（先问完三个阶段再决定）、令牌怎么流、为什么不做某些功能 |
| [ds-toolchain](ds-toolchain/SKILL.md) | pipeline | 提交前门禁：typecheck → lint → build → coverage，顺序不能改 |
| [ds-testing](ds-testing/SKILL.md) | reviewer | 审查测试与覆盖率：按严重性给结论、不可达分支、变异测试 |
| [ds-ie10](ds-ie10/SKILL.md) | reviewer | 审查 IE10 合规：三层检查怎么跑、什么能用什么不能用 |
| [github-api-fallback](github-api-fallback/SKILL.md) | pipeline | `github.com` 推不动时走 Git Data API 推送、用 contents 权限关 PR / 清告警 |

## 三种模式分别要求什么

- **inversion** —— 先按阶段把问题问完再动手，中间有硬性 gate，不许跳阶段直接开写
- **pipeline** —— 步骤有固定顺序，每步列出输入 / 动作 / 通过条件，不达标不往下走
- **reviewer** —— 加载检查清单逐条核对，按 error / warning / info 分组输出，
  每条要说清为什么（WHY），不只指出哪里不对（WHAT）
