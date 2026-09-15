/** 清掉各包 dist，重新构建前用 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

var root = path.dirname(fileURLToPath(import.meta.url))
var pkgs = ['core', 'dom', 'vue2']

pkgs.forEach(function (name) {
  var dir = path.resolve(root, '../packages/' + name + '/dist')
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log('cleaned', dir)
  }
})
