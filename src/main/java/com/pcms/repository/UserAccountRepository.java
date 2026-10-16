package com.pcms.repository;

import com.pcms.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Integer> {

    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByEmailIgnoreCase(String email);

    Optional<UserAccount> findByResetTokenHash(String resetTokenHash);

    /** Đăng nhập bằng Username hoặc Email. */
    @Query("SELECT u FROM UserAccount u WHERE u.username = :login OR LOWER(u.email) = LOWER(:login)")
    Optional<UserAccount> findByUsernameOrEmail(@Param("login") String login);

    boolean existsByUsername(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhoneNumber(String phoneNumber);
}
