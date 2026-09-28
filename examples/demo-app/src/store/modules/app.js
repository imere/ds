/** 应用层状态：导航、API 模式、全局加载计数 */
const state = () => ({
  sidebarOpen: false,
  commandOpen: false,
  apiMode: 'mock',
  loadingCount: 0,
  lastRequestId: '',
})

const mutations = {
  SET_SIDEBAR(state, open) {
    state.sidebarOpen = open
  },
  TOGGLE_SIDEBAR(state) {
    state.sidebarOpen = !state.sidebarOpen
  },
  SET_COMMAND(state, open) {
    state.commandOpen = open
  },
  SET_API_MODE(state, mode) {
    state.apiMode = mode
  },
  SET_LAST_REQUEST_ID(state, id) {
    state.lastRequestId = id
  },
  INCREMENT_LOADING(state) {
    state.loadingCount += 1
  },
  DECREMENT_LOADING(state) {
    state.loadingCount = Math.max(0, state.loadingCount - 1)
  },
}

const actions = {
  openSidebar({ commit }) {
    commit('SET_SIDEBAR', true)
  },
  closeSidebar({ commit }) {
    commit('SET_SIDEBAR', false)
  },
  toggleSidebar({ commit }) {
    commit('TOGGLE_SIDEBAR')
  },
  setApiMode({ commit }, mode) {
    commit('SET_API_MODE', mode)
  },
}

const getters = {
  isLoading: (state) => state.loadingCount > 0,
}

export default { namespaced: true, state, mutations, actions, getters }
