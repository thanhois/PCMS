import axiosClient from './axiosClient';

const ownerApi = {
  getMyPets() {
    return axiosClient.get('/api/owner/my-pets');
  },

  createPet(payload) {
    return axiosClient.post('/api/owner/pets', payload);
  },

  getServices() {
    return axiosClient.get('/api/owner/services');
  },

  getMyAppointments() {
    return axiosClient.get('/api/owner/appointments');
  },

  bookAppointment(payload) {
    return axiosClient.post('/api/owner/appointments', payload);
  },

  getMyPetMedicalHistory(petId) {
    return axiosClient.get(`/api/owner/pets/${petId}/medical-history`);
  },

  getMyMedicalRecordPrintView(recordId) {
    return axiosClient.get(`/api/owner/medical-records/${recordId}`);
  },
};

export default ownerApi;
