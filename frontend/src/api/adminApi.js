import axiosClient from './axiosClient';

const adminApi = {
  // 1. OVERVIEW
  getOverviewSummary(params) {
    return axiosClient.get('/api/admin/overview', { params });
  },

  // 2. ACCOUNTS
  getAccounts(params) {
    return axiosClient.get('/api/admin/accounts', { params });
  },

  createAccount(payload) {
    return axiosClient.post('/api/admin/accounts', payload);
  },

  updateAccount(userId, payload) {
    return axiosClient.put(`/api/admin/accounts/${userId}`, payload);
  },

  toggleAccountStatus(userId, status) {
    return axiosClient.patch(`/api/admin/accounts/${userId}/status`, { status });
  },

  resetAccountPassword(userId) {
    return axiosClient.post(`/api/admin/accounts/${userId}/reset-password`);
  },

  // 3. ROLES & PERMISSIONS
  getRolesAndPermissions() {
    return axiosClient.get('/api/admin/roles-permissions');
  },

  updateRolePermissions(roleId, permissionIds) {
    return axiosClient.put(`/api/admin/roles/${roleId}/permissions`, { permissionIds });
  },

  assignAccountRole(userId, roleName) {
    return axiosClient.patch(`/api/admin/accounts/${userId}/role`, { roleName });
  },

  // 3B. HISTORICAL MIGRATION
  importHistoricalCustomers(csvContent) {
    return axiosClient.post('/api/admin/migration/import-customers', { csvContent });
  },

  // 4. SERVICES & MEDICINES
  getServices() {
    return axiosClient.get('/api/admin/services');
  },

  saveService(payload) {
    return payload.serviceId
      ? axiosClient.put(`/api/admin/services/${payload.serviceId}`, payload)
      : axiosClient.post('/api/admin/services', payload);
  },

  toggleServiceStatus(serviceId, status) {
    return axiosClient.patch(`/api/admin/services/${serviceId}/status`, { status });
  },

  getMedicines() {
    return axiosClient.get('/api/admin/medicines');
  },

  saveMedicine(payload) {
    return payload.medicineId
      ? axiosClient.put(`/api/admin/medicines/${payload.medicineId}`, payload)
      : axiosClient.post('/api/admin/medicines', payload);
  },

  toggleMedicineStatus(medicineId, status) {
    return axiosClient.patch(`/api/admin/medicines/${medicineId}/status`, { status });
  },

  // 5. REPORTS
  getReports(params) {
    return axiosClient.get('/api/admin/reports', { params });
  },

  // 6. AUDIT LOGS
  getAuditLogs(params) {
    return axiosClient.get('/api/admin/audit-logs', { params });
  },
};

export default adminApi;
