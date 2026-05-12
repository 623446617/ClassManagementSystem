import Vue from 'vue';
import Vuex from 'vuex';
import api from '../api';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    settings: {}
  },
  getters: {
    isLoggedIn: state => !!state.token,
    userRole: state => state.user?.role || '',
    userName: state => state.user?.realName || ''
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token;
      localStorage.setItem('token', token);
    },
    SET_USER(state, user) {
      state.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    CLEAR_AUTH(state) {
      state.token = '';
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    SET_SETTINGS(state, settings) {
      state.settings = settings;
    }
  },
  actions: {
    async login({ commit }, credentials) {
      const res = await api.auth.login(credentials);
      if (res.success) {
        commit('SET_TOKEN', res.data.token);
        commit('SET_USER', res.data.user);
      }
      return res;
    },
    logout({ commit }) {
      commit('CLEAR_AUTH');
    },
    async fetchSettings({ commit }) {
      const res = await api.settings.get();
      if (res.success) {
        commit('SET_SETTINGS', res.data);
      }
      return res;
    }
  }
});
