package com.pcms.dto.response.billing;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Integer paymentId,
        Integer invoiceId,
        LocalDateTime paymentDate,
        String paymentMethod,
        BigDecimal amountPaid
) {
}
