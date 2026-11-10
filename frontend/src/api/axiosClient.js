import axios from 'axios';

/**
 * Lưu trữ JWT accessToken trực tiếp trong bộ nhớ (in-memory).
 */
const TOKEN_STORAGE_KEY = 'pcms_access_token';
const USER_STORAGE_KEY = 'pcms_auth_user';

let inMemoryAccessToken = (() => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
  } catch {
    return null;
  }
})();
let unauthorizedCallback = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage errors
  }
};

export const getAccessToken = () => inMemoryAccessToken;

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
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

const generateCorrelationId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

/**
 * Request Interceptor (Section 4.1.7):
 * - Tự động đính kèm Authorization: Bearer <token> từ biến in-memory
 * - Tự động sinh hoặc chuyển tiếp Correlation Identifier (X-Correlation-ID)
 */
axiosClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    if (!config.headers['X-Correlation-ID']) {
      config.headers['X-Correlation-ID'] = generateCorrelationId();
    }
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor (Section 4.1.5 & 4.1.7):
 * - Xử lý tập trung phiên làm việc hết hạn (401 clear token & callback)
 * - Chuẩn hóa phản hồi lỗi có stable errorCode, correlationId, user message và fieldErrors cho Form
 */
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const correlationId = data?.correlationId || error.response?.headers?.['x-correlation-id'] || null;

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
      errorCode: data?.errorCode || (status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'ACCESS_DENIED' : status === 404 ? 'RESOURCE_NOT_FOUND' : status === 409 ? 'STATE_CONFLICT' : 'INTERNAL_SERVER_ERROR'),
      correlationId: correlationId,
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
