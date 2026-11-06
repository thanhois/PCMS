package com.pcms.repository;

import com.pcms.entity.Appointment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {
    long countByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findByVeterinarian_UserId(Integer vetId);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findByPet_PetId(Integer petId);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findByPetOwner_OwnerId(Integer ownerId);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findByPetOwner_UserAccount_UserId(Integer userId);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findByPet_PetIdOrderByAppointmentDateDesc(Integer petId);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findAllByOrderByAppointmentDateDesc();
}
