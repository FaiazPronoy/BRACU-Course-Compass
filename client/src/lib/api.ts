import axios from 'axios';
import { logout } from '../redux/features/auth/authSlice';
import { store } from '../redux/store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && store.getState().auth.token) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
