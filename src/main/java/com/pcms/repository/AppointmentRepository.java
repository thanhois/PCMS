package com.pcms.repository;

import com.pcms.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {
    long countByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);
    List<Appointment> findByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);
    List<Appointment> findByVeterinarian_UserId(Integer vetId);
    List<Appointment> findByPet_PetId(Integer petId);
    List<Appointment> findByPetOwner_OwnerId(Integer ownerId);
    List<Appointment> findByPetOwner_UserAccount_UserId(Integer userId);
}
