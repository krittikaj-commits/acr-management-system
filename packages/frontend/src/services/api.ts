import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { DEMO_MODE, getMockResponse } from '@/services/mock-data';

/**
 * Axios API instance with auth token injection and 401 token refresh interceptor.
 *
 * Base URL defaults to /api/v1 (same-origin proxy in dev via Vite).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: inject access token from localStorage into Authorization header.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor: on 401, attempt token refresh once.
 * If refresh fails, clear tokens and redirect to login.
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Skip refresh for login/refresh endpoints themselves
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        clearAuthStorage();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data.data;

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthStorage();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

function clearAuthStorage(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

/**
 * Demo mode interceptor: catches network errors and returns mock data
 * so the app can be fully navigated without a real backend.
 */
if (DEMO_MODE) {
  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Only intercept network errors or 4xx/5xx when backend is unreachable
      const isNetworkError = !error.response;
      const isServerError = error.response && error.response.status >= 500;
      const is404 = error.response && error.response.status === 404;

      if (isNetworkError || isServerError || is404) {
        const url = error.config?.url;
        const method = error.config?.method;
        const mockData = getMockResponse(url, method);

        if (mockData) {
          // Return a fake successful response
          return Promise.resolve({
            data: mockData,
            status: 200,
            statusText: 'OK (Demo)',
            headers: {},
            config: error.config!,
          });
        }
      }

      return Promise.reject(error);
    },
  );
}

export default api;
