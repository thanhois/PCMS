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
import com.pcms.entity.Payment;
import com.pcms.entity.Prescription;
import com.pcms.entity.PrescriptionDetail;
import com.pcms.entity.UserAccount;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.AuditLogRepository;
import com.pcms.repository.InventoryBatchRepository;
import com.pcms.repository.InvoiceRepository;
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
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionDetailRepository prescriptionDetailRepository;
    private final InventoryBatchRepository inventoryBatchRepository;

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getPaymentQueue() {
        return invoiceRepository.findAll()
                .stream()
                .filter(invoice -> "PENDING".equalsIgnoreCase(invoice.getStatus()))
                .map(this::mapToInvoiceResponse)
                .toList();
    }

    private InvoiceResponse mapToInvoiceResponse(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getInvoiceId(),
                invoice.getMedicalRecord().getRecordId(),
                invoice.getMedicalRecord().getPet().getPetName(),
                invoice.getMedicalRecord().getPet().getPetOwner().getFullName(),
                invoice.getInvoiceDate(),
                invoice.getTotalAmount(),
                invoice.getDiscountAmount(),
                invoice.getStatus()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Integer invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Invoice not found with ID: " + invoiceId
                ));

        return mapToInvoiceResponse(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse updateInvoice(
            Integer invoiceId,
            InvoiceUpdateRequest request
    ) {
        // Tim hoa don
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Invoice not found with ID: " + invoiceId
                ));

        // Chi cho phep chinh sua hoa don dang cho thanh toan
        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException(
                    "Only PENDING invoices can be updated"
            );
        }

        // Kiem tra discount khong duoc lon hon tong tien
        BigDecimal discountAmount = request.discountAmount();

        if (discountAmount.compareTo(invoice.getTotalAmount()) > 0) {
            throw new BadRequestException(
                    "Discount amount cannot exceed invoice total"
            );
        }

        // Cap nhat tien giam gia
        invoice.setDiscountAmount(discountAmount);

        // Luu hoa don
        Invoice updatedInvoice = invoiceRepository.save(invoice);

        return mapToInvoiceResponse(updatedInvoice);
    }

    @Override
    @Transactional
    public InvoiceResponse voidInvoice(
            Integer invoiceId,
            VoidInvoiceRequest request
    ) {
        // 1. Tim hoa don
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Invoice not found with ID: " + invoiceId
                ));

        // 2. Chi cho phep huy hoa don PENDING
        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException(
                    "Only PENDING invoices can be voided"
            );
        }

        // 3. Lay thong tin nguoi dang dang nhap
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new BadRequestException(
                    "Unable to identify the current user"
            );
        }

        // 4. Tim UserAccount trong database
        UserAccount user = userAccountRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with ID: " + principal.getId()
                ));

        // 5. Cap nhat trang thai hoa don
        invoice.setStatus("VOID");

        Invoice voidedInvoice = invoiceRepository.save(invoice);

        // 6. Ghi nhat ky huy hoa don
        AuditLog auditLog = AuditLog.builder()
                .userAccount(user)
                .actionTime(LocalDateTime.now())
                .actionDetails(
                        "Voided invoice #" + invoiceId
                                + ". Reason: " + request.reason()
                )
                .build();

        auditLogRepository.save(auditLog);

        // 7. Tra ve thong tin hoa don
        return mapToInvoiceResponse(voidedInvoice);
    }

    @Override
    @Transactional
    public PaymentResponse confirmPayment(
            Integer invoiceId,
            ConfirmPaymentRequest request
    ) {
        // 1. Tim hoa don
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Invoice not found with ID: " + invoiceId
                ));

        // 2. Chi cho phep thanh toan hoa don PENDING
        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException(
                    "Only PENDING invoices can be paid"
            );
        }

        // 3. Kiem tra phuong thuc thanh toan
        String paymentMethod = request.paymentMethod().trim().toUpperCase();

        if (!List.of("CASH", "CARD", "BANK_TRANSFER").contains(paymentMethod)) {
            throw new BadRequestException(
                    "Invalid payment method. Supported methods: CASH, CARD, BANK_TRANSFER"
            );
        }

        // 4. Kiem tra giao dich trung lap
        if (!paymentRepository.findByInvoice_InvoiceId(invoiceId).isEmpty()) {
            throw new BadRequestException(
                    "This invoice already has a payment transaction"
            );
        }

        // 5. Kiem tra ket qua mock payment
// 5. Kiem tra ket qua mock payment
        String mockResult = request.mockResult();

        if (!"SUCCESS".equalsIgnoreCase(mockResult)
                && !"FAILED".equalsIgnoreCase(mockResult)) {
            throw new BadRequestException(
                    "Invalid mock payment result. Supported values: SUCCESS, FAILED"
            );
        }

        if ("FAILED".equalsIgnoreCase(mockResult)) {
            throw new BadRequestException(
                    "Payment failed. Please try again"
            );
        }

        // 6. Tinh so tien thuc te can thanh toan
        BigDecimal totalAmount = invoice.getTotalAmount();
        BigDecimal discountAmount = invoice.getDiscountAmount() == null
                ? BigDecimal.ZERO
                : invoice.getDiscountAmount();

        BigDecimal amountDue = totalAmount.subtract(discountAmount);

        if (amountDue.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException(
                    "Discount cannot exceed invoice total"
            );
        }

        // 7. Lay danh sach thuoc can tru kho
        Integer recordId = invoice.getMedicalRecord().getRecordId();

        Map<Integer, Integer> requiredMedicines =
                getRequiredMedicineQuantities(recordId);

        // 8. Kiem tra ton kho va lap ke hoach tru kho
        Map<InventoryBatch, Integer> deductionPlan =
                createStockDeductionPlan(requiredMedicines);

        // 9. Thuc hien tru kho sau khi da kiem tra tat ca thuoc
        for (Map.Entry<InventoryBatch, Integer> entry : deductionPlan.entrySet()) {
            InventoryBatch batch = entry.getKey();

            batch.setQuantityInStock(
                    batch.getQuantityInStock() - entry.getValue()
            );
        }

        inventoryBatchRepository.saveAll(deductionPlan.keySet());

        // 10. Tao giao dich thanh toan
        Payment payment = Payment.builder()
                .invoice(invoice)
                .paymentDate(LocalDateTime.now())
                .paymentMethod(paymentMethod)
                .amountPaid(amountDue)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // 11. Cap nhat trang thai hoa don
        invoice.setStatus("PAID");
        invoiceRepository.save(invoice);

        // 12. Tra ve ket qua
        return new PaymentResponse(
                savedPayment.getPaymentId(),
                invoice.getInvoiceId(),
                savedPayment.getPaymentDate(),
                savedPayment.getPaymentMethod(),
                savedPayment.getAmountPaid()
        );
    }
    private Map<Integer, Integer> getRequiredMedicineQuantities(
            Integer recordId
    ) {
        Map<Integer, Integer> requiredMedicines = new HashMap<>();

        // Tim don thuoc theo medical record
        Prescription prescription = prescriptionRepository
                .findByMedicalRecord_RecordId(recordId)
                .orElse(null);

        // Ho so khong co don thuoc
        if (prescription == null) {
            return requiredMedicines;
        }

        // Lay chi tiet don thuoc
        List<PrescriptionDetail> details =
                prescriptionDetailRepository.findByPrescription_PrescriptionId(
                        prescription.getPrescriptionId()
                );

        // Gop so luong neu mot loai thuoc xuat hien nhieu dong
        for (PrescriptionDetail detail : details) {
            Integer medicineId = detail.getMedicine().getMedicineId();
            Integer quantity = detail.getQuantity();

            if (quantity == null || quantity <= 0) {
                throw new BadRequestException(
                        "Invalid medicine quantity in prescription"
                );
            }

            requiredMedicines.merge(
                    medicineId,
                    quantity,
                    Integer::sum
            );
        }

        return requiredMedicines;
    }
    private Map<InventoryBatch, Integer> createStockDeductionPlan(
            Map<Integer, Integer> requiredMedicines
    ) {
        Map<InventoryBatch, Integer> deductionPlan = new LinkedHashMap<>();

        // Xu ly tung loai thuoc
        for (Map.Entry<Integer, Integer> entry : requiredMedicines.entrySet()) {
            Integer medicineId = entry.getKey();
            Integer requiredQuantity = entry.getValue();

            // Lay cac lo thuoc cua medicine
            List<InventoryBatch> batches = inventoryBatchRepository
                    .findByMedicine_MedicineId(medicineId)
                    .stream()
                    .filter(batch -> batch.getExpirationDate() != null)
                    .filter(batch -> !batch.getExpirationDate().isBefore(LocalDate.now()))
                    .filter(batch -> batch.getQuantityInStock() != null
                            && batch.getQuantityInStock() > 0)
                    // FEFO: lo het han som nhat duoc su dung truoc
                    .sorted(Comparator.comparing(InventoryBatch::getExpirationDate))
                    .toList();

            int remaining = requiredQuantity;

            // Lap ke hoach tru kho, chua thay doi database
            for (InventoryBatch batch : batches) {
                if (remaining <= 0) {
                    break;
                }

                int available = batch.getQuantityInStock();
                int quantityToDeduct = Math.min(available, remaining);

                deductionPlan.merge(
                        batch,
                        quantityToDeduct,
                        Integer::sum
                );

                remaining -= quantityToDeduct;
            }

            // Neu thieu thuoc, dung giao dich
            if (remaining > 0) {
                throw new BadRequestException(
                        "Insufficient stock for medicine ID: " + medicineId
                );
            }
        }

        return deductionPlan;
    }
}
