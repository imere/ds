/**
 * 用法二：ESM（现代浏览器 / Vite / webpack / rollup）
 * -------------------------------------------------------------
 * 这里刻意用相对路径引 dist，所以不需要任何打包器，起个静态服务就能跑。
 * 真实工程里直接写裸包名即可：
 *   import { createThemeManager } from '@ds/dom'
 *   import { buildClassSheet, resolveVars } from '@ds/core'
 */

import {
  createRegistry,
  buildClassSheet,
  resolveVars,
  lightTheme,
  darkTheme,
  accents,
} from '../../packages/core/dist/index.js'
import { createThemeManager } from '../../packages/dom/dist/index.js'

const ds = createThemeManager({
  themes: { light: lightTheme, dark: darkTheme },
  accents,
  channel: 'auto',
  persist: true,
  followSystem: true,
})
ds.init()

const $ = (sel) => document.querySelector(sel)

function renderInfo() {
  const s = ds.state()
  const tokens = ds.tokens()
  $('#info').innerHTML = `
    <div><b>通道</b>：${s.channel}（${s.channel === 'vars' ? '写 CSS 变量' : '注入静态 CSS'}）</div>
    <div><b>主题</b>：${s.theme} / ${s.mode}　<b>强调色</b>：${s.accent || '未选'}</div>
    <div><b>令牌数</b>：${Object.keys(tokens).length}</div>
  `
}

/**
 * 体积对比 —— 这是 class 拆两层的全部理由。
 * IE10 通道下 semantic 必须每个主题复制一份，primitive 则只此一份。
 */
function renderSize() {
  const resolved = resolveVars(ds.tokens(), { prefix: 'ds' })
  const opts = { tokens: ds.tokens() }

  const modern = buildClassSheet({ ...opts, resolve: null })
  const staticLight = buildClassSheet({ ...opts, resolve: resolved })

  const kb = (s) => (new Blob([s]).size / 1024).toFixed(1) + ' KB'
  const rows = [
    ['primitive（主题无关）', kb(modern.primitive), '只 1 份'],
    ['semantic（现代，用 var()）', kb(modern.semantic), '只 1 份'],
    ['semantic（IE10，实值）', kb(staticLight.semantic), '每主题 1 份'],
  ]

  $('#size').innerHTML = rows
    .map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b><i>${r[2]}</i></div>`)
    .join('')
}

function bind() {
  document.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => ds.use(btn.dataset.theme))
  })
  $('#toggle').addEventListener('click', () => ds.toggle())
  $('#accent').addEventListener('change', (e) => ds.useAccent(e.target.value))
  $('#radius').addEventListener('input', (e) => {
    ds.override('radius-md', e.target.value + 'px')
  })
}

/** 顺手演示 core 可以脱离 DOM 单独用（SSR、构建期预生成都靠这个） */
function demoCoreOnly() {
  const registry = createRegistry()
  registry.theme('light', lightTheme)
  registry.theme('dark', darkTheme)
  registry.accent('green', accents.green)
  registry.use('dark')
  registry.useAccent('green')

  const flat = registry.resolve()
  const sheet = buildClassSheet({ tokens: flat, resolve: resolveVars(flat, { prefix: 'ds' }) })
  $('#ssr').textContent =
    `深色 + 青绿：解析出 ${Object.keys(flat).length} 个令牌，` +
    `静态 CSS 共 ${(new Blob([sheet.primitive + sheet.semantic]).size / 1024).toFixed(1)} KB`
}

bind()
ds.subscribe(renderInfo)
renderInfo()
renderSize()
demoCoreOnly()
