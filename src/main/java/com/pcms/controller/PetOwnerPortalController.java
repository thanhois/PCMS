package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.entity.Appointment;
import com.pcms.entity.Pet;
import com.pcms.entity.PetOwner;
import com.pcms.entity.Service;
import com.pcms.exception.BadRequestException;
import com.pcms.repository.AppointmentRepository;
import com.pcms.repository.PetOwnerRepository;
import com.pcms.repository.PetRepository;
import com.pcms.repository.ServiceRepository;
import com.pcms.service.VeterinarianService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PET_OWNER', 'ADMIN', 'VETERINARIAN', 'RECEPTIONIST')")
@Transactional(readOnly = true)
public class PetOwnerPortalController {

    private final VeterinarianService veterinarianService;
    private final PetOwnerRepository petOwnerRepository;
    private final PetRepository petRepository;
    private final AppointmentRepository appointmentRepository;
    private final ServiceRepository serviceRepository;

    @GetMapping("/services")
    public ResponseEntity<List<Map<String, Object>>> getServices() {
        List<Map<String, Object>> services = serviceRepository.findAll().stream()
                .filter(s -> s.getStatus() == null || "ACTIVE".equalsIgnoreCase(s.getStatus()))
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("serviceId", s.getServiceId());
                    m.put("serviceName", s.getServiceName());
                    m.put("description", s.getDescription());
                    m.put("price", s.getPrice());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(services);
    }

    @GetMapping("/my-pets")
    public ResponseEntity<List<Map<String, Object>>> getMyPets(
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer ownerUserId = (principal != null) ? principal.getId() : null;
        return ResponseEntity.ok(veterinarianService.getMyPets(ownerUserId));
    }

    @PostMapping("/pets")
    @Transactional
    public ResponseEntity<Map<String, Object>> createPet(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new BadRequestException("Vui lòng đăng nhập.");
        PetOwner owner = petOwnerRepository.findByUserAccount_UserId(principal.getId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ chủ nuôi liên kết với tài khoản này."));

        String petName = payload.get("petName") != null ? payload.get("petName").toString().trim() : "";
        if (petName.isBlank()) throw new BadRequestException("Tên thú cưng không được để trống.");

        String species = payload.get("species") != null ? payload.get("species").toString().trim() : "Chó";
        String breed = payload.get("breed") != null ? payload.get("breed").toString().trim() : "";
        String gender = payload.get("gender") != null ? payload.get("gender").toString().trim() : "Đực";
        BigDecimal weight = null;
        if (payload.get("weight") != null && !payload.get("weight").toString().isBlank()) {
            weight = new BigDecimal(payload.get("weight").toString().trim());
        }

        Pet pet = Pet.builder()
                .petOwner(owner)
                .petName(petName)
                .species(species)
                .breed(breed)
                .gender(gender)
                .weight(weight)
                .status("ACTIVE")
                .build();
        pet = petRepository.save(pet);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("petId", pet.getPetId());
        res.put("petName", pet.getPetName());
        res.put("species", pet.getSpecies());
        res.put("breed", pet.getBreed());
        res.put("gender", pet.getGender());
        res.put("weight", pet.getWeight());
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @GetMapping("/appointments")
    public ResponseEntity<List<Map<String, Object>>> getMyAppointments(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new BadRequestException("Vui lòng đăng nhập.");
        List<Appointment> apps = appointmentRepository.findByPetOwner_UserAccount_UserId(principal.getId());
        List<Map<String, Object>> result = apps.stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toAppointmentDto)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/appointments")
    @Transactional
    public ResponseEntity<Map<String, Object>> bookAppointment(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new BadRequestException("Vui lòng đăng nhập.");
        PetOwner owner = petOwnerRepository.findByUserAccount_UserId(principal.getId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ chủ nuôi cho tài khoản này."));

        if (payload.get("petId") == null || payload.get("petId").toString().isBlank()) {
            throw new BadRequestException("Vui lòng chọn thú cưng cần đặt lịch.");
        }
        Integer petId = Integer.valueOf(payload.get("petId").toString());
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thú cưng #" + petId));

        if (!owner.getOwnerId().equals(pet.getPetOwner().getOwnerId())) {
            throw new BadRequestException("Thú cưng này không thuộc sở hữu của bạn.");
        }

        String dateStr = (String) payload.get("appointmentDate");
        if (dateStr == null || dateStr.isBlank()) {
            throw new BadRequestException("Vui lòng chọn ngày khám.");
        }
        LocalDate aptDate = LocalDate.parse(dateStr.trim());
        if (aptDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày khám không được chọn trong quá khứ.");
        }

        String shift = payload.get("shift") != null ? payload.get("shift").toString().toUpperCase() : "MORNING";
        if (!"MORNING".equals(shift) && !"AFTERNOON".equals(shift)) {
            shift = "MORNING";
        }

        LocalTime time = "AFTERNOON".equals(shift) ? LocalTime.of(13, 30) : LocalTime.of(8, 0);
        LocalDateTime aptDateTime = aptDate.atTime(time);

        Service service = null;
        if (payload.get("serviceId") != null && !payload.get("serviceId").toString().isBlank()) {
            Integer serviceId = Integer.valueOf(payload.get("serviceId").toString());
            service = serviceRepository.findById(serviceId).orElse(null);
        }

        String notes = payload.get("notes") != null ? payload.get("notes").toString().trim() : "";
        String reason = payload.get("reason") != null && !payload.get("reason").toString().isBlank()
                ? payload.get("reason").toString().trim()
                : (service != null ? service.getServiceName() : "Đặt lịch khám qua web");
        if (!notes.isBlank() && !reason.contains(notes)) {
            reason = reason + " - " + notes;
        }

        Appointment app = Appointment.builder()
                .petOwner(owner)
                .pet(pet)
                .appointmentDate(aptDateTime)
                .shift(shift)
                .service(service)
                .status("PENDING_APPROVAL")
                .reason(reason)
                .notes(notes)
                .build();

        app = appointmentRepository.save(app);
        return ResponseEntity.status(HttpStatus.CREATED).body(toAppointmentDto(app));
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

    private Map<String, Object> toAppointmentDto(Appointment a) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("appointmentId", a.getAppointmentId());
        map.put("appointmentCode", "APT-" + String.format("%04d", a.getAppointmentId()));
        map.put("petId", a.getPet() != null ? a.getPet().getPetId() : null);
        map.put("petName", a.getPet() != null ? a.getPet().getPetName() : "");
        map.put("species", a.getPet() != null ? a.getPet().getSpecies() : "");
        map.put("breed", a.getPet() != null ? a.getPet().getBreed() : "");
        map.put("petWeight", a.getPet() != null ? a.getPet().getWeight() : null);
        map.put("ownerId", a.getPetOwner() != null ? a.getPetOwner().getOwnerId() : null);
        map.put("ownerName", a.getPetOwner() != null ? a.getPetOwner().getFullName() : "");
        map.put("ownerPhone", a.getPetOwner() != null ? a.getPetOwner().getPhoneNumber() : "");
        map.put("veterinarianId", a.getVeterinarian() != null ? a.getVeterinarian().getUserId() : null);
        map.put("veterinarianName", a.getVeterinarian() != null ? a.getVeterinarian().getFullName() : "Chưa chỉ định (Lễ tân điều phối khi Check-in)");
        map.put("serviceId", a.getService() != null ? a.getService().getServiceId() : null);
        map.put("serviceName", a.getService() != null ? a.getService().getServiceName() : "Khám tổng quát");
        map.put("servicePrice", a.getService() != null ? a.getService().getPrice() : null);
        map.put("shift", a.getShift() != null ? a.getShift() : "MORNING");
        map.put("shiftDisplay", "AFTERNOON".equalsIgnoreCase(a.getShift()) ? "Buổi chiều (13:30 - 17:30)" : "Buổi sáng (08:00 - 12:00)");
        map.put("appointmentDate", a.getAppointmentDate() != null ? a.getAppointmentDate().toLocalDate().toString() : "");
        map.put("status", a.getStatus() != null ? a.getStatus() : "");
        map.put("statusDisplay", mapStatus(a.getStatus()));
        map.put("reason", a.getReason() != null ? a.getReason() : "");
        map.put("notes", a.getNotes() != null ? a.getNotes() : "");
        return map;
    }

    private String mapStatus(String status) {
        if (status == null) return "Chờ duyệt";
        return switch (status.toUpperCase()) {
            case "PENDING_APPROVAL" -> "Chờ duyệt";
            case "CONFIRMED", "APPROVED" -> "Đã xác nhận";
            case "CHECKED_IN" -> "Đã đến quầy (Đang đợi khám)";
            case "IN_PROGRESS" -> "Đang khám";
            case "COMPLETED" -> "Hoàn tất khám";
            case "CANCELLED" -> "Đã hủy";
            case "REJECTED" -> "Bị từ chối";
            default -> status;
        };
    }
}
