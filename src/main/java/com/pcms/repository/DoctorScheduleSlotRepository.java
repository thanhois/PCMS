package com.pcms.repository;

import com.pcms.entity.DoctorScheduleSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DoctorScheduleSlotRepository extends JpaRepository<DoctorScheduleSlot, Integer> {

    List<DoctorScheduleSlot> findBySlotDateOrderByStartTimeAsc(LocalDate slotDate);

    List<DoctorScheduleSlot> findByVeterinarian_UserIdAndSlotDateOrderByStartTimeAsc(Integer veterinarianId, LocalDate slotDate);

    List<DoctorScheduleSlot> findBySlotDateBetweenOrderBySlotDateAscStartTimeAsc(LocalDate fromDate, LocalDate toDate);
}
