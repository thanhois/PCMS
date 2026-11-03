
package com.pcms.dto.request.catalog;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ServiceRequest(

        @NotBlank(message = "Service name is required")
        @Size(max = 150, message = "Service name must not exceed 150 characters")
        String serviceName,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description,

        @NotNull(message = "Service price is required")
        @DecimalMin(value = "0.0", inclusive = false,
                message = "Service price must be greater than 0")
        BigDecimal price

) {
}
