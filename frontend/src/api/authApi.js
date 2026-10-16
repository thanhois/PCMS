import axiosClient from './axiosClient';

const authApi = {
  /**
   * POST /api/auth/register
   * Đăng ký tài khoản cho Pet Owner
   */
  register(payload) {
    return axiosClient.post('/api/auth/register', payload);
  },

  /**
   * POST /api/auth/login
   * Đăng nhập bằng Email/Username và Password
   */
  login(payload) {
    return axiosClient.post('/api/auth/login', payload);
  },

  /**
   * POST /api/auth/forgot-password
   * Yêu cầu gửi link đặt lại mật khẩu qua email
   */
  forgotPassword(payload) {
    return axiosClient.post('/api/auth/forgot-password', payload);
  },

  /**
   * POST /api/auth/reset-password
   * Đặt lại mật khẩu mới bằng token
   */
  resetPassword(payload) {
    return axiosClient.post('/api/auth/reset-password', payload);
  },

  /**
   * GET /api/auth/me
   * Lấy thông tin người dùng hiện tại từ Bearer token
   */
  getCurrentUser() {
    return axiosClient.get('/api/auth/me');
  },
};

export default authApi;
