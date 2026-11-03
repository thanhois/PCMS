
package com.pcms.dto.request.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VoidInvoiceRequest(

        @NotBlank(message = "Void reason is required")
        @Size(max = 500, message = "Void reason must not exceed 500 characters")
        String reason

) {
}

