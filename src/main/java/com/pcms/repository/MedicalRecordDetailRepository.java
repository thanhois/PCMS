package com.pcms.repository;

import com.pcms.entity.MedicalRecordDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalRecordDetailRepository extends JpaRepository<MedicalRecordDetail, Integer> {
    List<MedicalRecordDetail> findByMedicalRecord_RecordId(Integer recordId);
    void deleteByMedicalRecord_RecordId(Integer recordId);
}
