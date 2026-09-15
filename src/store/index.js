import Vue from 'vue'
import Vuex from 'vuex'
import app from './modules/app'
import users from './modules/users'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: { app, users },
  strict: process.env.NODE_ENV !== 'production',
})
