/**
 * uni-app x 接入：构建期令牌生成器
 * -------------------------------------------------------------
 * 为什么是构建期，不是运行时：
 *
 *   uni-app x 的 App 端分两种模式
 *     · VDOM 模式：逻辑层跑 UTS，编译成 Kotlin / Swift / ArkTS，
 *       这台机器里**没有 JS 引擎** —— @ds/core 的产物（ESM/UMD）压根没处执行
 *     · 蒸汽模式（HBuilderX 5.21+ Android / 5.11+ iOS / 5.0+ 鸿蒙）：
 *       逻辑层改成普通 js/ts，理论上能 import npm 库，
 *       但 uvue 的 App 端是原生渲染，**没有 document**，@ds/dom 的注入通道照样用不了
 *
 *   两个模式共同的硬约束是「注入 CSS 变量到根节点」这条路在 App 端不可靠：
 *   app-uvue 的 CSS 是 web 子集，样式不继承、选择器只认 class。
 *   所以主题值必须在别的地方落地 —— 构建期把令牌算好、落成文件，是最稳的一条。
 *
 *   这条路还有一个附带好处：@ds/* 是 private workspace 包（依赖写的是 `workspace:*`），
 *   npm 装不进来。构建期脚本直接从文件路径 import 产物，绕开了整条依赖链。
 *
 * 用法（在本仓库根目录或任意位置）：
 *   node examples/uniappx/gen-tokens.mjs
 * 产物落在 examples/uniappx/generated/
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const corePath = resolve(here, '../../packages/core/dist/index.js')
const tokensPath = resolve(here, '../../packages/tokens/dist/index.js')

// node:https 之外，Windows 下动态 import 绝对路径必须转成 file:// URL
const core = await import(pathToFileURL(corePath).href)
// 主题里的具体色值已经不在 core 里了 —— 机制在 @ds/core，值在 @ds/tokens
const tokens = await import(pathToFileURL(tokensPath).href)
const { lightTheme, darkTheme } = tokens
const { flattenTokens, resolveVars, toCssVars, toScopedCss, cssVarName, version } = core

const outDir = resolve(here, 'generated')
mkdirSync(outDir, { recursive: true })

const light = flattenTokens(lightTheme.tokens)
const dark = flattenTokens(darkTheme.tokens)

/**
 * 令牌表 -> CSS 变量名映射：color-bg-overlay -> --ds-color-bg-overlay
 * theme.json 由平台层注入，值是给渲染引擎直接用的，所以要把 var() 引用先解成实值
 */
const toVarMap = (flat) => {
  const resolved = resolveVars(flat)
  const map = {}
  Object.keys(resolved).forEach((key) => {
    map[cssVarName(key)] = resolved[key]
  })
  return map
}

const banner = (file) =>
  [
    '/* 由 examples/uniappx/gen-tokens.mjs 自动生成，请勿手改 */',
    `/* 来源：@ds/core v${version} */`,
    `/* 目标文件：${file} */`,
    '',
  ].join('\n')

// ---------------------------------------------------------------- 1. theme.json
// uni-app 的暗黑通道：manifest 里开 darkmode + 指定 themeLocation，
//  platforms 会按当前 appTheme 注入对应那套变量。只认 light / dark 两级。
const json = { light: toVarMap(light), dark: toVarMap(dark) }
writeFileSync(resolve(outDir, 'theme.json'), `${JSON.stringify(json, null, 2)}\n`)

// --------------------------------------------------- 2. ds-tokens.css（web / 小程序）
// 这两端有完整 DOM / 小程序样式环境，属性选择器和 prefers-color-scheme 都能用，
// 于是「切换一个属性 = 换肤」这套最省事的写法成立。
const webCss = [
  banner('web / 小程序：src/ds-tokens.css'),
  toCssVars(light, { selector: ':root, page' }),
  toScopedCss(dark, '[data-ds-theme="dark"]'),
  '@media (prefers-color-scheme: dark){',
  toCssVars(dark, { selector: ':root:not([data-ds-theme]), page:not([data-ds-theme])' }),
  '}',
].join('\n')
writeFileSync(resolve(outDir, 'ds-tokens.web.css'), `${webCss}\n`)

// ------------------------------------------------------- 3. ds-tokens.app.css
// App 端（ucss）只支持 class 选择器 —— 属性选择器和 :root 都不成立。
// 所以这里换成 .ds-theme-dark 一个类作用域。
// ⚠️ 前提是 App 端允许自定义属性沿着节点树向下穿透（实践上要先验证，见 README）。
// 若穿透不成立，请改用第 4 份产物里的「静态工具类」路线。
const appCss = [
  banner('uvue App 端：src/ds-tokens.app.css'),
  toCssVars(light, { selector: '.ds-theme-light' }),
  toCssVars(dark, { selector: '.ds-theme-dark' }),
].join('\n')
writeFileSync(resolve(outDir, 'ds-tokens.app.css'), `${appCss}\n`)

// ------------------------------------------------------------- 4. ds-tokens.uts
// UTS 逻辑层要用的色值：canvas / Draw API / uni API 传值时编译期就要拿到字符串。
// 生成的是普通常量，不涉及 UTSJSONObject 的语义差异，是最保险的形态。
const camel = (key) =>
  `ds${key
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`

const resolvedLight = resolveVars(light)
const uts = [
  banner('UTS 逻辑层：src/theme/ds-tokens.uts'),
  Object.keys(resolvedLight)
    .map((key) => `export const ${camel(key)} = '${String(resolvedLight[key])}'`)
    .join('\n'),
].join('\n')
writeFileSync(resolve(outDir, 'ds-tokens.uts'), `${uts}\n`)

console.log('生成完毕 ->', outDir)
console.log('  light / dark 令牌数：', Object.keys(light).length, '/', Object.keys(dark).length)
console.log('  theme.json            uni-app 暗黑通道（light / dark 两级）')
console.log('  ds-tokens.web.css     web / 小程序：属性选择器 + prefers-color-scheme')
console.log('  ds-tokens.app.css     uvue App 端：class 选择器')
console.log('  ds-tokens.uts         UTS 逻辑层的色值常量')
