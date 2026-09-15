/**
 * 生成 .d.ts 并分发到各包 dist/
 * -------------------------------------------------------------
 * SWC 只做转译、不做类型检查，类型由 tsc 负责：
 *   tsc -p tsconfig.build.json  ->  .types/<pkg>/src/*.d.ts
 *   再复制到                       packages/<pkg>/dist/
 *
 * 为什么不直接让 tsc 输出到 dist：rootDir 必须是 packages 才能一次性编译三个包，
 * 于是产物天然带一层 <pkg>/src/ 目录，最后摊平搬运一步最省事。
 *
 * 跨包引用（@ds/dom 引用 @ds/core）在 d.ts 里保留为包名导入，
 * 不会内联，所以消费方装哪个包就解析哪个包的类型，互不干扰。
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

var root = process.cwd()
var tmp = path.resolve(root, '.types')

if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true })

execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], {
  stdio: 'inherit',
})

var pkgs = ['core', 'dom', 'vue2']
var out = []

pkgs.forEach(function (p) {
  var from = path.join(tmp, p, 'src')
  var to = path.resolve(root, 'packages', p, 'dist')
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true })

  var files = fs.readdirSync(from).filter(function (f) {
    return f.endsWith('.d.ts')
  })

  files.forEach(function (f) {
    fs.copyFileSync(path.join(from, f), path.join(to, f))
  })

  out.push('@ds/' + p + '  ->  ' + files.length + ' 个 d.ts：' + files.join(', '))
})

fs.rmSync(tmp, { recursive: true, force: true })

out.push('')
out.push('已清理临时目录 .types')
process.stdout.write(out.join('\n') + '\n')
