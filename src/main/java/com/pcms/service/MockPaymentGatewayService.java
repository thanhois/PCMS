package com.pcms.service;

import java.math.BigDecimal;

public interface MockPaymentGatewayService {

    GatewayResult processCardPayment(
            Integer invoiceId,
            BigDecimal amount
    );

    record GatewayResult(
            boolean success,
            String transactionId,
            String message
    ) {
    }
}
