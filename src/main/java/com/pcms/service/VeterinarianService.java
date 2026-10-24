package com.pcms.service;

import java.util.List;
import java.util.Map;

public interface VeterinarianService {

    // 1. Quản lý công việc & Ca khám
    Map<String, Object> getAssignedAppointments(String date, String status, String search, Integer vetId);
    Map<String, Object> getWorklistSummary(String date, Integer vetId);
    Map<String, Object> updateAppointmentStatus(Integer appointmentId, String status, String notes, String actorUsername);
    Map<String, Object> startExamination(Integer appointmentId, String actorUsername);

    // 2. Quá trình khám & Bệnh sử Pet
    Map<String, Object> getPetMedicalHistory(Integer petId);
    Map<String, Object> updatePetVitals(Integer petId, Map<String, Object> payload, String actorUsername);
    List<Map<String, Object>> searchPets(String query);

    // 3. Quản lý Bệnh án (Medical Record)
    Map<String, Object> getMedicalRecords(String search, String fromDate, String toDate, String status, Integer vetId, int page, int pageSize);
    Map<String, Object> getMedicalRecordDetail(Integer recordId);
    Map<String, Object> createMedicalRecord(Map<String, Object> payload, String actorUsername);
    Map<String, Object> updateMedicalRecord(Integer recordId, Map<String, Object> payload, String actorUsername);
    Map<String, Object> completeMedicalRecord(Integer recordId, Map<String, Object> payload, String actorUsername);
    Map<String, Object> cancelMedicalRecord(Integer recordId, String reason, String actorUsername);

    // 4. Chỉ định dịch vụ / Y lệnh cận lâm sàng
    List<Map<String, Object>> getAvailableServices();
    List<Map<String, Object>> getRecordServices(Integer recordId);
    Map<String, Object> addServiceOrder(Integer recordId, Map<String, Object> payload, String actorUsername);
    Map<String, Object> updateServiceOrder(Integer recordId, Integer recordDetailId, Map<String, Object> payload, String actorUsername);
    Map<String, Object> deleteServiceOrder(Integer recordId, Integer recordDetailId, String actorUsername);

    // 5. Kê đơn thuốc & Theo dõi tái khám
    List<Map<String, Object>> getAvailableMedicines();
    Map<String, Object> getRecordPrescription(Integer recordId);
    Map<String, Object> savePrescription(Integer recordId, Map<String, Object> payload, String actorUsername);
    Map<String, Object> deletePrescription(Integer recordId, String actorUsername);
    List<Map<String, Object>> getRecordFollowUps(Integer recordId);
    Map<String, Object> createFollowUp(Integer recordId, Map<String, Object> payload, String actorUsername);
    Map<String, Object> deleteFollowUp(Integer followUpId, String actorUsername);

    // 6. Góc nhìn Chủ nuôi (Pet Owner Portal)
    List<Map<String, Object>> getMyPets(Integer ownerUserId);
    Map<String, Object> getMyPetMedicalHistory(Integer petId, Integer ownerUserId);
    Map<String, Object> getMyMedicalRecordPrintView(Integer recordId, Integer ownerUserId);
}
