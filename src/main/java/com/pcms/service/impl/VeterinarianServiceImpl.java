package com.pcms.service.impl;

import com.pcms.entity.*;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.*;
import com.pcms.service.VeterinarianService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VeterinarianServiceImpl implements VeterinarianService {

    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalRecordDetailRepository medicalRecordDetailRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionDetailRepository prescriptionDetailRepository;
    private final FollowUpRepository followUpRepository;
    private final PetRepository petRepository;
    private final PetOwnerRepository petOwnerRepository;
    private final ServiceRepository serviceRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserAccountRepository userAccountRepository;
    private final AuditLogRepository auditLogRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    // =========================================================================
    // 1. QUẢN LÝ CÔNG VIỆC & CA KHÁM (UC-01, UC-02)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getAssignedAppointments(String date, String status, String search, Integer vetId) {
        LocalDate targetDate = (date != null && !date.isBlank() && !"ALL".equalsIgnoreCase(date))
                ? LocalDate.parse(date.trim())
                : LocalDate.now();

        List<Appointment> allAppts = appointmentRepository.findAll();

        String q = (search == null) ? "" : search.trim().toLowerCase();
        String filterStatus = (status == null || status.isBlank()) ? "ALL" : status.trim().toUpperCase();

        List<Map<String, Object>> resultList = allAppts.stream()
                .filter(a -> {
                    // Lọc theo ngày
                    if (date != null && !"ALL".equalsIgnoreCase(date)) {
                        if (a.getAppointmentDate() == null) return false;
                        if (!a.getAppointmentDate().toLocalDate().equals(targetDate)) return false;
                    }

                    // Lọc theo bác sĩ (nếu vetId được truyền vào: lấy các ca gán cho vet này HOẶC chưa gán)
                    if (vetId != null && vetId > 0) {
                        if (a.getVeterinarian() != null && !a.getVeterinarian().getUserId().equals(vetId)) {
                            return false;
                        }
                    }

                    // Lọc theo trạng thái
                    if (!"ALL".equalsIgnoreCase(filterStatus)) {
                        if (!filterStatus.equalsIgnoreCase(a.getStatus())) return false;
                    }

                    // Lọc từ khóa tìm kiếm
                    if (!q.isEmpty()) {
                        String petName = a.getPet() != null ? a.getPet().getPetName().toLowerCase() : "";
                        String ownerName = (a.getPetOwner() != null && a.getPetOwner().getFullName() != null)
                                ? a.getPetOwner().getFullName().toLowerCase() : "";
                        String phone = (a.getPetOwner() != null && a.getPetOwner().getPhoneNumber() != null)
                                ? a.getPetOwner().getPhoneNumber() : "";
                        String reason = a.getReason() != null ? a.getReason().toLowerCase() : "";
                        String idStr = String.valueOf(a.getAppointmentId());

                        return petName.contains(q) || ownerName.contains(q) || phone.contains(q)
                                || reason.contains(q) || idStr.contains(q);
                    }

                    return true;
                })
                .sorted((a1, a2) -> {
                    if (a1.getAppointmentDate() == null || a2.getAppointmentDate() == null) return 0;
                    return a1.getAppointmentDate().compareTo(a2.getAppointmentDate());
                })
                .map(this::toAppointmentDto)
                .collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("date", targetDate.toString());
        response.put("total", resultList.size());
        response.put("appointments", resultList);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getWorklistSummary(String date, Integer vetId) {
        LocalDate targetDate = (date != null && !date.isBlank() && !"ALL".equalsIgnoreCase(date))
                ? LocalDate.parse(date.trim())
                : LocalDate.now();

        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = targetDate.atTime(LocalTime.MAX);

        List<Appointment> dayAppts = appointmentRepository.findByAppointmentDateBetween(startOfDay, endOfDay);

        if (vetId != null && vetId > 0) {
            dayAppts = dayAppts.stream()
                    .filter(a -> a.getVeterinarian() == null || a.getVeterinarian().getUserId().equals(vetId))
                    .toList();
        }

        long total = dayAppts.size();
        long waiting = dayAppts.stream()
                .filter(a -> "WAITING".equalsIgnoreCase(a.getStatus()) || "CHECKED_IN".equalsIgnoreCase(a.getStatus()) || "CONFIRMED".equalsIgnoreCase(a.getStatus()))
                .count();
        long inProgress = dayAppts.stream()
                .filter(a -> "IN_PROGRESS".equalsIgnoreCase(a.getStatus()) || "EXAMINING".equalsIgnoreCase(a.getStatus()))
                .count();
        long completed = dayAppts.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .count();
        long cancelled = dayAppts.stream()
                .filter(a -> "CANCELLED".equalsIgnoreCase(a.getStatus()))
                .count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("date", targetDate.toString());
        summary.put("totalToday", total);
        summary.put("waitingCount", waiting);
        summary.put("inProgressCount", inProgress);
        summary.put("completedCount", completed);
        summary.put("cancelledCount", cancelled);
        return summary;
    }

    @Override
    @Transactional
    public Map<String, Object> updateAppointmentStatus(Integer appointmentId, String status, String notes, String actorUsername) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch hẹn #" + appointmentId));

        appt.setStatus(status.toUpperCase());
        if (notes != null && !notes.isBlank()) {
            appt.setNotes(notes);
        }
        appointmentRepository.save(appt);

        logAudit(actorUsername, "Cập nhật trạng thái lịch hẹn #" + appointmentId + " thành " + status);
        return toAppointmentDto(appt);
    }

    @Override
    @Transactional
    public Map<String, Object> startExamination(Integer appointmentId, String actorUsername) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch hẹn #" + appointmentId));

        UserAccount vet = userAccountRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản bác sĩ: " + actorUsername));

        appt.setStatus("IN_PROGRESS");
        if (appt.getVeterinarian() == null) {
            appt.setVeterinarian(vet);
        }
        appointmentRepository.save(appt);

        // Kiểm tra xem đã có bệnh án liên kết với lịch hẹn này chưa
        Optional<MedicalRecord> existing = medicalRecordRepository.findByAppointment_AppointmentId(appointmentId);
        MedicalRecord record;
        if (existing.isPresent()) {
            record = existing.get();
        } else {
            record = MedicalRecord.builder()
                    .pet(appt.getPet())
                    .veterinarian(vet)
                    .appointment(appt)
                    .visitDate(LocalDateTime.now())
                    .symptoms(appt.getReason() != null ? appt.getReason() : "Khám lâm sàng theo lịch hẹn")
                    .diagnosis("Đang tiến hành khám và chẩn đoán lâm sàng...")
                    .treatmentPlan("")
                    .status("IN_PROGRESS")
                    .build();
            record = medicalRecordRepository.save(record);
        }

        logAudit(actorUsername, "Bác sĩ " + vet.getFullName() + " bắt đầu khám ca bệnh #" + appointmentId + " (Pet: " + appt.getPet().getPetName() + ")");
        return getMedicalRecordDetail(record.getRecordId());
    }

    // =========================================================================
    // 2. QUÁ TRÌNH KHÁM & BỆNH SỬ PET (UC-03, UC-04)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPetMedicalHistory(Integer petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thú cưng #" + petId));

        List<MedicalRecord> records = medicalRecordRepository.findByPet_PetIdOrderByVisitDateDesc(petId);

        List<Map<String, Object>> visitTimeline = records.stream()
                .map(this::toEnrichedRecordSummary)
                .toList();

        // Lịch sử cân nặng theo từng lần khám
        List<Map<String, Object>> weightHistory = records.stream()
                .filter(r -> r.getVisitDate() != null)
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", r.getVisitDate().format(DATE_FORMATTER));
                    m.put("weight", pet.getWeight());
                    m.put("recordId", r.getRecordId());
                    return m;
                })
                .toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("pet", toPetDto(pet));
        res.put("totalVisits", records.size());
        res.put("visits", visitTimeline);
        res.put("weightHistory", weightHistory);
        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> updatePetVitals(Integer petId, Map<String, Object> payload, String actorUsername) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thú cưng #" + petId));

        if (payload.containsKey("weight") && payload.get("weight") != null) {
            BigDecimal weight = new BigDecimal(String.valueOf(payload.get("weight")));
            pet.setWeight(weight);
        }

        petRepository.save(pet);
        logAudit(actorUsername, "Cập nhật chỉ số sinh tồn/cân nặng của thú cưng " + pet.getPetName() + " (" + pet.getWeight() + " kg)");
        return toPetDto(pet);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> searchPets(String query) {
        String q = (query == null) ? "" : query.trim().toLowerCase();
        return petRepository.findAll().stream()
                .filter(p -> {
                    if (q.isEmpty()) return true;
                    String petName = p.getPetName().toLowerCase();
                    String breed = p.getBreed() != null ? p.getBreed().toLowerCase() : "";
                    String ownerName = p.getPetOwner() != null ? p.getPetOwner().getFullName().toLowerCase() : "";
                    String phone = p.getPetOwner() != null ? p.getPetOwner().getPhoneNumber() : "";
                    return petName.contains(q) || breed.contains(q) || ownerName.contains(q) || phone.contains(q);
                })
                .limit(20)
                .map(this::toPetDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // 3. QUẢN LÝ BỆNH ÁN (UC-05, UC-06, UC-07, UC-08)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMedicalRecords(String search, String fromDate, String toDate, String status,
                                                  Integer vetId, int page, int pageSize) {
        String q = (search == null) ? "" : search.trim().toLowerCase();
        String filterStatus = (status == null || status.isBlank()) ? "ALL" : status.trim().toUpperCase();

        List<MedicalRecord> all = medicalRecordRepository.findAll();

        List<MedicalRecord> filtered = all.stream()
                .filter(r -> {
                    if (r.getVisitDate() == null) return false;
                    LocalDate vDate = r.getVisitDate().toLocalDate();

                    if (fromDate != null && !fromDate.isBlank()) {
                        if (vDate.isBefore(LocalDate.parse(fromDate.trim()))) return false;
                    }
                    if (toDate != null && !toDate.isBlank()) {
                        if (vDate.isAfter(LocalDate.parse(toDate.trim()))) return false;
                    }
                    if (vetId != null && vetId > 0) {
                        if (r.getVeterinarian() != null && !r.getVeterinarian().getUserId().equals(vetId)) {
                            return false;
                        }
                    }
                    if (!"ALL".equalsIgnoreCase(filterStatus)) {
                        String st = r.getStatus() != null ? r.getStatus() : "COMPLETED";
                        if (!filterStatus.equalsIgnoreCase(st)) return false;
                    }
                    if (!q.isEmpty()) {
                        String petName = (r.getPet() != null) ? r.getPet().getPetName().toLowerCase() : "";
                        String ownerName = (r.getPet() != null && r.getPet().getPetOwner() != null)
                                ? r.getPet().getPetOwner().getFullName().toLowerCase() : "";
                        String diag = r.getDiagnosis() != null ? r.getDiagnosis().toLowerCase() : "";
                        String symp = r.getSymptoms() != null ? r.getSymptoms().toLowerCase() : "";
                        String recordIdStr = String.valueOf(r.getRecordId());

                        return petName.contains(q) || ownerName.contains(q) || diag.contains(q)
                                || symp.contains(q) || recordIdStr.contains(q);
                    }
                    return true;
                })
                .sorted((r1, r2) -> r2.getVisitDate().compareTo(r1.getVisitDate()))
                .toList();

        int total = filtered.size();
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, pageSize);
        int fromIdx = (safePage - 1) * safeSize;
        int toIdx = Math.min(fromIdx + safeSize, total);

        List<Map<String, Object>> content = (fromIdx < total)
                ? filtered.subList(fromIdx, toIdx).stream().map(this::toEnrichedRecordSummary).toList()
                : List.of();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("records", content);
        res.put("total", total);
        res.put("page", safePage);
        res.put("pageSize", safeSize);
        res.put("totalPages", (int) Math.ceil((double) total / safeSize));
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMedicalRecordDetail(Integer recordId) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        Pet pet = record.getPet();
        UserAccount vet = record.getVeterinarian();
        PetOwner owner = (pet != null) ? pet.getPetOwner() : null;

        // 1. Dịch vụ / Y lệnh
        List<MedicalRecordDetail> details = medicalRecordDetailRepository.findByMedicalRecord_RecordId(recordId);
        BigDecimal totalServicesAmount = BigDecimal.ZERO;
        List<Map<String, Object>> serviceList = new ArrayList<>();
        for (MedicalRecordDetail d : details) {
            BigDecimal price = d.getService() != null ? d.getService().getPrice() : BigDecimal.ZERO;
            int qty = d.getQuantity() != null ? d.getQuantity() : 1;
            BigDecimal subTotal = price.multiply(BigDecimal.valueOf(qty));
            totalServicesAmount = totalServicesAmount.add(subTotal);

            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("recordDetailId", d.getRecordDetailId());
            sm.put("serviceId", d.getService() != null ? d.getService().getServiceId() : null);
            sm.put("serviceName", d.getService() != null ? d.getService().getServiceName() : "N/A");
            sm.put("unitPrice", price);
            sm.put("quantity", qty);
            sm.put("subTotal", subTotal);
            sm.put("notes", d.getNotes() != null ? d.getNotes() : "");
            serviceList.add(sm);
        }

        // 2. Đơn thuốc
        Optional<Prescription> prescOpt = prescriptionRepository.findByMedicalRecord_RecordId(recordId);
        Map<String, Object> prescriptionDto = null;
        BigDecimal totalMedicineAmount = BigDecimal.ZERO;

        if (prescOpt.isPresent()) {
            Prescription p = prescOpt.get();
            List<PrescriptionDetail> pDetails = prescriptionDetailRepository.findByPrescription_PrescriptionId(p.getPrescriptionId());
            List<Map<String, Object>> medicineList = new ArrayList<>();

            for (PrescriptionDetail pd : pDetails) {
                BigDecimal uPrice = (pd.getMedicine() != null) ? pd.getMedicine().getUnitPrice() : BigDecimal.ZERO;
                int mQty = pd.getQuantity() != null ? pd.getQuantity() : 1;
                BigDecimal medSubTotal = uPrice.multiply(BigDecimal.valueOf(mQty));
                totalMedicineAmount = totalMedicineAmount.add(medSubTotal);

                Map<String, Object> mm = new LinkedHashMap<>();
                mm.put("prescriptionDetailId", pd.getPrescriptionDetailId());
                mm.put("medicineId", pd.getMedicine() != null ? pd.getMedicine().getMedicineId() : null);
                mm.put("medicineName", pd.getMedicine() != null ? pd.getMedicine().getMedicineName() : "N/A");
                mm.put("unit", pd.getMedicine() != null ? pd.getMedicine().getUnit() : "đơn vị");
                mm.put("unitPrice", uPrice);
                mm.put("quantity", mQty);
                mm.put("dosage", pd.getDosage());
                mm.put("subTotal", medSubTotal);
                mm.put("notes", pd.getNotes() != null ? pd.getNotes() : "");
                medicineList.add(mm);
            }

            prescriptionDto = new LinkedHashMap<>();
            prescriptionDto.put("prescriptionId", p.getPrescriptionId());
            prescriptionDto.put("prescribedDate", p.getPrescribedDate() != null ? p.getPrescribedDate().toString() : "");
            prescriptionDto.put("instructions", p.getInstructions() != null ? p.getInstructions() : "");
            prescriptionDto.put("medicines", medicineList);
            prescriptionDto.put("totalMedicineAmount", totalMedicineAmount);
        }

        // 3. Lịch hẹn tái khám
        List<FollowUp> followUps = followUpRepository.findByMedicalRecord_RecordId(recordId);
        List<Map<String, Object>> followUpList = followUps.stream().map(f -> {
            Map<String, Object> fm = new LinkedHashMap<>();
            fm.put("followUpId", f.getFollowUpId());
            fm.put("followUpDate", f.getFollowUpDate() != null ? f.getFollowUpDate().toString() : "");
            fm.put("followUpType", f.getFollowUpType());
            fm.put("notes", f.getNotes() != null ? f.getNotes() : "");
            fm.put("status", f.getStatus());
            return fm;
        }).toList();

        // 4. Hóa đơn (nếu có)
        Optional<Invoice> invOpt = invoiceRepository.findByMedicalRecord_RecordId(recordId);
        Map<String, Object> invoiceDto = null;
        if (invOpt.isPresent()) {
            Invoice inv = invOpt.get();
            invoiceDto = new LinkedHashMap<>();
            invoiceDto.put("invoiceId", inv.getInvoiceId());
            invoiceDto.put("invoiceDate", inv.getInvoiceDate() != null ? inv.getInvoiceDate().format(DATE_TIME_FORMATTER) : "");
            invoiceDto.put("totalAmount", inv.getTotalAmount());
            invoiceDto.put("discountAmount", inv.getDiscountAmount());
            invoiceDto.put("status", inv.getStatus());
        }

        BigDecimal grandTotal = totalServicesAmount.add(totalMedicineAmount);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("recordId", record.getRecordId());
        res.put("visitDate", record.getVisitDate() != null ? record.getVisitDate().format(DATE_TIME_FORMATTER) : "");
        res.put("status", record.getStatus() != null ? record.getStatus() : "COMPLETED");
        res.put("symptoms", record.getSymptoms());
        res.put("diagnosis", record.getDiagnosis());
        res.put("treatmentPlan", record.getTreatmentPlan() != null ? record.getTreatmentPlan() : "");

        res.put("appointmentId", record.getAppointment() != null ? record.getAppointment().getAppointmentId() : null);

        res.put("pet", toPetDto(pet));
        res.put("owner", toOwnerDto(owner));
        res.put("veterinarian", toVetDto(vet));

        res.put("services", serviceList);
        res.put("totalServicesAmount", totalServicesAmount);

        res.put("prescription", prescriptionDto);
        res.put("totalMedicineAmount", totalMedicineAmount);

        res.put("followUps", followUpList);
        res.put("invoice", invoiceDto);
        res.put("grandTotal", grandTotal);

        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> createMedicalRecord(Map<String, Object> payload, String actorUsername) {
        Integer petId = payload.get("petId") != null ? Integer.parseInt(String.valueOf(payload.get("petId"))) : null;
        if (petId == null) {
            throw new BadRequestException("Vui lòng chọn thú cưng để lập bệnh án");
        }

        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thú cưng #" + petId));

        UserAccount vet = userAccountRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin bác sĩ"));

        Appointment appt = null;
        if (payload.containsKey("appointmentId") && payload.get("appointmentId") != null) {
            Integer apptId = Integer.parseInt(String.valueOf(payload.get("appointmentId")));
            appt = appointmentRepository.findById(apptId).orElse(null);
            if (appt != null) {
                appt.setStatus("IN_PROGRESS");
                if (appt.getVeterinarian() == null) {
                    appt.setVeterinarian(vet);
                }
                appointmentRepository.save(appt);
            }
        }

        // Cập nhật cân nặng mới nếu có
        if (payload.containsKey("weight") && payload.get("weight") != null) {
            try {
                BigDecimal w = new BigDecimal(String.valueOf(payload.get("weight")));
                pet.setWeight(w);
                petRepository.save(pet);
            } catch (Exception ignored) {}
        }

        String symptoms = String.valueOf(payload.getOrDefault("symptoms", "Khám tổng quát"));
        String diagnosis = String.valueOf(payload.getOrDefault("diagnosis", "Chẩn đoán lâm sàng"));
        String treatmentPlan = String.valueOf(payload.getOrDefault("treatmentPlan", ""));
        String status = String.valueOf(payload.getOrDefault("status", "IN_PROGRESS"));

        MedicalRecord record = MedicalRecord.builder()
                .pet(pet)
                .veterinarian(vet)
                .appointment(appt)
                .visitDate(LocalDateTime.now())
                .symptoms(symptoms)
                .diagnosis(diagnosis)
                .treatmentPlan(treatmentPlan)
                .status(status)
                .build();

        record = medicalRecordRepository.save(record);
        logAudit(actorUsername, "Tạo mới bệnh án #" + record.getRecordId() + " cho bé " + pet.getPetName());

        return getMedicalRecordDetail(record.getRecordId());
    }

    @Override
    @Transactional
    public Map<String, Object> updateMedicalRecord(Integer recordId, Map<String, Object> payload, String actorUsername) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        if (payload.containsKey("symptoms")) {
            record.setSymptoms(String.valueOf(payload.get("symptoms")));
        }
        if (payload.containsKey("diagnosis")) {
            record.setDiagnosis(String.valueOf(payload.get("diagnosis")));
        }
        if (payload.containsKey("treatmentPlan")) {
            record.setTreatmentPlan(String.valueOf(payload.get("treatmentPlan")));
        }
        if (payload.containsKey("status")) {
            record.setStatus(String.valueOf(payload.get("status")));
        }

        // Cập nhật cân nặng nếu có
        if (payload.containsKey("weight") && payload.get("weight") != null && record.getPet() != null) {
            try {
                BigDecimal w = new BigDecimal(String.valueOf(payload.get("weight")));
                record.getPet().setWeight(w);
                petRepository.save(record.getPet());
            } catch (Exception ignored) {}
        }

        medicalRecordRepository.save(record);
        logAudit(actorUsername, "Cập nhật thông tin chuyên môn bệnh án #" + recordId);
        return getMedicalRecordDetail(recordId);
    }

    @Override
    @Transactional
    public Map<String, Object> completeMedicalRecord(Integer recordId, Map<String, Object> payload, String actorUsername) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        if (payload != null) {
            if (payload.containsKey("diagnosis")) {
                record.setDiagnosis(String.valueOf(payload.get("diagnosis")));
            }
            if (payload.containsKey("treatmentPlan")) {
                record.setTreatmentPlan(String.valueOf(payload.get("treatmentPlan")));
            }
        }

        record.setStatus("COMPLETED");
        medicalRecordRepository.save(record);

        // Hoàn tất lịch hẹn liên kết
        if (record.getAppointment() != null) {
            Appointment appt = record.getAppointment();
            appt.setStatus("COMPLETED");
            appointmentRepository.save(appt);
        }

        // Tự động tính tổng tiền & tạo/cập nhật hóa đơn ở trạng thái PENDING (chờ thu ngân thu tiền)
        syncInvoiceForRecord(record);

        logAudit(actorUsername, "Hoàn thành khám bệnh & chốt bệnh án #" + recordId + " (Pet: " + record.getPet().getPetName() + ")");
        return getMedicalRecordDetail(recordId);
    }

    @Override
    @Transactional
    public Map<String, Object> cancelMedicalRecord(Integer recordId, String reason, String actorUsername) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        record.setStatus("CANCELLED");
        record.setTreatmentPlan((record.getTreatmentPlan() != null ? record.getTreatmentPlan() + "\n" : "") + "[HỦY CA: " + reason + "]");
        medicalRecordRepository.save(record);

        if (record.getAppointment() != null) {
            Appointment appt = record.getAppointment();
            appt.setStatus("CANCELLED");
            appt.setNotes("Bác sĩ hủy: " + reason);
            appointmentRepository.save(appt);
        }

        logAudit(actorUsername, "Hủy bệnh án #" + recordId + ". Lý do: " + reason);
        return getMedicalRecordDetail(recordId);
    }

    // =========================================================================
    // 4. CHỈ ĐỊNH DỊCH VỤ / Y LỆNH CẬN LÂM SÀNG (UC-09, UC-10, UC-11, UC-12)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAvailableServices() {
        return serviceRepository.findAll().stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()))
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("serviceId", s.getServiceId());
                    m.put("serviceName", s.getServiceName());
                    m.put("description", s.getDescription());
                    m.put("price", s.getPrice());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecordServices(Integer recordId) {
        List<MedicalRecordDetail> details = medicalRecordDetailRepository.findByMedicalRecord_RecordId(recordId);
        return details.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("recordDetailId", d.getRecordDetailId());
            m.put("serviceId", d.getService().getServiceId());
            m.put("serviceName", d.getService().getServiceName());
            m.put("unitPrice", d.getService().getPrice());
            m.put("quantity", d.getQuantity());
            m.put("subTotal", d.getService().getPrice().multiply(BigDecimal.valueOf(d.getQuantity())));
            m.put("notes", d.getNotes() != null ? d.getNotes() : "");
            return m;
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Map<String, Object> addServiceOrder(Integer recordId, Map<String, Object> payload, String actorUsername) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        Integer serviceId = Integer.parseInt(String.valueOf(payload.get("serviceId")));
        com.pcms.entity.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ #" + serviceId));

        int quantity = payload.containsKey("quantity") ? Integer.parseInt(String.valueOf(payload.get("quantity"))) : 1;
        String notes = payload.containsKey("notes") ? String.valueOf(payload.get("notes")) : "";

        MedicalRecordDetail detail = MedicalRecordDetail.builder()
                .medicalRecord(record)
                .service(service)
                .quantity(Math.max(1, quantity))
                .notes(notes)
                .build();

        medicalRecordDetailRepository.save(detail);
        syncInvoiceForRecord(record);

        logAudit(actorUsername, "Lên y lệnh dịch vụ: " + service.getServiceName() + " (SL: " + quantity + ") cho bệnh án #" + recordId);
        return getMedicalRecordDetail(recordId);
    }

    @Override
    @Transactional
    public Map<String, Object> updateServiceOrder(Integer recordId, Integer recordDetailId, Map<String, Object> payload, String actorUsername) {
        MedicalRecordDetail detail = medicalRecordDetailRepository.findById(recordDetailId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy y lệnh dịch vụ #" + recordDetailId));

        if (payload.containsKey("quantity")) {
            detail.setQuantity(Math.max(1, Integer.parseInt(String.valueOf(payload.get("quantity")))));
        }
        if (payload.containsKey("notes")) {
            detail.setNotes(String.valueOf(payload.get("notes")));
        }

        medicalRecordDetailRepository.save(detail);
        syncInvoiceForRecord(detail.getMedicalRecord());

        logAudit(actorUsername, "Cập nhật y lệnh dịch vụ #" + recordDetailId + " trong bệnh án #" + recordId);
        return getMedicalRecordDetail(recordId);
    }

    @Override
    @Transactional
    public Map<String, Object> deleteServiceOrder(Integer recordId, Integer recordDetailId, String actorUsername) {
        MedicalRecordDetail detail = medicalRecordDetailRepository.findById(recordDetailId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy y lệnh dịch vụ #" + recordDetailId));

        String sName = detail.getService() != null ? detail.getService().getServiceName() : "";
        medicalRecordDetailRepository.delete(detail);
        syncInvoiceForRecord(detail.getMedicalRecord());

        logAudit(actorUsername, "Hủy y lệnh dịch vụ '" + sName + "' khỏi bệnh án #" + recordId);
        return getMedicalRecordDetail(recordId);
    }

    // =========================================================================
    // 5. KÊ ĐƠN THUỐC & THEO DÕI TÁI KHÁM (UC-13, UC-14)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAvailableMedicines() {
        return medicineRepository.findAll().stream()
                .filter(m -> "ACTIVE".equalsIgnoreCase(m.getStatus()))
                .map(m -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("medicineId", m.getMedicineId());
                    map.put("medicineName", m.getMedicineName());
                    map.put("unit", m.getUnit());
                    map.put("unitPrice", m.getUnitPrice());
                    map.put("minThreshold", m.getMinThreshold());
                    return map;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getRecordPrescription(Integer recordId) {
        Optional<Prescription> prescOpt = prescriptionRepository.findByMedicalRecord_RecordId(recordId);
        if (prescOpt.isEmpty()) {
            return Map.of("exists", false);
        }
        Prescription p = prescOpt.get();
        List<PrescriptionDetail> details = prescriptionDetailRepository.findByPrescription_PrescriptionId(p.getPrescriptionId());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("exists", true);
        res.put("prescriptionId", p.getPrescriptionId());
        res.put("prescribedDate", p.getPrescribedDate() != null ? p.getPrescribedDate().toString() : "");
        res.put("instructions", p.getInstructions() != null ? p.getInstructions() : "");
        res.put("items", details.stream().map(pd -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("prescriptionDetailId", pd.getPrescriptionDetailId());
            item.put("medicineId", pd.getMedicine().getMedicineId());
            item.put("medicineName", pd.getMedicine().getMedicineName());
            item.put("unit", pd.getMedicine().getUnit());
            item.put("unitPrice", pd.getMedicine().getUnitPrice());
            item.put("quantity", pd.getQuantity());
            item.put("dosage", pd.getDosage());
            item.put("notes", pd.getNotes() != null ? pd.getNotes() : "");
            return item;
        }).toList());

        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> savePrescription(Integer recordId, Map<String, Object> payload, String actorUsername) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        String instructions = payload.containsKey("instructions") ? String.valueOf(payload.get("instructions")) : "";
        LocalDate presDate = LocalDate.now();
        if (payload.containsKey("prescribedDate") && payload.get("prescribedDate") != null) {
            try {
                presDate = LocalDate.parse(String.valueOf(payload.get("prescribedDate")));
            } catch (Exception ignored) {}
        }

        Prescription prescription = prescriptionRepository.findByMedicalRecord_RecordId(recordId)
                .orElseGet(() -> Prescription.builder()
                        .medicalRecord(record)
                        .prescribedDate(LocalDate.now())
                        .build());

        prescription.setPrescribedDate(presDate);
        prescription.setInstructions(instructions);
        prescription = prescriptionRepository.save(prescription);

        // Xóa chi tiết cũ và tạo lại nếu payload có danh sách thuốc
        if (payload.containsKey("items")) {
            List<PrescriptionDetail> oldDetails = prescriptionDetailRepository.findByPrescription_PrescriptionId(prescription.getPrescriptionId());
            prescriptionDetailRepository.deleteAll(oldDetails);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
            if (items != null) {
                for (Map<String, Object> it : items) {
                    Integer medId = Integer.parseInt(String.valueOf(it.get("medicineId")));
                    Medicine med = medicineRepository.findById(medId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thuốc #" + medId));

                    int qty = Integer.parseInt(String.valueOf(it.getOrDefault("quantity", 1)));
                    String dosage = String.valueOf(it.getOrDefault("dosage", "Theo hướng dẫn"));
                    String notes = it.containsKey("notes") ? String.valueOf(it.get("notes")) : "";

                    PrescriptionDetail pd = PrescriptionDetail.builder()
                            .prescription(prescription)
                            .medicine(med)
                            .quantity(Math.max(1, qty))
                            .dosage(dosage)
                            .notes(notes)
                            .build();

                    prescriptionDetailRepository.save(pd);
                }
            }
        }

        syncInvoiceForRecord(record);
        logAudit(actorUsername, "Lưu đơn thuốc điện tử cho bệnh án #" + recordId);
        return getMedicalRecordDetail(recordId);
    }

    @Override
    @Transactional
    public Map<String, Object> deletePrescription(Integer recordId, String actorUsername) {
        Optional<Prescription> prescOpt = prescriptionRepository.findByMedicalRecord_RecordId(recordId);
        if (prescOpt.isPresent()) {
            Prescription p = prescOpt.get();
            List<PrescriptionDetail> details = prescriptionDetailRepository.findByPrescription_PrescriptionId(p.getPrescriptionId());
            prescriptionDetailRepository.deleteAll(details);
            prescriptionRepository.delete(p);

            MedicalRecord record = medicalRecordRepository.findById(recordId).orElse(null);
            if (record != null) {
                syncInvoiceForRecord(record);
            }
            logAudit(actorUsername, "Hủy đơn thuốc của bệnh án #" + recordId);
        }
        return getMedicalRecordDetail(recordId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecordFollowUps(Integer recordId) {
        return followUpRepository.findByMedicalRecord_RecordId(recordId).stream()
                .map(f -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("followUpId", f.getFollowUpId());
                    m.put("followUpDate", f.getFollowUpDate().toString());
                    m.put("followUpType", f.getFollowUpType());
                    m.put("notes", f.getNotes() != null ? f.getNotes() : "");
                    m.put("status", f.getStatus());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Map<String, Object> createFollowUp(Integer recordId, Map<String, Object> payload, String actorUsername) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        String dateStr = String.valueOf(payload.get("followUpDate"));
        LocalDate followDate = LocalDate.parse(dateStr.trim());
        String type = String.valueOf(payload.getOrDefault("followUpType", "Tái khám theo dõi"));
        String notes = payload.containsKey("notes") ? String.valueOf(payload.get("notes")) : "";

        FollowUp followUp = FollowUp.builder()
                .pet(record.getPet())
                .medicalRecord(record)
                .followUpDate(followDate)
                .followUpType(type)
                .notes(notes)
                .status("PENDING")
                .build();

        followUpRepository.save(followUp);
        logAudit(actorUsername, "Hẹn lịch tái khám ngày " + dateStr + " cho bé " + record.getPet().getPetName());
        return getMedicalRecordDetail(recordId);
    }

    @Override
    @Transactional
    public Map<String, Object> deleteFollowUp(Integer followUpId, String actorUsername) {
        FollowUp f = followUpRepository.findById(followUpId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch tái khám #" + followUpId));

        Integer recordId = f.getMedicalRecord().getRecordId();
        followUpRepository.delete(f);
        logAudit(actorUsername, "Hủy lịch hẹn tái khám #" + followUpId);
        return getMedicalRecordDetail(recordId);
    }

    // =========================================================================
    // 6. GÓC NHÌN CHỦ NUÔI (PET OWNER PORTAL - UC-15)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyPets(Integer ownerUserId) {
        List<Pet> pets = petRepository.findByPetOwner_UserAccount_UserId(ownerUserId);
        return pets.stream().map(this::toPetDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMyPetMedicalHistory(Integer petId, Integer ownerUserId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thú cưng #" + petId));

        // Kiểm tra quyền sở hữu của chủ nuôi
        if (ownerUserId != null) {
            if (pet.getPetOwner() == null || pet.getPetOwner().getUserAccount() == null
                    || !ownerUserId.equals(pet.getPetOwner().getUserAccount().getUserId())) {
                throw new BadRequestException("Bạn không có quyền truy cập hồ sơ bệnh án của thú cưng này.");
            }
        }

        return getPetMedicalHistory(petId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMyMedicalRecordPrintView(Integer recordId, Integer ownerUserId) {
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án #" + recordId));

        if (ownerUserId != null) {
            Pet pet = record.getPet();
            if (pet != null && pet.getPetOwner() != null && pet.getPetOwner().getUserAccount() != null) {
                if (!ownerUserId.equals(pet.getPetOwner().getUserAccount().getUserId())) {
                    throw new BadRequestException("Bạn không có quyền xem bệnh án này.");
                }
            }
        }

        return getMedicalRecordDetail(recordId);
    }

    // =========================================================================
    // HELPER METHODS & DTO MAPPERS
    // =========================================================================

    private void syncInvoiceForRecord(MedicalRecord record) {
        try {
            // Tính tiền dịch vụ
            List<MedicalRecordDetail> details = medicalRecordDetailRepository.findByMedicalRecord_RecordId(record.getRecordId());
            BigDecimal servicesTotal = details.stream()
                    .map(d -> d.getService().getPrice().multiply(BigDecimal.valueOf(d.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Tính tiền thuốc
            BigDecimal medicineTotal = BigDecimal.ZERO;
            Optional<Prescription> prescOpt = prescriptionRepository.findByMedicalRecord_RecordId(record.getRecordId());
            if (prescOpt.isPresent()) {
                List<PrescriptionDetail> pDetails = prescriptionDetailRepository.findByPrescription_PrescriptionId(prescOpt.get().getPrescriptionId());
                medicineTotal = pDetails.stream()
                        .map(pd -> pd.getMedicine().getUnitPrice().multiply(BigDecimal.valueOf(pd.getQuantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }

            BigDecimal grandTotal = servicesTotal.add(medicineTotal);

            Optional<Invoice> existingInv = invoiceRepository.findByMedicalRecord_RecordId(record.getRecordId());
            if (existingInv.isPresent()) {
                Invoice inv = existingInv.get();
                inv.setTotalAmount(grandTotal);
                invoiceRepository.save(inv);
            } else {
                Invoice newInv = Invoice.builder()
                        .medicalRecord(record)
                        .invoiceDate(LocalDateTime.now())
                        .totalAmount(grandTotal)
                        .discountAmount(BigDecimal.ZERO)
                        .status("PENDING")
                        .build();
                invoiceRepository.save(newInv);
            }
        } catch (Exception e) {
            log.warn("Không thể đồng bộ hóa đơn cho bệnh án #{}: {}", record.getRecordId(), e.getMessage());
        }
    }

    private Map<String, Object> toAppointmentDto(Appointment a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("appointmentId", a.getAppointmentId());
        m.put("appointmentDate", a.getAppointmentDate() != null ? a.getAppointmentDate().format(DATE_TIME_FORMATTER) : "");
        m.put("reason", a.getReason() != null ? a.getReason() : "");
        m.put("status", a.getStatus());
        m.put("notes", a.getNotes() != null ? a.getNotes() : "");

        m.put("pet", toPetDto(a.getPet()));
        m.put("petOwner", toOwnerDto(a.getPetOwner()));
        m.put("veterinarian", toVetDto(a.getVeterinarian()));

        // Kiểm tra xem đã có bệnh án chưa
        Optional<MedicalRecord> rec = medicalRecordRepository.findByAppointment_AppointmentId(a.getAppointmentId());
        m.put("hasMedicalRecord", rec.isPresent());
        m.put("recordId", rec.map(MedicalRecord::getRecordId).orElse(null));

        return m;
    }

    private Map<String, Object> toPetDto(Pet pet) {
        if (pet == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("petId", pet.getPetId());
        m.put("petName", pet.getPetName());
        m.put("species", pet.getSpecies());
        m.put("breed", pet.getBreed() != null ? pet.getBreed() : "");
        m.put("gender", pet.getGender());
        m.put("dateOfBirth", pet.getDateOfBirth() != null ? pet.getDateOfBirth().toString() : "");
        m.put("weight", pet.getWeight());
        if (pet.getPetOwner() != null) {
            m.put("ownerId", pet.getPetOwner().getOwnerId());
            m.put("ownerName", pet.getPetOwner().getFullName());
            m.put("ownerPhone", pet.getPetOwner().getPhoneNumber());
        }
        return m;
    }

    private Map<String, Object> toOwnerDto(PetOwner owner) {
        if (owner == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ownerId", owner.getOwnerId());
        m.put("fullName", owner.getFullName());
        m.put("phoneNumber", owner.getPhoneNumber());
        m.put("email", owner.getEmail() != null ? owner.getEmail() : "");
        m.put("address", owner.getAddress() != null ? owner.getAddress() : "");
        return m;
    }

    private Map<String, Object> toVetDto(UserAccount vet) {
        if (vet == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("userId", vet.getUserId());
        m.put("fullName", vet.getFullName());
        m.put("email", vet.getEmail());
        m.put("phoneNumber", vet.getPhoneNumber());
        return m;
    }

    private Map<String, Object> toEnrichedRecordSummary(MedicalRecord r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("recordId", r.getRecordId());
        m.put("visitDate", r.getVisitDate() != null ? r.getVisitDate().format(DATE_TIME_FORMATTER) : "");
        m.put("status", r.getStatus() != null ? r.getStatus() : "COMPLETED");
        m.put("symptoms", r.getSymptoms());
        m.put("diagnosis", r.getDiagnosis());
        m.put("treatmentPlan", r.getTreatmentPlan() != null ? r.getTreatmentPlan() : "");
        m.put("veterinarianName", r.getVeterinarian() != null ? r.getVeterinarian().getFullName() : "N/A");
        m.put("petName", r.getPet() != null ? r.getPet().getPetName() : "N/A");
        m.put("petBreed", r.getPet() != null ? r.getPet().getBreed() : "");
        m.put("ownerName", (r.getPet() != null && r.getPet().getPetOwner() != null) ? r.getPet().getPetOwner().getFullName() : "N/A");
        m.put("ownerPhone", (r.getPet() != null && r.getPet().getPetOwner() != null) ? r.getPet().getPetOwner().getPhoneNumber() : "");
        return m;
    }

    private void logAudit(String actor, String actionDetails) {
        try {
            UserAccount user = userAccountRepository.findByUsername(actor).orElse(null);
            if (user != null) {
                auditLogRepository.save(AuditLog.builder()
                        .userAccount(user)
                        .actionTime(LocalDateTime.now())
                        .actionDetails("[BÁC SĨ THÚ Y] " + actionDetails)
                        .build());
            }
        } catch (Exception e) {
            log.warn("Lỗi lưu AuditLog: {}", e.getMessage());
        }
    }
}
