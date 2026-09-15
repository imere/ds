/**
 * API 模式配置
 * -------------------------------------------------------------
 * 一行切换：setApiMode('mock') / setApiMode('real')
 * 业务代码只依赖 src/api/modules/*，不感知当前用的是 mock 还是真实接口。
 */
import Vue from 'vue'

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiState = Vue.observable({
  mode: import.meta.env.VITE_API_MODE === 'real' ? 'real' : 'mock',
  baseURL: DEFAULT_BASE_URL,
  timeout: 12000,
  latency: 420, // mock 模式下的模拟网络延迟（ms）
  failureRate: 0, // mock 模式下的随机失败概率，用于演示错误态
})

export function setApiMode(mode) {
  if (mode !== 'mock' && mode !== 'real') return
  apiState.mode = mode
}

export function setApiConfig(patch = {}) {
  Object.keys(patch).forEach((key) => {
    if (apiState[key] !== undefined) apiState[key] = patch[key]
  })
}

export const isMock = () => apiState.mode === 'mock'

export default apiState
