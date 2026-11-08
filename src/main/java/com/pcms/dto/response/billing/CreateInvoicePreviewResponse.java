
package com.pcms.dto.response.billing;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CreateInvoicePreviewResponse(
        Integer invoiceId,
        Integer recordId,
        String petName,
        String ownerName,
        String ownerPhone,
        LocalDateTime visitDate,
        String invoiceStatus,
        List<InvoiceLineResponse> items,
        BigDecimal totalAmount,
        BigDecimal discountAmount,
        BigDecimal amountDue,
        boolean existingInvoice
) {
}
