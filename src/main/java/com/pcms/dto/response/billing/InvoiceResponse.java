package com.pcms.dto.response.billing;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceResponse(
        Integer invoiceId,
        Integer recordId,
        String petName,
        String ownerName,
        LocalDateTime invoiceDate,
        BigDecimal totalAmount,
        BigDecimal discountAmount,
        String status
) {
}
