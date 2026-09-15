/**
 * Mock Adapter（自定义 axios adapter）
 * -------------------------------------------------------------
 * 直接替换 axios 的 adapter，请求不会发出任何网络流量；
 * 切到真实后端只需 setApiMode('real')，业务代码零改动。
 */
import { apiState } from '../config'
import { users, metrics, activities } from './data'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseUrl(url = '') {
  const [path, query = ''] = url.split('?')
  return {
    path: path.replace(/^\/api/, '') || '/',
    query: Object.fromEntries(new URLSearchParams(query)),
  }
}

function buildResponse(config, data, status = 200) {
  return {
    data: { code: 0, data, message: 'ok' },
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
    request: { __mock: true },
  }
}

function fail(config, message, code = 'MOCK_ERROR', status = 500) {
  const error = new Error(message)
  error.config = config
  error.response = {
    status,
    data: { code, message },
    config,
  }
  return Promise.reject(error)
}

/** 路由表：[method, 正则, handler(config, ctx)] */
const routes = [
  [
    'get',
    /^\/users$/,
    (config, { query }) => {
      const page = Number(query.page || 1)
      const pageSize = Number(query.pageSize || 10)
      const keyword = (query.keyword || '').trim().toLowerCase()
      const status = query.status || ''

      let list = users.slice()
      if (keyword) {
        list = list.filter(
          (u) =>
            u.name.toLowerCase().includes(keyword) ||
            u.email.toLowerCase().includes(keyword) ||
            u.role.toLowerCase().includes(keyword),
        )
      }
      if (status) list = list.filter((u) => u.status === status)

      const start = (page - 1) * pageSize
      return {
        list: list.slice(start, start + pageSize),
        total: list.length,
        page,
        pageSize,
      }
    },
  ],
  ['get', /^\/users\/(\d+)$/, (config, { params }) => {
    const user = users.find((u) => String(u.id) === params[0])
    if (!user) return fail(config, '用户不存在', 'NOT_FOUND', 404)
    return user
  }],
  ['post', /^\/users$/, (config) => {
    const payload = JSON.parse(config.data || '{}')
    const created = {
      id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1001,
      name: payload.name || '未命名用户',
      email: payload.email || `user${Date.now()}@aurora.dev`,
      role: payload.role || '前端工程师',
      dept: payload.dept || '基础平台',
      status: 'invited',
      progress: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    users.unshift(created)
    return created
  }],
  ['get', /^\/metrics$/, () => metrics],
  ['get', /^\/activities$/, () => activities],
]

export function mockAdapter(config) {
  return (async () => {
    await delay(apiState.latency)

    if (Math.random() < apiState.failureRate) {
      return fail(config, '网络抖动，请求失败（mock 故障注入）', 'NETWORK', 0)
    }

    const { path, query } = parseUrl(config.url || '')
    const method = String(config.method || 'get').toLowerCase()

    for (const [m, pattern, handler] of routes) {
      if (m !== method) continue
      const match = path.match(pattern)
      if (!match) continue
      const result = await handler(config, { query, params: match.slice(1) })
      return buildResponse(config, result)
    }

    return fail(config, `未找到 mock 路由：${method.toUpperCase()} ${path}`, 'NOT_FOUND', 404)
  })().catch((error) => {
    // 让拒绝带上 config，供 axios 拦截器处理
    if (error && !error.config) error.config = config
    return Promise.reject(error)
  })
}

export default mockAdapter
