
package com.pcms.dto.request.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ServiceStatusRequest(

        @NotBlank(message = "Service status is required")
        @Pattern(
                regexp = "ACTIVE|INACTIVE",
                message = "Service status must be ACTIVE or INACTIVE"
        )
        String status

) {
}
