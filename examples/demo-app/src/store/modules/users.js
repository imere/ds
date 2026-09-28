import { fetchUsers, createUser } from '@/api/modules/users'

/**
 * 用户模块：演示 vuex + api 层的标准用法
 * 组件只 dispatch action，不直接接触 axios。
 */
const state = () => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '',
  loading: false,
  submitting: false,
  error: '',
  lastRequestId: '',
})

const mutations = {
  SET_LIST(state, { list, total, page, pageSize }) {
    state.list = list
    state.total = total
    state.page = page
    state.pageSize = pageSize
  },
  SET_QUERY(state, patch) {
    Object.keys(patch).forEach((k) => {
      if (state[k] !== undefined) state[k] = patch[k]
    })
  },
  SET_LOADING(state, v) {
    state.loading = v
  },
  SET_SUBMITTING(state, v) {
    state.submitting = v
  },
  SET_ERROR(state, msg) {
    state.error = msg
  },
  SET_REQUEST_ID(state, id) {
    state.lastRequestId = id
  },
}

const actions = {
  async load({ commit, state }) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', '')
    try {
      const res = await fetchUsers({
        page: state.page,
        pageSize: state.pageSize,
        keyword: state.keyword,
        status: state.status,
      })
      commit('SET_LIST', {
        list: res.list,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
      })
      commit('SET_REQUEST_ID', `req-${Date.now().toString(36)}`)
      return res
    } catch (err) {
      commit('SET_ERROR', err.message || '加载失败')
      throw err
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async add({ commit, dispatch }, payload) {
    commit('SET_SUBMITTING', true)
    try {
      const created = await createUser(payload)
      await dispatch('load')
      return created
    } finally {
      commit('SET_SUBMITTING', false)
    }
  },

  updateQuery({ commit, dispatch }, patch) {
    commit('SET_QUERY', patch)
    return dispatch('load')
  },

  resetQuery({ commit, dispatch }) {
    commit('SET_QUERY', { keyword: '', status: '', page: 1 })
    return dispatch('load')
  },
}

const getters = {
  isEmpty: (state) => !state.loading && state.list.length === 0,
}

export default { namespaced: true, state, mutations, actions, getters }
