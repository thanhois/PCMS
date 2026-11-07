package com.pcms.service.impl;

import com.pcms.config.AppProperties;
import com.pcms.config.security.JwtTokenProvider;
import com.pcms.config.security.UserPrincipal;
import com.pcms.dto.request.ChangePasswordRequest;
import com.pcms.dto.request.ForgotPasswordRequest;
import com.pcms.dto.request.LoginRequest;
import com.pcms.dto.request.RegisterRequest;
import com.pcms.dto.request.ResetPasswordRequest;
import com.pcms.dto.request.UpdateProfileRequest;
import com.pcms.dto.response.AuthResponse;
import com.pcms.dto.response.UserInfoResponse;
import com.pcms.entity.*;
import com.pcms.exception.AuthenticationFailedException;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.DuplicateResourceException;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.AuditLogRepository;
import com.pcms.repository.PetOwnerRepository;
import com.pcms.repository.RoleRepository;
import com.pcms.repository.UserAccountRepository;
import com.pcms.service.AuthService;
import com.pcms.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserAccountRepository userAccountRepository;
    private final PetOwnerRepository petOwnerRepository;
    private final RoleRepository roleRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final AppProperties appProperties;

    // UC01 - REGISTER
    @Override
    @Transactional
    public UserInfoResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        String phone = normalizePhone(request.phoneNumber());
        String fullName = request.fullName().trim();
        String address = request.address() != null && !request.address().isBlank()
                ? request.address().trim()
                : null;

        Map<String, String> conflicts = new LinkedHashMap<>();
        if (userAccountRepository.existsByEmailIgnoreCase(email) || userAccountRepository.existsByUsername(email)) {
            conflicts.put("email", "Email is already in use");
        }
        if (userAccountRepository.existsByPhoneNumber(phone)) {
            conflicts.put("phoneNumber", "Phone number is already in use");
        }
        if (!conflicts.isEmpty()) {
            throw new DuplicateResourceException("Email/Phone number is already in use", conflicts);
        }

        Role petOwnerRole = roleRepository.findByRoleName(RoleName.PET_OWNER)
                .orElseThrow(() -> new ResourceNotFoundException("Role PET_OWNER has not been initialized"));

        UserAccount account = UserAccount.builder()
                .username(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(fullName)
                .email(email)
                .phoneNumber(phone)
                .address(address)
                .mustChangePassword(false)
                .status(AccountStatus.ACTIVE)
                .role(petOwnerRole)
                .branch(null)
                .failedLoginAttempts(0)
                .build();
        account = userAccountRepository.save(account);

        PetOwner owner = petOwnerRepository.findFirstByPhoneNumberAndUserAccountIsNull(phone)
                .orElseGet(PetOwner::new);
        owner.setFullName(fullName);
        owner.setPhoneNumber(phone);
        owner.setEmail(email);
        if (address != null) {
            owner.setAddress(address);
        }
        owner.setUserAccount(account);
        petOwnerRepository.save(owner);

        saveAudit(account, "REGISTER_ACCOUNT",
                "UserAccount #" + account.getUserId() + " (" + account.getUsername() + ")",
                "Đăng ký tài khoản Chủ thú cưng mới \"" + account.getFullName() + "\".");

        log.info("Registered new pet owner account userId={} ownerId={}", account.getUserId(), owner.getOwnerId());
        return UserInfoResponse.from(account);
    }

    // UC02 - LOGIN
    @Override
    public AuthResponse login(LoginRequest request) {
        String login = request.login().trim();

        UserAccount user = userAccountRepository.findByUsernameOrEmail(login)
                .orElseThrow(AuthenticationFailedException::invalidCredentials);

        if (user.getStatus() == AccountStatus.INACTIVE) {
            throw AuthenticationFailedException.inactive();
        }

        LocalDateTime now = LocalDateTime.now();
        if (user.getStatus() == AccountStatus.LOCKED) {
            if (user.getLockUntil() != null && !user.getLockUntil().isAfter(now)) {
                user.setStatus(AccountStatus.ACTIVE);
                user.setLockUntil(null);
                user.setFailedLoginAttempts(0);
                userAccountRepository.save(user);
            } else if (user.getLockUntil() != null) {
                long remainingMinutes = Duration.between(now, user.getLockUntil()).toMinutes() + 1;
                throw AuthenticationFailedException.temporarilyLocked(remainingMinutes);
            } else {
                throw AuthenticationFailedException.locked();
            }
        } else if (user.getLockUntil() != null) {
            if (user.getLockUntil().isAfter(now)) {
                long remainingMinutes = Duration.between(now, user.getLockUntil()).toMinutes() + 1;
                throw AuthenticationFailedException.temporarilyLocked(remainingMinutes);
            } else {
                user.setLockUntil(null);
                user.setFailedLoginAttempts(0);
                userAccountRepository.save(user);
            }
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            handleFailedLogin(user);
        }

        if ((user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) || user.getLockUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockUntil(null);
            userAccountRepository.save(user);
        }

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtTokenProvider.generateToken(principal);

        String roleCode = user.getRole() != null ? user.getRole().getRoleName() : "USER";
        saveAudit(user, "LOGIN",
                "UserAccount #" + user.getUserId() + " (" + user.getUsername() + ")",
                "Đăng nhập hệ thống thành công với vai trò " + roleCode + ".");

        return new AuthResponse(token, "Bearer", jwtTokenProvider.getExpirationSeconds(), toUserInfoWithOwnerFallback(user));
    }

    /** UC02 AT2 / BR-01: Khóa tài khoản (status = LOCKED) sau 5 lần đăng nhập sai liên tiếp. */
    private void handleFailedLogin(UserAccount user) {
        int maxAttempts = appProperties.security().maxFailedLoginAttempts();
        int attempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
        user.setFailedLoginAttempts(attempts);

        if (attempts >= maxAttempts) {
            long lockMinutes = 15;
            user.setStatus(AccountStatus.LOCKED);
            user.setLockUntil(LocalDateTime.now().plusMinutes(lockMinutes));
            user.setFailedLoginAttempts(0);
            userAccountRepository.save(user);
            saveAudit(user, "LOCK_ACCOUNT",
                    "UserAccount #" + user.getUserId() + " (" + user.getUsername() + ")",
                    "Khóa tài khoản (" + lockMinutes + " phút / chờ Admin mở khóa) do nhập sai mật khẩu " + attempts + " lần liên tiếp.");
            log.warn("Account {} locked after {} failed login attempts", user.getUsername(), attempts);
            throw AuthenticationFailedException.temporarilyLocked(lockMinutes);
        }

        userAccountRepository.save(user);
        throw AuthenticationFailedException.invalidCredentials();
    }

    // UC03 - FORGOT PASSWORD
    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());

        userAccountRepository.findByEmailIgnoreCase(email).ifPresentOrElse(user -> {
            if (user.getStatus() == AccountStatus.INACTIVE) {
                log.info("Forgot-password ignored for inactive account {}", email);
                return;
            }
            String rawToken = generateRawToken();
            int expiresIn = appProperties.passwordReset().tokenExpirationMinutes();

            user.setResetTokenHash(sha256(rawToken));
            user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(expiresIn));
            userAccountRepository.save(user);

            String resetLink = UriComponentsBuilder
                    .fromUriString(appProperties.passwordReset().frontendResetUrl())
                    .queryParam("token", rawToken)
                    .build()
                    .toUriString();
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), rawToken, resetLink, expiresIn);
        }, () -> log.info("Forgot-password requested for non-existing email {}", email));
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        UserAccount user = userAccountRepository.findByResetTokenHash(sha256(request.token()))
                .orElseThrow(() -> new BadRequestException("Reset link is invalid or has already been used"));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            user.setResetTokenHash(null);
            user.setResetTokenExpiry(null);
            userAccountRepository.save(user);
            throw new BadRequestException("Reset link has expired, please request a new one");
        }

        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setResetTokenHash(null);
        user.setResetTokenExpiry(null);
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        user.setMustChangePassword(false);
        if (user.getStatus() == AccountStatus.LOCKED) {
            user.setStatus(AccountStatus.ACTIVE);
        }
        userAccountRepository.save(user);
        saveAudit(user, "RESET_PASSWORD",
                "UserAccount #" + user.getUserId() + " (" + user.getUsername() + ")",
                "Người dùng đặt lại mật khẩu qua liên kết email thành công.");
        log.info("Password reset successfully for user {}", user.getUsername());
    }

    // UC04 - CHANGE PASSWORD
    @Override
    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        UserAccount user = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người dùng"));

        if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }
        if (passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setMustChangePassword(false);
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        userAccountRepository.save(user);

        saveAudit(user, "CHANGE_PASSWORD",
                "UserAccount #" + user.getUserId() + " (" + user.getUsername() + ")",
                "Người dùng đổi mật khẩu cá nhân thành công.");
    }

    // UC05 - UPDATE PROFILE
    @Override
    @Transactional
    public UserInfoResponse updateProfile(String username, UpdateProfileRequest request) {
        UserAccount user = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người dùng"));

        String fullName = request.fullName().trim();
        String email = normalizeEmail(request.email());
        String phone = normalizePhone(request.phoneNumber());
        String gender = request.gender() != null && !request.gender().isBlank() ? request.gender().trim() : null;
        String address = request.address() != null && !request.address().isBlank() ? request.address().trim() : null;

        Map<String, String> conflicts = new LinkedHashMap<>();
        if (!email.equalsIgnoreCase(user.getEmail()) && userAccountRepository.existsByEmailIgnoreCase(email)) {
            conflicts.put("email", "Email này đã được sử dụng bởi tài khoản khác");
        }
        if (!phone.equals(user.getPhoneNumber()) && userAccountRepository.existsByPhoneNumber(phone)) {
            conflicts.put("phoneNumber", "Số điện thoại này đã được sử dụng bởi tài khoản khác");
        }
        if (!conflicts.isEmpty()) {
            throw new DuplicateResourceException("Thông tin liên hệ bị trùng lặp", conflicts);
        }

        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhoneNumber(phone);
        user.setGender(gender);
        user.setAddress(address);
        user = userAccountRepository.save(user);

        final UserAccount savedUser = user;
        petOwnerRepository.findByUserAccount_UserId(savedUser.getUserId()).ifPresent(owner -> {
            owner.setFullName(fullName);
            owner.setEmail(email);
            owner.setPhoneNumber(phone);
            owner.setAddress(address);
            petOwnerRepository.save(owner);
        });

        saveAudit(user, "UPDATE_PROFILE",
                "UserAccount #" + user.getUserId() + " (" + user.getUsername() + ")",
                "Cập nhật thông tin hồ sơ cá nhân.");

        return toUserInfoWithOwnerFallback(user);
    }

    // CURRENT USER
    @Override
    @Transactional(readOnly = true)
    public UserInfoResponse getCurrentUser(String username) {
        return userAccountRepository.findByUsername(username)
                .map(this::toUserInfoWithOwnerFallback)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UserInfoResponse toUserInfoWithOwnerFallback(UserAccount user) {
        String address = user.getAddress();
        if ((address == null || address.isBlank()) && user.getUserId() != null) {
            address = petOwnerRepository.findByUserAccount_UserId(user.getUserId())
                    .map(PetOwner::getAddress)
                    .orElse(null);
        }
        return new UserInfoResponse(
                user.getUserId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole().getRoleName(),
                user.getGender(),
                address,
                Boolean.TRUE.equals(user.getMustChangePassword())
        );
    }

    private void saveAudit(UserAccount actor, String actionType, String targetEntity, String details) {
        if (actor == null) return;
        String formatted = "[" + actionType + "] [" + targetEntity + "] " + details;
        auditLogRepository.save(AuditLog.builder()
                .userAccount(actor)
                .actionTime(LocalDateTime.now().withNano(0))
                .actionType(actionType)
                .affectedResource(targetEntity)
                .outcome("SUCCESS")
                .actionDetails(formatted)
                .build());
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private static String normalizePhone(String phone) {
        String p = phone.trim().replaceAll("\\s+", "");
        if (p.startsWith("+84")) {
            p = "0" + p.substring(3);
        }
        return p;
    }

    private static String generateRawToken() {
        int code = 100_000 + SECURE_RANDOM.nextInt(900_000);
        return String.valueOf(code);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
