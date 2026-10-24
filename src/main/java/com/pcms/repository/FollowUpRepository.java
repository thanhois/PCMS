package com.pcms.repository;

import com.pcms.entity.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FollowUpRepository extends JpaRepository<FollowUp, Integer> {
    List<FollowUp> findByMedicalRecord_RecordId(Integer recordId);
    List<FollowUp> findByPet_PetIdOrderByFollowUpDateDesc(Integer petId);
    void deleteByMedicalRecord_RecordId(Integer recordId);
}
