package com.pcms.controller;

import com.pcms.dto.request.catalog.ServiceRequest;
import com.pcms.dto.request.catalog.ServiceStatusRequest;
import com.pcms.dto.request.inventory.AdjustStockRequest;
import com.pcms.dto.request.inventory.MedicineRequest;
import com.pcms.dto.request.inventory.MedicineStatusRequest;
import com.pcms.dto.request.inventory.ReceiveStockRequest;
import com.pcms.dto.response.ApiResponse;
import com.pcms.dto.response.catalog.ServiceResponse;
import com.pcms.dto.response.inventory.InventoryBatchResponse;
import com.pcms.dto.response.inventory.MedicineResponse;
import com.pcms.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    // 1. SERVICE CATALOG

    // Lay danh sach dich vu
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @GetMapping("/services")
    public ResponseEntity<ApiResponse<List<ServiceResponse>>> getAllServices() {
        List<ServiceResponse> services = inventoryService.getAllServices();

        return ResponseEntity.ok(
                ApiResponse.success("Lay danh sach dich vu thanh cong", services)
        );
    }

    // Them dich vu moi
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PostMapping("/services")
    public ResponseEntity<ApiResponse<ServiceResponse>> createService(
            @Valid @RequestBody ServiceRequest request) {

        ServiceResponse response = inventoryService.createService(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Tao dich vu thanh cong", response)
        );
    }

    // Cap nhat thong tin dich vu
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PutMapping("/services/{serviceId}")
    public ResponseEntity<ApiResponse<ServiceResponse>> updateService(
            @PathVariable Integer serviceId,
            @Valid @RequestBody ServiceRequest request) {

        ServiceResponse response = inventoryService.updateService(serviceId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat dich vu thanh cong", response)
        );
    }

    // Thay doi trang thai dich vu
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PatchMapping("/services/{serviceId}/status")
    public ResponseEntity<ApiResponse<ServiceResponse>> updateServiceStatus(
            @PathVariable Integer serviceId,
            @Valid @RequestBody ServiceStatusRequest request) {

        ServiceResponse response = inventoryService.updateServiceStatus(serviceId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat trang thai dich vu thanh cong", response)
        );
    }

    // 2. MEDICINE CATALOG

    // Lay danh sach thuoc
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @GetMapping("/medicines")
    public ResponseEntity<ApiResponse<List<MedicineResponse>>> getAllMedicines() {
        List<MedicineResponse> medicines = inventoryService.getAllMedicines();

        return ResponseEntity.ok(
                ApiResponse.success("Lay danh sach thuoc thanh cong", medicines)
        );
    }

    // Them thuoc moi
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PostMapping("/medicines")
    public ResponseEntity<ApiResponse<MedicineResponse>> createMedicine(
            @Valid @RequestBody MedicineRequest request) {

        MedicineResponse response = inventoryService.createMedicine(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Tao thuoc thanh cong", response)
        );
    }

    // Cap nhat thong tin thuoc
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PutMapping("/medicines/{medicineId}")
    public ResponseEntity<ApiResponse<MedicineResponse>> updateMedicine(
            @PathVariable Integer medicineId,
            @Valid @RequestBody MedicineRequest request) {

        MedicineResponse response = inventoryService.updateMedicine(medicineId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat thuoc thanh cong", response)
        );
    }

    // Thay doi trang thai thuoc
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PatchMapping("/medicines/{medicineId}/status")
    public ResponseEntity<ApiResponse<MedicineResponse>> updateMedicineStatus(
            @PathVariable Integer medicineId,
            @Valid @RequestBody MedicineStatusRequest request) {

        MedicineResponse response = inventoryService.updateMedicineStatus(medicineId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat trang thai thuoc thanh cong", response)
        );
    }

    // 3. INVENTORY MANAGEMENT

    // Lay toan bo danh sach ton kho
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @GetMapping("/batches")
    public ResponseEntity<ApiResponse<List<InventoryBatchResponse>>> getInventory() {
        List<InventoryBatchResponse> inventory = inventoryService.getInventory();

        return ResponseEntity.ok(
                ApiResponse.success("Lay danh sach ton kho thanh cong", inventory)
        );
    }

    // Lay danh sach lo thuoc theo ma thuoc
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @GetMapping("/medicines/{medicineId}/batches")
    public ResponseEntity<ApiResponse<List<InventoryBatchResponse>>> getInventoryByMedicine(
            @PathVariable Integer medicineId) {

        List<InventoryBatchResponse> batches =
                inventoryService.getInventoryByMedicine(medicineId);

        return ResponseEntity.ok(
                ApiResponse.success("Lay danh sach lo thuoc thanh cong", batches)
        );
    }

    // Nhap them lo thuoc moi
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PostMapping("/batches/receive")
    public ResponseEntity<ApiResponse<InventoryBatchResponse>> receiveStock(
            @Valid @RequestBody ReceiveStockRequest request) {

        InventoryBatchResponse response = inventoryService.receiveStock(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Nhap kho thanh cong", response)
        );
    }

    // Dieu chinh so luong ton kho
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @PatchMapping("/batches/{batchId}/adjustment")
    public ResponseEntity<ApiResponse<InventoryBatchResponse>> adjustStock(
            @PathVariable Integer batchId,
            @Valid @RequestBody AdjustStockRequest request) {

        InventoryBatchResponse response =
                inventoryService.adjustStock(batchId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Dieu chinh ton kho thanh cong", response)
        );
    }

}
