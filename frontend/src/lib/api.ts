import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
});

// Request interceptor to inject Authorization Bearer token from Zustand
api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token || '');
    }
  });
  failedQueue = [];
};

// Response interceptor to manage 401 and silent refresh flow
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Reject immediately if no response or not a 401 Unauthorized
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Never intercept or retry the refresh-token request itself
    if (originalRequest.url && originalRequest.url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Limit retries to at most once per request to avoid infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue concurrent 401 requests until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject: (err: any) => {
            reject(err);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const { accessToken, user } = res.data.data;
      useAuthStore.getState().setAuth(accessToken, user);

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      // Dispatch custom event to notify React Router to redirect to login
      window.dispatchEvent(new CustomEvent('auth-session-expired'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

if (import.meta.env.DEV) {
  (window as any).__api = api;
}
