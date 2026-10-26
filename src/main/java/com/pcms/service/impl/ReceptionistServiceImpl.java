package com.pcms.service.impl;

import com.pcms.entity.*;
import com.pcms.exception.BadRequestException;
import com.pcms.repository.*;
import com.pcms.service.ReceptionistService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ReceptionistServiceImpl implements ReceptionistService {

    private final AppointmentRepository appointmentRepository;
    private final PetOwnerRepository petOwnerRepository;
    private final PetRepository petRepository;
    private final UserAccountRepository userAccountRepository;
    private final ServiceRepository serviceRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final AuditLogRepository auditLogRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DT_DISPLAY_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        List<Appointment> allAppointments = appointmentRepository.findAllByOrderByAppointmentDateDesc();

        List<Appointment> todayAppointments = allAppointments.stream()
                .filter(a -> a.getAppointmentDate() != null
                        && !a.getAppointmentDate().isBefore(startOfDay)
                        && !a.getAppointmentDate().isAfter(endOfDay))
                .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                .toList();

        List<Appointment> pendingApprovals = allAppointments.stream()
                .filter(a -> "PENDING_APPROVAL".equalsIgnoreCase(a.getStatus()))
                .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                .toList();

        long todayCheckedIn = todayAppointments.stream()
                .filter(a -> "CHECKED_IN".equalsIgnoreCase(a.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(a.getStatus()))
                .count();

        long todayConfirmedWaiting = todayAppointments.stream()
                .filter(a -> "CONFIRMED".equalsIgnoreCase(a.getStatus()) || "APPROVED".equalsIgnoreCase(a.getStatus()))
                .count();

        long todayCompleted = todayAppointments.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .count();

        long activeOwners = petOwnerRepository.findAll().stream()
                .filter(o -> !"INACTIVE".equalsIgnoreCase(o.getStatus()))
                .count();

        long activePets = petRepository.findAll().stream()
                .filter(p -> !"INACTIVE".equalsIgnoreCase(p.getStatus())
                        && p.getPetOwner() != null
                        && !"INACTIVE".equalsIgnoreCase(p.getPetOwner().getStatus()))
                .count();

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("todayTotalAppointments", todayAppointments.size());
        kpis.put("pendingApprovalCount", pendingApprovals.size());
        kpis.put("todayCheckedInCount", todayCheckedIn);
        kpis.put("todayWaitingArrivalCount", todayConfirmedWaiting);
        kpis.put("todayCompletedCount", todayCompleted);
        kpis.put("activeOwnersCount", activeOwners);
        kpis.put("activePetsCount", activePets);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kpis", kpis);
        result.put("pendingApprovals", pendingApprovals.stream().limit(15).map(this::toAppointmentMap).toList());
        result.put("todaySchedule", todayAppointments.stream().map(this::toAppointmentMap).toList());
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getCatalogLookup() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        List<Appointment> todayApps = appointmentRepository.findByAppointmentDateBetween(startOfDay, endOfDay);

        List<Map<String, Object>> veterinarians = userAccountRepository.findAll().stream()
                .filter(u -> u.getStatus() == AccountStatus.ACTIVE
                        && u.getRole() != null
                        && "VETERINARIAN".equalsIgnoreCase(u.getRole().getRoleName()))
                .map(u -> {
                    long activeCount = todayApps.stream()
                            .filter(a -> a.getVeterinarian() != null
                                    && a.getVeterinarian().getUserId().equals(u.getUserId())
                                    && ("CHECKED_IN".equalsIgnoreCase(a.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(a.getStatus())))
                            .count();

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("userId", u.getUserId());
                    m.put("fullName", u.getFullName());
                    m.put("email", u.getEmail());
                    m.put("phoneNumber", u.getPhoneNumber());
                    m.put("activeQueueCount", activeCount);
                    m.put("isAvailable", activeCount == 0);
                    m.put("availabilityLabel", activeCount == 0 ? "Sẵn sàng (0 ca)" : "Đang phụ trách " + activeCount + " ca");
                    return m;
                })
                .sorted(Comparator.comparingLong((Map<String, Object> m) -> (Long) m.get("activeQueueCount")))
                .toList();

        List<Map<String, Object>> services = serviceRepository.findAll().stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()))
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("serviceId", s.getServiceId());
                    m.put("serviceName", s.getServiceName());
                    m.put("description", s.getDescription());
                    m.put("basePrice", s.getPrice());
                    m.put("price", s.getPrice());
                    m.put("status", s.getStatus());
                    return m;
                })
                .toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("veterinarians", veterinarians);
        res.put("services", services);
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAppointments(String fromDate, String toDate, String status, Integer veterinarianId, String search) {
        LocalDate from = parseLocalDateOrNull(fromDate);
        LocalDate to = parseLocalDateOrNull(toDate);
        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        }

        String q = search != null ? search.trim().toLowerCase() : "";

        return appointmentRepository.findAllByOrderByAppointmentDateDesc().stream()
                .filter(a -> {
                    if (from != null && a.getAppointmentDate() != null && a.getAppointmentDate().toLocalDate().isBefore(from)) {
                        return false;
                    }
                    if (to != null && a.getAppointmentDate() != null && a.getAppointmentDate().toLocalDate().isAfter(to)) {
                        return false;
                    }
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if ("CONFIRMED".equalsIgnoreCase(status)) {
                            if (!"CONFIRMED".equalsIgnoreCase(a.getStatus()) && !"APPROVED".equalsIgnoreCase(a.getStatus())) {
                                return false;
                            }
                        } else if (!status.equalsIgnoreCase(a.getStatus())) {
                            return false;
                        }
                    }
                    if (veterinarianId != null && veterinarianId > 0) {
                        if (a.getVeterinarian() == null || !veterinarianId.equals(a.getVeterinarian().getUserId())) {
                            return false;
                        }
                    }
                    if (!q.isEmpty()) {
                        String petName = a.getPet() != null && a.getPet().getPetName() != null ? a.getPet().getPetName().toLowerCase() : "";
                        String ownerName = a.getPet() != null && a.getPet().getPetOwner() != null && a.getPet().getPetOwner().getFullName() != null
                                ? a.getPet().getPetOwner().getFullName().toLowerCase() : "";
                        String ownerPhone = a.getPet() != null && a.getPet().getPetOwner() != null && a.getPet().getPetOwner().getPhoneNumber() != null
                                ? a.getPet().getPetOwner().getPhoneNumber().toLowerCase() : "";
                        String code = "apt-" + a.getAppointmentId();
                        return petName.contains(q) || ownerName.contains(q) || ownerPhone.contains(q) || code.contains(q);
                    }
                    return true;
                })
                .map(this::toAppointmentMap)
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> createAppointment(Map<String, Object> payload, String actorUsername) {
        Integer petId = parseInt(payload.get("petId"), "Vui lòng chọn thú cưng.");
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ thú cưng."));

        if ("INACTIVE".equalsIgnoreCase(pet.getStatus())) {
            throw new BadRequestException("Thú cưng này đã ngừng hoạt động, không thể đặt lịch.");
        }
        if (pet.getPetOwner() == null || "INACTIVE".equalsIgnoreCase(pet.getPetOwner().getStatus())) {
            throw new BadRequestException("Chủ nuôi của thú cưng đã bị vô hiệu hóa (BR-06).");
        }

        LocalDateTime appointmentDateTime = parseAppointmentDateTime(payload);
        if (appointmentDateTime.isBefore(LocalDateTime.now().minusMinutes(5))) {
            throw new BadRequestException("Thời gian đặt lịch hẹn không được nằm trong quá khứ.");
        }

        String shift = resolveShift(payload.get("shift"), appointmentDateTime);
        UserAccount vet = resolveVeterinarian(payload.get("veterinarianId"));
        Service service = resolveService(payload.get("serviceId"));

        if (vet != null) {
            validateNoVetConflict(vet.getUserId(), appointmentDateTime, null);
        }

        String notes = strOrNull(payload.get("notes"));
        Appointment appointment = Appointment.builder()
                .petOwner(pet.getPetOwner())
                .pet(pet)
                .veterinarian(vet)
                .service(service)
                .appointmentDate(appointmentDateTime)
                .shift(shift)
                .status("CONFIRMED")
                .notes(notes)
                .build();

        appointment = appointmentRepository.save(appointment);
        recordAudit(actorUsername, "CREATE_APPOINTMENT", "Appointment",
                "Đặt lịch hẹn #" + appointment.getAppointmentId() + " (" + ("AFTERNOON".equalsIgnoreCase(shift) ? "Buổi chiều" : "Buổi sáng")
                        + ") cho thú cưng " + pet.getPetName());
        return toAppointmentMap(appointment);
    }

    @Override
    @Transactional
    public Map<String, Object> approveAppointment(Integer appointmentId, Map<String, Object> payload, String actorUsername) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lịch hẹn #" + appointmentId));

        if (!"PENDING_APPROVAL".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Chỉ có thể phê duyệt lịch hẹn đang ở trạng thái Chờ duyệt.");
        }

        if (payload != null && payload.get("veterinarianId") != null && !String.valueOf(payload.get("veterinarianId")).isBlank()) {
            UserAccount vet = resolveVeterinarian(payload.get("veterinarianId"));
            if (vet != null) {
                validateNoVetConflict(vet.getUserId(), appointment.getAppointmentDate(), appointmentId);
                appointment.setVeterinarian(vet);
            }
        }
        if (payload != null && payload.get("serviceId") != null && !String.valueOf(payload.get("serviceId")).isBlank()) {
            Service svc = resolveService(payload.get("serviceId"));
            if (svc != null) {
                appointment.setService(svc);
            }
        }
        if (payload != null && payload.get("notes") != null && !String.valueOf(payload.get("notes")).isBlank()) {
            appointment.setNotes(String.valueOf(payload.get("notes")).trim());
        }

        appointment.setStatus("CONFIRMED");
        appointment.setRejectionReason(null);
        appointment = appointmentRepository.save(appointment);

        recordAudit(actorUsername, "APPROVE_APPOINTMENT", "Appointment",
                "Phê duyệt lịch hẹn #" + appointmentId + " của thú cưng " + appointment.getPet().getPetName());
        return toAppointmentMap(appointment);
    }

    @Override
    @Transactional
    public Map<String, Object> rejectAppointment(Integer appointmentId, String reason, String actorUsername) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lịch hẹn #" + appointmentId));

        if (!"PENDING_APPROVAL".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Chỉ có thể từ chối lịch hẹn đang ở trạng thái Chờ duyệt.");
        }
        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập lý do từ chối lịch hẹn (UC10).");
        }

        appointment.setStatus("REJECTED");
        appointment.setRejectionReason(reason.trim());
        appointment = appointmentRepository.save(appointment);

        recordAudit(actorUsername, "REJECT_APPOINTMENT", "Appointment",
                "Từ chối lịch hẹn #" + appointmentId + " - Lý do: " + reason.trim());
        return toAppointmentMap(appointment);
    }

    @Override
    @Transactional
    public Map<String, Object> rescheduleAppointment(Integer appointmentId, Map<String, Object> payload, String actorUsername) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lịch hẹn #" + appointmentId));

        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())
                || "CANCELLED".equalsIgnoreCase(appointment.getStatus())
                || "REJECTED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Không thể đổi lịch cho cuộc hẹn đã hoàn tất, đã hủy hoặc đã từ chối.");
        }

        LocalDateTime newDateTime = parseAppointmentDateTime(payload);
        if (newDateTime.isBefore(LocalDateTime.now().minusMinutes(5))) {
            throw new BadRequestException("Thời gian hẹn mới không được nằm trong quá khứ.");
        }

        String shift = resolveShift(payload.get("shift"), newDateTime);
        UserAccount vet = payload.containsKey("veterinarianId")
                ? resolveVeterinarian(payload.get("veterinarianId"))
                : appointment.getVeterinarian();

        if (vet != null) {
            validateNoVetConflict(vet.getUserId(), newDateTime, appointmentId);
        }

        appointment.setAppointmentDate(newDateTime);
        appointment.setShift(shift);
        appointment.setVeterinarian(vet);

        if (payload.containsKey("serviceId")) {
            appointment.setService(resolveService(payload.get("serviceId")));
        }
        if (payload.get("notes") != null) {
            appointment.setNotes(String.valueOf(payload.get("notes")).trim());
        }
        if ("PENDING_APPROVAL".equalsIgnoreCase(appointment.getStatus())) {
            appointment.setStatus("CONFIRMED");
        }

        appointment = appointmentRepository.save(appointment);
        recordAudit(actorUsername, "RESCHEDULE_APPOINTMENT", "Appointment",
                "Đổi lịch hẹn #" + appointmentId + " sang ngày " + newDateTime.format(DATE_FMT) + " (" + ("AFTERNOON".equalsIgnoreCase(shift) ? "Buổi chiều" : "Buổi sáng") + ")");
        return toAppointmentMap(appointment);
    }

    @Override
    @Transactional
    public Map<String, Object> cancelAppointment(Integer appointmentId, String reason, String actorUsername) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lịch hẹn #" + appointmentId));

        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus()) || "CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Lịch hẹn đã hoàn tất hoặc đã hủy trước đó.");
        }
        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập lý do hủy lịch hẹn (UC09).");
        }

        appointment.setStatus("CANCELLED");
        appointment.setRejectionReason(reason.trim());
        appointment = appointmentRepository.save(appointment);

        recordAudit(actorUsername, "CANCEL_APPOINTMENT", "Appointment",
                "Hủy lịch hẹn #" + appointmentId + " - Lý do: " + reason.trim());
        return toAppointmentMap(appointment);
    }

    @Override
    @Transactional
    public Map<String, Object> checkInAppointment(Integer appointmentId, Map<String, Object> payload, String actorUsername) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lịch hẹn #" + appointmentId));

        String currentStatus = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "";
        if (!Set.of("CONFIRMED", "APPROVED", "PENDING_APPROVAL").contains(currentStatus)) {
            throw new BadRequestException("Chỉ có thể Check-in cho lịch hẹn đang ở trạng thái Đã xác nhận hoặc Chờ duyệt.");
        }

        Pet pet = appointment.getPet();
        if (payload != null && payload.get("weight") != null && !String.valueOf(payload.get("weight")).isBlank()) {
            BigDecimal weight = parsePositiveWeight(payload.get("weight"));
            pet.setWeight(weight);
            petRepository.save(pet);
        }

        // Bắt buộc chỉ định Bác sĩ trực sẵn sàng khi Check-in theo luồng mới
        UserAccount vet = null;
        if (payload != null && payload.get("veterinarianId") != null && !String.valueOf(payload.get("veterinarianId")).isBlank()) {
            vet = resolveVeterinarian(payload.get("veterinarianId"));
        } else if (appointment.getVeterinarian() != null) {
            vet = appointment.getVeterinarian();
        }

        if (vet == null) {
            throw new BadRequestException("Vui lòng chọn Bác sĩ phụ trách đang sẵn sàng trong danh sách để điều phối thú cưng.");
        }
        appointment.setVeterinarian(vet);

        if (payload != null && payload.get("serviceId") != null && !String.valueOf(payload.get("serviceId")).isBlank()) {
            Service svc = resolveService(payload.get("serviceId"));
            if (svc != null) {
                appointment.setService(svc);
            }
        }
        if (payload != null && payload.get("notes") != null && !String.valueOf(payload.get("notes")).isBlank()) {
            appointment.setNotes(String.valueOf(payload.get("notes")).trim());
        }

        appointment.setStatus("CHECKED_IN");
        appointment.setCheckInTime(LocalDateTime.now());
        appointment = appointmentRepository.save(appointment);

        recordAudit(actorUsername, "CHECK_IN_ASSIGN_VET", "Appointment",
                "Check-in lịch hẹn #" + appointmentId + " cho thú cưng " + pet.getPetName()
                        + " và điều phối cho Bác sĩ " + vet.getFullName());
        return toAppointmentMap(appointment);
    }

    @Override
    @Transactional
    public Map<String, Object> assignVeterinarian(Integer appointmentId, Integer veterinarianId, String actorUsername) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy ca khám #" + appointmentId));

        UserAccount vet = resolveVeterinarian(veterinarianId);
        if (vet == null) {
            throw new BadRequestException("Vui lòng chọn Bác sĩ phụ trách.");
        }

        appointment.setVeterinarian(vet);
        appointment = appointmentRepository.save(appointment);

        recordAudit(actorUsername, "REASSIGN_VET", "Appointment",
                "Điều phối ca khám #" + appointmentId + " (Thú cưng: " + appointment.getPet().getPetName()
                        + ") sang Bác sĩ " + vet.getFullName());
        return toAppointmentMap(appointment);
    }

    @Override
    @Transactional
    public Map<String, Object> processWalkIn(Map<String, Object> payload, String actorUsername) {
        String customerMode = payload.get("customerMode") != null ? String.valueOf(payload.get("customerMode")) : "EXISTING";
        Pet pet;

        if ("NEW".equalsIgnoreCase(customerMode)) {
            String ownerFullName = strOrNull(payload.get("ownerFullName"));
            String ownerPhone = strOrNull(payload.get("ownerPhoneNumber"));
            String ownerEmail = strOrNull(payload.get("ownerEmail"));
            String ownerAddress = strOrNull(payload.get("ownerAddress"));

            if (ownerFullName == null || ownerFullName.isBlank()) {
                throw new BadRequestException("Vui lòng nhập họ tên chủ nuôi.");
            }
            if (ownerPhone == null || !ownerPhone.matches("^[0-9+()\\-\\s]{9,15}$")) {
                throw new BadRequestException("Số điện thoại chủ nuôi không hợp lệ (9-15 ký tự số).");
            }
            if (petOwnerRepository.existsByPhoneNumber(ownerPhone)) {
                throw new BadRequestException("Số điện thoại này đã tồn tại trong hệ thống. Vui lòng chọn chế độ 'Khách hàng đã có hồ sơ' (BR-05).");
            }
            if (ownerEmail != null && !ownerEmail.isBlank() && petOwnerRepository.existsByEmailIgnoreCase(ownerEmail)) {
                throw new BadRequestException("Email chủ nuôi đã tồn tại trong hệ thống (BR-05).");
            }

            PetOwner newOwner = PetOwner.builder()
                    .fullName(ownerFullName)
                    .phoneNumber(ownerPhone)
                    .email(ownerEmail)
                    .address(ownerAddress)
                    .status("ACTIVE")
                    .build();
            newOwner = petOwnerRepository.save(newOwner);

            String petName = strOrNull(payload.get("petName"));
            String species = strOrNull(payload.get("species"));
            if (petName == null || petName.isBlank()) {
                throw new BadRequestException("Vui lòng nhập tên thú cưng.");
            }
            if (species == null || species.isBlank()) {
                throw new BadRequestException("Vui lòng chọn loài thú cưng.");
            }

            LocalDate dob = resolveDateOfBirth(payload.get("age"), payload.get("dateOfBirth"));
            BigDecimal weight = payload.get("weight") != null && !String.valueOf(payload.get("weight")).isBlank()
                    ? parsePositiveWeight(payload.get("weight"))
                    : null;
            String gender = strOrNull(payload.get("gender"));

            pet = Pet.builder()
                    .petOwner(newOwner)
                    .petName(petName)
                    .species(species)
                    .breed(strOrNull(payload.get("breed")))
                    .gender(gender != null ? gender : "Chưa rõ")
                    .dateOfBirth(dob)
                    .weight(weight)
                    .status("ACTIVE")
                    .build();
            pet = petRepository.save(pet);

            recordAudit(actorUsername, "CREATE_WALKIN_PROFILE", "PetOwner/Pet",
                    "Tạo nhanh hồ sơ khách vãng lai: " + newOwner.getFullName() + " & thú cưng " + pet.getPetName());
        } else {
            Integer petId = parseInt(payload.get("petId"), "Vui lòng chọn thú cưng cần tiếp nhận Walk-in.");
            pet = petRepository.findById(petId)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ thú cưng."));
            if ("INACTIVE".equalsIgnoreCase(pet.getStatus())) {
                throw new BadRequestException("Thú cưng này đã bị vô hiệu hóa.");
            }
            if (pet.getPetOwner() == null || "INACTIVE".equalsIgnoreCase(pet.getPetOwner().getStatus())) {
                throw new BadRequestException("Chủ nuôi đã bị vô hiệu hóa (BR-06).");
            }
            if (payload.get("weight") != null && !String.valueOf(payload.get("weight")).isBlank()) {
                pet.setWeight(parsePositiveWeight(payload.get("weight")));
                petRepository.save(pet);
            }
        }

        UserAccount vet = resolveVeterinarian(payload.get("veterinarianId"));
        if (vet == null) {
            throw new BadRequestException("Vui lòng chọn Bác sĩ phụ trách đang sẵn sàng khám để tiếp nhận ca Walk-in.");
        }

        Service service = resolveService(payload.get("serviceId"));
        String notes = strOrNull(payload.get("notes"));
        if (notes == null || notes.isBlank()) {
            throw new BadRequestException("Vui lòng nhập lý do khám / triệu chứng ban đầu cho ca tiếp nhận trực tiếp.");
        }

        LocalDateTime now = LocalDateTime.now();
        String currentShift = now.getHour() < 12 ? "MORNING" : "AFTERNOON";

        Appointment walkInAppointment = Appointment.builder()
                .petOwner(pet.getPetOwner())
                .pet(pet)
                .veterinarian(vet)
                .service(service)
                .appointmentDate(now)
                .checkInTime(now)
                .shift(currentShift)
                .status("CHECKED_IN")
                .notes("[WALK-IN] " + notes)
                .build();

        walkInAppointment = appointmentRepository.save(walkInAppointment);
        recordAudit(actorUsername, "PROCESS_WALK_IN", "Appointment",
                "Tiếp nhận khám trực tiếp (Walk-in) #" + walkInAppointment.getAppointmentId()
                        + " cho thú cưng " + pet.getPetName() + " -> điều phối cho Bác sĩ " + vet.getFullName());

        return toAppointmentMap(walkInAppointment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOwners(String search, String status) {
        String q = search != null ? search.trim().toLowerCase() : "";
        List<Pet> allPets = petRepository.findAll();
        Map<Integer, List<Pet>> petsByOwner = allPets.stream()
                .filter(p -> p.getPetOwner() != null)
                .collect(Collectors.groupingBy(p -> p.getPetOwner().getOwnerId()));

        return petOwnerRepository.findAll().stream()
                .sorted(Comparator.comparing(PetOwner::getOwnerId).reversed())
                .filter(o -> {
                    String ownerStatus = o.getStatus() != null ? o.getStatus() : "ACTIVE";
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if (!status.equalsIgnoreCase(ownerStatus)) {
                            return false;
                        }
                    }
                    if (!q.isEmpty()) {
                        String name = o.getFullName() != null ? o.getFullName().toLowerCase() : "";
                        String phone = o.getPhoneNumber() != null ? o.getPhoneNumber().toLowerCase() : "";
                        String email = o.getEmail() != null ? o.getEmail().toLowerCase() : "";
                        return name.contains(q) || phone.contains(q) || email.contains(q);
                    }
                    return true;
                })
                .map(o -> toOwnerMap(o, petsByOwner.getOrDefault(o.getOwnerId(), List.of())))
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> createOwner(Map<String, Object> payload, String actorUsername) {
        String fullName = strOrNull(payload.get("fullName"));
        String phoneNumber = strOrNull(payload.get("phoneNumber"));
        String email = strOrNull(payload.get("email"));
        String address = strOrNull(payload.get("address"));

        if (fullName == null || fullName.isBlank()) {
            throw new BadRequestException("Họ tên chủ nuôi không được để trống.");
        }
        if (phoneNumber == null || !phoneNumber.matches("^[0-9+()\\-\\s]{9,15}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ (9-15 ký tự số).");
        }
        if (petOwnerRepository.existsByPhoneNumber(phoneNumber)) {
            throw new BadRequestException("Số điện thoại này đã được đăng ký cho chủ nuôi khác (BR-05).");
        }
        if (email != null && !email.isBlank()) {
            if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                throw new BadRequestException("Định dạng Email không hợp lệ.");
            }
            if (petOwnerRepository.existsByEmailIgnoreCase(email)) {
                throw new BadRequestException("Email này đã được đăng ký cho chủ nuôi khác (BR-05).");
            }
        }

        PetOwner owner = PetOwner.builder()
                .fullName(fullName)
                .phoneNumber(phoneNumber)
                .email(email)
                .address(address)
                .status("ACTIVE")
                .build();
        owner = petOwnerRepository.save(owner);

        recordAudit(actorUsername, "CREATE_OWNER", "PetOwner",
                "Tạo hồ sơ chủ nuôi mới: " + owner.getFullName() + " (" + owner.getPhoneNumber() + ")");
        return toOwnerMap(owner, List.of());
    }

    @Override
    @Transactional
    public Map<String, Object> updateOwner(Integer ownerId, Map<String, Object> payload, String actorUsername) {
        PetOwner owner = petOwnerRepository.findById(ownerId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chủ nuôi #" + ownerId));

        String fullName = strOrNull(payload.get("fullName"));
        String phoneNumber = strOrNull(payload.get("phoneNumber"));
        String email = strOrNull(payload.get("email"));
        String address = strOrNull(payload.get("address"));

        if (fullName == null || fullName.isBlank()) {
            throw new BadRequestException("Họ tên chủ nuôi không được để trống.");
        }
        if (phoneNumber == null || !phoneNumber.matches("^[0-9+()\\-\\s]{9,15}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ (9-15 ký tự số).");
        }

        boolean phoneTaken = petOwnerRepository.findAll().stream()
                .anyMatch(o -> !o.getOwnerId().equals(ownerId) && phoneNumber.equalsIgnoreCase(o.getPhoneNumber()));
        if (phoneTaken) {
            throw new BadRequestException("Số điện thoại này đã thuộc về một chủ nuôi khác (BR-05).");
        }

        if (email != null && !email.isBlank()) {
            if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                throw new BadRequestException("Định dạng Email không hợp lệ.");
            }
            boolean emailTaken = petOwnerRepository.findAll().stream()
                    .anyMatch(o -> !o.getOwnerId().equals(ownerId) && o.getEmail() != null && email.equalsIgnoreCase(o.getEmail()));
            if (emailTaken) {
                throw new BadRequestException("Email này đã thuộc về một chủ nuôi khác (BR-05).");
            }
        }

        owner.setFullName(fullName);
        owner.setPhoneNumber(phoneNumber);
        owner.setEmail(email);
        owner.setAddress(address);
        owner = petOwnerRepository.save(owner);

        if (owner.getUserAccount() != null) {
            UserAccount ua = owner.getUserAccount();
            ua.setFullName(fullName);
            ua.setPhoneNumber(phoneNumber);
            if (email != null && !email.isBlank()) {
                ua.setEmail(email);
            }
            userAccountRepository.save(ua);
        }

        recordAudit(actorUsername, "UPDATE_OWNER", "PetOwner",
                "Cập nhật hồ sơ chủ nuôi #" + ownerId + ": " + owner.getFullName());
        List<Pet> pets = petRepository.findByPetOwner_OwnerId(ownerId);
        return toOwnerMap(owner, pets);
    }

    @Override
    @Transactional
    public Map<String, Object> toggleOwnerStatus(Integer ownerId, String status, String actorUsername) {
        PetOwner owner = petOwnerRepository.findById(ownerId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chủ nuôi #" + ownerId));

        String targetStatus = status != null && !status.isBlank()
                ? status.trim().toUpperCase()
                : ("ACTIVE".equalsIgnoreCase(owner.getStatus()) ? "INACTIVE" : "ACTIVE");

        if (!Set.of("ACTIVE", "INACTIVE").contains(targetStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ.");
        }

        owner.setStatus(targetStatus);
        owner = petOwnerRepository.save(owner);

        List<Pet> ownerPets = petRepository.findByPetOwner_OwnerId(ownerId);
        if ("INACTIVE".equalsIgnoreCase(targetStatus)) {
            for (Pet p : ownerPets) {
                p.setStatus("INACTIVE");
            }
            petRepository.saveAll(ownerPets);
        }

        if (owner.getUserAccount() != null) {
            UserAccount ua = owner.getUserAccount();
            ua.setStatus("ACTIVE".equalsIgnoreCase(targetStatus) ? AccountStatus.ACTIVE : AccountStatus.INACTIVE);
            userAccountRepository.save(ua);
        }

        recordAudit(actorUsername, "CHANGE_OWNER_STATUS", "PetOwner",
                "Đổi trạng thái chủ nuôi #" + ownerId + " (" + owner.getFullName() + ") sang " + targetStatus);
        return toOwnerMap(owner, ownerPets);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPets(String search, Integer ownerId, String status) {
        String q = search != null ? search.trim().toLowerCase() : "";

        return petRepository.findAll().stream()
                .sorted(Comparator.comparing(Pet::getPetId).reversed())
                .filter(p -> {
                    if (ownerId != null && ownerId > 0) {
                        if (p.getPetOwner() == null || !ownerId.equals(p.getPetOwner().getOwnerId())) {
                            return false;
                        }
                    }
                    String effectiveStatus = getEffectivePetStatus(p);
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if (!status.equalsIgnoreCase(effectiveStatus)) {
                            return false;
                        }
                    }
                    if (!q.isEmpty()) {
                        String petName = p.getPetName() != null ? p.getPetName().toLowerCase() : "";
                        String species = p.getSpecies() != null ? p.getSpecies().toLowerCase() : "";
                        String breed = p.getBreed() != null ? p.getBreed().toLowerCase() : "";
                        String ownerName = p.getPetOwner() != null && p.getPetOwner().getFullName() != null
                                ? p.getPetOwner().getFullName().toLowerCase() : "";
                        String ownerPhone = p.getPetOwner() != null && p.getPetOwner().getPhoneNumber() != null
                                ? p.getPetOwner().getPhoneNumber().toLowerCase() : "";
                        return petName.contains(q) || species.contains(q) || breed.contains(q)
                                || ownerName.contains(q) || ownerPhone.contains(q);
                    }
                    return true;
                })
                .map(this::toPetMap)
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> createPet(Map<String, Object> payload, String actorUsername) {
        Integer ownerId = parseInt(payload.get("ownerId"), "Vui lòng chọn chủ nuôi cho thú cưng (BR-06).");
        PetOwner owner = petOwnerRepository.findById(ownerId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ chủ nuôi #" + ownerId));

        if ("INACTIVE".equalsIgnoreCase(owner.getStatus())) {
            throw new BadRequestException("Không thể thêm thú cưng cho chủ nuôi đang bị vô hiệu hóa (BR-06).");
        }

        String petName = strOrNull(payload.get("petName"));
        String species = strOrNull(payload.get("species"));
        if (petName == null || petName.isBlank()) {
            throw new BadRequestException("Tên thú cưng không được để trống.");
        }
        if (species == null || species.isBlank()) {
            throw new BadRequestException("Loài thú cưng không được để trống.");
        }

        LocalDate dob = resolveDateOfBirth(payload.get("age"), payload.get("dateOfBirth"));
        BigDecimal weight = payload.get("weight") != null && !String.valueOf(payload.get("weight")).isBlank()
                ? parsePositiveWeight(payload.get("weight"))
                : null;
        String gender = strOrNull(payload.get("gender"));

        Pet pet = Pet.builder()
                .petOwner(owner)
                .petName(petName)
                .species(species)
                .breed(strOrNull(payload.get("breed")))
                .gender(gender != null ? gender : "Chưa rõ")
                .dateOfBirth(dob)
                .weight(weight)
                .status("ACTIVE")
                .build();
        pet = petRepository.save(pet);

        recordAudit(actorUsername, "CREATE_PET", "Pet",
                "Thêm hồ sơ thú cưng " + pet.getPetName() + " (" + pet.getSpecies() + ") cho chủ nuôi " + owner.getFullName());
        return toPetMap(pet);
    }

    @Override
    @Transactional
    public Map<String, Object> updatePet(Integer petId, Map<String, Object> payload, String actorUsername) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ thú cưng #" + petId));

        if (payload.get("ownerId") != null) {
            Integer newOwnerId = parseInt(payload.get("ownerId"), "Chủ nuôi không hợp lệ.");
            PetOwner newOwner = petOwnerRepository.findById(newOwnerId)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chủ nuôi #" + newOwnerId));
            if ("INACTIVE".equalsIgnoreCase(newOwner.getStatus())) {
                throw new BadRequestException("Không thể chuyển thú cưng sang chủ nuôi đang bị vô hiệu hóa (BR-06).");
            }
            pet.setPetOwner(newOwner);
        }

        String petName = strOrNull(payload.get("petName"));
        String species = strOrNull(payload.get("species"));
        if (petName == null || petName.isBlank()) {
            throw new BadRequestException("Tên thú cưng không được để trống.");
        }
        if (species == null || species.isBlank()) {
            throw new BadRequestException("Loài thú cưng không được để trống.");
        }

        LocalDate dob = resolveDateOfBirth(payload.get("age"), payload.get("dateOfBirth"));
        BigDecimal weight = payload.get("weight") != null && !String.valueOf(payload.get("weight")).isBlank()
                ? parsePositiveWeight(payload.get("weight"))
                : null;
        String gender = strOrNull(payload.get("gender"));

        pet.setPetName(petName);
        pet.setSpecies(species);
        pet.setBreed(strOrNull(payload.get("breed")));
        pet.setGender(gender != null ? gender : "Chưa rõ");
        pet.setDateOfBirth(dob);
        pet.setWeight(weight);
        pet = petRepository.save(pet);

        recordAudit(actorUsername, "UPDATE_PET", "Pet",
                "Cập nhật hồ sơ thú cưng #" + petId + " (" + pet.getPetName() + ")");
        return toPetMap(pet);
    }

    @Override
    @Transactional
    public Map<String, Object> togglePetStatus(Integer petId, String status, String actorUsername) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ thú cưng #" + petId));

        String targetStatus = status != null && !status.isBlank()
                ? status.trim().toUpperCase()
                : ("ACTIVE".equalsIgnoreCase(pet.getStatus()) ? "INACTIVE" : "ACTIVE");

        if ("ACTIVE".equalsIgnoreCase(targetStatus)
                && pet.getPetOwner() != null
                && "INACTIVE".equalsIgnoreCase(pet.getPetOwner().getStatus())) {
            throw new BadRequestException("Chủ nuôi đang bị vô hiệu hóa. Vui lòng kích hoạt lại hồ sơ chủ nuôi trước (BR-06, BR-07).");
        }

        pet.setStatus(targetStatus);
        pet = petRepository.save(pet);

        recordAudit(actorUsername, "CHANGE_PET_STATUS", "Pet",
                "Đổi trạng thái thú cưng #" + petId + " (" + pet.getPetName() + ") sang " + targetStatus);
        return toPetMap(pet);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPetHistory(Integer petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ thú cưng #" + petId));

        List<Map<String, Object>> medicalRecords = medicalRecordRepository.findByPet_PetIdOrderByVisitDateDesc(petId).stream()
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("recordId", r.getRecordId());
                    m.put("visitDate", r.getVisitDate() != null ? r.getVisitDate().format(DT_DISPLAY_FMT) : "");
                    m.put("veterinarianName", r.getVeterinarian() != null ? r.getVeterinarian().getFullName() : "Chưa rõ");
                    m.put("symptoms", r.getSymptoms());
                    m.put("diagnosis", r.getDiagnosis());
                    m.put("treatmentPlan", r.getTreatmentPlan());
                    return m;
                })
                .toList();

        List<Map<String, Object>> appointments = appointmentRepository.findByPet_PetIdOrderByAppointmentDateDesc(petId).stream()
                .map(this::toAppointmentMap)
                .toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("pet", toPetMap(pet));
        res.put("medicalRecords", medicalRecords);
        res.put("appointments", appointments);
        return res;
    }

    // ==================== Helper Methods ====================

    private String resolveShift(Object shiftObj, LocalDateTime dt) {
        String s = strOrNull(shiftObj);
        if (s != null && ("MORNING".equalsIgnoreCase(s) || "AFTERNOON".equalsIgnoreCase(s))) {
            return s.toUpperCase();
        }
        return (dt != null && dt.getHour() < 12) ? "MORNING" : "AFTERNOON";
    }

    private LocalDate resolveDateOfBirth(Object ageObj, Object dobObj) {
        String dobStr = strOrNull(dobObj);
        if (dobStr != null) {
            try {
                return LocalDate.parse(dobStr);
            } catch (Exception ignored) {
            }
        }
        if (ageObj != null && !String.valueOf(ageObj).isBlank()) {
            Integer age = parseNonNegativeInt(ageObj, "Tuổi thú cưng phải là số nguyên không âm.");
            return LocalDate.now().minusYears(age);
        }
        return null;
    }

    private Integer computeAgeYears(Pet p) {
        if (p.getDateOfBirth() == null) return null;
        return Math.max(0, LocalDate.now().getYear() - p.getDateOfBirth().getYear());
    }

    private void validateNoVetConflict(Integer vetId, LocalDateTime targetTime, Integer excludeAppointmentId) {
        LocalDateTime windowStart = targetTime.minusMinutes(29);
        LocalDateTime windowEnd = targetTime.plusMinutes(29);

        List<Appointment> conflicts = appointmentRepository.findByAppointmentDateBetween(windowStart, windowEnd).stream()
                .filter(a -> excludeAppointmentId == null || !excludeAppointmentId.equals(a.getAppointmentId()))
                .filter(a -> a.getVeterinarian() != null && vetId.equals(a.getVeterinarian().getUserId()))
                .filter(a -> !Set.of("CANCELLED", "REJECTED").contains(a.getStatus() != null ? a.getStatus().toUpperCase() : ""))
                .toList();

        if (!conflicts.isEmpty()) {
            Appointment c = conflicts.get(0);
            throw new BadRequestException("Bác sĩ đã có ca hẹn #" + c.getAppointmentId()
                    + " lúc " + c.getAppointmentDate().format(DT_DISPLAY_FMT)
                    + " (Khoảng cách tối thiểu giữa 2 ca khám là 30 phút - BR-09).");
        }
    }

    private UserAccount resolveVeterinarian(Object vetIdObj) {
        if (vetIdObj == null || String.valueOf(vetIdObj).isBlank()) {
            return null;
        }
        Integer vetId = parseInt(vetIdObj, "Mã bác sĩ không hợp lệ.");
        if (vetId <= 0) return null;
        return userAccountRepository.findById(vetId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy bác sĩ #" + vetId));
    }

    private Service resolveService(Object serviceIdObj) {
        if (serviceIdObj == null || String.valueOf(serviceIdObj).isBlank()) {
            return null;
        }
        Integer serviceId = parseInt(serviceIdObj, "Mã dịch vụ không hợp lệ.");
        if (serviceId <= 0) return null;
        return serviceRepository.findById(serviceId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy dịch vụ #" + serviceId));
    }

    private LocalDateTime parseAppointmentDateTime(Map<String, Object> payload) {
        String dateTimeStr = strOrNull(payload.get("appointmentDateTime"));
        if (dateTimeStr != null && !dateTimeStr.isBlank()) {
            try {
                return LocalDateTime.parse(dateTimeStr);
            } catch (Exception ignored) {
            }
        }
        String dateStr = strOrNull(payload.get("appointmentDate"));
        String timeStr = strOrNull(payload.get("appointmentTime"));
        String shift = strOrNull(payload.get("shift"));

        if (dateStr == null || dateStr.isBlank()) {
            throw new BadRequestException("Vui lòng chọn ngày hẹn.");
        }
        if (timeStr == null || timeStr.isBlank()) {
            timeStr = "AFTERNOON".equalsIgnoreCase(shift) ? "14:00" : "09:00";
        }
        try {
            LocalDate d = LocalDate.parse(dateStr);
            LocalTime t = LocalTime.parse(timeStr.length() > 5 ? timeStr.substring(0, 5) : timeStr);
            return LocalDateTime.of(d, t);
        } catch (Exception e) {
            throw new BadRequestException("Định dạng ngày giờ hẹn không hợp lệ.");
        }
    }

    private LocalDate parseLocalDateOrNull(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            return LocalDate.parse(dateStr.trim());
        } catch (Exception e) {
            throw new BadRequestException("Định dạng ngày lọc không hợp lệ: " + dateStr);
        }
    }

    private Integer parseInt(Object val, String errMsg) {
        if (val == null) throw new BadRequestException(errMsg);
        try {
            return Integer.valueOf(String.valueOf(val).trim());
        } catch (NumberFormatException e) {
            throw new BadRequestException(errMsg);
        }
    }

    private Integer parseNonNegativeInt(Object val, String errMsg) {
        Integer n = parseInt(val, errMsg);
        if (n < 0 || n > 50) {
            throw new BadRequestException("Tuổi thú cưng phải từ 0 đến 50.");
        }
        return n;
    }

    private BigDecimal parsePositiveWeight(Object val) {
        try {
            BigDecimal w = new BigDecimal(String.valueOf(val).trim());
            if (w.compareTo(BigDecimal.ZERO) <= 0 || w.compareTo(new BigDecimal("250")) > 0) {
                throw new BadRequestException("Cân nặng thú cưng phải lớn hơn 0 và nhỏ hơn 250 kg.");
            }
            return w;
        } catch (NumberFormatException e) {
            throw new BadRequestException("Cân nặng thú cưng không hợp lệ.");
        }
    }

    private String strOrNull(Object val) {
        if (val == null) return null;
        String s = String.valueOf(val).trim();
        return s.isEmpty() ? null : s;
    }

    private String getEffectivePetStatus(Pet p) {
        if ("INACTIVE".equalsIgnoreCase(p.getStatus())) return "INACTIVE";
        if (p.getPetOwner() != null && "INACTIVE".equalsIgnoreCase(p.getPetOwner().getStatus())) return "INACTIVE";
        return "ACTIVE";
    }

    private Map<String, Object> toAppointmentMap(Appointment a) {
        Pet p = a.getPet();
        PetOwner o = p != null ? p.getPetOwner() : a.getPetOwner();
        UserAccount vet = a.getVeterinarian();
        Service svc = a.getService();

        String shift = a.getShift();
        if (shift == null || shift.isBlank()) {
            shift = (a.getAppointmentDate() != null && a.getAppointmentDate().getHour() < 12) ? "MORNING" : "AFTERNOON";
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("appointmentId", a.getAppointmentId());
        m.put("appointmentCode", "APT-" + String.format("%04d", a.getAppointmentId()));
        m.put("petId", p != null ? p.getPetId() : null);
        m.put("petName", p != null ? p.getPetName() : "N/A");
        m.put("species", p != null ? p.getSpecies() : "");
        m.put("breed", p != null && p.getBreed() != null ? p.getBreed() : "");
        m.put("petWeight", p != null ? p.getWeight() : null);
        m.put("ownerId", o != null ? o.getOwnerId() : null);
        m.put("ownerName", o != null ? o.getFullName() : "N/A");
        m.put("ownerPhone", o != null ? o.getPhoneNumber() : "");
        m.put("veterinarianId", vet != null ? vet.getUserId() : null);
        m.put("veterinarianName", vet != null ? vet.getFullName() : "Chưa chỉ định (Chọn khi Check-in)");
        m.put("serviceId", svc != null ? svc.getServiceId() : null);
        m.put("serviceName", svc != null ? svc.getServiceName() : "Khám tổng quát");
        m.put("servicePrice", svc != null ? svc.getPrice() : null);
        m.put("shift", shift);
        m.put("shiftDisplay", "AFTERNOON".equalsIgnoreCase(shift) ? "Buổi chiều (13:30 - 17:30)" : "Buổi sáng (08:00 - 12:00)");
        m.put("appointmentDate", a.getAppointmentDate() != null ? a.getAppointmentDate().toLocalDate().format(DATE_FMT) : "");
        m.put("appointmentTime", a.getAppointmentDate() != null ? a.getAppointmentDate().toLocalTime().format(TIME_FMT) : "");
        m.put("appointmentDateTimeDisplay", a.getAppointmentDate() != null
                ? a.getAppointmentDate().toLocalDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " • " + ("AFTERNOON".equalsIgnoreCase(shift) ? "Buổi chiều" : "Buổi sáng")
                : "");
        m.put("checkInTimeDisplay", a.getCheckInTime() != null ? a.getCheckInTime().format(DT_DISPLAY_FMT) : null);
        m.put("status", a.getStatus());
        m.put("reason", a.getReason() != null ? a.getReason() : "");
        m.put("notes", a.getNotes() != null ? a.getNotes() : (a.getReason() != null ? a.getReason() : ""));
        m.put("rejectionReason", a.getRejectionReason() != null ? a.getRejectionReason() : "");
        m.put("walkIn", a.getNotes() != null && a.getNotes().startsWith("[WALK-IN]"));
        return m;
    }

    private Map<String, Object> toOwnerMap(PetOwner o, List<Pet> pets) {
        List<Map<String, Object>> petSummaries = pets.stream().map(p -> {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("petId", p.getPetId());
            pm.put("petName", p.getPetName());
            pm.put("species", p.getSpecies());
            pm.put("breed", p.getBreed());
            pm.put("gender", p.getGender());
            pm.put("age", computeAgeYears(p));
            pm.put("weight", p.getWeight());
            pm.put("status", getEffectivePetStatus(p));
            return pm;
        }).toList();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ownerId", o.getOwnerId());
        m.put("ownerCode", "OWN-" + String.format("%04d", o.getOwnerId()));
        m.put("fullName", o.getFullName());
        m.put("phoneNumber", o.getPhoneNumber());
        m.put("email", o.getEmail() != null ? o.getEmail() : "");
        m.put("address", o.getAddress() != null ? o.getAddress() : "");
        m.put("status", o.getStatus() != null ? o.getStatus() : "ACTIVE");
        m.put("hasOnlineAccount", o.getUserAccount() != null);
        m.put("petCount", pets.stream().filter(p -> "ACTIVE".equalsIgnoreCase(getEffectivePetStatus(p))).count());
        m.put("totalPetCount", pets.size());
        m.put("pets", petSummaries);
        return m;
    }

    private Map<String, Object> toPetMap(Pet p) {
        PetOwner o = p.getPetOwner();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("petId", p.getPetId());
        m.put("petCode", "PET-" + String.format("%04d", p.getPetId()));
        m.put("petName", p.getPetName());
        m.put("species", p.getSpecies());
        m.put("breed", p.getBreed() != null ? p.getBreed() : "");
        m.put("gender", p.getGender() != null ? p.getGender() : "");
        m.put("age", computeAgeYears(p));
        m.put("dateOfBirth", p.getDateOfBirth() != null ? p.getDateOfBirth().format(DATE_FMT) : "");
        m.put("weight", p.getWeight());
        m.put("status", getEffectivePetStatus(p));
        m.put("ownerId", o != null ? o.getOwnerId() : null);
        m.put("ownerName", o != null ? o.getFullName() : "N/A");
        m.put("ownerPhone", o != null ? o.getPhoneNumber() : "");
        m.put("ownerStatus", o != null && o.getStatus() != null ? o.getStatus() : "ACTIVE");
        return m;
    }

    private void recordAudit(String actorUsername, String actionType, String targetEntity, String details) {
        UserAccount actor = null;
        if (actorUsername != null && !actorUsername.isBlank()) {
            actor = userAccountRepository.findByUsernameOrEmail(actorUsername).orElse(null);
        }
        if (actor == null) {
            actor = userAccountRepository.findAll().stream().findFirst().orElse(null);
        }
        if (actor != null) {
            AuditLog log = AuditLog.builder()
                    .userAccount(actor)
                    .actionDetails("[" + actionType + "] [" + targetEntity + "] " + details)
                    .actionTime(LocalDateTime.now())
                    .build();
            auditLogRepository.save(log);
        }
    }
}
