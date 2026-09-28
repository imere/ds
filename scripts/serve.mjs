/**
 * 极简静态服务：ESM 示例在 file:// 下会被 CORS 拦掉，用它起个 http。
 *   node scripts/serve.mjs 5199
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.argv[2] || 5199)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

http
  .createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0])
    if (url === '/') url = '/index.html'

    const file = path.join(root, url)
    if (file.indexOf(root) !== 0) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }

    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end(`404 ${url}`)
        return
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      res.end(buf)
    })
  })
  .listen(port, () => {
    process.stdout.write(`[ds] http://localhost:${port}/\n`)
    process.stdout.write(`[ds] UMD   http://localhost:${port}/examples/umd/\n`)
    process.stdout.write(`[ds] ESM   http://localhost:${port}/examples/esm/\n`)
    process.stdout.write(`[ds] Vue2  http://localhost:${port}/examples/vue2/\n`)
  })
