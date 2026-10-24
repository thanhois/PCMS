package com.pcms.repository;

import com.pcms.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Integer> {
    Optional<Prescription> findByMedicalRecord_RecordId(Integer recordId);
    void deleteByMedicalRecord_RecordId(Integer recordId);
}
