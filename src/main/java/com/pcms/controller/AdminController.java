package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    //  1. OVERVIEW
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverviewSummary(
            @RequestParam(required = false, defaultValue = "2026") String year) {
        return ResponseEntity.ok(adminService.getOverviewSummary(year));
    }

    // 2. ACCOUNTS
    @GetMapping("/accounts")
    public ResponseEntity<Map<String, Object>> getAccounts(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "ALL") String role,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "10") int pageSize) {
        return ResponseEntity.ok(adminService.getAccounts(search, role, status, page, pageSize));
    }

    @PostMapping("/accounts")
    public ResponseEntity<Map<String, Object>> createAccount(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createAccount(payload, actor));
    }

    @PutMapping("/accounts/{userId}")
    public ResponseEntity<Map<String, Object>> updateAccount(
            @PathVariable Integer userId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        return ResponseEntity.ok(adminService.updateAccount(userId, payload, actor));
    }

    @PatchMapping("/accounts/{userId}/status")
    public ResponseEntity<Map<String, Object>> toggleAccountStatus(
            @PathVariable Integer userId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        String nextStatus = String.valueOf(payload.getOrDefault("status", "ACTIVE"));
        return ResponseEntity.ok(adminService.toggleAccountStatus(userId, nextStatus, actor));
    }

    @PostMapping("/accounts/{userId}/reset-password")
    public ResponseEntity<Map<String, Object>> resetAccountPassword(
            @PathVariable Integer userId,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        return ResponseEntity.ok(adminService.resetAccountPassword(userId, actor));
    }

    // 3. ROLES & PERMISSIONS
    @GetMapping("/roles-permissions")
    public ResponseEntity<Map<String, Object>> getRolesAndPermissions() {
        return ResponseEntity.ok(adminService.getRolesAndPermissions());
    }

    @PatchMapping("/accounts/{userId}/role")
    public ResponseEntity<Map<String, Object>> assignAccountRole(
            @PathVariable Integer userId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        String roleName = String.valueOf(payload.getOrDefault("roleName", ""));
        return ResponseEntity.ok(adminService.assignAccountRole(userId, roleName, actor));
    }

    // 4. SERVICES CATALOG
    @GetMapping("/services")
    public ResponseEntity<List<Map<String, Object>>> getServices() {
        return ResponseEntity.ok(adminService.getServices());
    }

    @PostMapping("/services")
    public ResponseEntity<Map<String, Object>> createService(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.saveService(null, payload, actor));
    }

    @PutMapping("/services/{serviceId}")
    public ResponseEntity<Map<String, Object>> updateService(
            @PathVariable Integer serviceId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        return ResponseEntity.ok(adminService.saveService(serviceId, payload, actor));
    }

    @PatchMapping("/services/{serviceId}/status")
    public ResponseEntity<Map<String, Object>> toggleServiceStatus(
            @PathVariable Integer serviceId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        String nextStatus = String.valueOf(payload.getOrDefault("status", "ACTIVE"));
        return ResponseEntity.ok(adminService.toggleServiceStatus(serviceId, nextStatus, actor));
    }

    // 5. MEDICINES CATALOG
    @GetMapping("/medicines")
    public ResponseEntity<List<Map<String, Object>>> getMedicines() {
        return ResponseEntity.ok(adminService.getMedicines());
    }

    @PostMapping("/medicines")
    public ResponseEntity<Map<String, Object>> createMedicine(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.saveMedicine(null, payload, actor));
    }

    @PutMapping("/medicines/{medicineId}")
    public ResponseEntity<Map<String, Object>> updateMedicine(
            @PathVariable Integer medicineId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        return ResponseEntity.ok(adminService.saveMedicine(medicineId, payload, actor));
    }

    @PatchMapping("/medicines/{medicineId}/status")
    public ResponseEntity<Map<String, Object>> toggleMedicineStatus(
            @PathVariable Integer medicineId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getUsername() : "admin";
        String nextStatus = String.valueOf(payload.getOrDefault("status", "ACTIVE"));
        return ResponseEntity.ok(adminService.toggleMedicineStatus(medicineId, nextStatus, actor));
    }

    // 6. REPORTS
    @GetMapping("/reports")
    public ResponseEntity<Map<String, Object>> getReports(
            @RequestParam(required = false, defaultValue = "2026-03-01") String fromDate,
            @RequestParam(required = false, defaultValue = "2026-10-31") String toDate) {
        return ResponseEntity.ok(adminService.getReports(fromDate, toDate));
    }

    //7. AUDIT LOGS
    @GetMapping("/audit-logs")
    public ResponseEntity<List<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false, defaultValue = "") String fromDate,
            @RequestParam(required = false, defaultValue = "") String toDate,
            @RequestParam(required = false, defaultValue = "ALL") String username,
            @RequestParam(required = false, defaultValue = "ALL") String actionType) {
        return ResponseEntity.ok(adminService.getAuditLogs(fromDate, toDate, username, actionType));
    }
}
