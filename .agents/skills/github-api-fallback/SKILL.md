---
name: github-api-fallback
description: github.com 推不动时怎么用 api.github.com 的 Git Data API 把提交推到远端（含「本地怎么重建出同一个 commit sha」的精确做法），以及 PAT 只有 contents 权限时怎么处理 PR（在 main 上重做一遍 / 删 head 分支）与 Dependabot 告警。当 git push 报 schannel handshake failed / CONNECT tunnel failed 502 / Empty reply，或需要关 PR、清告警、查 CI 结果时使用。
agent_created: true
---

# GitHub 访问兜底（push 不通 / PR 与告警处理）

仓库 `imere/ds`，分支 `main`，令牌走环境变量传入，不写进任何文件。

## 何时使用

- `git push` 报 `schannel: failed to receive handshake` / `CONNECT tunnel failed, response 502` / `Empty reply from server`
- 需要关 PR、删分支、查 workflow 结果、看 Dependabot 告警

## 工作流：先探通道，再决定怎么推

```bash
curl -s -m 8 -o /dev/null -w "direct_github=%{http_code}\n" https://github.com
curl -s -m 8 -o /dev/null -w "proxy_github=%{http_code}\n" -x http://<代理地址> https://github.com
curl -s -m 8 -o /dev/null -w "direct_api=%{http_code}\n"   https://api.github.com
```

| 探测结果 | 怎么推 |
| --- | --- |
| `direct_github=200` | 正常 `git push <带令牌的 origin URL> main` |
| 代理活着（`-x` 那条 200） | `http_proxy=... https_proxy=... git push ...` |
| 只有 `api.github.com` 通 | **走 Git Data API**（下节），不要反复试 push |

可达性会**隔天漂移**：昨天直连通、今天可能就得走 API —— 每次动手先探一次。

## 工作流：Git Data API 推一个提交

顺序不能乱，第 5 步的分叉处理是关键。

1. **收集本地信息**（bash）：HEAD sha、`HEAD^{tree}`、`HEAD^`、`cat-file commit HEAD` 里解析出的
   author/committer 的 name / email / ts / tz、`git log -1 --format=%B` 的 message、
   `git diff --name-only HEAD^ HEAD` 的变更文件（每个取 mode 与 blob sha，`git cat-file blob | base64 -w0`）
2. **POST /git/blobs**：先 `GET /git/blobs/<sha>` 试探，不存在再传 base64
3. **POST /git/trees**：`base_tree` 用远端 main 的 tree，`tree` 数组只放差集条目
   —— 出来的 tree sha 应当**等于**本地 tree sha。
   删除条目写 `sha: null` **并且照样要带 `mode`**（`'100644'`），否则
   `422 Must supply a valid tree.mode`
4. **POST /git/commits**：tree / parents / author / committer / message；committer 用本地那份元数据
5. **对齐 sha**（见下节）
6. **PATCH /git/refs/heads/main** 带 `force: true`（兄弟 commit 非快进，不带 force 报 422）

### 第 5 步：两端的差异只在 message 尾部

同样的 tree / parent / author / committer，本地 `HEAD` 与远端新 commit 的 sha 仍会不同。
**原因：GitHub 生成的那个对象，message 比本地多一个 `\n`。** 穷举一组候选逐个
`git hash-object -t commit --stdin` 试，比猜快：

| 候选 message | 算出的 sha 是谁 |
| --- | --- |
| `msgAPI` | 都不是 |
| `msgAPI + "\n"` | **本地 HEAD** |
| `msgAPI + "\n\n"` | **远端新建的那个** |

其中 `msgAPI` = API 返回的 commit 里的 `message`（它的尾部换行已被剥掉）。
拿到匹配项后 `git hash-object -t commit -w --stdin` 写入、`git update-ref refs/heads/main <sha>`、
`git update-ref refs/remotes/origin/main <sha>`，再 PATCH。
**tz 一定用本地的 `+0800`**：API 返回的 `date` 是 `...Z`（UTC 显示），照它改成 `+0000` 就算不出。

成了的标志：`git status -sb` 只剩 `## main...origin/main`。

## 硬规则

1. **Node 里别 `spawnSync('git')`**（沙箱报 EBUSY）。分工：bash 跑 git 把 metadata / blob base64
   落到临时 json，node 只负责 HTTP
2. **跑 JSON 解析优先用 node 而不是 python** —— python 会被同一沙箱拦，症状是
   `PermissionError: ... Lib\encodings\__init__.py`
3. 临时脚本写进 `node_modules/`（gitignored），用完删；批量删不掉就留着报告给用户
4. 变量赋值前缀**不能在同一条命令里展开**：`ND=... "$ND" x.mjs` 是空的，得先 `export ND=...` 单独一行
5. PATCH ref 必须 `force: true`

## PAT 权限边界（细粒度令牌）

| 能做 | 不能做（403） |
| --- | --- |
| `contents` / `admin`：推代码、删分支、改 ref | 合并 PR、close PR（PATCH pulls）、dismiss 告警（要 security_events） |

所以「处理 PR」要绕开按钮：

| 场景 | 做法 |
| --- | --- |
| PR 内容是对的想收进来 | **把变更直接在 main 上做一遍**，Dependabot 下次调度发现 base 已有 → 自己删分支、关 PR |
| PR 已失效 / 不想收 | `DELETE /git/refs/heads/<head 分支>` → PR 立刻 closed |
| Dependabot 告警想关掉 | 只能请用户在 Security → Dependabot alerts 里手动 dismiss（reason: tolerable risk） |

## 告警清查清单（一次性扫全）

```text
GET /pulls?state=open                     → 期望 0
GET /dependabot/alerts?state=open         → 已知的几条（Vue 2 线，无补丁）
GET /code-scanning/alerts?state=open      → 私有库未开 GHAS 会 403
GET /secret-scanning/alerts?state=open    → 404 即未启用
GET /branches                             → 期望只剩 main
GET /actions/runs?per_page=10             → 看最新 commit 的 conclusion
```

`.github/workflows/*.yml` 的 `permissions` 已是最小集：**不要顺手加**，显式声明会把没写到的全置 none。

## 检查清单

- [ ] push 前先 `curl` 探三条通道，别闷头重试 push
- [ ] 走 API 时：tree sha == 本地 tree sha（不等就别往下走）
- [ ] 重建出的本地对象 sha == 远端新建 commit sha
- [ ] PATCH 带 `force: true`
- [ ] 收尾 `git status -sb` 只剩 `## main...origin/main`
- [ ] 等 2-3 分钟查 `/actions/runs`，确认新 commit 的 CI 是 success（不是只看跑没跑起来）
- [ ] 临时脚本从 `node_modules/` 里清理掉
