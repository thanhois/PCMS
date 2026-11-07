package com.pcms.service.impl;

import com.pcms.config.security.UserPrincipal;
import com.pcms.dto.request.billing.ConfirmPaymentRequest;
import com.pcms.dto.request.billing.InvoiceUpdateRequest;
import com.pcms.dto.request.billing.VoidInvoiceRequest;
import com.pcms.dto.response.billing.InvoiceResponse;
import com.pcms.dto.response.billing.PaymentResponse;
import com.pcms.entity.AuditLog;
import com.pcms.entity.InventoryBatch;
import com.pcms.entity.Invoice;
import com.pcms.entity.MedicalRecord;
import com.pcms.entity.MedicalRecordDetail;
import com.pcms.entity.Payment;
import com.pcms.entity.Pet;
import com.pcms.entity.PetOwner;
import com.pcms.entity.Prescription;
import com.pcms.entity.PrescriptionDetail;
import com.pcms.entity.UserAccount;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.AuditLogRepository;
import com.pcms.repository.InventoryBatchRepository;
import com.pcms.repository.InvoiceRepository;
import com.pcms.repository.MedicalRecordDetailRepository;
import com.pcms.repository.PaymentRepository;
import com.pcms.repository.PrescriptionDetailRepository;
import com.pcms.repository.PrescriptionRepository;
import com.pcms.repository.UserAccountRepository;
import com.pcms.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BillingServiceImpl implements BillingService {

    private final InvoiceRepository invoiceRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserAccountRepository userAccountRepository;
    private final PaymentRepository paymentRepository;
    private final MedicalRecordDetailRepository medicalRecordDetailRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionDetailRepository prescriptionDetailRepository;
    private final InventoryBatchRepository inventoryBatchRepository;

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getPaymentQueue() {
        return getPaymentQueue("PENDING");
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getPaymentQueue(String status) {
        String filter = (status == null || status.isBlank()) ? "PENDING" : status.trim().toUpperCase();
        return invoiceRepository.findAll()
                .stream()
                .filter(invoice -> {
                    if ("ALL".equals(filter)) return true;
                    String st = normalizeStatus(invoice.getStatus());
                    return filter.equalsIgnoreCase(st);
                })
                .sorted(Comparator.comparing(Invoice::getInvoiceDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(inv -> mapToInvoiceResponse(inv, false))
                .toList();
    }

    private String normalizeStatus(String status) {
        if (status == null) return "PENDING";
        if ("VOIDED".equalsIgnoreCase(status)) return "VOID";
        return status.toUpperCase();
    }

    private InvoiceResponse mapToInvoiceResponse(Invoice invoice, boolean includeDetails) {
        MedicalRecord mr = invoice.getMedicalRecord();
        Pet pet = mr != null ? mr.getPet() : null;
        PetOwner owner = pet != null ? pet.getPetOwner() : null;
        UserAccount vet = mr != null ? mr.getVeterinarian() : null;

        List<InvoiceResponse.LineItem> serviceItems = List.of();
        List<InvoiceResponse.LineItem> medicineItems = List.of();
        List<PaymentResponse> payments = List.of();

        if (includeDetails && mr != null) {
            List<MedicalRecordDetail> recordDetails =
                    medicalRecordDetailRepository.findByMedicalRecord_RecordId(mr.getRecordId());
            serviceItems = recordDetails.stream().map(d -> {
                String name = d.getService() != null ? d.getService().getServiceName() : "Dịch vụ";
                int qty = d.getQuantity() != null ? d.getQuantity() : 1;
                BigDecimal unitPrice = (d.getService() != null && d.getService().getPrice() != null)
                        ? d.getService().getPrice() : BigDecimal.ZERO;
                BigDecimal subTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
                return new InvoiceResponse.LineItem(
                        name,
                        "Lần",
                        qty,
                        unitPrice,
                        subTotal,
                        d.getNotes() != null ? d.getNotes() : ""
                );
            }).toList();

            Prescription presc = prescriptionRepository.findByMedicalRecord_RecordId(mr.getRecordId()).orElse(null);
            if (presc != null) {
                List<PrescriptionDetail> pDetails =
                        prescriptionDetailRepository.findByPrescription_PrescriptionId(presc.getPrescriptionId());
                List<InvoiceResponse.LineItem> medList = new ArrayList<>();
                for (PrescriptionDetail pd : pDetails) {
                    String name = pd.getMedicine() != null ? pd.getMedicine().getMedicineName() : "Thuốc";
                    String unit = pd.getMedicine() != null && pd.getMedicine().getUnit() != null
                            ? pd.getMedicine().getUnit() : "Đơn vị";
                    int qty = pd.getQuantity() != null ? pd.getQuantity() : 1;
                    BigDecimal unitPrice = (pd.getMedicine() != null && pd.getMedicine().getUnitPrice() != null)
                            ? pd.getMedicine().getUnitPrice() : BigDecimal.ZERO;
                    BigDecimal subTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
                    medList.add(new InvoiceResponse.LineItem(
                            name,
                            unit,
                            qty,
                            unitPrice,
                            subTotal,
                            pd.getDosage() != null ? pd.getDosage() : ""
                    ));
                }
                medicineItems = medList;
            }

            payments = paymentRepository.findByInvoice_InvoiceId(invoice.getInvoiceId())
                    .stream()
                    .map(p -> new PaymentResponse(
                            p.getPaymentId(),
                            invoice.getInvoiceId(),
                            p.getPaymentDate(),
                            p.getPaymentMethod(),
                            p.getAmountPaid()
                    ))
                    .toList();
        }

        return new InvoiceResponse(
                invoice.getInvoiceId(),
                mr != null ? mr.getRecordId() : null,
                pet != null ? pet.getPetName() : "—",
                pet != null && pet.getSpecies() != null ? pet.getSpecies() : "",
                pet != null && pet.getBreed() != null ? pet.getBreed() : "",
                owner != null ? owner.getFullName() : "—",
                owner != null && owner.getPhoneNumber() != null ? owner.getPhoneNumber() : "",
                owner != null && owner.getAddress() != null ? owner.getAddress() : "",
                vet != null ? vet.getFullName() : "—",
                invoice.getInvoiceDate(),
                invoice.getTotalAmount(),
                invoice.getDiscountAmount() != null ? invoice.getDiscountAmount() : BigDecimal.ZERO,
                normalizeStatus(invoice.getStatus()),
                serviceItems,
                medicineItems,
                payments
        );
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Integer invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hóa đơn với mã: " + invoiceId
                ));

        return mapToInvoiceResponse(invoice, true);
    }

    @Override
    @Transactional
    public InvoiceResponse updateInvoice(
            Integer invoiceId,
            InvoiceUpdateRequest request
    ) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hóa đơn với mã: " + invoiceId
                ));

        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException(
                    "Chỉ hóa đơn ở trạng thái PENDING mới được phép cập nhật giảm giá."
            );
        }

        BigDecimal discountAmount = request.discountAmount();
        if (discountAmount == null || discountAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Số tiền giảm giá không được âm.");
        }
        if (discountAmount.compareTo(invoice.getTotalAmount()) > 0) {
            throw new BadRequestException(
                    "Số tiền giảm giá không được vượt quá tổng hóa đơn (" + invoice.getTotalAmount() + ")."
            );
        }

        invoice.setDiscountAmount(discountAmount);
        Invoice updatedInvoice = invoiceRepository.save(invoice);

        recordBillingAudit(
                "INVOICE_UPDATE",
                "Invoice #" + invoiceId,
                "SUCCESS",
                "Cập nhật giảm giá hóa đơn #" + invoiceId + ": " + discountAmount + " VNĐ"
        );

        return mapToInvoiceResponse(updatedInvoice, true);
    }

    @Override
    @Transactional
    public InvoiceResponse voidInvoice(
            Integer invoiceId,
            VoidInvoiceRequest request
    ) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hóa đơn với mã: " + invoiceId
                ));

        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException(
                    "Chỉ hóa đơn ở trạng thái PENDING mới được phép hủy."
            );
        }

        if (request == null || request.reason() == null || request.reason().trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập lý do hủy hóa đơn.");
        }

        invoice.setStatus("VOID");
        Invoice voidedInvoice = invoiceRepository.save(invoice);

        recordBillingAudit(
                "INVOICE_VOID",
                "Invoice #" + invoiceId,
                "SUCCESS",
                "Voided invoice #" + invoiceId + ". Reason: " + request.reason().trim()
        );

        return mapToInvoiceResponse(voidedInvoice, true);
    }

    @Override
    @Transactional
    public PaymentResponse confirmPayment(
            Integer invoiceId,
            ConfirmPaymentRequest request
    ) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hóa đơn với mã: " + invoiceId
                ));

        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException(
                    "Chỉ hóa đơn ở trạng thái PENDING mới có thể xác nhận thanh toán."
            );
        }

        String paymentMethod = request.paymentMethod().trim().toUpperCase();
        if (!List.of("CASH", "CARD", "BANK_TRANSFER").contains(paymentMethod)) {
            throw new BadRequestException(
                    "Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: CASH, CARD, BANK_TRANSFER."
            );
        }

        if (!paymentRepository.findByInvoice_InvoiceId(invoiceId).isEmpty()) {
            throw new BadRequestException(
                    "Hóa đơn #" + invoiceId + " đã tồn tại giao dịch thanh toán."
            );
        }

        String mockResult = request.mockResult() != null ? request.mockResult().trim().toUpperCase() : "SUCCESS";
        if (!"SUCCESS".equals(mockResult) && !"FAILED".equals(mockResult)) {
            throw new BadRequestException(
                    "Kết quả mô phỏng thanh toán không hợp lệ (SUCCESS / FAILED)."
            );
        }

        if ("FAILED".equals(mockResult)) {
            recordBillingAudit(
                    "INVOICE_PAYMENT",
                    "Invoice #" + invoiceId,
                    "FAILED",
                    "Giao dịch thanh toán thất bại cho hóa đơn #" + invoiceId + " (" + paymentMethod + ")"
            );
            throw new BadRequestException(
                    "Giao dịch thanh toán thất bại. Hóa đơn vẫn giữ trạng thái PENDING, vui lòng thử lại."
            );
        }

        BigDecimal totalAmount = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal discountAmount = invoice.getDiscountAmount() == null
                ? BigDecimal.ZERO
                : invoice.getDiscountAmount();

        BigDecimal amountDue = totalAmount.subtract(discountAmount);
        if (amountDue.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException(
                    "Số tiền giảm giá không được vượt quá tổng hóa đơn."
            );
        }

        // FEFO stock deduction (BR-19)
        Integer recordId = invoice.getMedicalRecord() != null ? invoice.getMedicalRecord().getRecordId() : null;
        if (recordId != null) {
            Map<Integer, Integer> requiredMedicines = getRequiredMedicineQuantities(recordId);
            Map<InventoryBatch, Integer> deductionPlan = createStockDeductionPlan(requiredMedicines);

            for (Map.Entry<InventoryBatch, Integer> entry : deductionPlan.entrySet()) {
                InventoryBatch batch = entry.getKey();
                batch.setQuantityInStock(batch.getQuantityInStock() - entry.getValue());
            }
            if (!deductionPlan.isEmpty()) {
                inventoryBatchRepository.saveAll(deductionPlan.keySet());
            }
        }

        Payment payment = Payment.builder()
                .invoice(invoice)
                .paymentDate(LocalDateTime.now())
                .paymentMethod(paymentMethod)
                .amountPaid(amountDue)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        invoice.setStatus("PAID");
        invoiceRepository.save(invoice);

        recordBillingAudit(
                "INVOICE_PAYMENT",
                "Invoice #" + invoiceId,
                "SUCCESS",
                "Thanh toán thành công hóa đơn #" + invoiceId + " - Thực thu: " + amountDue
                        + " VNĐ - Phương thức: " + paymentMethod + " (Trừ kho FEFO hoàn tất)"
        );

        return new PaymentResponse(
                savedPayment.getPaymentId(),
                invoice.getInvoiceId(),
                savedPayment.getPaymentDate(),
                savedPayment.getPaymentMethod(),
                savedPayment.getAmountPaid()
        );
    }

    private void recordBillingAudit(String actionType, String affectedResource, String outcome, String details) {
        UserAccount actor = resolveCurrentUser();
        if (actor != null) {
            auditLogRepository.save(AuditLog.builder()
                    .userAccount(actor)
                    .actionTime(LocalDateTime.now())
                    .actionType(actionType)
                    .affectedResource(affectedResource)
                    .outcome(outcome)
                    .actionDetails("[" + actionType + "] [" + affectedResource + "] " + details)
                    .build());
        }
    }

    private UserAccount resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userAccountRepository.findById(principal.getId()).orElse(null);
        }
        if (authentication != null && authentication.getName() != null) {
            return userAccountRepository.findByUsernameOrEmail(authentication.getName()).orElse(null);
        }
        return userAccountRepository.findAll().stream().findFirst().orElse(null);
    }

    private Map<Integer, Integer> getRequiredMedicineQuantities(Integer recordId) {
        Map<Integer, Integer> requiredMedicines = new HashMap<>();

        Prescription prescription = prescriptionRepository
                .findByMedicalRecord_RecordId(recordId)
                .orElse(null);

        if (prescription == null) {
            return requiredMedicines;
        }

        List<PrescriptionDetail> details =
                prescriptionDetailRepository.findByPrescription_PrescriptionId(
                        prescription.getPrescriptionId()
                );

        for (PrescriptionDetail detail : details) {
            Integer medicineId = detail.getMedicine().getMedicineId();
            Integer quantity = detail.getQuantity();

            if (quantity == null || quantity <= 0) {
                throw new BadRequestException(
                        "Số lượng thuốc trong đơn không hợp lệ."
                );
            }

            requiredMedicines.merge(medicineId, quantity, Integer::sum);
        }

        return requiredMedicines;
    }

    private Map<InventoryBatch, Integer> createStockDeductionPlan(
            Map<Integer, Integer> requiredMedicines
    ) {
        Map<InventoryBatch, Integer> deductionPlan = new LinkedHashMap<>();

        for (Map.Entry<Integer, Integer> entry : requiredMedicines.entrySet()) {
            Integer medicineId = entry.getKey();
            Integer requiredQuantity = entry.getValue();

            List<InventoryBatch> batches = inventoryBatchRepository
                    .findByMedicine_MedicineId(medicineId)
                    .stream()
                    .filter(batch -> batch.getExpirationDate() != null)
                    .filter(batch -> !batch.getExpirationDate().isBefore(LocalDate.now()))
                    .filter(batch -> batch.getQuantityInStock() != null
                            && batch.getQuantityInStock() > 0)
                    // FEFO: lo het han som nhat duoc su dung truoc (BR-19)
                    .sorted(Comparator.comparing(InventoryBatch::getExpirationDate))
                    .toList();

            int remaining = requiredQuantity;

            for (InventoryBatch batch : batches) {
                if (remaining <= 0) {
                    break;
                }

                int available = batch.getQuantityInStock();
                int quantityToDeduct = Math.min(available, remaining);

                deductionPlan.merge(batch, quantityToDeduct, Integer::sum);
                remaining -= quantityToDeduct;
            }

            if (remaining > 0) {
                throw new BadRequestException(
                        "Không đủ tồn kho khả dụng (chưa hết hạn) cho thuốc ID #" + medicineId
                                + " (thiếu " + remaining + " đơn vị) theo quy tắc FEFO."
                );
            }
        }

        return deductionPlan;
    }
}
