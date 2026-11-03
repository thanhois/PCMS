
package com.pcms.service;

import com.pcms.dto.request.billing.ConfirmPaymentRequest;
import com.pcms.dto.request.billing.InvoiceUpdateRequest;
import com.pcms.dto.request.billing.VoidInvoiceRequest;
import com.pcms.dto.response.billing.InvoiceResponse;
import com.pcms.dto.response.billing.PaymentResponse;

import java.util.List;

public interface BillingService {

    List<InvoiceResponse> getPaymentQueue();

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
}
