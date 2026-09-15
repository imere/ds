/**
 * 业务接口模块
 * 只依赖 client，mock / real 切换对这一层完全透明。
 */
import client from '../client'

export function fetchUsers(params = {}) {
  return client.get('/users', { params })
}

export function fetchUser(id) {
  return client.get(`/users/${id}`)
}

export function createUser(payload) {
  return client.post('/users', payload)
}

export function fetchMetrics() {
  return client.get('/metrics')
}

export function fetchActivities() {
  return client.get('/activities')
}
