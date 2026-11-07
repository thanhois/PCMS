
package com.pcms.dto.request.inventory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MedicineStatusRequest(
        @NotBlank(message = "Medicine status is required")
        @Pattern(
                regexp = "ACTIVE|INACTIVE",
                message = "Medicine status must be ACTIVE or INACTIVE"
        )
        String status
) {
}
