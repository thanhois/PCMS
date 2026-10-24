package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.service.VeterinarianService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PET_OWNER', 'ADMIN', 'VETERINARIAN')")
public class PetOwnerPortalController {

    private final VeterinarianService veterinarianService;

    @GetMapping("/my-pets")
    public ResponseEntity<List<Map<String, Object>>> getMyPets(
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer ownerUserId = (principal != null) ? principal.getId() : null;
        return ResponseEntity.ok(veterinarianService.getMyPets(ownerUserId));
    }

    @GetMapping("/pets/{petId}/medical-history")
    public ResponseEntity<Map<String, Object>> getMyPetMedicalHistory(
            @PathVariable Integer petId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer ownerUserId = (principal != null && "PET_OWNER".equals(principal.getRole())) ? principal.getId() : null;
        return ResponseEntity.ok(veterinarianService.getMyPetMedicalHistory(petId, ownerUserId));
    }

    @GetMapping("/medical-records/{recordId}")
    public ResponseEntity<Map<String, Object>> getMyMedicalRecordPrintView(
            @PathVariable Integer recordId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer ownerUserId = (principal != null && "PET_OWNER".equals(principal.getRole())) ? principal.getId() : null;
        return ResponseEntity.ok(veterinarianService.getMyMedicalRecordPrintView(recordId, ownerUserId));
    }
}
