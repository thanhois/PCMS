import inventoryApi from './inventoryApi';

// Backend Inventory tra ve ApiResponse<T>.
// Axios interceptor da loai bo lop response cua Axios.
const unwrapData = (response) => response?.data ?? response;

const inventoryCatalogApi = {
  // SERVICES
  async getServices() {
    const response = await inventoryApi.getServices();
    return unwrapData(response);
  },

  async saveService(payload) {
    const response = payload.serviceId
      ? await inventoryApi.updateService(payload.serviceId, payload)
      : await inventoryApi.createService(payload);

    return unwrapData(response);
  },

  async toggleServiceStatus(serviceId, status) {
    const response = await inventoryApi.updateServiceStatus(serviceId, status);
    return unwrapData(response);
  },

  // MEDICINES
  async getMedicines() {
    const response = await inventoryApi.getMedicines();
    return unwrapData(response);
  },

  async saveMedicine(payload) {
    const response = payload.medicineId
      ? await inventoryApi.updateMedicine(payload.medicineId, payload)
      : await inventoryApi.createMedicine(payload);

    return unwrapData(response);
  },

  async toggleMedicineStatus(medicineId, status) {
    const response = await inventoryApi.updateMedicineStatus(medicineId, status);
    return unwrapData(response);
  },
};

export default inventoryCatalogApi;