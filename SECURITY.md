# 安全策略

## 适用范围

本仓库（`ds-foundation`）是一组 **private workspace 包**，不发布到 npm，不出现在任何公开
制品里。它的运行时面很窄：四个包都不发网络请求、不读文件系统、不执行用户输入。

真正值得关注的只有两处，因为它们是**把字符串拼进 HTML / CSS** 的地方：

| 位置 | 输入来源 | 风险 |
| --- | --- | --- |
| `packages/core/src/output.ts` 的 CSS 生成 | 令牌的键与值 | 令牌值来自业务自己的配置，理论上可控；若把用户输入当令牌值写进来，可能截断声明 |
| `packages/dom/src/ssr.ts` 的 `getInitScript()` | 主题名、前缀 | 脚本内联进 `<head>`，字符串里必须转义 `</script`（已处理，见 `scripts/inline-examples.mjs`） |

如果你发现令牌值 / 前缀能把内容注入到 CSS 或内联脚本里，那是**真漏洞**，请按下节报告。

## 支持的版本

只维护 `main`。本仓库不打 tag、不发版（包是 private），所以「版本」就是提交 sha，
报告时请带上 sha。

## 报告方式

**不要开公开 issue。** 走私有安全公告：

<https://github.com/imere/ds/security/advisories/new>

也可以直接用仓库设置里的 "Report a vulnerability"。请附上：

1. 复现用的最小代码（一段 `createThemeManager` 调用就够）
2. 触发条件（需要什么令牌值 / 前缀 / 通道）
3. 影响面（是本地 DoS，还是能把内容写进别人的页面）

## 响应时间

目标：72 小时内确认收到，确认后两周内给出修法或明确的不修理由。
修完会在公告里公开（除非你要求匿名）。

## 依赖漏洞

- Dependabot 每周一扫 npm 与 GitHub Actions，PR 自动开。
- PR 上的 Dependency Review 会拦住带高危漏洞的新依赖。
- 全部依赖都是 devDependency，不进运行时产物 —— 所以依赖漏洞的影响面是**开发机与 CI**，
  不是最终用户。这不影响我们修的优先级排序：CI 上能执行的任何东西都算攻击面。
