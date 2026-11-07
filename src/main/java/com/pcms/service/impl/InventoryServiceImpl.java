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
import com.pcms.entity.UserAccount;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class InventoryServiceImpl implements InventoryService {
    private final ServiceRepository serviceRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserAccountRepository userAccountRepository;

    @Override
    @Transactional(readOnly = true)
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
    @Transactional
    public ServiceResponse createService(ServiceRequest request) {
        String trimmedName = request.serviceName().trim();
        if (serviceRepository.existsByServiceNameIgnoreCase(trimmedName)) {
            throw new BadRequestException("Tên dịch vụ đã tồn tại trong danh mục");
        }

        com.pcms.entity.Service service = new com.pcms.entity.Service();
        service.setServiceName(trimmedName);
        service.setDescription(request.description());
        service.setPrice(request.price());
        service.setStatus("ACTIVE");

        com.pcms.entity.Service savedService = serviceRepository.save(service);
        recordAudit("CREATE_SERVICE", "Service #" + savedService.getServiceId(),
                "Thêm dịch vụ mới \"" + savedService.getServiceName() + "\" (Giá: " + savedService.getPrice() + " VNĐ).");

        return new ServiceResponse(
                savedService.getServiceId(),
                savedService.getServiceName(),
                savedService.getDescription(),
                savedService.getPrice(),
                savedService.getStatus()
        );
    }

    @Override
    @Transactional
    public ServiceResponse updateService(
            Integer serviceId,
            ServiceRequest request
    ) {
        com.pcms.entity.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy dịch vụ #" + serviceId));

        String newName = request.serviceName().trim();
        if (!service.getServiceName().equalsIgnoreCase(newName)
                && serviceRepository.existsByServiceNameIgnoreCase(newName)) {
            throw new BadRequestException("Tên dịch vụ đã tồn tại trong danh mục");
        }

        service.setServiceName(newName);
        service.setDescription(request.description());
        service.setPrice(request.price());

        com.pcms.entity.Service updatedService = serviceRepository.save(service);
        recordAudit("UPDATE_SERVICE", "Service #" + updatedService.getServiceId(),
                "Cập nhật dịch vụ \"" + updatedService.getServiceName() + "\" (Giá: " + updatedService.getPrice() + " VNĐ).");

        return new ServiceResponse(
                updatedService.getServiceId(),
                updatedService.getServiceName(),
                updatedService.getDescription(),
                updatedService.getPrice(),
                updatedService.getStatus()
        );
    }

    @Override
    @Transactional
    public ServiceResponse updateServiceStatus(
            Integer serviceId,
            ServiceStatusRequest request
    ) {
        com.pcms.entity.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy dịch vụ #" + serviceId));

        String nextStatus = "INACTIVE".equalsIgnoreCase(request.status()) ? "INACTIVE" : "ACTIVE";
        service.setStatus(nextStatus);

        com.pcms.entity.Service updatedService = serviceRepository.save(service);
        String actionType = "ACTIVE".equals(nextStatus) ? "ACTIVATE_SERVICE" : "DEACTIVATE_SERVICE";
        recordAudit(actionType, "Service #" + updatedService.getServiceId(),
                "Chuyển trạng thái dịch vụ \"" + updatedService.getServiceName() + "\" sang " + nextStatus + ".");

        return new ServiceResponse(
                updatedService.getServiceId(),
                updatedService.getServiceName(),
                updatedService.getDescription(),
                updatedService.getPrice(),
                updatedService.getStatus()
        );
    }

    @Override
    @Transactional(readOnly = true)
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
    @Transactional
    public MedicineResponse createMedicine(MedicineRequest request) {
        String trimmedName = request.medicineName().trim();
        if (medicineRepository.existsByMedicineNameIgnoreCase(trimmedName)) {
            throw new BadRequestException("Tên thuốc đã tồn tại trong danh mục");
        }

        com.pcms.entity.Medicine medicine = new com.pcms.entity.Medicine();
        medicine.setMedicineName(trimmedName);
        medicine.setUnit(request.unit().trim());
        medicine.setUnitPrice(request.unitPrice());
        medicine.setMinThreshold(request.minThreshold());
        medicine.setStatus("ACTIVE");

        com.pcms.entity.Medicine savedMedicine = medicineRepository.save(medicine);
        recordAudit("CREATE_MEDICINE", "Medicine #" + savedMedicine.getMedicineId(),
                "Thêm thuốc mới \"" + savedMedicine.getMedicineName() + "\" (" + savedMedicine.getUnit() + ").");

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
    @Transactional
    public MedicineResponse updateMedicine(
            Integer medicineId,
            MedicineRequest request
    ) {
        com.pcms.entity.Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy thuốc #" + medicineId));

        String newName = request.medicineName().trim();
        if (!medicine.getMedicineName().equalsIgnoreCase(newName)
                && medicineRepository.existsByMedicineNameIgnoreCase(newName)) {
            throw new BadRequestException("Tên thuốc đã tồn tại trong danh mục");
        }

        medicine.setMedicineName(newName);
        medicine.setUnit(request.unit().trim());
        medicine.setUnitPrice(request.unitPrice());
        medicine.setMinThreshold(request.minThreshold());

        com.pcms.entity.Medicine updatedMedicine = medicineRepository.save(medicine);
        recordAudit("UPDATE_MEDICINE", "Medicine #" + updatedMedicine.getMedicineId(),
                "Cập nhật danh mục thuốc \"" + updatedMedicine.getMedicineName() + "\".");

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
    @Transactional
    public MedicineResponse updateMedicineStatus(
            Integer medicineId,
            MedicineStatusRequest request
    ) {
        com.pcms.entity.Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy thuốc #" + medicineId));

        String nextStatus = "INACTIVE".equalsIgnoreCase(request.status()) ? "INACTIVE" : "ACTIVE";
        medicine.setStatus(nextStatus);

        com.pcms.entity.Medicine updatedMedicine = medicineRepository.save(medicine);
        String actionType = "ACTIVE".equals(nextStatus) ? "ACTIVATE_MEDICINE" : "DEACTIVATE_MEDICINE";
        recordAudit(actionType, "Medicine #" + updatedMedicine.getMedicineId(),
                "Chuyển trạng thái thuốc \"" + updatedMedicine.getMedicineName() + "\" sang " + nextStatus + ".");

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
    @Transactional(readOnly = true)
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
    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> getInventoryByMedicine(
            Integer medicineId
    ) {
        if (!medicineRepository.existsById(medicineId)) {
            throw new ResourceNotFoundException("Không tìm thấy thuốc #" + medicineId);
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
        com.pcms.entity.Medicine medicine = medicineRepository.findById(request.medicineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy thuốc #" + request.medicineId()));

        if (!"ACTIVE".equals(medicine.getStatus())) {
            throw new BadRequestException("Không thể nhập kho cho thuốc đã ngừng lưu hành (INACTIVE).");
        }

        String normalizedBatchNumber = request.batchNumber().trim();
        Optional<InventoryBatch> existingOpt = inventoryBatchRepository
                .findByMedicine_MedicineIdAndBatchNumber(medicine.getMedicineId(), normalizedBatchNumber);

        InventoryBatch savedBatch;
        if (existingOpt.isPresent()) {
            InventoryBatch existing = existingOpt.get();
            if (!Objects.equals(existing.getExpirationDate(), request.expirationDate())) {
                throw new BadRequestException(
                        "Số lô \"" + normalizedBatchNumber + "\" của thuốc \"" + medicine.getMedicineName()
                                + "\" đã tồn tại với hạn sử dụng khác (" + existing.getExpirationDate() + ").");
            }
            long accumulated = (long) existing.getQuantityInStock() + request.quantity();
            if (accumulated > Integer.MAX_VALUE) {
                throw new BadRequestException("Số lượng tồn kho vượt quá giới hạn cho phép.");
            }
            existing.setQuantityInStock((int) accumulated);
            if (request.supplier() != null && !request.supplier().trim().isEmpty()) {
                existing.setSupplier(request.supplier().trim());
            }
            savedBatch = inventoryBatchRepository.save(existing);
        } else {
            InventoryBatch batch = new InventoryBatch();
            batch.setMedicine(medicine);
            batch.setBatchNumber(normalizedBatchNumber);
            batch.setExpirationDate(request.expirationDate());
            batch.setQuantityInStock(request.quantity());
            batch.setSupplier(request.supplier() != null ? request.supplier().trim() : null);
            savedBatch = inventoryBatchRepository.save(batch);
        }

        recordAudit("STOCK_RECEIVE", "InventoryBatch #" + savedBatch.getBatchId(),
                "Nhập kho thuốc \"" + medicine.getMedicineName()
                        + "\" — Lô: " + savedBatch.getBatchNumber()
                        + ", Số lượng nhập: +" + request.quantity()
                        + ", Tồn sau nhập: " + savedBatch.getQuantityInStock()
                        + ", HSD: " + savedBatch.getExpirationDate());

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
        if (request.reason() == null || request.reason().trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập lý do điều chỉnh tồn kho.");
        }

        InventoryBatch batch = inventoryBatchRepository.findById(batchId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy lô thuốc #" + batchId));

        int currentQuantity = batch.getQuantityInStock();
        int quantityChange = request.quantityChange();
        long newQuantity = (long) currentQuantity + quantityChange;

        if (newQuantity < 0) {
            throw new BadRequestException("Số lượng tồn kho sau điều chỉnh không được âm.");
        }

        if (newQuantity > Integer.MAX_VALUE) {
            throw new BadRequestException("Số lượng tồn kho vượt quá giới hạn cho phép.");
        }

        batch.setQuantityInStock((int) newQuantity);
        InventoryBatch updatedBatch = inventoryBatchRepository.save(batch);

        recordAudit("INVENTORY_ADJUSTMENT", "InventoryBatch #" + batchId,
                "Điều chỉnh lô thuốc #" + batchId + " (" + batch.getMedicine().getMedicineName()
                        + ", Lô " + batch.getBatchNumber() + "): Tồn cũ=" + currentQuantity
                        + ", Thay đổi=" + (quantityChange >= 0 ? "+" + quantityChange : quantityChange)
                        + ", Tồn mới=" + newQuantity
                        + ", Lý do=" + request.reason().trim());

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

    private void recordAudit(String actionType, String affectedResource, String details) {
        UserAccount actor = resolveCurrentUserAccount();
        if (actor == null) return;

        auditLogRepository.save(AuditLog.builder()
                .userAccount(actor)
                .actionTime(LocalDateTime.now().withNano(0))
                .actionType(actionType)
                .affectedResource(affectedResource)
                .outcome("SUCCESS")
                .actionDetails(details)
                .build());
    }

    private UserAccount resolveCurrentUserAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userAccountRepository.findById(principal.getId()).orElse(null);
        }
        if (authentication != null && authentication.getName() != null) {
            return userAccountRepository.findByUsername(authentication.getName()).orElse(null);
        }
        return userAccountRepository.findByUsername("admin").orElse(null);
    }
}
