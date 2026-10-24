package com.pcms.repository;

import com.pcms.entity.PrescriptionDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionDetailRepository extends JpaRepository<PrescriptionDetail, Integer> {
    List<PrescriptionDetail> findByPrescription_PrescriptionId(Integer prescriptionId);
    void deleteByPrescription_PrescriptionId(Integer prescriptionId);
}
