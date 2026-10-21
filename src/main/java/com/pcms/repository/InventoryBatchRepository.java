package com.pcms.repository;

import com.pcms.entity.InventoryBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, Integer> {
    List<InventoryBatch> findByMedicine_MedicineId(Integer medicineId);
}
