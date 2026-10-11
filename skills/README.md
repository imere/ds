# 使用方 Skills

给**用 ds 的项目**用的操作指南。每一份都是「触发条件 + 工作流 + 决策表 + 硬规则 + 坑表 +
检查清单」，不是说明文 —— 目标是照着做完一件事，不是读完懂一个设计。

本目录可以整份搬到自己的项目里用：内容不依赖 ds 仓库的其他文件，只有
`ds-token-import`、`ds-uniappx` 两处举例时写了本仓库的脚本路径，搬走后换成你自己的即可。

出处是 ds 仓库的 `README.md`、`docs/architecture.md` 与各 `examples/` 下的接入文档。
**改了那些文档，对应的 Skill 也要跟着改。**

## 索引

| Skill | 什么时候读 |
| --- | --- |
| [ds-core](ds-core/SKILL.md) | 用 `@ds/core`：令牌 → CSS、两层 class、前缀、派生、IE10 静态通道 |
| [ds-tokens](ds-tokens/SKILL.md) | 用或自建 `@ds/tokens`：官方那套值、六个必传参数、换成自己的设计语言 |
| [ds-dom](ds-dom/SKILL.md) | 用 `@ds/dom`：运行时注入、双通道、持久化、SSR、出口单位换算 |
| [ds-vue2](ds-vue2/SKILL.md) | 在 Vue 2 里接入：`$ds`、`v-ds-theme`、provide/inject |
| [ds-units](ds-units/SKILL.md) | 把 px 令牌换成 rem / vw / cqw，或排查「换了单位没生效」 |
| [ds-token-import](ds-token-import/SKILL.md) | 从 Figma / W3C DTCG 导入设计稿令牌 |
| [ds-uniappx](ds-uniappx/SKILL.md) | 接到 uni-app x（uvue）：构建期生成、暗黑模式、ucss 限制 |

## 三条总纲

1. **机制归 `@ds/core`，值归 `@ds/tokens`。** 换一套设计语言时要改的是值，不是算法。
2. **不替用户做设计决策。** 宁可参数必传、宁可抛错，不要加默认值兜底。
3. **集合会长大的，就别手写清单。** 语法用解析器、API 用 compat 数据、单位用系数查询。

## 不在这里的那些

维护 ds 仓库本身用的 Skill（包怎么分层、构建与工具链、测试门禁、IE10 检查、仓库运维）
不在这里，在 ds 仓库的 `.agents/skills/` —— 那是给改库的人看的，用库的人不需要。
