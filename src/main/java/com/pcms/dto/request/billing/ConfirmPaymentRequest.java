
package com.pcms.dto.request.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ConfirmPaymentRequest(

        @NotBlank(message = "Payment method is required")
        @Size(max = 50, message = "Payment method must not exceed 50 characters")
        String paymentMethod,

        @NotBlank(message = "Mock payment result is required")
        @Pattern(
                regexp = "SUCCESS|FAILED",
                message = "Mock payment result must be SUCCESS or FAILED"
        )
        String mockResult

) {
}
