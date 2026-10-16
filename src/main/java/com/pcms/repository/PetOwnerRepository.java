package com.pcms.repository;

import com.pcms.entity.PetOwner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PetOwnerRepository extends JpaRepository<PetOwner, Integer> {

    Optional<PetOwner> findByUserAccount_UserId(Integer userId);

    /** Pet Owner walk-in (do Lễ tân tạo) chưa có tài khoản online. */
    Optional<PetOwner> findFirstByPhoneNumberAndUserAccountIsNull(String phoneNumber);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByEmailIgnoreCase(String email);
}
