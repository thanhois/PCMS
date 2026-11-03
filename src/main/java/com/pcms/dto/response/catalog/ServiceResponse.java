
package com.pcms.dto.response.catalog;

import java.math.BigDecimal;

public record ServiceResponse(
        Integer serviceId,
        String serviceName,
        String description,
        BigDecimal price,
        String status
) {
}
