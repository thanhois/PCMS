import axiosClient from './axiosClient';

const authApi = {
  register(payload) {
    return axiosClient.post('/api/auth/register', payload);
  },

  login(payload) {
    return axiosClient.post('/api/auth/login', payload);
  },

  forgotPassword(payload) {
    return axiosClient.post('/api/auth/forgot-password', payload);
  },

  resetPassword(payload) {
    return axiosClient.post('/api/auth/reset-password', payload);
  },

  changePassword(payload) {
    return axiosClient.post('/api/auth/change-password', payload);
  },

  updateProfile(payload) {
    return axiosClient.put('/api/auth/profile', payload);
  },

  getCurrentUser() {
    return axiosClient.get('/api/auth/me');
  },
};

export default authApi;
