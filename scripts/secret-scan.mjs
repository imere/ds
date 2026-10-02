/**
 * 零依赖密钥扫描器 —— 没装 gitleaks 的机器上的兜底
 * -------------------------------------------------------------
 * 主力是 gitleaks（150+ 条供应商规则，配置在 .gitleaks.toml）。这份脚本存在的意义
 * 是：没装 gitleaks 的机器也不至于裸奔。只用 node 内置模块 + 从 stdin 读 diff，
 * 所以任何环境都能直接跑，不需要装任何东西。
 *
 * 强度排序（决定了每一层能拦到什么）：
 *   1. GitHub Push Protection —— 服务端直接拒，跳过不了（公开仓库免费，见 SECURITY.md）
 *   2. gitleaks —— pre-commit / pre-push / CI 三处都跑
 *   3. 本脚本 —— 规则少一截，但零安装
 *
 * 客户端钩子永远能被 `--no-verify` 跳过；唯一跳不过的是 CI 与服务端保护，而 CI 跑的
 * 时候提交已经存在了。**所以只要扫出真凭据，第一件事是吊销 / 轮换**，删提交救不回来。
 *
 * 用法：
 *   node scripts/secret-scan.mjs                 扫工作树（默认）
 *   git diff --cached -U0 | node scripts/secret-scan.mjs --patch
 *   git log -p HEAD --not --remotes --diff-merges=first-parent -U0 \
 *     | node scripts/secret-scan.mjs --patch
 *   node scripts/secret-scan.mjs --quiet          只在失败时出声
 *
 * 上面两条 git 命令里每个参数都是承重的：
 *   - `HEAD` 必须显式写。`git log --not --remotes` 没有正向 rev，选出的是空集，
 *     于是对着一个真泄漏报「干净」—— 一个永远说通过的闸门比没有闸门更糟。
 *   - `--diff-merges=first-parent` 让 git 给合并提交也出 patch。不给的话，解冲突时
 *     写进去的东西（最容易漏的一种）根本到不了扫描器。
 *
 * `--patch` 从 stdin 读而不是自己调 git：某些 Windows 沙箱里 node 起不了 git 子进程
 * （spawnSync 报 EBUSY），而跑钩子的 shell 调 git 完全正常，所以让 shell 把 diff
 * 管道进来，本脚本保持零子进程。
 *
 * 消误报：在出问题的那一行末尾加 `secret-scan:ignore`（与 .gitleaks.toml 共用同一个
 * 标记，加一处同时消掉两个扫描器）。
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const IGNORE_MARKER = 'secret-scan:ignore'
const MAX_FILE_BYTES = 2 * 1024 * 1024

/** 兜底熵规则的阈值。4.3 bits/char 能捞到 base64 / hex 形态的密钥，又放得过普通标识符。 */
const ENTROPY_MIN = 4.3
const ENTROPY_MIN_LEN = 24

/** 无论 .gitignore 有没有写都跳过的目录名。 */
const ALWAYS_SKIP = new Set([
  'node_modules',
  '.git',
  'build',
  'dist',
  'coverage',
  '.workbuddy',
  '.husky',
  '.pnpm-store',
])

// 扫描器配置与扫描器自身天然长得像凭据，扫它们只会自伤；lock 文件巨大且里面是
// 完整性哈希而不是密钥，一并跳过。
const SKIP_FILES = new Set([
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  '.gitleaks.toml',
  'gitleaks.toml',
  'secret-scan.mjs',
  'secret-scan.js',
])

const SKIP_EXT =
  /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|eot|pdf|zip|gz|tgz|rar|7z|map|wasm|exe|dll|so|dylib)$/i

// 第三方源码与生成物：examples 下 vendored 了一份 vue 以便离线打开示例，
// standalone.html 是把整个库内联进去的自包含示例。两者都不是人写的代码，
// 扫它们只会得到误报（高熵的压缩产物、minify 过的变量名）。
const SKIP_PATH_RE = /(?:^|\/)vendor\/|(?:^|\/)standalone\.html$/

/** 看着像密钥其实是占位符的写法。 */
const PLACEHOLDER =
  /^(?:x{3,}|\*{3,}|your[-_]?\w*|example|placeholder|changeme|dummy|test|foo|bar|todo|none|null|undefined|\$\{[^}]+\}|\{\{.*\}\}|<[^>]+>|process\.env\..*|import\.meta\..*)$/i

const SECRETISH_NAME =
  '(?:secret|token|password|passwd|pwd|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|credential|auth)'

const RULES = [
  // --- GitHub（本仓库真实的凭据面）-------------------------------------------
  { id: 'github-fine-grained-pat', desc: 'GitHub 细粒度 PAT', re: /github_pat_[A-Za-z0-9_]{22,}/g },
  {
    id: 'github-classic-token',
    desc: 'GitHub classic token（ghp/gho/ghu/ghs/ghr）',
    re: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g,
  },

  // --- 云 / 基础设施 ----------------------------------------------------------
  { id: 'aws-access-key-id', desc: 'AWS access key id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: 'google-api-key', desc: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  {
    id: 'google-oauth-id',
    desc: 'Google OAuth client id',
    re: /\b\d{12}-[a-z0-9]{32}\.apps\.googleusercontent\.com\b/g,
  },

  // --- SaaS 供应商 ------------------------------------------------------------
  {
    id: 'stripe-access-token',
    desc: 'Stripe key',
    re: /\b(?:sk|rk)_(?:test|live|prod)_[A-Za-z0-9]{10,99}\b/g,
  },
  {
    id: 'openai-api-key',
    desc: 'OpenAI key',
    re: /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}\b|\bsk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}\b/g,
  },
  { id: 'anthropic-api-key', desc: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  {
    id: 'sendgrid-api-token',
    desc: 'SendGrid key',
    re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g,
  },
  { id: 'gitlab-pat', desc: 'GitLab PAT', re: /\bglpat-[A-Za-z0-9_-]{20,}\b/g },
  { id: 'slack-token', desc: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    id: 'slack-webhook',
    desc: 'Slack webhook URL',
    re: /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9_/]{20,}/g,
  },
  { id: 'twilio-key', desc: 'Twilio account/sk key', re: /\b(?:AC|SK)[0-9a-fA-F]{32}\b/g },
  { id: 'npm-token', desc: 'npm access token', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { id: 'telegram-bot-token', desc: 'Telegram bot token', re: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/g },
  {
    id: 'jwt',
    desc: 'JSON Web Token',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: 'private-key',
    desc: '私钥块',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g,
  },

  // --- 连接串里嵌的凭据 ------------------------------------------------------
  // 凭据是 URI 的一个组成部分，没有可识别的前缀，所以任何按前缀匹配的供应商规则
  // 都认不出它 —— 而这是真凭据进仓库最常见的形态之一。
  //
  // 注释里不写完整的示例：本文件自身也在被扫的范围内，一个像样的示例会被这条规则
  // 自己命中。
  {
    id: 'uri-credential',
    desc: '连接串里的 user:password@host',
    re: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?|mssql|ftp|https?):\/\/[^\s:/@]{1,64}:([^\s:@/]{3,})@/gi,
    captureGroup: 1,
  },
  {
    id: 'jdbc-credential',
    desc: 'JDBC URL 里的 password',
    re: /jdbc:[a-z0-9]+:[^\s]*?password=([^\s;&"']{3,})/gi,
    captureGroup: 1,
  },

  // --- 私有环境信息（不是凭据，但公开即泄漏）---------------------------------
  {
    id: 'local-absolute-path',
    desc: '带用户目录的本机绝对路径',
    re: /\b[a-zA-Z]:[\\/](?:users|home|temp)[\\/][^\\/\s'"]+/g,
  },
  {
    id: 'local-proxy-endpoint',
    desc: '本机代理 / 回环服务地址（排除 5199，那是 serve 脚本的示例端口）',
    re: /(?:https?:\/\/)?(?:127\.0\.0\.1|localhost|0\.0\.0\.0):(?!5199\b)\d{2,5}\b/gi,
  },
  { id: 'windows-machine-name', desc: 'Windows 机器名', re: /\bDESKTOP-[A-Z0-9]{4,15}\b/g },

  // --- 通用赋值 ---------------------------------------------------------------
  // 带引号和不带引号都收（`password: ...` 这种裸 YAML / env 写法漏过一整类），
  // 只认引号的版本当年就是这么漏的。
  {
    id: 'assigned-credential',
    desc: '赋给 key 形状名字的凭据字面量',
    re: new RegExp(
      SECRETISH_NAME +
        `["' ]{0,2}\\s*[:=]\\s*(?:"([^"\\s]{6,})"|'([^'\\s]{6,})'|([A-Za-z0-9+/=_-]{10,}))`,
      'gi'
    ),
    pickFirstDefined: true,
  },
]

/**
 * 极简 .gitignore 支持：够用来跳过 node_modules / build / .workbuddy 即可。
 *
 * 不做完整的 gitignore 语义（否定式、目录级继承），因为这里需要的只是「别去扫
 * 明显不该扫的地方」，完整语义交给 git 自己。
 *
 * @returns {string[]} 从 .gitignore 读到的、去掉注释与结尾斜杠的模式列表
 */
function loadGitignorePatterns() {
  const patterns = []
  const file = join(ROOT, '.gitignore')
  if (!existsSync(file)) return patterns
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    patterns.push(line.replace(/\/$/, ''))
  }
  return patterns
}

/**
 * 把 .gitignore 的模式编译成正则（支持 `*` 与 `**`，分隔符跨平台）。
 *
 * @returns {RegExp[]} 与路径片段匹配的正则数组
 */
function gitignoreMatchers() {
  return loadGitignorePatterns().map((p) => {
    const escaped = p
      .split(/[\\/]/)
      .map((seg) =>
        seg
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
      )
      .join('[/\\\\]')
    return new RegExp(`(^|[/\\\\])${escaped}([/\\\\]|$)`)
  })
}

const IGNORE_MATCHERS = gitignoreMatchers()

/**
 * 判断相对路径是否被 .gitignore 的模式命中。
 *
 * @param {string} relPath 相对仓库根的路径（用正斜杠）
 * @returns {boolean} 命中任一模式即为 true
 */
function isIgnored(relPath) {
  return IGNORE_MATCHERS.some((re) => re.test(relPath))
}

/**
 * 判断路径是否该跳过（文件名黑名单 / 二进制扩展名 / gitignore）。
 *
 * @param {string} relPath 相对仓库根的路径（用正斜杠）
 * @returns {boolean} 该跳过返回 true
 */
function isSkippedPath(relPath) {
  const base = relPath.split('/').pop() || relPath
  return (
    SKIP_FILES.has(base) || SKIP_EXT.test(base) || SKIP_PATH_RE.test(relPath) || isIgnored(relPath)
  )
}

/**
 * 计算字符串的香农熵（bits/char），用于兜底规则判断「像不像随机密钥」。
 *
 * @param {string} s 待计算的字符串
 * @returns {number} 熵值，空串返回 0
 */
function shannon(s) {
  const freq = new Map()
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1)
  let e = 0
  for (const n of freq.values()) {
    const p = n / s.length
    e -= p * Math.log2(p)
  }
  return e
}

/**
 * 判断一个长 token 是否明显不是密钥（重复字符、纯数字、单词、定长哈希、占位符）。
 *
 * @param {string} t 待判断的 token
 * @returns {boolean} 明显无害返回 true
 */
function isBenignToken(t) {
  if (/^(.)\1+$/.test(t)) return true // aaaaaaaa
  if (/^\d+$/.test(t)) return true // 长数字 id / 时间戳
  if (/^[a-z]+$/.test(t)) return true // 单个小写单词
  // 定长十六进制几乎总是内容哈希而不是密钥
  if (/^[0-9a-f]+$/.test(t) && (t.length === 32 || t.length === 40 || t.length === 64)) return true
  if (PLACEHOLDER.test(t)) return true
  return false
}

/**
 * 扫描一段文本，返回所有命中。
 *
 * 既跑具名规则，也跑一条兜底规则：够长、够随机、没有任何具名规则认得的 token。
 * 内部 / 自签发格式永远不会有人为它写规则，靠的就是这条 —— 代价是会有误报，
 * 所以阈值是照本仓库调过的。
 *
 * @param {string} text 待扫描的文本
 * @param {object} loc 这段文本的来源位置（`path`，patch 模式下额外带 `commit`）
 * @returns {Array<object>} 命中列表，每项含 path / line / rule / value
 */
function scanText(text, loc) {
  const hits = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (line.includes(IGNORE_MARKER)) return
    const at = { ...loc, line: index + 1 }

    for (const rule of RULES) {
      // 每行新建正则：`g` 标志的 lastIndex 不能跨行带过去
      const re = new RegExp(rule.re.source, rule.re.flags)
      for (const match of line.matchAll(re)) {
        let value
        if (rule.pickFirstDefined) value = match.slice(1).find((g) => g !== undefined)
        else if (rule.captureGroup) value = match[rule.captureGroup]
        else value = match[0]
        if (!value) continue
        if (PLACEHOLDER.test(value)) continue
        hits.push({ ...at, rule, value })
      }
    }

    for (const token of line.split(/[^A-Za-z0-9+/=_-]+/)) {
      if (token.length < ENTROPY_MIN_LEN) continue
      if (isBenignToken(token)) continue
      if (shannon(token) < ENTROPY_MIN) continue
      hits.push({
        ...at,
        rule: { id: 'high-entropy-token', desc: '长且高熵的 token（格式未知）' },
        value: token,
      })
    }
  })
  return hits
}

/**
 * 给命中值打码，报错信息里只留首尾几个字符。
 *
 * @param {string} value 原始命中值
 * @returns {string} 打码后的字符串
 */
function mask(value) {
  const v = String(value)
  return v.length <= 12 ? `${v.slice(0, 4)}***` : `${v.slice(0, 8)}***${v.slice(-4)}`
}

/**
 * 遍历工作树收集待扫文本（默认模式）。
 *
 * 跳过 ALWAYS_SKIP 目录、gitignore 命中的路径、黑名单文件与二进制文件。
 *
 * @returns {Array<{text: string, loc: {path: string}}>} 待扫目标列表
 */
function collectTree() {
  const out = []
  /**
   * 递归收集目录下未被跳过的文件（绝对路径 + 仓库相对路径）。
   *
   * @param {string} dir 要遍历的目录绝对路径
   * @returns {void} 结果写进外层 out 数组
   */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name)
      const rel = relative(ROOT, abs).split(sep).join('/')
      if (entry.isDirectory()) {
        if (ALWAYS_SKIP.has(entry.name) || isIgnored(rel)) continue
        walk(abs)
        continue
      }
      if (!entry.isFile() || isSkippedPath(rel)) continue
      out.push({ abs, rel })
    }
  }
  walk(ROOT)
  const targets = []
  for (const f of out) {
    let size
    try {
      size = statSync(f.abs).size
    } catch {
      continue
    }
    if (size > MAX_FILE_BYTES) continue
    const buf = readFileSync(f.abs)
    if (buf.includes(0)) continue // 二进制
    const text = buf.toString('utf8')
    if (text.includes('￿')) continue // 替换字符 => 不是合法文本
    targets.push({ text, loc: { path: f.rel } })
  }
  return targets
}

/**
 * 从 stdin 读 unified diff，只扫新增行。
 *
 * 两道闸门共用它，只是生产者不同：
 *   pre-commit : git diff --cached -U0
 *   pre-push   : git log -p HEAD --not --remotes --diff-merges=first-parent -U0
 *
 * 只扫新增行是刻意的：不是你写的行不可能是你漏的，顺带把噪音压下去。
 *
 * @returns {Array<{text: string, loc: {path: string, commit: string}}>} 待扫目标列表
 */
function collectPatch() {
  const patch = readFileSync(0, 'utf8')
  const chunks = new Map() // path -> { commit, lines[] }
  let commit = ''
  let path = ''
  for (const raw of patch.split('\n')) {
    if (raw.startsWith('commit ')) commit = raw.slice(7).trim().slice(0, 8)
    else if (raw.startsWith('+++ ')) path = raw.slice(4).trim().replace(/^b\//, '')
    else if (raw.startsWith('-'))
      continue // 删掉的行漏不了
    else if (raw.startsWith('+')) {
      if (!path || path === '/dev/null' || isSkippedPath(path)) continue
      if (!chunks.has(path)) chunks.set(path, { commit, lines: [] })
      chunks.get(path).lines.push(raw.slice(1))
    }
  }
  const targets = []
  for (const [p, { commit: c, lines }] of chunks) {
    targets.push({ text: lines.join('\n'), loc: { path: p, commit: c } })
  }
  // 空 diff 通常是「没东西可扫」，但也正好是一个写坏的 revision 表达式的产物 ——
  // 而这个故障是静默的。说出口，免得被当成干净结果。
  const sawCommitMarker = /^commit /m.test(patch)
  if (targets.length === 0 && !sawCommitMarker && patch.trim() !== '') {
    console.error('secret-scan: diff 里没有新增行 —— 实际上什么都没检查到。')
  }
  return targets
}

const argv = process.argv.slice(2)
const mode = argv.includes('--patch') ? 'patch' : 'tree'
const quiet = argv.includes('--quiet')

const targets = mode === 'patch' ? collectPatch() : collectTree()

const findings = []
for (const t of targets) {
  for (const hit of scanText(t.text, t.loc)) findings.push(hit)
}

if (findings.length > 0) {
  if (!quiet) {
    console.error('\n密钥扫描未通过 —— 拒绝继续。\n')
    for (const f of findings) {
      const where = f.commit ? `${f.commit}  ${f.path}` : `${f.path}:${f.line}`
      console.error(`  ${where}  [${f.rule.id}] ${f.rule.desc}`)
      console.error(`      ${mask(f.value)}`)
    }
    console.error(
      `\n${mode} 模式下共 ${findings.length} 处。误报就在那行末尾加 \`${IGNORE_MARKER}\`。\n` +
        '是真凭据就先吊销 / 轮换 —— 删掉提交并不能当作没泄漏过。\n'
    )
  }
  process.exit(1)
}

if (!quiet) {
  console.log(`secret-scan: ${mode} 模式，扫了 ${targets.length} 个目标，未发现密钥。`)
}
