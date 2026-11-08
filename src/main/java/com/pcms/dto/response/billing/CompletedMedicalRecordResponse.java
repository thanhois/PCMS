
package com.pcms.dto.response.billing;

import java.time.LocalDateTime;

public record CompletedMedicalRecordResponse(
        Integer recordId,
        LocalDateTime visitDate,
        String petName,
        String ownerName,
        String ownerPhone,
        Integer appointmentId
) {
}
