/**
 * 清掉所有产物，重新构建前用
 * -------------------------------------------------------------
 * 两类产物，两处位置：
 *   packages/*\/build   每个包自己的 ESM / UMD / d.ts
 *   build/              仓库级的产物（覆盖率等，见 vitest.config.ts）
 * 所以这里两个都要清，否则「跑一次 coverage、改代码、再跑」会拿到上一次的报告。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const pkgs = ['core', 'tokens', 'dom', 'vue2']

const dirs = pkgs.map((name) => path.resolve(root, `../packages/${name}/build`))
// 仓库级产物目录（覆盖率）
dirs.push(path.resolve(root, '../build'))

let cleaned = 0
dirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    cleaned += 1
    console.log('cleaned', dir)
  }
})

if (!cleaned) console.log('nothing to clean')
