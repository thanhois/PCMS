package com.pcms.dto.response.inventory;

import java.math.BigDecimal;

public record MedicineResponse(
        Integer medicineId,
        String medicineName,
        String unit,
        BigDecimal unitPrice,
        String status,
        Integer minThreshold
) {
}