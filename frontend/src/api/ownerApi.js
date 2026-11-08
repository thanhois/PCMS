import axiosClient from './axiosClient';

const ownerApi = {
  getMyPets() {
    return axiosClient.get('/api/owner/my-pets');
  },

  createPet(payload) {
    return axiosClient.post('/api/owner/pets', payload);
  },

  updatePet(petId, payload) {
    return axiosClient.put(`/api/owner/pets/${petId}`, payload);
  },

  updatePetStatus(petId, status = 'INACTIVE') {
    return axiosClient.patch(`/api/owner/pets/${petId}/status`, { status });
  },

  getServices() {
    return axiosClient.get('/api/owner/services');
  },

  getVeterinarians() {
    return axiosClient.get('/api/owner/veterinarians');
  },

  getAvailableSlots(params) {
    return axiosClient.get('/api/owner/available-slots', { params });
  },

  getMyAppointments() {
    return axiosClient.get('/api/owner/appointments');
  },

  bookAppointment(payload) {
    return axiosClient.post('/api/owner/appointments', payload);
  },

  rescheduleAppointment(appointmentId, payload) {
    return axiosClient.put(`/api/owner/appointments/${appointmentId}/reschedule`, payload);
  },

  cancelAppointment(appointmentId, reason) {
    return axiosClient.patch(`/api/owner/appointments/${appointmentId}/cancel`, { reason });
  },

  getMyPetMedicalHistory(petId) {
    return axiosClient.get(`/api/owner/pets/${petId}/medical-history`);
  },

  getMyMedicalRecordPrintView(recordId) {
    return axiosClient.get(`/api/owner/medical-records/${recordId}`);
  },

  getMyInvoices() {
    return axiosClient.get('/api/owner/my-invoices');
  },

  getMyInvoiceById(invoiceId) {
    return axiosClient.get(`/api/owner/my-invoices/${invoiceId}`);
  },
};

export default ownerApi;
