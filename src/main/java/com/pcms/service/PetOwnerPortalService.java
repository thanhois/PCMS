package com.pcms.service;

import java.util.List;
import java.util.Map;

public interface PetOwnerPortalService {

    List<Map<String, Object>> getActiveServices();

    List<Map<String, Object>> getActiveVeterinarians();

    List<Map<String, Object>> getAvailableSlots(String dateStr, Integer veterinarianId);

    List<Map<String, Object>> getMyPets(Integer userId);

    Map<String, Object> createPet(Integer userId, Map<String, Object> payload);

    Map<String, Object> updatePet(Integer userId, Integer petId, Map<String, Object> payload);

    Map<String, Object> updatePetStatus(Integer userId, Integer petId, String status);

    List<Map<String, Object>> getMyAppointments(Integer userId);

    Map<String, Object> bookAppointment(Integer userId, Map<String, Object> payload);

    Map<String, Object> rescheduleMyAppointment(Integer userId, Integer appointmentId, Map<String, Object> payload);

    Map<String, Object> cancelMyAppointment(Integer userId, Integer appointmentId, String reason);

    Map<String, Object> getMyPetMedicalHistory(Integer petId, Integer ownerUserId);

    Map<String, Object> getMyMedicalRecordPrintView(Integer recordId, Integer ownerUserId);

    List<Map<String, Object>> getMyInvoices(Integer userId);
}
