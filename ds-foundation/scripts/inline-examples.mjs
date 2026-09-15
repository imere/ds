/**
 * 生成自包含单文件示例：examples/<name>/standalone.html
 * -------------------------------------------------------------
 * 为什么要这个：
 *   · 预览面板会把单个 HTML 复制到临时目录再打开，相对路径 ../.. 全断
 *   · 后台静态服务有存活上限，刷新一次就 404
 *   · 单文件可以直接发给别人、丢进 UAT 环境、用 file:// 打开
 *
 * 把本地 <script src> 直接内联进 HTML。注意一个坑：
 * core 的 getInitScript() 产物里含 "</script>" 字符串，
 * 原样内联会把标签提前闭合、后面的 JS 全变成文本。
 * 所以内联前统一把 </script 转义成 <\/script（在 JS 字符串里等价）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

var root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
var targets = ['umd', 'vue2']

function escapeClosingTag(code) {
  return code.replace(/<\/script/gi, '<\\/script')
}

targets.forEach(function (name) {
  var dir = path.join(root, 'examples', name)
  var src = path.join(dir, 'index.html')
  if (!fs.existsSync(src)) return

  var html = fs.readFileSync(src, 'utf8')
  var count = 0

  html = html.replace(/<script src="([^"]+)"><\/script>/g, function (all, href) {
    if (/^(https?:)?\/\//.test(href)) return all
    var file = path.resolve(dir, href)
    if (!fs.existsSync(file)) {
      process.stdout.write('  [跳过] 找不到 ' + href + '\n')
      return all
    }
    count++
    return '<script>' + escapeClosingTag(fs.readFileSync(file, 'utf8')) + '</script>'
  })

  var out = path.join(dir, 'standalone.html')
  fs.writeFileSync(out, html, 'utf8')
  var kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)
  process.stdout.write('  ' + name + '/standalone.html  ' + kb + ' KB（内联 ' + count + ' 个脚本）\n')
})

process.stdout.write('\nESM 示例不生成单文件：原生 ES Module 在 file:// 下必被 CORS 拦，' + '只能走 pnpm run serve。\n')
