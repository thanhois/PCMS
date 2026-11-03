package com.pcms.dto.response.inventory;

import java.time.LocalDate;

public record InventoryBatchResponse(
        Integer batchId,
        Integer medicineId,
        String medicineName,
        String batchNumber,
        LocalDate expirationDate,
        Integer quantityInStock,
        String supplier
) {
}
