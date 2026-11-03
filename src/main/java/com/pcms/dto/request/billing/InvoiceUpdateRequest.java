
package com.pcms.dto.request.billing;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record InvoiceUpdateRequest(

        @NotNull(message = "Discount amount is required")
        @DecimalMin(value = "0.0", inclusive = true,
                message = "Discount amount must not be negative")
        BigDecimal discountAmount

) {
}

