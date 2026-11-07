package com.pcms.dto.request.inventory;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record ReceiveStockRequest(

        @NotNull(message = "Medicine ID is required")
        @Min(value = 1, message = "Medicine ID must be greater than 0")
        Integer medicineId,

        @NotBlank(message = "Batch number is required")
        @Size(max = 80, message = "Batch number must not exceed 80 characters")
        String batchNumber,

        @NotNull(message = "Expiration date is required")
        @Future(message = "Expiration date must be in the future")
        LocalDate expirationDate,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be greater than 0")
        Integer quantity,

        @Size(max = 150, message = "Supplier must not exceed 150 characters")
        String supplier

) {
}
