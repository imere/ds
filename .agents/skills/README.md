# Agent Skills

给 AI Agent / 新人用的操作指南。每一份都是「触发条件 + 工作流 + 决策表 + 硬规则 + 坑表 +
检查清单」，不是说明文 —— 目标是照着做完一件事，不是读完懂一个设计。

出处是 `README.md`、`docs/architecture.md` 与各 `examples/` 下的
接入文档。**改了那些文档，对应的 Skill 也要跟着改。**

## 索引

| Skill | 什么时候读 |
| --- | --- |
| [ds-foundation](ds-foundation/SKILL.md) | **先读这份。** 判断新东西该放哪个包、令牌怎么流、怎么路由到下面的 Skill |
| [ds-core](ds-core/SKILL.md) | 用 `@ds/core`：令牌 → CSS、两层 class、前缀、派生、IE10 静态通道 |
| [ds-tokens](ds-tokens/SKILL.md) | 用或自建 `@ds/tokens`：官方那套值、六个必传参数、换成自己的设计语言 |
| [ds-dom](ds-dom/SKILL.md) | 用 `@ds/dom`：运行时注入、双通道、持久化、SSR、出口单位换算 |
| [ds-vue2](ds-vue2/SKILL.md) | 在 Vue 2 里接入：`$ds`、`v-ds-theme`、provide/inject |
| [ds-units](ds-units/SKILL.md) | 把 px 令牌换成 rem / vw / cqw，或排查「换了单位没生效」 |
| [ds-ie10](ds-ie10/SKILL.md) | 保证产物在 IE10 上能跑：三层检查怎么跑、什么能用什么不能用 |
| [ds-testing](ds-testing/SKILL.md) | 写测试 / 补覆盖率：100% 门槛、不可达分支、变异测试 |
| [ds-toolchain](ds-toolchain/SKILL.md) | 构建与仓库运维：verify 顺序、产物在哪、工具链版本红线 |
| [ds-token-import](ds-token-import/SKILL.md) | 从 Figma / W3C DTCG 导入设计稿令牌 |
| [ds-uniappx](ds-uniappx/SKILL.md) | 接到 uni-app x（uvue）：构建期生成、暗黑模式、ucss 限制 |
| [github-api-fallback](github-api-fallback/SKILL.md) | `github.com` 推不动时走 Git Data API 推送、用 contents 权限关 PR / 清告警、清查清单 |

## 三条总纲

1. **机制归 `@ds/core`，值归 `@ds/tokens`。** 换一套设计语言时要不要改？要改的是值。
2. **不替用户做设计决策。** 宁可参数必传、宁可抛错，不要加默认值兜底。
3. **集合会长大的，就别手写清单。** 语法用解析器、API 用 compat 数据、单位用系数查询。
