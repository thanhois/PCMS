
package com.pcms.service.impl;

import com.pcms.service.MockPaymentGatewayService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class MockPaymentGatewayServiceImpl
        implements MockPaymentGatewayService {

    @Value("${pcms.payment.mock.card-enabled:true}")
    private boolean cardEnabled;

    @Value("${pcms.payment.mock.card-result:SUCCESS}")
    private String cardResult;

    @Override
    public GatewayResult processCardPayment(
            Integer invoiceId,
            BigDecimal amount
    ) {
        if (!cardEnabled) {
            return new GatewayResult(
                    false,
                    null,
                    "Mock Card Payment Gateway is disabled"
            );
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return new GatewayResult(
                    false,
                    null,
                    "Invalid payment amount"
            );
        }

        String transactionId = "MOCK-CARD-"
                + UUID.randomUUID().toString().substring(0, 8)
                .toUpperCase();

        if ("SUCCESS".equalsIgnoreCase(cardResult)) {
            return new GatewayResult(
                    true,
                    transactionId,
                    "Mock card payment completed successfully"
            );
        }

        return new GatewayResult(
                false,
                transactionId,
                "Mock card payment was declined"
        );
    }
}
