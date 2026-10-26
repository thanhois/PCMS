import axiosClient from './axiosClient';

const receptionistApi = {
  getDashboardSummary() {
    return axiosClient.get('/api/receptionist/dashboard');
  },

  getCatalogLookup() {
    return axiosClient.get('/api/receptionist/catalog');
  },

  // Appointments (UC06 - UC10)
  getAppointments(params = {}) {
    return axiosClient.get('/api/receptionist/appointments', { params });
  },

  createAppointment(payload) {
    return axiosClient.post('/api/receptionist/appointments', payload);
  },

  approveAppointment(appointmentId, payload = {}) {
    return axiosClient.patch(`/api/receptionist/appointments/${appointmentId}/approve`, payload);
  },

  rejectAppointment(appointmentId, reason) {
    return axiosClient.patch(`/api/receptionist/appointments/${appointmentId}/reject`, { reason });
  },

  rescheduleAppointment(appointmentId, payload) {
    return axiosClient.put(`/api/receptionist/appointments/${appointmentId}/reschedule`, payload);
  },

  cancelAppointment(appointmentId, reason) {
    return axiosClient.patch(`/api/receptionist/appointments/${appointmentId}/cancel`, { reason });
  },

  // Check-in & Walk-in (UC11, UC12)
  checkInAppointment(appointmentId, payload = {}) {
    return axiosClient.patch(`/api/receptionist/appointments/${appointmentId}/check-in`, payload);
  },

  assignVeterinarian(appointmentId, veterinarianId) {
    return axiosClient.put(`/api/receptionist/appointments/${appointmentId}/assign-vet`, { veterinarianId });
  },

  processWalkIn(payload) {
    return axiosClient.post('/api/receptionist/walk-in', payload);
  },

  // Pet Owners (UC16, UC17, UC19)
  getOwners(params = {}) {
    return axiosClient.get('/api/receptionist/owners', { params });
  },

  createOwner(payload) {
    return axiosClient.post('/api/receptionist/owners', payload);
  },

  updateOwner(ownerId, payload) {
    return axiosClient.put(`/api/receptionist/owners/${ownerId}`, payload);
  },

  toggleOwnerStatus(ownerId, status) {
    return axiosClient.patch(`/api/receptionist/owners/${ownerId}/status`, { status });
  },

  // Pets (UC13, UC14, UC15, UC37)
  getPets(params = {}) {
    return axiosClient.get('/api/receptionist/pets', { params });
  },

  createPet(payload) {
    return axiosClient.post('/api/receptionist/pets', payload);
  },

  updatePet(petId, payload) {
    return axiosClient.put(`/api/receptionist/pets/${petId}`, payload);
  },

  togglePetStatus(petId, status) {
    return axiosClient.patch(`/api/receptionist/pets/${petId}/status`, { status });
  },

  getPetHistory(petId) {
    return axiosClient.get(`/api/receptionist/pets/${petId}/history`);
  },
};

export default receptionistApi;
