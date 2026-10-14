import axios from 'axios';
import { logout } from '../redux/features/auth/authSlice';
import { store } from '../redux/store';

// The API lives at /api/v1 on the same address as the site: Vite passes it
// through in development, and the server serves the built site in production.
// VITE_API_URL is only needed if the two are ever deployed apart.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// a rejected token means the session is over; clear it here once instead of
// in every page
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
