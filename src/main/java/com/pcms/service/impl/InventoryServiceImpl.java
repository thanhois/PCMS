package com.pcms.service.impl;

import com.pcms.config.security.UserPrincipal;
import com.pcms.dto.request.catalog.ServiceRequest;
import com.pcms.dto.request.catalog.ServiceStatusRequest;
import com.pcms.dto.request.inventory.AdjustStockRequest;
import com.pcms.dto.request.inventory.MedicineRequest;
import com.pcms.dto.request.inventory.MedicineStatusRequest;
import com.pcms.dto.request.inventory.ReceiveStockRequest;
import com.pcms.dto.response.catalog.ServiceResponse;
import com.pcms.dto.response.inventory.InventoryBatchResponse;
import com.pcms.dto.response.inventory.MedicineResponse;
import com.pcms.entity.AuditLog;
import com.pcms.entity.InventoryBatch;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.AuditLogRepository;
import com.pcms.repository.InventoryBatchRepository;
import com.pcms.repository.MedicineRepository;
import com.pcms.repository.ServiceRepository;
import com.pcms.repository.UserAccountRepository;
import com.pcms.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
public class InventoryServiceImpl implements InventoryService {
    private final ServiceRepository serviceRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserAccountRepository userAccountRepository;


    @Override
    public List<ServiceResponse> getAllServices() {
        return serviceRepository.findAll()
                .stream()
                .map(service -> new ServiceResponse(
                        service.getServiceId(),
                        service.getServiceName(),
                        service.getDescription(),
                        service.getPrice(),
                        service.getStatus()
                ))
                .toList();
    }

    @Override
    public ServiceResponse createService(ServiceRequest request) {
        if (serviceRepository.existsByServiceNameIgnoreCase(
                request.serviceName().trim())) {
            throw new BadRequestException("Service name already exists");
        }


        com.pcms.entity.Service service =
                new com.pcms.entity.Service();

        service.setServiceName(request.serviceName().trim());
        service.setDescription(request.description());
        service.setPrice(request.price());
        service.setStatus("ACTIVE");

        com.pcms.entity.Service savedService =
                serviceRepository.save(service);


        return new ServiceResponse(
                savedService.getServiceId(),
                savedService.getServiceName(),
                savedService.getDescription(),
                savedService.getPrice(),
                savedService.getStatus()
        );
    }


    @Override
    public ServiceResponse updateService(
            Integer serviceId,
            ServiceRequest request
    ) {
        com.pcms.entity.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Service not found"));

        String newName = request.serviceName().trim();

        if (!service.getServiceName().equalsIgnoreCase(newName)
                && serviceRepository.existsByServiceNameIgnoreCase(newName)) {
            throw new BadRequestException("Service name already exists");
        }

        service.setServiceName(newName);
        service.setDescription(request.description());
        service.setPrice(request.price());

        com.pcms.entity.Service updatedService = serviceRepository.save(service);

        return new ServiceResponse(
                updatedService.getServiceId(),
                updatedService.getServiceName(),
                updatedService.getDescription(),
                updatedService.getPrice(),
                updatedService.getStatus()
        );
    }


    @Override
    public ServiceResponse updateServiceStatus(
            Integer serviceId,
            ServiceStatusRequest request
    ) {
        com.pcms.entity.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Service not found"));

        service.setStatus(request.status());

        com.pcms.entity.Service updatedService =
                serviceRepository.save(service);

        return new ServiceResponse(
                updatedService.getServiceId(),
                updatedService.getServiceName(),
                updatedService.getDescription(),
                updatedService.getPrice(),
                updatedService.getStatus()
        );
    }


    @Override
    public List<MedicineResponse> getAllMedicines() {
        return medicineRepository.findAll()
                .stream()
                .map(medicine -> new MedicineResponse(
                        medicine.getMedicineId(),
                        medicine.getMedicineName(),
                        medicine.getUnit(),
                        medicine.getUnitPrice(),
                        medicine.getStatus(),
                        medicine.getMinThreshold()
                ))
                .toList();
    }


    @Override
    public MedicineResponse createMedicine(MedicineRequest request) {
        if (medicineRepository.existsByMedicineNameIgnoreCase(
                request.medicineName().trim())) {
            throw new BadRequestException("Medicine name already exists");
        }

        com.pcms.entity.Medicine medicine =
                new com.pcms.entity.Medicine();

        medicine.setMedicineName(request.medicineName().trim());
        medicine.setUnit(request.unit().trim());
        medicine.setUnitPrice(request.unitPrice());
        medicine.setMinThreshold(request.minThreshold());
        medicine.setStatus("ACTIVE");

        com.pcms.entity.Medicine savedMedicine =
                medicineRepository.save(medicine);

        return new MedicineResponse(
                savedMedicine.getMedicineId(),
                savedMedicine.getMedicineName(),
                savedMedicine.getUnit(),
                savedMedicine.getUnitPrice(),
                savedMedicine.getStatus(),
                savedMedicine.getMinThreshold()
        );
    }



    @Override
    public MedicineResponse updateMedicine(
            Integer medicineId,
            MedicineRequest request
    ) {
        com.pcms.entity.Medicine medicine =
                medicineRepository.findById(medicineId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException("Medicine not found"));

        String newName = request.medicineName().trim();

        if (!medicine.getMedicineName().equalsIgnoreCase(newName)
                && medicineRepository.existsByMedicineNameIgnoreCase(newName)) {
            throw new BadRequestException("Medicine name already exists");
        }

        medicine.setMedicineName(newName);
        medicine.setUnit(request.unit().trim());
        medicine.setUnitPrice(request.unitPrice());
        medicine.setMinThreshold(request.minThreshold());

        com.pcms.entity.Medicine updatedMedicine =
                medicineRepository.save(medicine);

        return new MedicineResponse(
                updatedMedicine.getMedicineId(),
                updatedMedicine.getMedicineName(),
                updatedMedicine.getUnit(),
                updatedMedicine.getUnitPrice(),
                updatedMedicine.getStatus(),
                updatedMedicine.getMinThreshold()
        );
    }



    @Override
    public MedicineResponse updateMedicineStatus(
            Integer medicineId,
            MedicineStatusRequest request
    ) {
        com.pcms.entity.Medicine medicine =
                medicineRepository.findById(medicineId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException("Medicine not found"));

        medicine.setStatus(request.status());

        com.pcms.entity.Medicine updatedMedicine =
                medicineRepository.save(medicine);

        return new MedicineResponse(
                updatedMedicine.getMedicineId(),
                updatedMedicine.getMedicineName(),
                updatedMedicine.getUnit(),
                updatedMedicine.getUnitPrice(),
                updatedMedicine.getStatus(),
                updatedMedicine.getMinThreshold()
        );
    }



    @Override
    public List<InventoryBatchResponse> getInventory() {
        return inventoryBatchRepository.findAll()
                .stream()
                .map(batch -> new InventoryBatchResponse(
                        batch.getBatchId(),
                        batch.getMedicine().getMedicineId(),
                        batch.getMedicine().getMedicineName(),
                        batch.getBatchNumber(),
                        batch.getExpirationDate(),
                        batch.getQuantityInStock(),
                        batch.getSupplier()
                ))
                .toList();
    }



    @Override
    public List<InventoryBatchResponse> getInventoryByMedicine(
            Integer medicineId
    ) {
        if (!medicineRepository.existsById(medicineId)) {
            throw new ResourceNotFoundException("Medicine not found");
        }

        return inventoryBatchRepository.findByMedicine_MedicineId(medicineId)
                .stream()
                .map(batch -> new InventoryBatchResponse(
                        batch.getBatchId(),
                        batch.getMedicine().getMedicineId(),
                        batch.getMedicine().getMedicineName(),
                        batch.getBatchNumber(),
                        batch.getExpirationDate(),
                        batch.getQuantityInStock(),
                        batch.getSupplier()
                ))
                .toList();
    }



    @Override
    @Transactional
    public InventoryBatchResponse receiveStock(ReceiveStockRequest request) {
        com.pcms.entity.Medicine medicine =
                medicineRepository.findById(request.medicineId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException("Medicine not found"));

        if (!"ACTIVE".equals(medicine.getStatus())) {
            throw new BadRequestException(
                    "Cannot receive stock for an inactive medicine");
        }

        InventoryBatch batch = new InventoryBatch();
        batch.setMedicine(medicine);
        batch.setBatchNumber(request.batchNumber().trim());
        batch.setExpirationDate(request.expirationDate());
        batch.setQuantityInStock(request.quantity());
        batch.setSupplier(request.supplier());

        InventoryBatch savedBatch = inventoryBatchRepository.save(batch);

        return new InventoryBatchResponse(
                savedBatch.getBatchId(),
                savedBatch.getMedicine().getMedicineId(),
                savedBatch.getMedicine().getMedicineName(),
                savedBatch.getBatchNumber(),
                savedBatch.getExpirationDate(),
                savedBatch.getQuantityInStock(),
                savedBatch.getSupplier()
        );
    }



    @Override
    @Transactional
    public InventoryBatchResponse adjustStock(
            Integer batchId,
            AdjustStockRequest request
    ) {
        InventoryBatch batch = inventoryBatchRepository.findById(batchId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Inventory batch not found"));

        int currentQuantity = batch.getQuantityInStock();
        int quantityChange = request.quantityChange();

        long newQuantity = (long) currentQuantity + quantityChange;

        if (newQuantity < 0) {
            throw new BadRequestException(
                    "Stock quantity cannot be negative");
        }

        if (newQuantity > Integer.MAX_VALUE) {
            throw new BadRequestException(
                    "Stock quantity exceeds the maximum allowed value");
        }

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new BadRequestException(
                    "Unable to identify the logged-in user");
        }

        com.pcms.entity.UserAccount userAccount =
                userAccountRepository.findById(principal.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException("User account not found"));

        batch.setQuantityInStock((int) newQuantity);

        InventoryBatch updatedBatch =
                inventoryBatchRepository.save(batch);

        AuditLog auditLog = AuditLog.builder()
                .userAccount(userAccount)
                .actionTime(java.time.LocalDateTime.now())
                .actionDetails(
                        "Inventory stock adjusted. Batch ID: " + batchId
                                + ", Medicine: " + batch.getMedicine().getMedicineName()
                                + ", Previous quantity: " + currentQuantity
                                + ", Change: " + quantityChange
                                + ", New quantity: " + newQuantity
                                + ", Reason: " + request.reason().trim()
                )
                .build();

        auditLogRepository.save(auditLog);

        return new InventoryBatchResponse(
                updatedBatch.getBatchId(),
                updatedBatch.getMedicine().getMedicineId(),
                updatedBatch.getMedicine().getMedicineName(),
                updatedBatch.getBatchNumber(),
                updatedBatch.getExpirationDate(),
                updatedBatch.getQuantityInStock(),
                updatedBatch.getSupplier()
        );
    }

}
