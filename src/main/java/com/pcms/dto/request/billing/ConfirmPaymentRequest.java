
package com.pcms.dto.request.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConfirmPaymentRequest(

        @NotBlank(message = "Payment method is required")
        @Size(max = 50, message = "Payment method must not exceed 50 characters")
        String paymentMethod,

        String mockResult

) {
}
