package com.pcms.service;

import com.pcms.dto.request.billing.ConfirmPaymentRequest;
import com.pcms.dto.request.billing.InvoiceUpdateRequest;
import com.pcms.dto.request.billing.VoidInvoiceRequest;
import com.pcms.dto.response.billing.CompletedMedicalRecordResponse;
import com.pcms.dto.response.billing.CreateInvoicePreviewResponse;
import com.pcms.dto.response.billing.InvoiceResponse;
import com.pcms.dto.response.billing.PaymentResponse;

import java.util.List;

public interface BillingService {

    List<InvoiceResponse> getPaymentQueue();

    List<InvoiceResponse> getPaymentQueue(String status);

    InvoiceResponse getInvoiceById(Integer invoiceId);

    InvoiceResponse updateInvoice(
            Integer invoiceId,
            InvoiceUpdateRequest request
    );

    InvoiceResponse voidInvoice(
            Integer invoiceId,
            VoidInvoiceRequest request
    );

    PaymentResponse confirmPayment(
            Integer invoiceId,
            ConfirmPaymentRequest request
    );

    PaymentResponse payMyInvoice(
            Integer invoiceId,
            ConfirmPaymentRequest request,
            Integer ownerUserId
    );

    List<InvoiceResponse> getAllInvoices();


    List<InvoiceResponse> getMyInvoices(Integer userId);

    InvoiceResponse getMyInvoiceById(Integer invoiceId, Integer userId);

    List<CompletedMedicalRecordResponse> getCompletedMedicalRecords();

    CreateInvoicePreviewResponse createInvoicePreview(Integer recordId);
}
