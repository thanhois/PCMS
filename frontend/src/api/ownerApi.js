import axiosClient from './axiosClient';

const ownerApi = {
  getMyPets() {
    return axiosClient.get('/api/owner/my-pets');
  },

  getMyPetMedicalHistory(petId) {
    return axiosClient.get(`/api/owner/pets/${petId}/medical-history`);
  },

  getMyMedicalRecordPrintView(recordId) {
    return axiosClient.get(`/api/owner/medical-records/${recordId}`);
  },
};

export default ownerApi;
