package com.pcms.repository;

import com.pcms.entity.Pet;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PetRepository extends JpaRepository<Pet, Integer> {
    @EntityGraph(attributePaths = {"petOwner"})
    List<Pet> findByPetOwner_OwnerId(Integer ownerId);

    @EntityGraph(attributePaths = {"petOwner"})
    List<Pet> findByPetOwner_UserAccount_UserId(Integer userId);
}
