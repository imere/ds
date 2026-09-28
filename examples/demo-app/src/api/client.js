import axios from 'axios'
import { apiState } from './config'
import { mockAdapter } from './mock/adapter'

/**
 * axios 实例
 * 统一处理：baseURL、超时、鉴权头、请求标识、错误归一化、401 处理。
 * mock 模式下把 adapter 换成内存实现，请求根本不会发出网络。
 */
const client = axios.create({
  baseURL: apiState.baseURL,
  timeout: apiState.timeout,
  headers: { 'Content-Type': 'application/json' },
})

/** 根据当前模式动态选择 adapter（mock 不发网络请求） */
export function applyAdapter() {
  client.defaults.adapter = apiState.mode === 'mock' ? mockAdapter : undefined
}
applyAdapter()

let requestSeq = 0

client.interceptors.request.use(
  (config) => {
    requestSeq += 1
    config.metadata = { startedAt: Date.now() }
    config.headers['X-Request-Id'] = `req-${Date.now().toString(36)}-${requestSeq}`

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('aurora-ds:token') : null
    if (token) config.headers.Authorization = `Bearer ${token}`

    return config
  },
  (error) => Promise.reject(error),
)

/** 把各类错误统一成 { code, message, status, raw } */
export function normalizeError(error) {
  if (error && error.__normalized) return error

  const normalized = { __normalized: true }

  if (error.response) {
    const { status, data } = error.response
    normalized.status = status
    normalized.code = (data && data.code) || `HTTP_${status}`
    normalized.message =
      (data && (data.message || data.error)) ||
      (status === 401
        ? '登录状态已失效，请重新登录'
        : status === 403
          ? '没有权限执行该操作'
          : status === 404
            ? '请求的资源不存在'
            : status >= 500
              ? '服务器开小差了，请稍后再试'
              : '请求失败，请重试')
    normalized.data = data
  } else if (error.code === 'ECONNABORTED') {
    normalized.status = 0
    normalized.code = 'TIMEOUT'
    normalized.message = '请求超时，请检查网络后重试'
  } else if (error.request) {
    normalized.status = 0
    normalized.code = 'NETWORK'
    normalized.message = '网络连接失败，请检查网络后重试'
  } else {
    normalized.status = 0
    normalized.code = error.code || 'UNKNOWN'
    normalized.message = error.message || '发生未知错误'
  }

  normalized.raw = error
  return normalized
}

client.interceptors.response.use(
  (response) => {
    // 约定：后端返回 { code, data, message }，code=0 为成功
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
      return Promise.reject(
        normalizeError({
          response: { status: response.status, data: body },
          config: response.config,
        }),
      )
    }
    return body && typeof body === 'object' && 'data' in body ? body.data : body
  },
  (error) => {
    const normalized = normalizeError(error)
    if (normalized.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ds:unauthorized', { detail: normalized }))
    }
    return Promise.reject(normalized)
  },
)

export function setAuthToken(token) {
  if (typeof window === 'undefined') return
  if (token) window.localStorage.setItem('aurora-ds:token', token)
  else window.localStorage.removeItem('aurora-ds:token')
}

export default client
