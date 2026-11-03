
package com.pcms.dto.request.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record MedicineRequest(

        @NotBlank(message = "Medicine name is required")
        @Size(max = 150, message = "Medicine name must not exceed 150 characters")
        String medicineName,

        @NotBlank(message = "Unit is required")
        @Size(max = 50, message = "Unit must not exceed 50 characters")
        String unit,

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.0", inclusive = true,
                message = "Unit price must not be negative")
        BigDecimal unitPrice,

        @NotNull(message = "Minimum stock threshold is required")
        @Min(value = 0, message = "Minimum stock threshold must not be negative")
        Integer minThreshold

) {
}
