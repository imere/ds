# 安全策略

## 适用范围

本仓库是**公开**的。四个包都是 private（不发布到 npm）、不出现在任何公开制品里，
运行时面很窄：不发网络请求、不读文件系统、不执行用户输入。

所以这里真正要防的不是「被人利用本库的代码」，而是**本仓库自己往外漏东西** ——
凭据、以及本机环境信息。下一节就是这件事的闸门。

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

## 凭据与私有信息：三道闸门

仓库公开之后，一次误提交就是一次永久泄漏 —— 历史重写也撤不回已经被 clone / fork
走的对象。所以「别把凭据提交进来」这件事不靠自觉，靠闸门：

| 闸门 | 泄漏发生了吗 | 能跳过吗 |
| --- | --- | --- |
| pre-commit（扫索引里的 diff） | 没有，对象还没建 | `--no-verify` |
| pre-push（扫正要发出去的提交） | 没有，还没到远端 | `--no-verify` |
| CI（扫全量历史） | **已经发生了 —— 先轮换** | 不能 |
| GitHub push protection（服务端） | 没有 | 不能，且会记审计日志 |

两道客户端钩子的存在意义是**让凭据根本进不了历史**；CI 是事后检测。服务端那道
在本仓库（公开）是免费的，在 Settings → Code security and analysis 里打开
**Secret scanning + Push protection** —— 它是唯一跳不过、也唯一不需要本机配合的一层。

除了凭据，闸门还拦三类「不是密钥但公开即泄漏」的私有环境信息：本机绝对路径、
本机代理地址、Windows 机器名。规则写在 `.gitleaks.toml` 与
`scripts/secret-scan.mjs`（后者是没装 gitleaks 时的零依赖兜底），两处共用同一个
静默标记：行尾加 `secret-scan:ignore`。

**扫出真凭据时：先吊销 / 轮换，再谈删提交。** 删提交只是让它在仓库里看不见，
不撤回已经泄漏的事实。

## 依赖漏洞

- Dependabot 每周一扫 npm 与 GitHub Actions，PR 自动开。
- PR 上的 Dependency Review 会拦住带高危漏洞的新依赖。
- 全部依赖都是 devDependency，不进运行时产物 —— 所以依赖漏洞的影响面是**开发机与 CI**，
  不是最终用户。这不影响我们修的优先级排序：CI 上能执行的任何东西都算攻击面。

### 已接受的依赖风险（有告警，但不修）

这几条会在 Dependabot 里长期挂着，**不是漏修**：

| 告警 | 包 | 为什么不修 |
| --- | --- | --- |
| GHSA-5j4c-8p2g-v4jx（low，ReDoS） | `vue` 2.7.x | 影响范围是 Vue 2 **全线**（修复只在 `3.0.0-alpha.0` 之后），而 `@ds/vue2` 的存在意义就是支持 Vue 2。本仓库里 vue 只是 devDependency（跑测试用），触发 ReDoS 需要攻击者可控的模板字符串，测试里不存在 |
| GHSA-g3ch-rx76-35fx（medium，XSS） | `vue-template-compiler` 2.7.x | 同上，只影响 Vue 2 全线，没有更高版本可升。它由 `@vue/test-utils@1` 引入（Vue 2 的测试工具没有 v2 以上），只在测试期用 |

判断依据是「**能不能升**」而不是「严不严重」：有补丁的就升，没补丁且只影响开发期的就记下来。
这三条会在 Dependabot 列表里一直显示 open —— 想让它不再提醒，在 Security → Dependabot alerts
里手动 dismiss（reason 选 tolerable risk）即可，理由同上。
升级路径也走完了 —— `examples/demo-app` 的 vite 5 / vitest 2 已不在维护线，
已升到 vite 7.3.5+ / vitest 4.1.11，并用 `overrides` 把 `js-beautify → glob`
钉到 10.5.0（10.4.x 有命令注入漏洞）。
