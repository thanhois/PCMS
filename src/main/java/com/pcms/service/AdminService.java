package com.pcms.service;

import java.util.List;
import java.util.Map;

public interface AdminService {

    Map<String, Object> getOverviewSummary(String year);

    Map<String, Object> getAccounts(String search, String role, String status, int page, int pageSize);

    Map<String, Object> createAccount(Map<String, Object> payload, String adminUsername);

    Map<String, Object> updateAccount(Integer userId, Map<String, Object> payload, String adminUsername);

    Map<String, Object> toggleAccountStatus(Integer userId, String nextStatus, String adminUsername);

    Map<String, Object> resetAccountPassword(Integer userId, String adminUsername);

    Map<String, Object> getRolesAndPermissions();

    Map<String, Object> assignAccountRole(Integer userId, String roleName, String adminUsername);

    List<Map<String, Object>> getServices();

    Map<String, Object> saveService(Integer serviceId, Map<String, Object> payload, String adminUsername);

    Map<String, Object> toggleServiceStatus(Integer serviceId, String nextStatus, String adminUsername);

    List<Map<String, Object>> getMedicines();

    Map<String, Object> saveMedicine(Integer medicineId, Map<String, Object> payload, String adminUsername);

    Map<String, Object> toggleMedicineStatus(Integer medicineId, String nextStatus, String adminUsername);

    Map<String, Object> getReports(String fromDate, String toDate);

    List<Map<String, Object>> getAuditLogs(String fromDate, String toDate, String username, String actionType);
}
