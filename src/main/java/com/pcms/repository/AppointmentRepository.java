package com.pcms.repository;

import com.pcms.entity.Appointment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {
    long countByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.veterinarian.userId = :vetId AND a.appointmentDate BETWEEN :start AND :end")
    List<Appointment> findVetAppointmentsInWindowForUpdate(
            @Param("vetId") Integer vetId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

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

    @EntityGraph(attributePaths = {"petOwner", "petOwner.userAccount", "pet", "veterinarian", "service"})
    @Query("SELECT a FROM Appointment a WHERE a.appointmentId = :id")
    java.util.Optional<Appointment> findByIdWithDetails(@Param("id") Integer id);

    @EntityGraph(attributePaths = {"petOwner", "pet", "veterinarian", "service"})
    List<Appointment> findAllByOrderByAppointmentDateDesc();
}
