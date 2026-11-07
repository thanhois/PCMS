package com.pcms.service;

import com.pcms.dto.request.catalog.ServiceRequest;
import com.pcms.dto.request.catalog.ServiceStatusRequest;
import com.pcms.dto.request.inventory.AdjustStockRequest;
import com.pcms.dto.request.inventory.MedicineRequest;
import com.pcms.dto.request.inventory.MedicineStatusRequest;
import com.pcms.dto.request.inventory.ReceiveStockRequest;
import com.pcms.dto.response.catalog.ServiceResponse;
import com.pcms.dto.response.inventory.InventoryBatchResponse;
import com.pcms.dto.response.inventory.MedicineResponse;

import java.util.List;

public interface InventoryService {
    // Service catalog
    List<ServiceResponse> getAllServices();

    ServiceResponse createService(ServiceRequest request);

    ServiceResponse updateService(Integer serviceId, ServiceRequest request);

    ServiceResponse updateServiceStatus(
            Integer serviceId,
            ServiceStatusRequest request
    );

    // Medicine catalog
    List<MedicineResponse> getAllMedicines();

    MedicineResponse createMedicine(MedicineRequest request);

    MedicineResponse updateMedicine(
            Integer medicineId,
            MedicineRequest request
    );

    MedicineResponse updateMedicineStatus(
            Integer medicineId,
            MedicineStatusRequest request
    );

    // Inventory
    List<InventoryBatchResponse> getInventory();

    List<InventoryBatchResponse> getInventoryByMedicine(Integer medicineId);

    InventoryBatchResponse receiveStock(ReceiveStockRequest request);

    InventoryBatchResponse adjustStock(
            Integer batchId,
            AdjustStockRequest request
    );
}


