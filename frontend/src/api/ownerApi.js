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

  getMyInvoices() {
    return axiosClient.get('/api/owner/my-invoices');
  },

  getMyInvoiceById(invoiceId) {
    return axiosClient.get(`/api/owner/my-invoices/${invoiceId}`);
  },
};

export default ownerApi;
