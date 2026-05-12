import axios from 'axios';
import { message } from 'ant-design-vue';
import store from '../store';
import router from '../router';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
});

request.interceptors.request.use(
  config => {
    const token = store.state.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        store.dispatch('logout');
        router.push('/login');
        message.error('登录已过期，请重新登录');
      } else if (status === 403) {
        message.error('没有权限访问');
      } else {
        message.error(data.message || '请求失败');
      }
    } else {
      message.error('网络错误');
    }
    return Promise.reject(error);
  }
);

export default request;
