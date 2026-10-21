package com.pcms.service.impl;

import com.pcms.entity.*;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.DuplicateResourceException;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.*;
import com.pcms.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final ServiceRepository serviceRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    // Danh sách quyền mặc định cố định theo từng Role
    private static final List<Map<String, Object>> DEFAULT_PERMISSIONS = List.of(
            Map.of("permissionId", 1, "permissionCode", "ACCOUNT_MANAGE", "permissionName", "Quản lý tài khoản nhân viên (Tạo/Sửa/Khóa/Reset mật khẩu)", "module", "Quản trị & Bảo mật"),
            Map.of("permissionId", 2, "permissionCode", "ROLE_PERMISSION_MANAGE", "permissionName", "Phân công vai trò nhân sự", "module", "Quản trị & Bảo mật"),
            Map.of("permissionId", 3, "permissionCode", "AUDIT_LOG_VIEW", "permissionName", "Xem và xuất nhật ký hệ thống (Audit Log)", "module", "Quản trị & Bảo mật"),
            Map.of("permissionId", 5, "permissionCode", "SERVICE_CATALOG_MANAGE", "permissionName", "Thêm/Sửa/Vô hiệu hóa danh mục dịch vụ", "module", "Danh mục & Cấu hình"),
            Map.of("permissionId", 6, "permissionCode", "SERVICE_CATALOG_VIEW", "permissionName", "Xem bảng giá danh mục dịch vụ", "module", "Danh mục & Cấu hình"),
            Map.of("permissionId", 7, "permissionCode", "MEDICINE_CATALOG_MANAGE", "permissionName", "Thêm/Sửa/Vô hiệu hóa danh mục thuốc", "module", "Kho dược"),
            Map.of("permissionId", 8, "permissionCode", "INVENTORY_BATCH_VIEW", "permissionName", "Xem tồn kho thuốc & cảnh báo cận hạn", "module", "Kho dược"),
            Map.of("permissionId", 9, "permissionCode", "INVENTORY_STOCK_ADJUST", "permissionName", "Điều chỉnh số lượng lô tồn kho (Stock Adjust)", "module", "Kho dược"),
            Map.of("permissionId", 10, "permissionCode", "APPOINTMENT_BOOK_RESCHEDULE", "permissionName", "Đặt lịch, đổi lịch & hủy lịch hẹn khám", "module", "Lịch hẹn & Tiếp đón"),
            Map.of("permissionId", 11, "permissionCode", "APPOINTMENT_APPROVE_CHECKIN", "permissionName", "Duyệt lịch hẹn, Check-in & tiếp nhận Walk-in", "module", "Lịch hẹn & Tiếp đón"),
            Map.of("permissionId", 12, "permissionCode", "PET_OWNER_PROFILE_MANAGE", "permissionName", "Quản lý hồ sơ Chủ nuôi & Thú cưng", "module", "Lịch hẹn & Tiếp đón"),
            Map.of("permissionId", 13, "permissionCode", "MEDICAL_RECORD_EXAMINE", "permissionName", "Khám lâm sàng, lập bệnh án & kê đơn thuốc", "module", "Khám chữa bệnh"),
            Map.of("permissionId", 14, "permissionCode", "INVOICE_PAYMENT_PROCESS", "permissionName", "Lập hóa đơn, xác nhận thu tiền & in biên lai", "module", "Thanh toán"),
            Map.of("permissionId", 15, "permissionCode", "INVOICE_VOID", "permissionName", "Hủy hóa đơn sai sót (Void Invoice)", "module", "Thanh toán"),
            Map.of("permissionId", 16, "permissionCode", "REPORT_REVENUE_VIEW", "permissionName", "Xem báo cáo doanh thu & thống kê lịch hẹn", "module", "Báo cáo thống kê")
    );

    private static final Map<String, List<Integer>> ROLE_DEFAULT_PERM_IDS = Map.of(
            RoleName.ADMIN, List.of(1, 2, 3, 5, 7, 8, 9, 15, 16),
            RoleName.VETERINARIAN, List.of(6, 8, 12, 13),
            RoleName.RECEPTIONIST, List.of(6, 10, 11, 12, 14),
            RoleName.INVENTORY_MANAGER, List.of(5, 6, 7, 8, 9, 16),
            RoleName.PET_OWNER, List.of(10, 12)
    );

    //  1. OVERVIEW
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getOverviewSummary(String year) {
        List<Map<String, Object>> enrichedMedicines = getMedicines();
        long lowStockCount = enrichedMedicines.stream()
                .filter(m -> "ACTIVE".equals(m.get("status")) && Boolean.TRUE.equals(m.get("lowStock")))
                .count();

        long activeStaffCount = userAccountRepository.findAll().stream()
                .filter(u -> u.getStatus() == AccountStatus.ACTIVE
                        && u.getRole() != null
                        && !RoleName.PET_OWNER.equals(u.getRole().getRoleName()))
                .count();

        LocalDate today = LocalDate.now();
        long todayAppts = appointmentRepository.countByAppointmentDateBetween(
                today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        long yesterdayAppts = appointmentRepository.countByAppointmentDateBetween(
                today.minusDays(1).atStartOfDay(), today.atStartOfDay());
        long totalApptsInDb = appointmentRepository.count();

        String targetYear = (year != null && !year.isBlank()) ? year.trim() : String.valueOf(today.getYear());
        List<Map<String, Object>> revenueSeries = buildRevenueSeries(targetYear + "-01-01", targetYear + "-12-31");

        String currentYm = String.format("%04d-%02d", today.getYear(), today.getMonthValue());
        LocalDate prevMonthDate = today.minusMonths(1);
        String prevYm = String.format("%04d-%02d", prevMonthDate.getYear(), prevMonthDate.getMonthValue());

        long currentMonthRevenue = revenueSeries.stream()
                .filter(r -> String.valueOf(r.get("dateKey")).startsWith(currentYm))
                .mapToLong(r -> ((Number) r.get("netAmount")).longValue())
                .sum();
        long previousMonthRevenue = revenueSeries.stream()
                .filter(r -> String.valueOf(r.get("dateKey")).startsWith(prevYm))
                .mapToLong(r -> ((Number) r.get("netAmount")).longValue())
                .sum();
        long totalPaidInvoices = invoiceRepository.count();

        List<Map<String, Object>> appointmentStatusBreakdown = buildAppointmentStatusBreakdown(
                targetYear + "-01-01", targetYear + "-12-31");
        List<Map<String, Object>> recentLogs = auditLogRepository.findTop10ByOrderByActionTimeDesc()
                .stream()
                .limit(6)
                .map(this::toAuditLogDto)
                .toList();

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("todayAppointments", todayAppts);
        kpis.put("yesterdayAppointments", yesterdayAppts);
        kpis.put("totalAppointments", totalApptsInDb);
        kpis.put("monthlyRevenue", currentMonthRevenue);
        kpis.put("previousMonthRevenue", previousMonthRevenue);
        kpis.put("totalInvoices", totalPaidInvoices);
        kpis.put("lowStockMedicines", lowStockCount);
        kpis.put("totalMedicines", enrichedMedicines.size());
        kpis.put("activeStaffCount", activeStaffCount);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("year", targetYear);
        res.put("kpis", kpis);
        res.put("monthlyRevenueSeries", revenueSeries);
        res.put("appointmentStatusBreakdown", appointmentStatusBreakdown);
        res.put("recentAuditLogs", recentLogs);
        return res;
    }

    // 2. ACCOUNTS
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getAccounts(String search, String role, String status, int page, int pageSize) {
        String q = search == null ? "" : search.trim().toLowerCase();

        List<Map<String, Object>> filtered = userAccountRepository.findAll().stream()
                .filter(u -> u.getRole() != null && !RoleName.PET_OWNER.equals(u.getRole().getRoleName()))
                .filter(u -> {
                    if (q.isEmpty()) return true;
                    return (u.getFullName() != null && u.getFullName().toLowerCase().contains(q))
                            || (u.getUsername() != null && u.getUsername().toLowerCase().contains(q))
                            || (u.getEmail() != null && u.getEmail().toLowerCase().contains(q))
                            || (u.getPhoneNumber() != null && u.getPhoneNumber().contains(q));
                })
                .filter(u -> role == null || "ALL".equalsIgnoreCase(role) || role.equalsIgnoreCase(u.getRole().getRoleName()))
                .filter(u -> status == null || "ALL".equalsIgnoreCase(status) || status.equalsIgnoreCase(u.getStatus().name()))
                .sorted(Comparator.comparing(UserAccount::getUserId))
                .map(this::toStaffAccountDto)
                .toList();

        int totalItems = filtered.size();
        int safePageSize = Math.max(1, pageSize);
        int totalPages = Math.max(1, (int) Math.ceil((double) totalItems / safePageSize));
        int safePage = Math.min(Math.max(1, page), totalPages);
        int fromIdx = (safePage - 1) * safePageSize;
        int toIdx = Math.min(fromIdx + safePageSize, totalItems);

        List<Map<String, Object>> pageItems = fromIdx < totalItems ? filtered.subList(fromIdx, toIdx) : List.of();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", pageItems);
        result.put("page", safePage);
        result.put("pageSize", safePageSize);
        result.put("totalItems", totalItems);
        result.put("totalPages", totalPages);
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> createAccount(Map<String, Object> payload, String adminUsername) {
        String username = getString(payload, "username");
        String fullName = getString(payload, "fullName");
        String email = getString(payload, "email").toLowerCase();
        String phone = getString(payload, "phoneNumber");
        String roleName = getString(payload, "roleName");
        String tempPass = getString(payload, "temporaryPassword");

        if (RoleName.ADMIN.equalsIgnoreCase(roleName)) {
            throw new BadRequestException("Không được phép gán vai trò ADMIN cho tài khoản mới");
        }

        Map<String, String> conflicts = new LinkedHashMap<>();
        if (userAccountRepository.existsByUsername(username)) {
            conflicts.put("username", "Tên đăng nhập đã được sử dụng");
        }
        if (userAccountRepository.existsByEmailIgnoreCase(email)) {
            conflicts.put("email", "Email này đã tồn tại trong hệ thống");
        }
        if (userAccountRepository.existsByPhoneNumber(phone)) {
            conflicts.put("phoneNumber", "Số điện thoại đã được sử dụng");
        }
        if (!conflicts.isEmpty()) {
            throw new DuplicateResourceException("Thông tin tài khoản bị trùng lặp", conflicts);
        }

        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò " + roleName));

        UserAccount created = userAccountRepository.save(UserAccount.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(tempPass.isEmpty() ? "Password123" : tempPass))
                .fullName(fullName)
                .email(email)
                .phoneNumber(phone)
                .status(AccountStatus.ACTIVE)
                .role(role)
                .failedLoginAttempts(0)
                .build());

        recordAudit(adminUsername, "CREATE_ACCOUNT", "UserAccount #" + created.getUserId() + " (" + created.getUsername() + ")",
                "Tạo tài khoản nhân viên mới \"" + created.getFullName() + "\" với vai trò " + roleName + ".");

        return toStaffAccountDto(created);
    }

    @Override
    @Transactional
    public Map<String, Object> updateAccount(Integer userId, Map<String, Object> payload, String adminUsername) {
        UserAccount acc = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản #" + userId));

        String fullName = getString(payload, "fullName");
        String phone = getString(payload, "phoneNumber");
        String roleName = getString(payload, "roleName");

        if (!phone.isEmpty() && !phone.equals(acc.getPhoneNumber()) && userAccountRepository.existsByPhoneNumber(phone)) {
            throw new DuplicateResourceException("Thông tin tài khoản bị trùng lặp",
                    Map.of("phoneNumber", "Số điện thoại này đã được sử dụng bởi tài khoản khác"));
        }

        if (!fullName.isEmpty()) acc.setFullName(fullName);
        if (!phone.isEmpty()) acc.setPhoneNumber(phone);

        if (!roleName.isEmpty() && !RoleName.ADMIN.equalsIgnoreCase(acc.getRole().getRoleName())) {
            if (RoleName.ADMIN.equalsIgnoreCase(roleName)) {
                throw new BadRequestException("Không được phép gán vai trò ADMIN cho tài khoản khác");
            }
            Role role = roleRepository.findByRoleName(roleName)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò " + roleName));
            acc.setRole(role);
        }

        acc = userAccountRepository.save(acc);
        recordAudit(adminUsername, "UPDATE_ACCOUNT", "UserAccount #" + acc.getUserId() + " (" + acc.getUsername() + ")",
                "Cập nhật thông tin nhân viên \"" + acc.getFullName() + "\".");

        return toStaffAccountDto(acc);
    }

    @Override
    @Transactional
    public Map<String, Object> toggleAccountStatus(Integer userId, String nextStatus, String adminUsername) {
        UserAccount acc = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản #" + userId));

        if ("admin".equalsIgnoreCase(acc.getUsername()) && "INACTIVE".equalsIgnoreCase(nextStatus)) {
            throw new BadRequestException("Không thể vô hiệu hóa tài khoản Quản trị viên gốc");
        }

        AccountStatus statusEnum = "INACTIVE".equalsIgnoreCase(nextStatus)
                ? AccountStatus.INACTIVE
                : AccountStatus.ACTIVE;

        acc.setStatus(statusEnum);
        if (statusEnum == AccountStatus.ACTIVE) {
            acc.setFailedLoginAttempts(0);
            acc.setLockUntil(null);
        }
        acc = userAccountRepository.save(acc);

        String actionType = statusEnum == AccountStatus.ACTIVE ? "ACTIVATE_ACCOUNT" : "DEACTIVATE_ACCOUNT";
        recordAudit(adminUsername, actionType, "UserAccount #" + acc.getUserId() + " (" + acc.getUsername() + ")",
                "Chuyển trạng thái tài khoản \"" + acc.getFullName() + "\" sang " + statusEnum.name() + ".");

        return toStaffAccountDto(acc);
    }

    @Override
    @Transactional
    public Map<String, Object> resetAccountPassword(Integer userId, String adminUsername) {
        UserAccount acc = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản #" + userId));

        String tempPassword = "Pcms@" + (1000 + RANDOM.nextInt(9000));
        acc.setPasswordHash(passwordEncoder.encode(tempPassword));
        acc.setFailedLoginAttempts(0);
        acc.setLockUntil(null);
        userAccountRepository.save(acc);

        recordAudit(adminUsername, "RESET_PASSWORD", "UserAccount #" + acc.getUserId() + " (" + acc.getUsername() + ")",
                "Admin đặt lại mật khẩu tạm thời mới cho nhân viên \"" + acc.getFullName() + "\".");

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("userId", acc.getUserId());
        res.put("username", acc.getUsername());
        res.put("temporaryPassword", tempPassword);
        res.put("message", "Đã cấp mật khẩu tạm thời mới cho " + acc.getFullName() + ": " + tempPassword);
        return res;
    }

    // 3. ROLES & PERMISSIONS
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getRolesAndPermissions() {
        List<Map<String, Object>> roles = roleRepository.findAll().stream()
                .sorted(Comparator.comparing(Role::getRoleId))
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("roleId", r.getRoleId());
                    m.put("roleName", r.getRoleName());
                    m.put("description", r.getDescription());
                    m.put("active", true);
                    return m;
                })
                .toList();

        List<Map<String, Object>> staffAccounts = userAccountRepository.findAll().stream()
                .filter(u -> u.getRole() != null && !RoleName.PET_OWNER.equals(u.getRole().getRoleName()))
                .sorted(Comparator.comparing(UserAccount::getUserId))
                .map(this::toStaffAccountDto)
                .toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("roles", roles);
        res.put("permissions", DEFAULT_PERMISSIONS);
        res.put("rolePermissions", ROLE_DEFAULT_PERM_IDS);
        res.put("accounts", staffAccounts);
        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> assignAccountRole(Integer userId, String roleName, String adminUsername) {
        if (RoleName.ADMIN.equalsIgnoreCase(roleName)) {
            throw new BadRequestException("Không được phép gán vai trò ADMIN cho tài khoản khác");
        }

        UserAccount acc = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản #" + userId));

        if (RoleName.ADMIN.equalsIgnoreCase(acc.getRole().getRoleName())) {
            throw new BadRequestException("Không thể thay đổi vai trò của tài khoản Quản trị viên");
        }

        Role newRole = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Vai trò không hợp lệ: " + roleName));

        String oldRole = acc.getRole().getRoleName();
        acc.setRole(newRole);
        acc = userAccountRepository.save(acc);

        recordAudit(adminUsername, "ASSIGN_ROLE", "UserAccount #" + acc.getUserId() + " (" + acc.getUsername() + ")",
                "Đổi vai trò của \"" + acc.getFullName() + "\" từ " + oldRole + " sang " + roleName + ".");

        return toStaffAccountDto(acc);
    }

    // 4. SERVICES CATALOG
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getServices() {
        return serviceRepository.findAll().stream()
                .sorted(Comparator.comparing(com.pcms.entity.Service::getServiceId))
                .map(this::toServiceDto)
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> saveService(Integer serviceId, Map<String, Object> payload, String adminUsername) {
        String serviceName = getString(payload, "serviceName");
        String description = getString(payload, "description");
        BigDecimal price = new BigDecimal(String.valueOf(payload.getOrDefault("price", "0")));

        if (serviceName.length() < 3 || serviceName.length() > 150) {
            throw new BadRequestException("Tên dịch vụ phải từ 3 đến 150 ký tự");
        }
        if (price.compareTo(BigDecimal.valueOf(1000)) < 0) {
            throw new BadRequestException("Đơn giá dịch vụ tối thiểu từ 1,000 VNĐ trở lên");
        }
        boolean duplicateService = serviceRepository.findAll().stream()
                .anyMatch(s -> !Objects.equals(s.getServiceId(), serviceId)
                        && s.getServiceName() != null
                        && s.getServiceName().trim().equalsIgnoreCase(serviceName));
        if (duplicateService) {
            throw new DuplicateResourceException("Trùng tên dịch vụ",
                    Map.of("serviceName", "Tên dịch vụ này đã tồn tại trong danh mục"));
        }

        com.pcms.entity.Service entity;
        if (serviceId != null) {
            entity = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ #" + serviceId));
            entity.setServiceName(serviceName);
            entity.setDescription(description);
            entity.setPrice(price);
            entity = serviceRepository.save(entity);

            recordAudit(adminUsername, "UPDATE_SERVICE", "Service #" + entity.getServiceId(),
                    "Cập nhật dịch vụ \"" + entity.getServiceName() + "\" (Giá: " + price + " VNĐ).");
        } else {
            entity = serviceRepository.save(com.pcms.entity.Service.builder()
                    .serviceName(serviceName)
                    .description(description)
                    .price(price)
                    .status("ACTIVE")
                    .build());

            recordAudit(adminUsername, "CREATE_SERVICE", "Service #" + entity.getServiceId(),
                    "Thêm dịch vụ mới \"" + entity.getServiceName() + "\" (Giá: " + price + " VNĐ).");
        }
        return toServiceDto(entity);
    }

    @Override
    @Transactional
    public Map<String, Object> toggleServiceStatus(Integer serviceId, String nextStatus, String adminUsername) {
        com.pcms.entity.Service entity = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ #" + serviceId));

        String normalized = "INACTIVE".equalsIgnoreCase(nextStatus) ? "INACTIVE" : "ACTIVE";
        entity.setStatus(normalized);
        entity = serviceRepository.save(entity);

        String actionType = "ACTIVE".equals(normalized) ? "ACTIVATE_SERVICE" : "DEACTIVATE_SERVICE";
        recordAudit(adminUsername, actionType, "Service #" + entity.getServiceId(),
                "Đổi trạng thái dịch vụ \"" + entity.getServiceName() + "\" sang " + normalized + ".");

        return toServiceDto(entity);
    }

    // ==================== 5. MEDICINES CATALOG ====================
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMedicines() {
        List<InventoryBatch> allBatches = inventoryBatchRepository.findAll();
        Map<Integer, List<InventoryBatch>> batchesByMedId = allBatches.stream()
                .collect(Collectors.groupingBy(b -> b.getMedicine().getMedicineId()));

        return medicineRepository.findAll().stream()
                .sorted(Comparator.comparing(Medicine::getMedicineId))
                .map(m -> toMedicineDto(m, batchesByMedId.getOrDefault(m.getMedicineId(), List.of())))
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> saveMedicine(Integer medicineId, Map<String, Object> payload, String adminUsername) {
        String medicineName = getString(payload, "medicineName");
        String unit = getString(payload, "unit");
        BigDecimal unitPrice = new BigDecimal(String.valueOf(payload.getOrDefault("unitPrice", "0")));
        int minThreshold = Integer.parseInt(String.valueOf(payload.getOrDefault("minThreshold", "20")));

        if (medicineName.length() < 2 || medicineName.length() > 150) {
            throw new BadRequestException("Tên thuốc phải từ 2 đến 150 ký tự");
        }
        if (unit.isEmpty() || unit.length() > 50) {
            throw new BadRequestException("Đơn vị tính không hợp lệ");
        }
        if (unitPrice.compareTo(BigDecimal.valueOf(500)) < 0) {
            throw new BadRequestException("Đơn giá bán tối thiểu từ 500 VNĐ trở lên");
        }
        if (minThreshold < 1 || minThreshold > 100000) {
            throw new BadRequestException("Ngưỡng cảnh báo tối thiểu phải từ 1 đến 100,000");
        }
        boolean duplicateMed = medicineRepository.findAll().stream()
                .anyMatch(m -> !Objects.equals(m.getMedicineId(), medicineId)
                        && m.getMedicineName() != null
                        && m.getMedicineName().trim().equalsIgnoreCase(medicineName));
        if (duplicateMed) {
            throw new DuplicateResourceException("Trùng tên thuốc",
                    Map.of("medicineName", "Tên thuốc này đã tồn tại trong danh mục"));
        }

        Medicine entity;
        if (medicineId != null) {
            entity = medicineRepository.findById(medicineId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thuốc #" + medicineId));
            entity.setMedicineName(medicineName);
            entity.setUnit(unit);
            entity.setUnitPrice(unitPrice);
            entity.setMinThreshold(minThreshold);
            entity = medicineRepository.save(entity);

            recordAudit(adminUsername, "UPDATE_MEDICINE", "Medicine #" + entity.getMedicineId(),
                    "Cập nhật danh mục thuốc \"" + entity.getMedicineName() + "\".");
        } else {
            entity = medicineRepository.save(Medicine.builder()
                    .medicineName(medicineName)
                    .unit(unit)
                    .unitPrice(unitPrice)
                    .status("ACTIVE")
                    .minThreshold(minThreshold)
                    .build());

            recordAudit(adminUsername, "CREATE_MEDICINE", "Medicine #" + entity.getMedicineId(),
                    "Thêm thuốc mới vào danh mục: \"" + entity.getMedicineName() + "\" (" + entity.getUnit() + ").");
        }

        List<InventoryBatch> batches = inventoryBatchRepository.findByMedicine_MedicineId(entity.getMedicineId());
        return toMedicineDto(entity, batches);
    }

    @Override
    @Transactional
    public Map<String, Object> toggleMedicineStatus(Integer medicineId, String nextStatus, String adminUsername) {
        Medicine entity = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thuốc #" + medicineId));

        String normalized = "INACTIVE".equalsIgnoreCase(nextStatus) ? "INACTIVE" : "ACTIVE";
        entity.setStatus(normalized);
        entity = medicineRepository.save(entity);

        String actionType = "ACTIVE".equals(normalized) ? "ACTIVATE_MEDICINE" : "DEACTIVATE_MEDICINE";
        recordAudit(adminUsername, actionType, "Medicine #" + entity.getMedicineId(),
                "Đổi trạng thái lưu hành thuốc \"" + entity.getMedicineName() + "\" sang " + normalized + ".");

        List<InventoryBatch> batches = inventoryBatchRepository.findByMedicine_MedicineId(entity.getMedicineId());
        return toMedicineDto(entity, batches);
    }

    // 6. REPORTS
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getReports(String fromDate, String toDate) {
        validateDateRange(fromDate, toDate);
        List<Map<String, Object>> revenueRows = buildRevenueSeries(fromDate, toDate);
        List<Map<String, Object>> inventoryRows = getMedicines();
        List<Map<String, Object>> appointmentRows = buildAppointmentStatusBreakdown(fromDate, toDate);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("revenueRows", revenueRows);
        res.put("inventoryRows", inventoryRows);
        res.put("appointmentRows", appointmentRows);
        return res;
    }

    // 7. AUDIT LOGS
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAuditLogs(String fromDate, String toDate, String username, String actionType) {
        validateDateRange(fromDate, toDate);
        return auditLogRepository.findAllByOrderByActionTimeDesc().stream()
                .map(this::toAuditLogDto)
                .filter(dto -> {
                    String timeStr = String.valueOf(dto.get("actionTime"));
                    String logDate = timeStr.length() >= 10 ? timeStr.substring(0, 10) : "";
                    boolean matchFrom = fromDate == null || fromDate.isBlank() || logDate.compareTo(fromDate) >= 0;
                    boolean matchTo = toDate == null || toDate.isBlank() || logDate.compareTo(toDate) <= 0;
                    boolean matchUser = username == null || username.isBlank() || "ALL".equalsIgnoreCase(username)
                            || username.equalsIgnoreCase(String.valueOf(dto.get("username")));
                    boolean matchAction = actionType == null || actionType.isBlank() || "ALL".equalsIgnoreCase(actionType)
                            || actionType.equalsIgnoreCase(String.valueOf(dto.get("actionType")));
                    return matchFrom && matchTo && matchUser && matchAction;
                })
                .toList();
    }

    // PRIVATE HELPERS

    private void validateDateRange(String fromDate, String toDate) {
        if (fromDate != null && !fromDate.isBlank()
                && toDate != null && !toDate.isBlank()
                && fromDate.trim().compareTo(toDate.trim()) > 0) {
            throw new BadRequestException("Khoảng ngày không hợp lệ: 'Từ ngày' không được lớn hơn 'Đến ngày'");
        }
    }

    private void recordAudit(String username, String actionType, String targetEntity, String details) {
        UserAccount actor = (username != null && !username.isBlank())
                ? userAccountRepository.findByUsername(username).orElse(null)
                : null;
        if (actor == null) {
            actor = userAccountRepository.findByUsername("admin").orElse(null);
        }
        if (actor == null) return;

        String formattedDetails = "[" + actionType + "] [" + targetEntity + "] " + details;
        auditLogRepository.save(AuditLog.builder()
                .userAccount(actor)
                .actionTime(LocalDateTime.now().withNano(0))
                .actionDetails(formattedDetails)
                .build());
    }

    private Map<String, Object> toAuditLogDto(AuditLog logEntity) {
        String raw = logEntity.getActionDetails() != null ? logEntity.getActionDetails() : "";
        String actionType = "SYSTEM_ACTION";
        String targetEntity = "PCMS";
        String cleanDetails = raw;

        // Parse định dạng "[ACTION_TYPE] [TargetEntity] Nội dung..."
        if (raw.startsWith("[")) {
            int firstClose = raw.indexOf(']');
            if (firstClose > 1) {
                actionType = raw.substring(1, firstClose).trim();
                String rest = raw.substring(firstClose + 1).trim();
                if (rest.startsWith("[")) {
                    int secondClose = rest.indexOf(']');
                    if (secondClose > 1) {
                        targetEntity = rest.substring(1, secondClose).trim();
                        cleanDetails = rest.substring(secondClose + 1).trim();
                    }
                } else {
                    cleanDetails = rest;
                }
            }
        }

        UserAccount u = logEntity.getUserAccount();
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("logId", logEntity.getLogId());
        dto.put("actionTime", logEntity.getActionTime() != null ? logEntity.getActionTime().withNano(0).toString() : "");
        dto.put("userId", u != null ? u.getUserId() : 1);
        dto.put("username", u != null ? u.getUsername() : "admin");
        dto.put("fullName", u != null ? u.getFullName() : "Quản trị viên");
        dto.put("actionType", actionType);
        dto.put("targetEntity", targetEntity);
        dto.put("actionDetails", cleanDetails);
        return dto;
    }

    private Map<String, Object> toStaffAccountDto(UserAccount u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("userId", u.getUserId());
        m.put("username", u.getUsername());
        m.put("fullName", u.getFullName());
        m.put("email", u.getEmail());
        m.put("phoneNumber", u.getPhoneNumber());
        m.put("status", u.getStatus() != null ? u.getStatus().name() : "ACTIVE");
        m.put("roleId", u.getRole() != null ? u.getRole().getRoleId() : null);
        m.put("roleName", u.getRole() != null ? u.getRole().getRoleName() : "RECEPTIONIST");
        m.put("failedLoginAttempts", u.getFailedLoginAttempts() != null ? u.getFailedLoginAttempts() : 0);
        m.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().withNano(0).toString() : "2026-01-10T08:00:00");
        return m;
    }

    private Map<String, Object> toServiceDto(com.pcms.entity.Service s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("serviceId", s.getServiceId());
        m.put("serviceName", s.getServiceName());
        m.put("description", s.getDescription());
        m.put("price", s.getPrice());
        m.put("status", s.getStatus() != null ? s.getStatus() : "ACTIVE");
        return m;
    }

    private Map<String, Object> toMedicineDto(Medicine med, List<InventoryBatch> batches) {
        int totalStock = batches.stream()
                .mapToInt(b -> b.getQuantityInStock() != null ? b.getQuantityInStock() : 0)
                .sum();
        String nearestExpiry = batches.stream()
                .filter(b -> b.getQuantityInStock() != null && b.getQuantityInStock() > 0 && b.getExpirationDate() != null)
                .map(b -> b.getExpirationDate().toString())
                .sorted()
                .findFirst()
                .orElse(batches.isEmpty() || batches.get(0).getExpirationDate() == null
                        ? null
                        : batches.get(0).getExpirationDate().toString());

        int minThreshold = med.getMinThreshold() != null ? med.getMinThreshold() : 20;
        boolean lowStock = totalStock <= minThreshold;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("medicineId", med.getMedicineId());
        m.put("medicineName", med.getMedicineName());
        m.put("unit", med.getUnit());
        m.put("unitPrice", med.getUnitPrice());
        m.put("status", med.getStatus() != null ? med.getStatus() : "ACTIVE");
        m.put("minThreshold", minThreshold);
        m.put("totalStock", totalStock);
        m.put("batchCount", batches.size());
        m.put("nearestExpirationDate", nearestExpiry);
        m.put("lowStock", lowStock);
        return m;
    }

    private List<Map<String, Object>> buildRevenueSeries(String fromDate, String toDate) {
        List<Invoice> invoices = invoiceRepository.findAll().stream()
                .filter(inv -> inv.getInvoiceDate() != null)
                .filter(inv -> inv.getStatus() == null || !"VOID".equalsIgnoreCase(inv.getStatus()))
                .filter(inv -> {
                    String dateKey = inv.getInvoiceDate().toLocalDate().toString();
                    boolean matchFrom = fromDate == null || fromDate.isBlank() || dateKey.compareTo(fromDate) >= 0;
                    boolean matchTo = toDate == null || toDate.isBlank() || dateKey.compareTo(toDate) <= 0;
                    return matchFrom && matchTo;
                })
                .toList();

        if (invoices.isEmpty()) {
            return List.of();
        }

        Map<String, List<Invoice>> byYearMonth = invoices.stream()
                .collect(Collectors.groupingBy(
                        inv -> {
                            LocalDate d = inv.getInvoiceDate().toLocalDate();
                            return String.format("%04d-%02d", d.getYear(), d.getMonthValue());
                        },
                        TreeMap::new,
                        Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<Invoice>> entry : byYearMonth.entrySet()) {
            String ym = entry.getKey(); // YYYY-MM
            String[] parts = ym.split("-");
            String monthLabel = "Tháng " + parts[1] + "/" + parts[0];
            String shortMonth = "T" + parts[1] + "/" + parts[0];
            String dateKey = ym + "-01";

            List<Invoice> monthInvs = entry.getValue();
            long totalNet = monthInvs.stream()
                    .mapToLong(i -> i.getTotalAmount() != null ? i.getTotalAmount().longValue() : 0L)
                    .sum();
            long discount = monthInvs.stream()
                    .mapToLong(i -> i.getDiscountAmount() != null ? i.getDiscountAmount().longValue() : 0L)
                    .sum();
            long gross = totalNet + discount;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month", monthLabel);
            m.put("shortMonth", shortMonth);
            m.put("dateKey", dateKey);
            m.put("examinationRevenue", gross);
            m.put("vaccinationRevenue", 0L);
            m.put("surgerySpaRevenue", 0L);
            m.put("pharmacyRevenue", 0L);
            m.put("invoiceCount", monthInvs.size());
            m.put("discountTotal", discount);
            m.put("totalRevenue", gross);
            m.put("grossAmount", gross);
            m.put("netAmount", totalNet);
            result.add(m);
        }
        return result;
    }

    private List<Map<String, Object>> buildAppointmentStatusBreakdown(String fromDate, String toDate) {
        List<Appointment> filteredAppts = appointmentRepository.findAll().stream()
                .filter(a -> {
                    if (a.getAppointmentDate() == null) return true;
                    String dateKey = a.getAppointmentDate().toLocalDate().toString();
                    boolean matchFrom = fromDate == null || fromDate.isBlank() || dateKey.compareTo(fromDate) >= 0;
                    boolean matchTo = toDate == null || toDate.isBlank() || dateKey.compareTo(toDate) <= 0;
                    return matchFrom && matchTo;
                })
                .toList();

        if (filteredAppts.isEmpty()) {
            return List.of();
        }

        Map<String, Long> grouped = filteredAppts.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getStatus() != null ? a.getStatus().toUpperCase() : "PENDING_APPROVAL",
                        Collectors.counting()));

        return List.of(
                Map.of("status", "COMPLETED", "label", "Hoàn thành khám", "count", grouped.getOrDefault("COMPLETED", 0L), "color", "#10b981"),
                Map.of("status", "APPROVED", "label", "Đã duyệt lịch", "count", grouped.getOrDefault("APPROVED", 0L), "color", "#6320ee"),
                Map.of("status", "CHECKED_IN", "label", "Đã Check-in", "count", grouped.getOrDefault("CHECKED_IN", 0L), "color", "#3b82f6"),
                Map.of("status", "PENDING_APPROVAL", "label", "Chờ lễ tân duyệt", "count", grouped.getOrDefault("PENDING_APPROVAL", 0L), "color", "#f59e0b"),
                Map.of("status", "CANCELLED", "label", "Khách báo hủy", "count", grouped.getOrDefault("CANCELLED", 0L), "color", "#ef4444"),
                Map.of("status", "REJECTED", "label", "Từ chối lịch", "count", grouped.getOrDefault("REJECTED", 0L), "color", "#94a3b8")
        );
    }

    private static String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val == null ? "" : String.valueOf(val).trim();
    }
}
