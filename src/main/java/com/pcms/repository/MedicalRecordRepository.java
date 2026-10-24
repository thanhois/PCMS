package com.pcms.repository;

import com.pcms.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Integer> {
    List<MedicalRecord> findByPet_PetIdOrderByVisitDateDesc(Integer petId);
    List<MedicalRecord> findByVeterinarian_UserIdOrderByVisitDateDesc(Integer vetId);
    List<MedicalRecord> findByVisitDateBetweenOrderByVisitDateDesc(LocalDateTime start, LocalDateTime end);
    List<MedicalRecord> findByPet_PetOwner_OwnerIdOrderByVisitDateDesc(Integer ownerId);
    List<MedicalRecord> findByPet_PetOwner_UserAccount_UserIdOrderByVisitDateDesc(Integer userId);
    Optional<MedicalRecord> findByAppointment_AppointmentId(Integer appointmentId);
}
