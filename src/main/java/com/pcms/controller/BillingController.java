package com.pcms.controller;

import com.pcms.dto.request.billing.ConfirmPaymentRequest;
import com.pcms.dto.request.billing.InvoiceUpdateRequest;
import com.pcms.dto.request.billing.VoidInvoiceRequest;
import com.pcms.dto.response.ApiResponse;
import com.pcms.dto.response.billing.InvoiceResponse;
import com.pcms.dto.response.billing.PaymentResponse;
import com.pcms.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    // UC23: Lay danh sach hoa don (mac dinh PENDING, ho tro loc PAID/VOID/ALL de in lai bien lai UC27)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getPaymentQueue(
            @RequestParam(required = false, defaultValue = "PENDING") String status
    ) {
        List<InvoiceResponse> invoices = billingService.getPaymentQueue(status);
        return ResponseEntity.ok(
                ApiResponse.success("Payment queue retrieved successfully", invoices)
        );
    }

    // UC23, UC27: Xem chi tiet hoa don & bien lai
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @GetMapping("/invoices/{invoiceId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(
            @PathVariable Integer invoiceId
    ) {
        InvoiceResponse invoice = billingService.getInvoiceById(invoiceId);
        return ResponseEntity.ok(
                ApiResponse.success("Invoice retrieved successfully", invoice)
        );
    }

    // UC24: Cap nhat hoa don (giam gia)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @PutMapping("/invoices/{invoiceId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> updateInvoice(
            @PathVariable Integer invoiceId,
            @Valid @RequestBody InvoiceUpdateRequest request
    ) {
        InvoiceResponse invoice = billingService.updateInvoice(invoiceId, request);
        return ResponseEntity.ok(
                ApiResponse.success("Invoice updated successfully", invoice)
        );
    }

    // UC25: Huy hoa don (Void Invoice — chi ADMIN theo SRS 4.2 & Bang 5.2)
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/invoices/{invoiceId}/void")
    public ResponseEntity<ApiResponse<InvoiceResponse>> voidInvoice(
            @PathVariable Integer invoiceId,
            @Valid @RequestBody VoidInvoiceRequest request
    ) {
        InvoiceResponse invoice = billingService.voidInvoice(invoiceId, request);
        return ResponseEntity.ok(
                ApiResponse.success("Invoice voided successfully", invoice)
        );
    }

    // UC26: Xac nhan thanh toan (FEFO stock deduction)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @PostMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmPayment(
            @PathVariable Integer invoiceId,
            @Valid @RequestBody ConfirmPaymentRequest request
    ) {
        PaymentResponse payment = billingService.confirmPayment(invoiceId, request);
        return ResponseEntity.ok(
                ApiResponse.success("Payment completed successfully", payment)
        );
    }
}
