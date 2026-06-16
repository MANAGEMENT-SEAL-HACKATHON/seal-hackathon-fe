import axios from 'axios';

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

// Danh sách các endpoint public — KHÔNG đính kèm token
const PUBLIC_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/oauth',
];

const isPublicEndpoint = (url = '') =>
  PUBLIC_ENDPOINTS.some((pub) => url.includes(pub));

// Add a request interceptor
axiosClient.interceptors.request.use(
  function (config) {
    // Không gửi token cho các endpoint public (login, register, oauth)
    // để tránh bị JWT filter từ chối khi token cũ hết hạn
    if (!isPublicEndpoint(config.url)) {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// Tránh redirect nhiều lần khi nhiều request cùng nhận 401
let isSessionExpiredHandled = false;

const handleSessionExpired = () => {
  if (isSessionExpiredHandled) return;
  isSessionExpiredHandled = true;

  // Xóa toàn bộ thông tin xác thực
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');

  // Redirect về login với thông báo
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    window.location.replace('/login?reason=session_expired');
  }

  // Reset flag sau 2 giây để tránh block nếu user ở lại trang login
  setTimeout(() => { isSessionExpiredHandled = false; }, 2000);
};

// Add a response interceptor
axiosClient.interceptors.response.use(
  function (response) {
    // If backend wraps response in { code, message, data }, we return data
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  function (error) {
    // Standardize error handling
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

      // Khi nhận 401 từ protected endpoint → token hết hạn → đá ra login
      if (
        error.response.status === 401 &&
        !isPublicEndpoint(error.config?.url)
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
