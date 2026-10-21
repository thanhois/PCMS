import axiosClient from './axiosClient';

/**
 * @typedef {Object} RoleDto
 * @property {number} roleId
 * @property {string} roleName
 * @property {string} description
 * @property {boolean} [active]
 */

/**
 * @typedef {Object} StaffAccountDto
 * @property {number} userId
 * @property {string} username
 * @property {string} fullName
 * @property {string} email
 * @property {string} phoneNumber
 * @property {'ACTIVE'|'INACTIVE'} status
 * @property {number} roleId
 * @property {string} roleName
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ServiceCatalogDto
 * @property {number} serviceId
 * @property {string} serviceName
 * @property {string} description
 * @property {number} price
 * @property {'ACTIVE'|'INACTIVE'} status
 */

/**
 * @typedef {Object} MedicineCatalogDto
 * @property {number} medicineId
 * @property {string} medicineName
 * @property {string} unit
 * @property {number} unitPrice
 * @property {'ACTIVE'|'INACTIVE'} status
 * @property {number} minThreshold
 * @property {number} totalStock
 * @property {string|null} nearestExpirationDate
 */

/**
 * @typedef {Object} AuditLogDto
 * @property {number} logId
 * @property {string} actionTime
 * @property {number} userId
 * @property {string} username
 * @property {string} fullName
 * @property {string} actionType
 * @property {string} targetEntity
 * @property {string} actionDetails
 */

const adminApi = {
  //  1. OVERVIEW
  getOverviewSummary(params) {
    return axiosClient.get('/api/admin/overview', { params });
  },

  //  2. ACCOUNTS
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

  assignAccountRole(userId, roleName) {
    return axiosClient.patch(`/api/admin/accounts/${userId}/role`, { roleName });
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
