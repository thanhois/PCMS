package com.pcms.service;

import java.util.List;
import java.util.Map;

public interface ReceptionistService {

    Map<String, Object> getDashboardSummary();

    Map<String, Object> getCatalogLookup();

    List<Map<String, Object>> getAppointments(String fromDate, String toDate, String status, Integer veterinarianId, String search);

    Map<String, Object> createAppointment(Map<String, Object> payload, String actorUsername);

    Map<String, Object> approveAppointment(Integer appointmentId, Map<String, Object> payload, String actorUsername);

    Map<String, Object> rejectAppointment(Integer appointmentId, String reason, String actorUsername);

    Map<String, Object> rescheduleAppointment(Integer appointmentId, Map<String, Object> payload, String actorUsername);

    Map<String, Object> cancelAppointment(Integer appointmentId, String reason, String actorUsername);

    Map<String, Object> checkInAppointment(Integer appointmentId, Map<String, Object> payload, String actorUsername);

    Map<String, Object> assignVeterinarian(Integer appointmentId, Integer veterinarianId, String actorUsername);

    Map<String, Object> processWalkIn(Map<String, Object> payload, String actorUsername);

    List<Map<String, Object>> getOwners(String search, String status);

    Map<String, Object> createOwner(Map<String, Object> payload, String actorUsername);

    Map<String, Object> updateOwner(Integer ownerId, Map<String, Object> payload, String actorUsername);

    Map<String, Object> toggleOwnerStatus(Integer ownerId, String status, String actorUsername);

    List<Map<String, Object>> getPets(String search, Integer ownerId, String status);

    Map<String, Object> createPet(Map<String, Object> payload, String actorUsername);

    Map<String, Object> updatePet(Integer petId, Map<String, Object> payload, String actorUsername);

    Map<String, Object> togglePetStatus(Integer petId, String status, String actorUsername);

    Map<String, Object> getPetHistory(Integer petId);
}
