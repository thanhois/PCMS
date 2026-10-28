package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.service.ReceptionistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/receptionist")
@RequiredArgsConstructor
public class ReceptionistController {

    private final ReceptionistService receptionistService;

    private String resolveActor(UserPrincipal principal) {
        return principal != null ? principal.getUsername() : "receptionist";
    }

    // 1. DASHBOARD & CATALOG LOOKUP
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        return ResponseEntity.ok(receptionistService.getDashboardSummary());
    }

    @GetMapping("/catalog")
    public ResponseEntity<Map<String, Object>> getCatalogLookup() {
        return ResponseEntity.ok(receptionistService.getCatalogLookup());
    }

    // 2. APPOINTMENTS (UC06 - UC10)
    @GetMapping("/appointments")
    public ResponseEntity<List<Map<String, Object>>> getAppointments(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) Integer veterinarianId,
            @RequestParam(required = false, defaultValue = "") String search) {
        return ResponseEntity.ok(receptionistService.getAppointments(fromDate, toDate, status, veterinarianId, search));
    }

    @PostMapping("/appointments")
    public ResponseEntity<Map<String, Object>> createAppointment(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(receptionistService.createAppointment(payload, resolveActor(principal)));
    }

    @PatchMapping("/appointments/{appointmentId}/approve")
    public ResponseEntity<Map<String, Object>> approveAppointment(
            @PathVariable Integer appointmentId,
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(receptionistService.approveAppointment(appointmentId, payload, resolveActor(principal)));
    }

    @PatchMapping("/appointments/{appointmentId}/reject")
    public ResponseEntity<Map<String, Object>> rejectAppointment(
            @PathVariable Integer appointmentId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String reason = payload != null && payload.get("reason") != null
                ? String.valueOf(payload.get("reason")) : "";
        return ResponseEntity.ok(receptionistService.rejectAppointment(appointmentId, reason, resolveActor(principal)));
    }

    @PutMapping("/appointments/{appointmentId}/reschedule")
    public ResponseEntity<Map<String, Object>> rescheduleAppointment(
            @PathVariable Integer appointmentId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(receptionistService.rescheduleAppointment(appointmentId, payload, resolveActor(principal)));
    }

    @PatchMapping("/appointments/{appointmentId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelAppointment(
            @PathVariable Integer appointmentId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String reason = payload != null && payload.get("reason") != null
                ? String.valueOf(payload.get("reason")) : "";
        return ResponseEntity.ok(receptionistService.cancelAppointment(appointmentId, reason, resolveActor(principal)));
    }

    // 3. CHECK-IN & WALK-IN (UC11, UC12)
    @PatchMapping("/appointments/{appointmentId}/check-in")
    public ResponseEntity<Map<String, Object>> checkInAppointment(
            @PathVariable Integer appointmentId,
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(receptionistService.checkInAppointment(appointmentId, payload, resolveActor(principal)));
    }

    @PutMapping("/appointments/{appointmentId}/assign-vet")
    public ResponseEntity<Map<String, Object>> assignVeterinarian(
            @PathVariable Integer appointmentId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer vetId = payload != null && payload.get("veterinarianId") != null
                ? Integer.valueOf(String.valueOf(payload.get("veterinarianId")).trim()) : null;
        return ResponseEntity.ok(receptionistService.assignVeterinarian(appointmentId, vetId, resolveActor(principal)));
    }

    @PostMapping("/walk-in")
    public ResponseEntity<Map<String, Object>> processWalkIn(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(receptionistService.processWalkIn(payload, resolveActor(principal)));
    }

    // 4. PET OWNERS (UC16, UC17, UC19)
    @GetMapping("/owners")
    public ResponseEntity<List<Map<String, Object>>> getOwners(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(receptionistService.getOwners(search, status));
    }

    @PostMapping("/owners")
    public ResponseEntity<Map<String, Object>> createOwner(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(receptionistService.createOwner(payload, resolveActor(principal)));
    }

    @PutMapping("/owners/{ownerId}")
    public ResponseEntity<Map<String, Object>> updateOwner(
            @PathVariable Integer ownerId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(receptionistService.updateOwner(ownerId, payload, resolveActor(principal)));
    }

    @PatchMapping("/owners/{ownerId}/status")
    public ResponseEntity<Map<String, Object>> toggleOwnerStatus(
            @PathVariable Integer ownerId,
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String status = payload != null && payload.get("status") != null
                ? String.valueOf(payload.get("status")) : null;
        return ResponseEntity.ok(receptionistService.toggleOwnerStatus(ownerId, status, resolveActor(principal)));
    }

    // 5. PETS (UC13, UC14, UC15, UC37)
    @GetMapping("/pets")
    public ResponseEntity<List<Map<String, Object>>> getPets(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false) Integer ownerId,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(receptionistService.getPets(search, ownerId, status));
    }

    @PostMapping("/pets")
    public ResponseEntity<Map<String, Object>> createPet(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(receptionistService.createPet(payload, resolveActor(principal)));
    }

    @PutMapping("/pets/{petId}")
    public ResponseEntity<Map<String, Object>> updatePet(
            @PathVariable Integer petId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(receptionistService.updatePet(petId, payload, resolveActor(principal)));
    }

    @PatchMapping("/pets/{petId}/status")
    public ResponseEntity<Map<String, Object>> togglePetStatus(
            @PathVariable Integer petId,
            @RequestBody(required = false) Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String status = payload != null && payload.get("status") != null
                ? String.valueOf(payload.get("status")) : null;
        return ResponseEntity.ok(receptionistService.togglePetStatus(petId, status, resolveActor(principal)));
    }

    @GetMapping("/pets/{petId}/history")
    public ResponseEntity<Map<String, Object>> getPetHistory(@PathVariable Integer petId) {
        return ResponseEntity.ok(receptionistService.getPetHistory(petId));
    }
}
