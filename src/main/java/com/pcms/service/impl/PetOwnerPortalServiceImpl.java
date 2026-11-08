package com.pcms.service.impl;

import com.pcms.entity.*;
import com.pcms.event.AppointmentBookedEvent;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.*;
import com.pcms.service.PetOwnerPortalService;
import com.pcms.service.VeterinarianService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class PetOwnerPortalServiceImpl implements PetOwnerPortalService {

    private final VeterinarianService veterinarianService;
    private final PetOwnerRepository petOwnerRepository;
    private final PetRepository petRepository;
    private final AppointmentRepository appointmentRepository;
    private final ServiceRepository serviceRepository;
    private final UserAccountRepository userAccountRepository;
    private final DoctorScheduleSlotRepository doctorScheduleSlotRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogRepository auditLogRepository;
    private final ApplicationEventPublisher eventPublisher;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DT_DISPLAY_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private static final List<LocalTime> DEFAULT_SLOTS = List.of(
            LocalTime.of(8, 0), LocalTime.of(8, 30),
            LocalTime.of(9, 0), LocalTime.of(9, 30),
            LocalTime.of(10, 0), LocalTime.of(10, 30),
            LocalTime.of(11, 0), LocalTime.of(11, 30),
            LocalTime.of(13, 30), LocalTime.of(14, 0),
            LocalTime.of(14, 30), LocalTime.of(15, 0),
            LocalTime.of(15, 30), LocalTime.of(16, 0),
            LocalTime.of(16, 30), LocalTime.of(17, 0)
    );

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveServices() {
        return serviceRepository.findAll().stream()
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
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveVeterinarians() {
        return userAccountRepository.findAll().stream()
                .filter(u -> u.getStatus() == AccountStatus.ACTIVE
                        && u.getRole() != null
                        && "VETERINARIAN".equalsIgnoreCase(u.getRole().getRoleName()))
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("userId", u.getUserId());
                    m.put("fullName", u.getFullName());
                    m.put("email", u.getEmail());
                    return m;
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAvailableSlots(String dateStr, Integer veterinarianId) {
        LocalDate date;
        try {
            date = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr.trim()) : LocalDate.now();
        } catch (Exception e) {
            throw new BadRequestException("Định dạng ngày khám không hợp lệ.");
        }

        LocalDateTime minBookingTime = LocalDateTime.now().plusHours(2);
        List<Appointment> dayApps = appointmentRepository.findByAppointmentDateBetween(
                date.atStartOfDay(), date.atTime(LocalTime.MAX));

        List<DoctorScheduleSlot> configuredSlots = (veterinarianId != null && veterinarianId > 0)
                ? doctorScheduleSlotRepository.findByVeterinarian_UserIdAndSlotDateOrderByStartTimeAsc(veterinarianId, date)
                : List.of();

        List<LocalTime> candidateTimes = !configuredSlots.isEmpty()
                ? configuredSlots.stream().map(DoctorScheduleSlot::getStartTime).distinct().sorted().toList()
                : DEFAULT_SLOTS;

        List<Map<String, Object>> result = new ArrayList<>();
        for (LocalTime slotTime : candidateTimes) {
            LocalDateTime slotDateTime = LocalDateTime.of(date, slotTime);
            boolean pastMinLead = !slotDateTime.isBefore(minBookingTime);

            boolean slotBlocked = configuredSlots.stream()
                    .anyMatch(s -> s.getStartTime().equals(slotTime)
                            && ("BLOCKED".equalsIgnoreCase(s.getStatus()) || "BOOKED".equalsIgnoreCase(s.getStatus())));

            boolean vetBusy = false;
            if (veterinarianId != null && veterinarianId > 0) {
                vetBusy = dayApps.stream()
                        .filter(a -> a.getVeterinarian() != null && veterinarianId.equals(a.getVeterinarian().getUserId()))
                        .filter(a -> !Set.of("CANCELLED", "REJECTED").contains(a.getStatus() != null ? a.getStatus().toUpperCase() : ""))
                        .anyMatch(a -> a.getAppointmentDate() != null
                                && Math.abs(java.time.Duration.between(a.getAppointmentDate(), slotDateTime).toMinutes()) < 30);
            }

            boolean available = pastMinLead && !slotBlocked && !vetBusy;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("time", slotTime.format(TIME_FMT));
            m.put("shift", slotTime.getHour() < 12 ? "MORNING" : "AFTERNOON");
            m.put("available", available);
            m.put("reasonUnavailable", !pastMinLead ? "Cách hiện tại dưới 2 giờ"
                    : (slotBlocked || vetBusy ? "Đã kín lịch" : null));
            result.add(m);
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyPets(Integer userId) {
        if (userId == null) throw new BadRequestException("Vui lòng đăng nhập.");
        return petRepository.findByPetOwner_UserAccount_UserId(userId).stream()
                .filter(p -> !"INACTIVE".equalsIgnoreCase(p.getStatus()))
                .map(this::toPetDto)
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> createPet(Integer userId, Map<String, Object> payload) {
        PetOwner owner = requireActiveOwner(userId);

        String petName = strOrEmpty(payload.get("petName"));
        if (petName.isBlank()) throw new BadRequestException("Tên thú cưng không được để trống.");

        String species = strOrDefault(payload.get("species"), "Chó");
        String breed = strOrEmpty(payload.get("breed"));
        String gender = strOrDefault(payload.get("gender"), "UNKNOWN");
        String color = strOrNull(payload.get("color"));
        LocalDate dob = parseDateOrNull(payload.get("dateOfBirth"));
        BigDecimal weight = parseWeightOrNull(payload.get("weight"));

        Pet pet = Pet.builder()
                .petOwner(owner)
                .petName(petName)
                .species(species)
                .breed(breed)
                .gender(gender)
                .color(color)
                .dateOfBirth(dob)
                .weight(weight)
                .status("ACTIVE")
                .build();
        pet = petRepository.save(pet);
        recordAudit(userId, "OWNER_CREATE_PET", "Pet #" + pet.getPetId(),
                "Chủ nuôi tạo hồ sơ thú cưng " + pet.getPetName());
        return toPetDto(pet);
    }

    @Override
    @Transactional
    public Map<String, Object> updatePet(Integer userId, Integer petId, Map<String, Object> payload) {
        PetOwner owner = requireActiveOwner(userId);
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thú cưng #" + petId));
        if (pet.getPetOwner() == null || !owner.getOwnerId().equals(pet.getPetOwner().getOwnerId())) {
            throw new BadRequestException("Thú cưng này không thuộc sở hữu của bạn.");
        }

        String petName = strOrEmpty(payload.get("petName"));
        if (petName.isBlank()) throw new BadRequestException("Tên thú cưng không được để trống.");

        pet.setPetName(petName);
        if (payload.containsKey("species") && !strOrEmpty(payload.get("species")).isBlank()) {
            pet.setSpecies(strOrEmpty(payload.get("species")));
        }
        if (payload.containsKey("breed")) {
            pet.setBreed(strOrEmpty(payload.get("breed")));
        }
        if (payload.containsKey("gender") && !strOrEmpty(payload.get("gender")).isBlank()) {
            pet.setGender(strOrEmpty(payload.get("gender")));
        }
        if (payload.containsKey("color")) {
            pet.setColor(strOrNull(payload.get("color")));
        }
        if (payload.containsKey("dateOfBirth")) {
            pet.setDateOfBirth(parseDateOrNull(payload.get("dateOfBirth")));
        }
        if (payload.containsKey("weight")) {
            pet.setWeight(parseWeightOrNull(payload.get("weight")));
        }

        pet = petRepository.save(pet);
        recordAudit(userId, "OWNER_UPDATE_PET", "Pet #" + petId,
                "Chủ nuôi cập nhật hồ sơ thú cưng " + pet.getPetName());
        return toPetDto(pet);
    }

    @Override
    @Transactional
    public Map<String, Object> updatePetStatus(Integer userId, Integer petId, String status) {
        PetOwner owner = requireActiveOwner(userId);
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thú cưng #" + petId));
        if (pet.getPetOwner() == null || !owner.getOwnerId().equals(pet.getPetOwner().getOwnerId())) {
            throw new BadRequestException("Thú cưng này không thuộc sở hữu của bạn.");
        }

        String targetStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : "INACTIVE";
        if (!Set.of("ACTIVE", "INACTIVE").contains(targetStatus)) {
            throw new BadRequestException("Trạng thái thú cưng không hợp lệ.");
        }

        if ("INACTIVE".equals(targetStatus)) {
            boolean hasActiveAppointments = appointmentRepository.findByPet_PetIdOrderByAppointmentDateDesc(petId)
                    .stream()
                    .anyMatch(a -> Set.of("PENDING_APPROVAL", "CONFIRMED", "APPROVED", "CHECKED_IN", "IN_PROGRESS")
                            .contains(a.getStatus() != null ? a.getStatus().toUpperCase() : ""));
            if (hasActiveAppointments) {
                throw new BadRequestException("Không thể xóa/ẩn hồ sơ thú cưng đang có lịch hẹn chờ khám. Vui lòng hủy lịch hẹn trước.");
            }
        }

        pet.setStatus(targetStatus);
        pet = petRepository.save(pet);
        recordAudit(userId, "OWNER_CHANGE_PET_STATUS", "Pet #" + petId,
                "Chủ nuôi đổi trạng thái thú cưng " + pet.getPetName() + " -> " + targetStatus);
        return toPetDto(pet);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyAppointments(Integer userId) {
        if (userId == null) throw new BadRequestException("Vui lòng đăng nhập.");
        return appointmentRepository.findByPetOwner_UserAccount_UserId(userId).stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toAppointmentDto)
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> bookAppointment(Integer userId, Map<String, Object> payload) {
        PetOwner owner = requireActiveOwner(userId);

        if (payload.get("petId") == null || payload.get("petId").toString().isBlank()) {
            throw new BadRequestException("Vui lòng chọn thú cưng cần đặt lịch.");
        }
        Integer petId = Integer.valueOf(payload.get("petId").toString().trim());
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thú cưng #" + petId));

        if (pet.getPetOwner() == null || !owner.getOwnerId().equals(pet.getPetOwner().getOwnerId())) {
            throw new BadRequestException("Thú cưng này không thuộc sở hữu của bạn.");
        }
        if ("INACTIVE".equalsIgnoreCase(pet.getStatus())) {
            throw new BadRequestException("Thú cưng này đã ngừng hoạt động, không thể đặt lịch.");
        }

        LocalDateTime aptDateTime = resolveBookingDateTime(payload);
        // BR-09: Online appointments must be booked at least 2 hours before slot start time
        if (aptDateTime.isBefore(LocalDateTime.now().plusHours(2))) {
            throw new BadRequestException("Lịch khám trực tuyến phải đặt trước giờ bắt đầu ít nhất 2 tiếng.");
        }

        String shift = aptDateTime.getHour() < 12 ? "MORNING" : "AFTERNOON";
        UserAccount vet = resolveActiveVetOrNull(payload.get("veterinarianId"));
        if (vet != null) {
            validateNoVetConflictAndSlot(vet.getUserId(), aptDateTime, null);
        }

        Service service = null;
        if (payload.get("serviceId") != null && !payload.get("serviceId").toString().isBlank()) {
            Integer serviceId = Integer.valueOf(payload.get("serviceId").toString().trim());
            service = serviceRepository.findById(serviceId).orElse(null);
            if (service != null && "INACTIVE".equalsIgnoreCase(service.getStatus())) {
                throw new BadRequestException("Dịch vụ đã chọn hiện tạm ngừng cung cấp.");
            }
        }

        String notes = strOrEmpty(payload.get("notes"));
        String reason = strOrEmpty(payload.get("reason"));
        if (reason.isBlank()) {
            reason = service != null ? service.getServiceName() : "Đặt lịch khám trực tuyến";
            if (!notes.isBlank()) {
                reason = reason + " - " + notes;
            }
        }

        Appointment app = Appointment.builder()
                .petOwner(owner)
                .pet(pet)
                .veterinarian(vet)
                .appointmentDate(aptDateTime)
                .shift(shift)
                .service(service)
                .status("PENDING_APPROVAL")
                .reason(reason)
                .notes(notes)
                .build();

        app = appointmentRepository.save(app);

        if (vet != null) {
            markSlotStatusIfPresent(vet.getUserId(), aptDateTime.toLocalDate(), aptDateTime.toLocalTime(), "BOOKED");
        }

        recordAudit(userId, "OWNER_BOOK_APPOINTMENT", "Appointment #" + app.getAppointmentId(),
                "Chủ nuôi đặt lịch trực tuyến #" + app.getAppointmentId() + " lúc " + aptDateTime.format(DT_DISPLAY_FMT));
        publishBookingNotification(app, "OWNER_PORTAL_BOOKING");
        return toAppointmentDto(app);
    }

    @Override
    @Transactional
    public Map<String, Object> rescheduleMyAppointment(Integer userId, Integer appointmentId, Map<String, Object> payload) {
        PetOwner owner = requireActiveOwner(userId);
        Appointment app = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch hẹn #" + appointmentId));

        if (app.getPetOwner() == null || !owner.getOwnerId().equals(app.getPetOwner().getOwnerId())) {
            throw new BadRequestException("Bạn không có quyền thao tác trên lịch hẹn này.");
        }

        String currentStatus = app.getStatus() != null ? app.getStatus().toUpperCase() : "";
        if (!Set.of("PENDING_APPROVAL", "CONFIRMED", "APPROVED").contains(currentStatus)) {
            throw new BadRequestException("Chỉ có thể đổi lịch cho cuộc hẹn đang ở trạng thái Chờ duyệt hoặc Đã xác nhận.");
        }

        // BR-10: Must be >= 24 hours before scheduled start time
        if (app.getAppointmentDate() != null && app.getAppointmentDate().isBefore(LocalDateTime.now().plusHours(24))) {
            throw new BadRequestException("Chỉ được đổi lịch trực tuyến trước giờ hẹn ít nhất 24 tiếng. Vui lòng liên hệ hotline phòng khám để được hỗ trợ.");
        }

        LocalDateTime newDateTime = resolveBookingDateTime(payload);
        if (newDateTime.isBefore(LocalDateTime.now().plusHours(2))) {
            throw new BadRequestException("Khung giờ hẹn mới phải cách thời điểm hiện tại ít nhất 2 tiếng.");
        }

        UserAccount oldVet = app.getVeterinarian();
        LocalDateTime oldDateTime = app.getAppointmentDate();

        UserAccount newVet = payload.containsKey("veterinarianId")
                ? resolveActiveVetOrNull(payload.get("veterinarianId"))
                : app.getVeterinarian();

        if (newVet != null) {
            validateNoVetConflictAndSlot(newVet.getUserId(), newDateTime, appointmentId);
        }

        if (oldVet != null && oldDateTime != null) {
            markSlotStatusIfPresent(oldVet.getUserId(), oldDateTime.toLocalDate(), oldDateTime.toLocalTime(), "AVAILABLE");
        }

        app.setAppointmentDate(newDateTime);
        app.setShift(newDateTime.getHour() < 12 ? "MORNING" : "AFTERNOON");
        app.setVeterinarian(newVet);
        if (payload.containsKey("serviceId") && payload.get("serviceId") != null && !payload.get("serviceId").toString().isBlank()) {
            Integer serviceId = Integer.valueOf(payload.get("serviceId").toString().trim());
            app.setService(serviceRepository.findById(serviceId).orElse(app.getService()));
        }
        if (payload.get("notes") != null) {
            app.setNotes(strOrEmpty(payload.get("notes")));
        }
        app.setStatus("PENDING_APPROVAL");

        app = appointmentRepository.save(app);

        if (newVet != null) {
            markSlotStatusIfPresent(newVet.getUserId(), newDateTime.toLocalDate(), newDateTime.toLocalTime(), "BOOKED");
        }

        recordAudit(userId, "OWNER_RESCHEDULE_APPOINTMENT", "Appointment #" + appointmentId,
                "Chủ nuôi đổi lịch hẹn #" + appointmentId + " sang " + newDateTime.format(DT_DISPLAY_FMT));
        return toAppointmentDto(app);
    }

    @Override
    @Transactional
    public Map<String, Object> cancelMyAppointment(Integer userId, Integer appointmentId, String reason) {
        PetOwner owner = requireActiveOwner(userId);
        Appointment app = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch hẹn #" + appointmentId));

        if (app.getPetOwner() == null || !owner.getOwnerId().equals(app.getPetOwner().getOwnerId())) {
            throw new BadRequestException("Bạn không có quyền hủy lịch hẹn này.");
        }

        String currentStatus = app.getStatus() != null ? app.getStatus().toUpperCase() : "";
        if (!Set.of("PENDING_APPROVAL", "CONFIRMED", "APPROVED").contains(currentStatus)) {
            throw new BadRequestException("Chỉ có thể hủy lịch hẹn đang ở trạng thái Chờ duyệt hoặc Đã xác nhận.");
        }

        // BR-10: Must be >= 24 hours before scheduled start time
        if (app.getAppointmentDate() != null && app.getAppointmentDate().isBefore(LocalDateTime.now().plusHours(24))) {
            throw new BadRequestException("Chỉ được hủy lịch trực tuyến trước giờ hẹn ít nhất 24 tiếng. Vui lòng liên hệ hotline phòng khám để được hỗ trợ.");
        }

        String cancelReason = (reason != null && !reason.trim().isEmpty())
                ? reason.trim()
                : "Chủ nuôi chủ động hủy lịch trực tuyến";

        if (app.getVeterinarian() != null && app.getAppointmentDate() != null) {
            markSlotStatusIfPresent(app.getVeterinarian().getUserId(),
                    app.getAppointmentDate().toLocalDate(),
                    app.getAppointmentDate().toLocalTime(),
                    "AVAILABLE");
        }

        app.setStatus("CANCELLED");
        app.setRejectionReason(cancelReason);
        app = appointmentRepository.save(app);

        recordAudit(userId, "OWNER_CANCEL_APPOINTMENT", "Appointment #" + appointmentId,
                "Chủ nuôi hủy lịch hẹn #" + appointmentId + " - Lý do: " + cancelReason);
        return toAppointmentDto(app);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMyPetMedicalHistory(Integer petId, Integer ownerUserId) {
        return veterinarianService.getMyPetMedicalHistory(petId, ownerUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMyMedicalRecordPrintView(Integer recordId, Integer ownerUserId) {
        return veterinarianService.getMyMedicalRecordPrintView(recordId, ownerUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyInvoices(Integer userId) {
        if (userId == null) return List.of();
        Optional<PetOwner> ownerOpt = petOwnerRepository.findByUserAccount_UserId(userId);
        if (ownerOpt.isEmpty()) return List.of();
        Integer ownerId = ownerOpt.get().getOwnerId();

        return invoiceRepository.findAll().stream()
                .filter(inv -> inv.getMedicalRecord() != null
                        && inv.getMedicalRecord().getPet() != null
                        && inv.getMedicalRecord().getPet().getPetOwner() != null
                        && ownerId.equals(inv.getMedicalRecord().getPet().getPetOwner().getOwnerId()))
                .sorted(Comparator.comparing(Invoice::getInvoiceDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(inv -> {
                    MedicalRecord mr = inv.getMedicalRecord();
                    Pet pet = mr.getPet();
                    BigDecimal total = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;
                    BigDecimal disc = inv.getDiscountAmount() != null ? inv.getDiscountAmount() : BigDecimal.ZERO;
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("invoiceId", inv.getInvoiceId());
                    m.put("invoiceCode", "HD-" + inv.getInvoiceId());
                    m.put("recordId", mr.getRecordId());
                    m.put("petId", pet.getPetId());
                    m.put("petName", pet.getPetName());
                    m.put("invoiceDate", inv.getInvoiceDate() != null ? inv.getInvoiceDate().format(DT_DISPLAY_FMT) : "");
                    m.put("totalAmount", total);
                    m.put("discountAmount", disc);
                    m.put("netAmount", total.subtract(disc).max(BigDecimal.ZERO));
                    m.put("status", "VOIDED".equalsIgnoreCase(inv.getStatus()) ? "VOID" : inv.getStatus());
                    List<Payment> pays = paymentRepository.findByInvoice_InvoiceId(inv.getInvoiceId());
                    if (!pays.isEmpty()) {
                        Payment pay = pays.get(0);
                        m.put("paymentMethod", pay.getPaymentMethod());
                        m.put("paymentDate", pay.getPaymentDate() != null ? pay.getPaymentDate().format(DT_DISPLAY_FMT) : "");
                        m.put("amountPaid", pay.getAmountPaid());
                    }
                    return m;
                })
                .toList();
    }

    // ==================== Helpers ====================

    private PetOwner requireActiveOwner(Integer userId) {
        if (userId == null) {
            throw new BadRequestException("Vui lòng đăng nhập.");
        }
        PetOwner owner = petOwnerRepository.findByUserAccount_UserId(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ chủ nuôi liên kết với tài khoản này."));
        if ("INACTIVE".equalsIgnoreCase(owner.getStatus())) {
            throw new BadRequestException("Hồ sơ chủ nuôi đang bị vô hiệu hóa, không thể thực hiện thao tác này.");
        }
        return owner;
    }

    private LocalDateTime resolveBookingDateTime(Map<String, Object> payload) {
        String dateStr = strOrNull(payload.get("appointmentDate"));
        if (dateStr == null) {
            throw new BadRequestException("Vui lòng chọn ngày khám.");
        }
        LocalDate aptDate;
        try {
            aptDate = LocalDate.parse(dateStr);
        } catch (Exception e) {
            throw new BadRequestException("Định dạng ngày khám không hợp lệ.");
        }
        if (aptDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày khám không được nằm trong quá khứ.");
        }

        String timeStr = strOrNull(payload.get("appointmentTime"));
        String shift = strOrDefault(payload.get("shift"), "MORNING").toUpperCase();
        LocalTime time;
        if (timeStr != null) {
            try {
                time = LocalTime.parse(timeStr.length() > 5 ? timeStr.substring(0, 5) : timeStr);
            } catch (Exception e) {
                throw new BadRequestException("Khung giờ khám không hợp lệ.");
            }
        } else {
            time = "AFTERNOON".equals(shift) ? LocalTime.of(14, 0) : LocalTime.of(9, 0);
        }
        return LocalDateTime.of(aptDate, time);
    }

    private UserAccount resolveActiveVetOrNull(Object vetIdObj) {
        if (vetIdObj == null || String.valueOf(vetIdObj).trim().isEmpty()) {
            return null;
        }
        Integer vetId = Integer.valueOf(String.valueOf(vetIdObj).trim());
        if (vetId <= 0) return null;
        UserAccount vet = userAccountRepository.findById(vetId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy bác sĩ #" + vetId));
        if (vet.getStatus() != AccountStatus.ACTIVE || vet.getRole() == null
                || !"VETERINARIAN".equalsIgnoreCase(vet.getRole().getRoleName())) {
            throw new BadRequestException("Bác sĩ được chọn hiện không sẵn sàng tiếp nhận.");
        }
        return vet;
    }

    private void validateNoVetConflictAndSlot(Integer vetId, LocalDateTime targetTime, Integer excludeAppointmentId) {
        List<DoctorScheduleSlot> slots = doctorScheduleSlotRepository
                .findByVeterinarian_UserIdAndSlotDateOrderByStartTimeAsc(vetId, targetTime.toLocalDate());
        boolean blocked = slots.stream()
                .anyMatch(s -> !targetTime.toLocalTime().isBefore(s.getStartTime())
                        && targetTime.toLocalTime().isBefore(s.getEndTime())
                        && "BLOCKED".equalsIgnoreCase(s.getStatus()));
        if (blocked) {
            throw new BadRequestException("Khung giờ này của bác sĩ đang khóa lịch nghỉ / bận chuyên môn.");
        }

        LocalDateTime windowStart = targetTime.minusMinutes(29);
        LocalDateTime windowEnd = targetTime.plusMinutes(29);
        List<Appointment> conflicts = appointmentRepository.findVetAppointmentsInWindowForUpdate(vetId, windowStart, windowEnd)
                .stream()
                .filter(a -> excludeAppointmentId == null || !excludeAppointmentId.equals(a.getAppointmentId()))
                .filter(a -> !Set.of("CANCELLED", "REJECTED").contains(a.getStatus() != null ? a.getStatus().toUpperCase() : ""))
                .toList();

        if (!conflicts.isEmpty()) {
            throw new BadRequestException("Bác sĩ đã có lịch khám khác trùng khung giờ này (cách tối thiểu 30 phút). Vui lòng chọn khung giờ hoặc bác sĩ khác.");
        }
    }

    private void markSlotStatusIfPresent(Integer vetId, LocalDate date, LocalTime startTime, String status) {
        doctorScheduleSlotRepository.findByVeterinarian_UserIdAndSlotDateOrderByStartTimeAsc(vetId, date)
                .stream()
                .filter(s -> s.getStartTime().equals(startTime) && !"BLOCKED".equalsIgnoreCase(s.getStatus()))
                .findFirst()
                .ifPresent(slot -> {
                    slot.setStatus(status);
                    doctorScheduleSlotRepository.save(slot);
                });
    }

    private void publishBookingNotification(Appointment appt, String source) {
        try {
            if (appt != null) {
                String email = (appt.getPetOwner() != null && appt.getPetOwner().getEmail() != null)
                        ? appt.getPetOwner().getEmail().trim() : "";
                eventPublisher.publishEvent(new AppointmentBookedEvent(
                        appt.getAppointmentId(),
                        email,
                        appt.getPetOwner() != null ? appt.getPetOwner().getFullName() : "Khách hàng",
                        appt.getPet() != null ? appt.getPet().getPetName() : "Thú cưng",
                        appt.getAppointmentDate(),
                        appt.getShift(),
                        appt.getService() != null ? appt.getService().getServiceName() : "Khám tổng quát",
                        appt.getVeterinarian() != null ? appt.getVeterinarian().getFullName() : "Phòng khám điều phối",
                        source
                ));
            }
        } catch (Exception ignored) {
        }
    }

    private void recordAudit(Integer userId, String actionType, String resource, String details) {
        try {
            UserAccount actor = userAccountRepository.findById(userId).orElse(null);
            if (actor != null) {
                auditLogRepository.save(AuditLog.builder()
                        .userAccount(actor)
                        .actionType(actionType)
                        .affectedResource(resource)
                        .outcome("SUCCESS")
                        .actionDetails("[" + actionType + "] [" + resource + "] " + details)
                        .actionTime(LocalDateTime.now())
                        .build());
            }
        } catch (Exception ignored) {
        }
    }

    private Map<String, Object> toPetDto(Pet pet) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("petId", pet.getPetId());
        res.put("petName", pet.getPetName());
        res.put("species", pet.getSpecies());
        res.put("breed", pet.getBreed() != null ? pet.getBreed() : "");
        res.put("gender", pet.getGender() != null ? pet.getGender() : "UNKNOWN");
        res.put("color", pet.getColor() != null ? pet.getColor() : "");
        res.put("dateOfBirth", pet.getDateOfBirth() != null ? pet.getDateOfBirth().toString() : "");
        res.put("weight", pet.getWeight());
        res.put("status", pet.getStatus() != null ? pet.getStatus() : "ACTIVE");
        return res;
    }

    private Map<String, Object> toAppointmentDto(Appointment a) {
        Map<String, Object> map = new LinkedHashMap<>();
        LocalDateTime dt = a.getAppointmentDate();
        boolean canModifyOnline = dt != null
                && !dt.isBefore(LocalDateTime.now().plusHours(24))
                && Set.of("PENDING_APPROVAL", "CONFIRMED", "APPROVED")
                .contains(a.getStatus() != null ? a.getStatus().toUpperCase() : "");

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
        map.put("veterinarianName", a.getVeterinarian() != null ? a.getVeterinarian().getFullName() : "Phòng khám điều phối khi Check-in");
        map.put("serviceId", a.getService() != null ? a.getService().getServiceId() : null);
        map.put("serviceName", a.getService() != null ? a.getService().getServiceName() : "Khám tổng quát");
        map.put("servicePrice", a.getService() != null ? a.getService().getPrice() : null);
        map.put("shift", a.getShift() != null ? a.getShift() : "MORNING");
        map.put("shiftDisplay", "AFTERNOON".equalsIgnoreCase(a.getShift()) ? "Buổi chiều (13:30 - 17:30)" : "Buổi sáng (08:00 - 12:00)");
        map.put("appointmentDate", dt != null ? dt.toLocalDate().toString() : "");
        map.put("appointmentTime", dt != null ? dt.toLocalTime().format(TIME_FMT) : "");
        map.put("appointmentDateTimeDisplay", dt != null ? dt.format(DT_DISPLAY_FMT) : "");
        map.put("status", a.getStatus() != null ? a.getStatus() : "");
        map.put("statusDisplay", mapStatus(a.getStatus()));
        map.put("canModifyOnline", canModifyOnline);
        map.put("reason", a.getReason() != null ? a.getReason() : "");
        map.put("notes", a.getNotes() != null ? a.getNotes() : "");
        map.put("rejectionReason", a.getRejectionReason() != null ? a.getRejectionReason() : "");
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
            case "NO_SHOW" -> "Vắng mặt";
            default -> status;
        };
    }

    private String strOrNull(Object val) {
        if (val == null) return null;
        String s = String.valueOf(val).trim();
        return s.isEmpty() ? null : s;
    }

    private String strOrEmpty(Object val) {
        return val == null ? "" : String.valueOf(val).trim();
    }

    private String strOrDefault(Object val, String def) {
        String s = strOrNull(val);
        return s != null ? s : def;
    }

    private LocalDate parseDateOrNull(Object val) {
        String s = strOrNull(val);
        if (s == null) return null;
        try {
            LocalDate d = LocalDate.parse(s);
            if (d.isAfter(LocalDate.now())) {
                throw new BadRequestException("Ngày sinh thú cưng không được lớn hơn ngày hiện tại.");
            }
            return d;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Định dạng ngày sinh không hợp lệ.");
        }
    }

    private BigDecimal parseWeightOrNull(Object val) {
        String s = strOrNull(val);
        if (s == null) return null;
        try {
            BigDecimal w = new BigDecimal(s);
            if (w.compareTo(BigDecimal.ZERO) <= 0 || w.compareTo(new BigDecimal("250")) > 0) {
                throw new BadRequestException("Cân nặng phải lớn hơn 0 và không vượt quá 250 kg.");
            }
            return w;
        } catch (NumberFormatException e) {
            throw new BadRequestException("Cân nặng không hợp lệ.");
        }
    }
}
