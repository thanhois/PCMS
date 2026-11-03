package com.pcms.dto.request.inventory;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdjustStockRequest(

        @NotNull(message = "Quantity change is required")
        Integer quantityChange,

        @NotBlank(message = "Adjustment reason is required")
        @Size(max = 500, message = "Reason must not exceed 500 characters")
        String reason

) {
        @AssertTrue(message = "Quantity change must not be zero")
        public boolean isQuantityChangeValid() {
                return quantityChange == null || quantityChange != 0;
        }
}