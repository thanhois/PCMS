import axiosClient from './axiosClient';

const vetApi = {
  // 1. Quản lý công việc & Ca khám
  getAppointments(params) {
    return axiosClient.get('/api/vet/appointments', { params });
  },

  getWorklistSummary(params) {
    return axiosClient.get('/api/vet/appointments/summary', { params });
  },

  updateAppointmentStatus(id, payload) {
    return axiosClient.patch(`/api/vet/appointments/${id}/status`, payload);
  },

  startExamination(id) {
    return axiosClient.post(`/api/vet/appointments/${id}/start`);
  },

  // 2. Quá trình khám & Bệnh sử Pet
  getPetMedicalHistory(petId) {
    return axiosClient.get(`/api/vet/pets/${petId}/history`);
  },

  updatePetVitals(petId, payload) {
    return axiosClient.patch(`/api/vet/pets/${petId}/vitals`, payload);
  },

  searchPets(query) {
    return axiosClient.get('/api/vet/pets/search', { params: { query } });
  },

  // 3. Quản lý Bệnh án
  getMedicalRecords(params) {
    return axiosClient.get('/api/vet/medical-records', { params });
  },

  getMedicalRecordDetail(recordId) {
    return axiosClient.get(`/api/vet/medical-records/${recordId}`);
  },

  createMedicalRecord(payload) {
    return axiosClient.post('/api/vet/medical-records', payload);
  },

  updateMedicalRecord(recordId, payload) {
    return axiosClient.put(`/api/vet/medical-records/${recordId}`, payload);
  },

  completeMedicalRecord(recordId, payload) {
    return axiosClient.post(`/api/vet/medical-records/${recordId}/complete`, payload);
  },

  cancelMedicalRecord(recordId, payload) {
    return axiosClient.post(`/api/vet/medical-records/${recordId}/cancel`, payload);
  },

  // 4. Chỉ định dịch vụ
  getAvailableServices() {
    return axiosClient.get('/api/vet/services');
  },

  getRecordServices(recordId) {
    return axiosClient.get(`/api/vet/medical-records/${recordId}/services`);
  },

  addServiceOrder(recordId, payload) {
    return axiosClient.post(`/api/vet/medical-records/${recordId}/services`, payload);
  },

  updateServiceOrder(recordId, detailId, payload) {
    return axiosClient.put(`/api/vet/medical-records/${recordId}/services/${detailId}`, payload);
  },

  deleteServiceOrder(recordId, detailId) {
    return axiosClient.delete(`/api/vet/medical-records/${recordId}/services/${detailId}`);
  },

  // 5. Kê đơn thuốc & Tái khám
  getAvailableMedicines() {
    return axiosClient.get('/api/vet/medicines');
  },

  getRecordPrescription(recordId) {
    return axiosClient.get(`/api/vet/medical-records/${recordId}/prescription`);
  },

  savePrescription(recordId, payload) {
    return axiosClient.post(`/api/vet/medical-records/${recordId}/prescription`, payload);
  },

  deletePrescription(recordId) {
    return axiosClient.delete(`/api/vet/medical-records/${recordId}/prescription`);
  },

  getRecordFollowUps(recordId) {
    return axiosClient.get(`/api/vet/medical-records/${recordId}/follow-ups`);
  },

  createFollowUp(recordId, payload) {
    return axiosClient.post(`/api/vet/medical-records/${recordId}/follow-ups`, payload);
  },

  deleteFollowUp(followUpId) {
    return axiosClient.delete(`/api/vet/follow-ups/${followUpId}`);
  },
};

export default vetApi;
