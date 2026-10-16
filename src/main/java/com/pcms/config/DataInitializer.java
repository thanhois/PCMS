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

import java.util.Map;

/**
 * Seed dữ liệu tối thiểu khi khởi động: 4 Role chuẩn, 1 Branch mặc định và 1 tài khoản ADMIN.
 * Idempotent - chạy lại nhiều lần không tạo trùng.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private static final Map<String, String> DEFAULT_ROLES = Map.of(
            RoleName.ADMIN, "System administrator - full access",
            RoleName.VETERINARIAN, "Veterinarian - examinations, medical records, prescriptions",
            RoleName.RECEPTIONIST, "Receptionist - appointments, check-in, invoices",
            RoleName.PET_OWNER, "Pet owner (customer) - book appointments, view pets and history"
    );

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
                    .branchName("PCMS Main Clinic")
                    .address("123 Nguyen Van Linh, District 7, Ho Chi Minh City")
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
