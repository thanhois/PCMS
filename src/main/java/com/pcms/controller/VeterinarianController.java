package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.service.VeterinarianService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vet")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('VETERINARIAN', 'ADMIN')")
public class VeterinarianController {

    private final VeterinarianService veterinarianService;

    // =========================================================================
    // 1. QUẢN LÝ CÔNG VIỆC & CA KHÁM (UC-01, UC-02)
    // =========================================================================

    @GetMapping("/appointments")
    public ResponseEntity<Map<String, Object>> getAssignedAppointments(
            @RequestParam(required = false, defaultValue = "") String date,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "") String search,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer vetId = (principal != null && "VETERINARIAN".equals(principal.getRole())) ? principal.getId() : null;
        return ResponseEntity.ok(veterinarianService.getAssignedAppointments(date, status, search, vetId));
    }

    @GetMapping("/appointments/summary")
    public ResponseEntity<Map<String, Object>> getWorklistSummary(
            @RequestParam(required = false, defaultValue = "") String date,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer vetId = (principal != null && "VETERINARIAN".equals(principal.getRole())) ? principal.getId() : null;
        return ResponseEntity.ok(veterinarianService.getWorklistSummary(date, vetId));
    }

    @PatchMapping("/appointments/{id}/status")
    public ResponseEntity<Map<String, Object>> updateAppointmentStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        String status = String.valueOf(payload.getOrDefault("status", "IN_PROGRESS"));
        String notes = (payload.containsKey("notes")) ? String.valueOf(payload.get("notes")) : "";
        return ResponseEntity.ok(veterinarianService.updateAppointmentStatus(id, status, notes, actor));
    }

    @PostMapping("/appointments/{id}/start")
    public ResponseEntity<Map<String, Object>> startExamination(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.startExamination(id, actor));
    }

    // =========================================================================
    // 2. QUÁ TRÌNH KHÁM & BỆNH SỬ PET (UC-03, UC-04)
    // =========================================================================

    @GetMapping("/pets/{petId}/history")
    public ResponseEntity<Map<String, Object>> getPetMedicalHistory(@PathVariable Integer petId) {
        return ResponseEntity.ok(veterinarianService.getPetMedicalHistory(petId));
    }

    @PatchMapping("/pets/{petId}/vitals")
    public ResponseEntity<Map<String, Object>> updatePetVitals(
            @PathVariable Integer petId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.updatePetVitals(petId, payload, actor));
    }

    @GetMapping("/pets/search")
    public ResponseEntity<List<Map<String, Object>>> searchPets(
            @RequestParam(required = false, defaultValue = "") String query) {
        return ResponseEntity.ok(veterinarianService.searchPets(query));
    }

    // =========================================================================
    // 3. QUẢN LÝ BỆNH ÁN (UC-05, UC-06, UC-07, UC-08)
    // =========================================================================

    @GetMapping("/medical-records")
    public ResponseEntity<Map<String, Object>> getMedicalRecords(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "") String fromDate,
            @RequestParam(required = false, defaultValue = "") String toDate,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "10") int pageSize,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer vetId = (principal != null && "VETERINARIAN".equals(principal.getRole())) ? principal.getId() : null;
        return ResponseEntity.ok(veterinarianService.getMedicalRecords(search, fromDate, toDate, status, vetId, page, pageSize));
    }

    @GetMapping("/medical-records/{id}")
    public ResponseEntity<Map<String, Object>> getMedicalRecordDetail(@PathVariable Integer id) {
        return ResponseEntity.ok(veterinarianService.getMedicalRecordDetail(id));
    }

    @PostMapping("/medical-records")
    public ResponseEntity<Map<String, Object>> createMedicalRecord(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(veterinarianService.createMedicalRecord(payload, actor));
    }

    @PutMapping("/medical-records/{id}")
    public ResponseEntity<Map<String, Object>> updateMedicalRecord(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.updateMedicalRecord(id, payload, actor));
    }

    @PostMapping("/medical-records/{id}/complete")
    public ResponseEntity<Map<String, Object>> completeMedicalRecord(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.completeMedicalRecord(id, payload, actor));
    }

    @PostMapping("/medical-records/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelMedicalRecord(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        String reason = String.valueOf(payload.getOrDefault("reason", "Hủy theo yêu cầu chuyên môn"));
        return ResponseEntity.ok(veterinarianService.cancelMedicalRecord(id, reason, actor));
    }

    // =========================================================================
    // 4. CHỈ ĐỊNH DỊCH VỤ / Y LỆNH (UC-09, UC-10, UC-11, UC-12)
    // =========================================================================

    @GetMapping("/services")
    public ResponseEntity<List<Map<String, Object>>> getAvailableServices() {
        return ResponseEntity.ok(veterinarianService.getAvailableServices());
    }

    @GetMapping("/medical-records/{recordId}/services")
    public ResponseEntity<List<Map<String, Object>>> getRecordServices(@PathVariable Integer recordId) {
        return ResponseEntity.ok(veterinarianService.getRecordServices(recordId));
    }

    @PostMapping("/medical-records/{recordId}/services")
    public ResponseEntity<Map<String, Object>> addServiceOrder(
            @PathVariable Integer recordId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(veterinarianService.addServiceOrder(recordId, payload, actor));
    }

    @PutMapping("/medical-records/{recordId}/services/{detailId}")
    public ResponseEntity<Map<String, Object>> updateServiceOrder(
            @PathVariable Integer recordId,
            @PathVariable Integer detailId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.updateServiceOrder(recordId, detailId, payload, actor));
    }

    @DeleteMapping("/medical-records/{recordId}/services/{detailId}")
    public ResponseEntity<Map<String, Object>> deleteServiceOrder(
            @PathVariable Integer recordId,
            @PathVariable Integer detailId,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.deleteServiceOrder(recordId, detailId, actor));
    }

    // =========================================================================
    // 5. KÊ ĐƠN THUỐC & TÁI KHÁM (UC-13, UC-14)
    // =========================================================================

    @GetMapping("/medicines")
    public ResponseEntity<List<Map<String, Object>>> getAvailableMedicines() {
        return ResponseEntity.ok(veterinarianService.getAvailableMedicines());
    }

    @GetMapping("/medical-records/{recordId}/prescription")
    public ResponseEntity<Map<String, Object>> getRecordPrescription(@PathVariable Integer recordId) {
        return ResponseEntity.ok(veterinarianService.getRecordPrescription(recordId));
    }

    @PostMapping("/medical-records/{recordId}/prescription")
    public ResponseEntity<Map<String, Object>> savePrescription(
            @PathVariable Integer recordId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.savePrescription(recordId, payload, actor));
    }

    @DeleteMapping("/medical-records/{recordId}/prescription")
    public ResponseEntity<Map<String, Object>> deletePrescription(
            @PathVariable Integer recordId,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.deletePrescription(recordId, actor));
    }

    @GetMapping("/medical-records/{recordId}/follow-ups")
    public ResponseEntity<List<Map<String, Object>>> getRecordFollowUps(@PathVariable Integer recordId) {
        return ResponseEntity.ok(veterinarianService.getRecordFollowUps(recordId));
    }

    @PostMapping("/medical-records/{recordId}/follow-ups")
    public ResponseEntity<Map<String, Object>> createFollowUp(
            @PathVariable Integer recordId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(veterinarianService.createFollowUp(recordId, payload, actor));
    }

    @DeleteMapping("/follow-ups/{followUpId}")
    public ResponseEntity<Map<String, Object>> deleteFollowUp(
            @PathVariable Integer followUpId,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = (principal != null) ? principal.getUsername() : "vet";
        return ResponseEntity.ok(veterinarianService.deleteFollowUp(followUpId, actor));
    }
}
