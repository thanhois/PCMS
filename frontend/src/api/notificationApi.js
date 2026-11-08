import axiosClient from './axiosClient';

const notificationApi = {
  getMyNotifications() {
    return axiosClient.get('/api/notifications');
  },

  getUnreadCount() {
    return axiosClient.get('/api/notifications/unread-count');
  },

  markAsRead(notificationId) {
    return axiosClient.patch(`/api/notifications/${notificationId}/read`);
  },

  markAllAsRead() {
    return axiosClient.post('/api/notifications/read-all');
  },
};

export default notificationApi;
