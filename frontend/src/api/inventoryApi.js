
import axiosClient from './axiosClient';

const inventoryApi = {
  // 1. SERVICES
  getServices() {
    return axiosClient.get('/api/v1/inventory/services');
  },

  createService(payload) {
    return axiosClient.post('/api/v1/inventory/services', payload);
  },

  updateService(serviceId, payload) {
    return axiosClient.put(
      `/api/v1/inventory/services/${serviceId}`,
      payload
    );
  },

  updateServiceStatus(serviceId, status) {
    return axiosClient.patch(
      `/api/v1/inventory/services/${serviceId}/status`,
      { status }
    );
  },

  // 2. MEDICINES
  getMedicines() {
    return axiosClient.get('/api/v1/inventory/medicines');
  },

  createMedicine(payload) {
    return axiosClient.post('/api/v1/inventory/medicines', payload);
  },

  updateMedicine(medicineId, payload) {
    return axiosClient.put(
      `/api/v1/inventory/medicines/${medicineId}`,
      payload
    );
  },

  updateMedicineStatus(medicineId, status) {
    return axiosClient.patch(
      `/api/v1/inventory/medicines/${medicineId}/status`,
      { status }
    );
  },

  // 3. INVENTORY BATCHES
  getInventoryBatches() {
    return axiosClient.get('/api/v1/inventory/batches');
  },

  getMedicineBatches(medicineId) {
    return axiosClient.get(
      `/api/v1/inventory/medicines/${medicineId}/batches`
    );
  },

  receiveStock(payload) {
    return axiosClient.post(
      '/api/v1/inventory/batches/receive',
      payload
    );
  },

  adjustStock(batchId, payload) {
    return axiosClient.patch(
      `/api/v1/inventory/batches/${batchId}/adjustment`,
      payload
    );
  },
};

export default inventoryApi;
