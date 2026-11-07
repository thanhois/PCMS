package com.pcms.dto.response.billing;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceResponse(
        Integer invoiceId,
        Integer recordId,
        String petName,
        String petSpecies,
        String petBreed,
        String ownerName,
        String ownerPhone,
        String ownerAddress,
        String veterinarianName,
        LocalDateTime invoiceDate,
        BigDecimal totalAmount,
        BigDecimal discountAmount,
        String status,
        List<LineItem> serviceItems,
        List<LineItem> medicineItems,
        List<PaymentResponse> payments
) {
    public record LineItem(
            String itemName,
            String unit,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal subTotal,
            String notes
    ) {
    }
}
