package com.pcms.repository;

import com.pcms.entity.InventoryBatch;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, Integer> {

    @Override
    @EntityGraph(attributePaths = {"medicine"})
    List<InventoryBatch> findAll();

    @EntityGraph(attributePaths = {"medicine"})
    List<InventoryBatch> findByMedicine_MedicineId(Integer medicineId);

    Optional<InventoryBatch> findByMedicine_MedicineIdAndBatchNumber(
            Integer medicineId,
            String batchNumber
    );

    boolean existsByMedicine_MedicineIdAndBatchNumber(
            Integer medicineId,
            String batchNumber
    );
}
