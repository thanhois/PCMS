import axios from 'axios';

/**
 * Lưu trữ JWT accessToken trực tiếp trong bộ nhớ (in-memory).
 */
let inMemoryAccessToken = null;
let unauthorizedCallback = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
};

export const getAccessToken = () => inMemoryAccessToken;

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
};

export const onUnauthorized = (callback) => {
  unauthorizedCallback = callback;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor: tự động đính kèm Authorization: Bearer <token> từ biến in-memory.
 */
axiosClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: xử lý tập trung lỗi trả về từ Backend (GlobalExceptionHandler).
 */
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Nếu token hết hạn hoặc không hợp lệ trên các API cần xác thực (trừ login)
    const requestUrl = error.config?.url || '';
    if (status === 401 && !requestUrl.includes('/api/auth/login')) {
      clearAccessToken();
      if (typeof unauthorizedCallback === 'function') {
        unauthorizedCallback();
      }
    }

    const normalizedError = {
      status: status || 0,
      message:
        data?.message ||
        (error.code === 'ERR_NETWORK'
          ? 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra Backend đã chạy chưa.'
          : 'Đã có lỗi xảy ra, vui lòng thử lại.'),
      fieldErrors: data?.fieldErrors || {},
    };

    return Promise.reject(normalizedError);
  }
);

export default axiosClient;
