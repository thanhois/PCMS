package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.service.PetOwnerPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import com.pcms.service.BillingService;
import com.pcms.dto.response.ApiResponse;
import com.pcms.dto.response.billing.InvoiceResponse;
import com.pcms.dto.response.billing.PaymentResponse;
import com.pcms.dto.request.billing.ConfirmPaymentRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/owner")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PET_OWNER', 'ADMIN', 'VETERINARIAN', 'RECEPTIONIST')")
public class PetOwnerPortalController {

    private final PetOwnerPortalService petOwnerPortalService;
    private final BillingService billingService;

    @GetMapping("/services")
    public ResponseEntity<List<Map<String, Object>>> getServices() {
        return ResponseEntity.ok(petOwnerPortalService.getActiveServices());
    }

    @GetMapping("/veterinarians")
    public ResponseEntity<List<Map<String, Object>>> getVeterinarians() {
        return ResponseEntity.ok(petOwnerPortalService.getActiveVeterinarians());
    }

    @GetMapping("/available-slots")
    public ResponseEntity<List<Map<String, Object>>> getAvailableSlots(
            @RequestParam String date,
            @RequestParam(required = false) Integer veterinarianId) {
        return ResponseEntity.ok(petOwnerPortalService.getAvailableSlots(date, veterinarianId));
    }

    @GetMapping("/my-pets")
    public ResponseEntity<List<Map<String, Object>>> getMyPets(
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(petOwnerPortalService.getMyPets(userId));
    }

    @PostMapping("/pets")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<Map<String, Object>> createPet(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(petOwnerPortalService.createPet(principal != null ? principal.getId() : null, payload));
    }

    @PutMapping("/pets/{petId}")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<Map<String, Object>> updatePet(
            @PathVariable Integer petId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(petOwnerPortalService.updatePet(
                principal != null ? principal.getId() : null, petId, payload));
    }

    @PatchMapping("/pets/{petId}/status")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<Map<String, Object>> updatePetStatus(
            @PathVariable Integer petId,
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String status = payload != null && payload.get("status") != null
                ? String.valueOf(payload.get("status"))
                : "INACTIVE";
        return ResponseEntity.ok(petOwnerPortalService.updatePetStatus(
                principal != null ? principal.getId() : null, petId, status));
    }

    @GetMapping("/appointments")
    public ResponseEntity<List<Map<String, Object>>> getMyAppointments(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(petOwnerPortalService.getMyAppointments(
                principal != null ? principal.getId() : null));
    }

    @PostMapping("/appointments")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<Map<String, Object>> bookAppointment(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(petOwnerPortalService.bookAppointment(
                        principal != null ? principal.getId() : null, payload));
    }

    @PutMapping("/appointments/{appointmentId}/reschedule")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<Map<String, Object>> rescheduleAppointment(
            @PathVariable Integer appointmentId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(petOwnerPortalService.rescheduleMyAppointment(
                principal != null ? principal.getId() : null, appointmentId, payload));
    }

    @PatchMapping("/appointments/{appointmentId}/cancel")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<Map<String, Object>> cancelAppointment(
            @PathVariable Integer appointmentId,
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String reason = payload != null && payload.get("reason") != null
                ? String.valueOf(payload.get("reason"))
                : null;
        return ResponseEntity.ok(petOwnerPortalService.cancelMyAppointment(
                principal != null ? principal.getId() : null, appointmentId, reason));
    }

    @GetMapping("/pets/{petId}/medical-history")
    public ResponseEntity<Map<String, Object>> getMyPetMedicalHistory(
            @PathVariable Integer petId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer ownerUserId = (principal != null && "PET_OWNER".equals(principal.getRole())) ? principal.getId() : null;
        return ResponseEntity.ok(petOwnerPortalService.getMyPetMedicalHistory(petId, ownerUserId));
    }

    @GetMapping("/medical-records/{recordId}")
    public ResponseEntity<Map<String, Object>> getMyMedicalRecordPrintView(
            @PathVariable Integer recordId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer ownerUserId = (principal != null && "PET_OWNER".equals(principal.getRole())) ? principal.getId() : null;
        return ResponseEntity.ok(petOwnerPortalService.getMyMedicalRecordPrintView(recordId, ownerUserId));
    }

    @GetMapping("/invoices")
    public ResponseEntity<List<Map<String, Object>>> getMyInvoices(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(petOwnerPortalService.getMyInvoices(
                principal != null ? principal.getId() : null));
    }
    @GetMapping("/my-invoices")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<List<InvoiceResponse>> getMyBillingInvoices(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                billingService.getMyInvoices(principal.getId())
        );
    }
    @GetMapping("/my-invoices/{invoiceId}")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<InvoiceResponse> getMyInvoiceById(
            @PathVariable Integer invoiceId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                billingService.getMyInvoiceById(
                        invoiceId,
                        principal.getId()
                )
        );
    }

    @PostMapping("/my-invoices/{invoiceId}/pay")
    @PreAuthorize("hasRole('PET_OWNER')")
    public ResponseEntity<ApiResponse<PaymentResponse>> payMyInvoice(
            @PathVariable Integer invoiceId,
            @Valid @RequestBody ConfirmPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer ownerUserId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                "Thanh toán hóa đơn thành công",
                billingService.payMyInvoice(invoiceId, request, ownerUserId)
        ));
    }
}
