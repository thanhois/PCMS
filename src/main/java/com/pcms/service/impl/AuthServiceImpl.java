package com.pcms.service.impl;

import com.pcms.config.AppProperties;
import com.pcms.config.security.JwtTokenProvider;
import com.pcms.config.security.UserPrincipal;
import com.pcms.dto.request.ForgotPasswordRequest;
import com.pcms.dto.request.LoginRequest;
import com.pcms.dto.request.RegisterRequest;
import com.pcms.dto.request.ResetPasswordRequest;
import com.pcms.dto.response.AuthResponse;
import com.pcms.dto.response.UserInfoResponse;
import com.pcms.entity.*;
import com.pcms.exception.AuthenticationFailedException;
import com.pcms.exception.BadRequestException;
import com.pcms.exception.DuplicateResourceException;
import com.pcms.exception.ResourceNotFoundException;
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
import java.time.LocalDateTime;
import java.util.Base64;
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
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final AppProperties appProperties;

    // REGISTER
    @Override
    @Transactional
    public UserInfoResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        String phone = normalizePhone(request.phoneNumber());
        String fullName = request.fullName().trim();

        // Email và SĐT là duy nhất trong toàn hệ thống
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

        // Tạo UserAccount: role PET_OWNER, status ACTIVE, branch = NULL
        UserAccount account = UserAccount.builder()
                .username(email)                       // Pet Owner dùng email làm username
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(fullName)
                .email(email)
                .phoneNumber(phone)
                .status(AccountStatus.ACTIVE)
                .role(petOwnerRole)
                .branch(null)
                .failedLoginAttempts(0)
                .build();
        account = userAccountRepository.save(account);

        //  Tạo / liên kết PetOwner. Nếu Lễ tân đã tạo hồ sơ walk-in cùng SĐT -> liên kết vào hồ sơ đó.
        PetOwner owner = petOwnerRepository.findFirstByPhoneNumberAndUserAccountIsNull(phone)
                .orElseGet(PetOwner::new);
        owner.setFullName(fullName);
        owner.setPhoneNumber(phone);
        owner.setEmail(email);
        if (request.address() != null && !request.address().isBlank()) {
            owner.setAddress(request.address().trim());
        }
        owner.setUserAccount(account);
        petOwnerRepository.save(owner);

        log.info("Registered new pet owner account userId={} ownerId={}", account.getUserId(), owner.getOwnerId());
        return UserInfoResponse.from(account);
    }

    // LOGIN
    // Không dùng @Transactional ở mức method: số lần đăng nhập sai phải được lưu lại
    // ngay cả khi method ném exception (nếu không sẽ bị rollback).
    @Override
    public AuthResponse login(LoginRequest request) {
        String login = request.login().trim();

        UserAccount user = userAccountRepository.findByUsernameOrEmail(login)
                .orElseThrow(AuthenticationFailedException::invalidCredentials);

        if (user.getStatus() == AccountStatus.LOCKED) {
            throw AuthenticationFailedException.locked();
        }
        if (user.getStatus() == AccountStatus.INACTIVE) {
            throw AuthenticationFailedException.inactive();
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            handleFailedLogin(user);
            // handleFailedLogin ném exception phù hợp
        }

        if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
            user.setFailedLoginAttempts(0);
            userAccountRepository.save(user);
        }

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtTokenProvider.generateToken(principal);
        return new AuthResponse(token, "Bearer", jwtTokenProvider.getExpirationSeconds(), UserInfoResponse.from(user));
    }

    /** khóa tài khoản sau N lần đăng nhập sai liên tiếp. */
    private void handleFailedLogin(UserAccount user) {
        int maxAttempts = appProperties.security().maxFailedLoginAttempts();
        int attempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
        user.setFailedLoginAttempts(attempts);

        if (attempts >= maxAttempts) {
            user.setStatus(AccountStatus.LOCKED);
            userAccountRepository.save(user);
            log.warn("Account {} locked after {} failed login attempts", user.getUsername(), attempts);
            throw AuthenticationFailedException.locked();
        }

        userAccountRepository.save(user);
        throw AuthenticationFailedException.invalidCredentials();
    }

    // FORGOT PASSWORD
    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());

        // Luôn trả về thành công cho client (dù email có tồn tại hay không) để chống dò email.
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
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetLink, expiresIn);
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
        user.setResetTokenHash(null);     // token chỉ dùng 1 lần
        user.setResetTokenExpiry(null);
        user.setFailedLoginAttempts(0);
        userAccountRepository.save(user);
        log.info("Password reset successfully for user {}", user.getUsername());
    }

    // CURRENT USER
    @Override
    @Transactional(readOnly = true)
    public UserInfoResponse getCurrentUser(String username) {
        return userAccountRepository.findByUsername(username)
                .map(UserInfoResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    // Helpers
    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    /** Chuẩn hóa +84xxxxxxxxx -> 0xxxxxxxxx để kiểm tra unique chính xác. */
    private static String normalizePhone(String phone) {
        String p = phone.trim().replaceAll("\\s+", "");
        if (p.startsWith("+84")) {
            p = "0" + p.substring(3);
        }
        return p;
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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
