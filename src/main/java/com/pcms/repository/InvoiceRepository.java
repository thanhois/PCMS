package com.pcms.repository;

import com.pcms.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Integer> {
    List<Invoice> findByInvoiceDateBetween(LocalDateTime start, LocalDateTime end);
    Optional<Invoice> findByMedicalRecord_RecordId(Integer recordId);
}
