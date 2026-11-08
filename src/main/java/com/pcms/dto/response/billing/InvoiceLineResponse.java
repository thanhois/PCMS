
package com.pcms.dto.response.billing;

import java.math.BigDecimal;

public record InvoiceLineResponse(
        String itemType,
        String itemName,
        String unit,
        String dosage,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String notes
) {
}
