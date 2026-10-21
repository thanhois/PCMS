package com.pcms.config;

import com.pcms.entity.*;
import com.pcms.repository.BranchRepository;
import com.pcms.repository.RoleRepository;
import com.pcms.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Seed dữ liệu tối thiểu khi khởi động: 5 Role chuẩn, 1 Branch mặc định và 1 tài khoản ADMIN.
 * Không tự động chèn dữ liệu mẫu (nhân viên, dịch vụ, thuốc, lịch hẹn, hóa đơn) để dữ liệu hiển thị
 * phản ánh đúng 100% những gì đang có trong Database.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private static final Map<String, String> DEFAULT_ROLES;
    static {
        Map<String, String> roles = new LinkedHashMap<>();
        roles.put(RoleName.ADMIN, "Quản trị viên hệ thống — Toàn quyền cấu hình, nhân sự, danh mục, báo cáo & nhật ký");
        roles.put(RoleName.VETERINARIAN, "Bác sĩ thú y — Khám lâm sàng, lập bệnh án điện tử, kê đơn & lịch tiêm chủng");
        roles.put(RoleName.RECEPTIONIST, "Lễ tân — Tiếp nhận lịch hẹn, check-in, đăng ký walk-in & thu ngân hóa đơn");
        roles.put(RoleName.INVENTORY_MANAGER, "Thủ kho — Quản lý danh mục thuốc, nhập lô tồn kho, điều chỉnh & cảnh báo hạn dùng");
        roles.put(RoleName.PET_OWNER, "Chủ thú cưng — Đặt lịch khám trực tuyến, theo dõi hồ sơ thú cưng & hóa đơn");
        DEFAULT_ROLES = roles;
    }

    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        DEFAULT_ROLES.forEach((name, desc) -> {
            if (!roleRepository.existsByRoleName(name)) {
                roleRepository.save(Role.builder().roleName(name).description(desc).build());
                log.info("Seeded role {}", name);
            }
        });

        Branch mainBranch = branchRepository.findAll().stream().findFirst().orElseGet(() -> {
            log.info("Seeded default branch");
            return branchRepository.save(Branch.builder()
                    .branchName("Phòng khám Thú y Veterian")
                    .address("123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh")
                    .phoneNumber("02812345678")
                    .build());
        });

        AppProperties.Seed seed = appProperties.seed();
        if (!userAccountRepository.existsByUsername(seed.adminUsername())) {
            Role adminRole = roleRepository.findByRoleName(RoleName.ADMIN).orElseThrow();
            userAccountRepository.save(UserAccount.builder()
                    .username(seed.adminUsername())
                    .passwordHash(passwordEncoder.encode(seed.adminPassword()))
                    .fullName("System Administrator")
                    .email(seed.adminEmail())
                    .phoneNumber("0900000000")
                    .status(AccountStatus.ACTIVE)
                    .role(adminRole)
                    .branch(mainBranch)
                    .failedLoginAttempts(0)
                    .build());
            log.info("Seeded admin account '{}'", seed.adminUsername());
        }
    }
}
