import axios from 'axios';
import { ENDPOINTS } from './endpoints';

const persistTokensFromRefresh = (payload) => {
  if (payload?.accessToken) {
    localStorage.setItem('accessToken', payload.accessToken);
  }
  if (payload?.refreshToken) {
    localStorage.setItem('refreshToken', payload.refreshToken);
  }
};

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

const PUBLIC_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/oauth',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/refresh',
  '/api/v1/public/',
];

const isPublicEndpoint = (url = '') =>
  PUBLIC_ENDPOINTS.some((pub) => url.includes(pub));

axiosClient.interceptors.request.use(
  function (config) {
    if (!isPublicEndpoint(config.url)) {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

let isSessionExpiredHandled = false;
let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

const handleSessionExpired = () => {
  if (isSessionExpiredHandled) return;
  isSessionExpiredHandled = true;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');

  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    window.location.replace('/login?reason=session_expired');
  }

  setTimeout(() => { isSessionExpiredHandled = false; }, 2000);
};

const tryRefreshSession = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('NO_REFRESH_TOKEN');
  }

  const response = await axios.post(
    `${axiosClient.defaults.baseURL}${ENDPOINTS.AUTH.REFRESH}`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const payload = response.data?.data ?? response.data;
  persistTokensFromRefresh(payload);
  return payload?.accessToken;
};

axiosClient.interceptors.response.use(
  function (response) {
    if (response.config?.responseType === 'blob') {
      return response.data;
    }
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async function (error) {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    if (
      status === 401 &&
      !isPublicEndpoint(requestUrl) &&
      !originalRequest?._retry &&
      !requestUrl.includes(ENDPOINTS.AUTH.REFRESH)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((queueError) => Promise.reject(queueError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await tryRefreshSession();
        processRefreshQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        handleSessionExpired();
      } finally {
        isRefreshing = false;
      }
    }

    let customError = {
      message: 'Lỗi hệ thống không xác định',
      status: 500,
      data: null
    };

    if (error.response) {
      customError.status = error.response.status;
      customError.data = error.response.data;
      const apiError = error.response.data?.error;
      if (apiError) {
        customError.code = apiError.code;
        customError.message = apiError.message || customError.message;
      } else if (error.response.data && error.response.data.message) {
        customError.message = error.response.data.message;
      } else {
        switch (error.response.status) {
          case 400: customError.message = 'Dữ liệu không hợp lệ'; break;
          case 401: customError.message = 'Vui lòng đăng nhập lại'; break;
          case 403: customError.message = 'Bạn không có quyền thực hiện thao tác này'; break;
          case 404: customError.message = 'Không tìm thấy dữ liệu'; break;
          case 422: customError.message = 'Lỗi ràng buộc dữ liệu'; break;
          case 500: customError.message = 'Lỗi hệ thống backend'; break;
          default: customError.message = 'Lỗi không xác định';
        }
      }

      if (
        error.response.status === 401 &&
        !isPublicEndpoint(error.config?.url) &&
        originalRequest?._retry
      ) {
        handleSessionExpired();
      }
    } else if (error.request) {
      customError.message = 'Không thể kết nối đến server';
    }

    return Promise.reject(customError);
  }
);

export default axiosClient;
