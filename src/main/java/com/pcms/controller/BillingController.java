
package com.pcms.controller;

import com.pcms.dto.request.billing.ConfirmPaymentRequest;
import com.pcms.dto.request.billing.InvoiceUpdateRequest;
import com.pcms.dto.request.billing.VoidInvoiceRequest;
import com.pcms.dto.response.ApiResponse;
import com.pcms.dto.response.billing.InvoiceResponse;
import com.pcms.dto.response.billing.PaymentResponse;
import com.pcms.service.BillingService;
import org.springframework.security.access.prepost.PreAuthorize;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.pcms.dto.response.billing.CompletedMedicalRecordResponse;
import com.pcms.dto.response.billing.CreateInvoicePreviewResponse;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    // UC23: Lay danh sach hoa don cho thanh toan
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getPaymentQueue() {

        List<InvoiceResponse> invoices = billingService.getPaymentQueue();

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Payment queue retrieved successfully",
                        invoices
                )
        );
    }

    // UC23, UC27: Xem chi tiet hoa don
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @GetMapping("/invoices/{invoiceId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(
            @PathVariable Integer invoiceId
    ) {
        InvoiceResponse invoice = billingService.getInvoiceById(invoiceId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Invoice retrieved successfully",
                        invoice
                )
        );
    }

    // UC24: Cap nhat hoa don
    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PutMapping("/invoices/{invoiceId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> updateInvoice(
            @PathVariable Integer invoiceId,
            @Valid @RequestBody InvoiceUpdateRequest request
    ) {
        InvoiceResponse invoice = billingService.updateInvoice(
                invoiceId,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Invoice updated successfully",
                        invoice
                )
        );
    }

    // UC31: Void Invoice - Receptionist huy hoa don
    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PatchMapping("/invoices/{invoiceId}/void")
    public ResponseEntity<ApiResponse<InvoiceResponse>> voidInvoice(
            @PathVariable Integer invoiceId,
            @Valid @RequestBody VoidInvoiceRequest request
    ) {
        InvoiceResponse invoice = billingService.voidInvoice(
                invoiceId,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Invoice voided successfully",
                        invoice
                )
        );
    }

    // Lay tat ca hoa don cho Receptionist Invoice Management
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @GetMapping("/invoices")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getAllInvoices() {

        List<InvoiceResponse> invoices = billingService.getAllInvoices();

        return ResponseEntity.ok(
                ApiResponse.success(
                        "All invoices retrieved successfully",
                        invoices
                )
        );
    }

    // UC26: Xac nhan thanh toan
    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PostMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmPayment(
            @PathVariable Integer invoiceId,
            @Valid @RequestBody ConfirmPaymentRequest request
    ) {
        PaymentResponse payment = billingService.confirmPayment(
                invoiceId,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Payment completed successfully",
                        payment
                )
        );
    }
    // UC24: Lay danh sach benh an da hoan tat
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @GetMapping("/records/completed")
    public ResponseEntity<ApiResponse<List<CompletedMedicalRecordResponse>>>
    getCompletedMedicalRecords() {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Completed medical records retrieved successfully",
                        billingService.getCompletedMedicalRecords()
                )
        );
    }

    // UC24: Xem truoc va tao hoa don PENDING neu chua ton tai
    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PostMapping("/records/{recordId}/invoice-preview")
    public ResponseEntity<ApiResponse<CreateInvoicePreviewResponse>>
    createInvoicePreview(@PathVariable Integer recordId) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Invoice preview retrieved successfully",
                        billingService.createInvoicePreview(recordId)
                )
        );
    }
}
