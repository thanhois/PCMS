package com.pcms.repository;

import com.pcms.entity.Pet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PetRepository extends JpaRepository<Pet, Integer> {
    List<Pet> findByPetOwner_OwnerId(Integer ownerId);
    List<Pet> findByPetOwner_UserAccount_UserId(Integer userId);
}
