package com.pcms.config;

import com.pcms.entity.*;
import com.pcms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Seed dữ liệu ban đầu cho hệ thống PCMS:
 * - 5 Role chuẩn, 1 Branch mặc định, tài khoản ADMIN
 * - Tài khoản Bác sĩ thú y (VETERINARIAN) và Chủ thú cưng (PET_OWNER)
 * - Danh mục dịch vụ khám & thuốc chuẩn
 * - Thú cưng mẫu & ca bệnh trong ngày để kiểm thử ngay luồng khám chữa bệnh.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private static final Map<String, String> DEFAULT_ROLES;
    static {
        Map<String, String> roles = new LinkedHashMap<>();
        roles.put(RoleName.ADMIN, "Quản trị viên hệ thống — Toàn quyền cấu hình, nhân sự, danh mục, báo cáo & nhật ký");
        roles.put(RoleName.VETERINARIAN, "Bác sĩ thú y — Khám lâm sàng, lập bệnh án điện tử, kê đơn & lịch tiêm chủng");
        roles.put(RoleName.RECEPTIONIST, "Lễ tân — Tiếp nhận lịch hẹn, check-in, đăng ký walk-in & thu ngân hóa đơn");
        roles.put(RoleName.INVENTORY_MANAGER, "Thủ kho — Quản lý danh mục thuốc, nhập lô tồn kho, điều chỉnh & cảnh báo hạn dùng");
        roles.put(RoleName.PET_OWNER, "Chủ thú cưng — Đặt lịch khám trực tuyến, theo dõi hồ sơ thú cưng & hóa đơn");
        DEFAULT_ROLES = roles;
    }

    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final UserAccountRepository userAccountRepository;
    private final PetOwnerRepository petOwnerRepository;
    private final PetRepository petRepository;
    private final ServiceRepository serviceRepository;
    private final MedicineRepository medicineRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalRecordDetailRepository medicalRecordDetailRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionDetailRepository prescriptionDetailRepository;
    private final FollowUpRepository followUpRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // 1. Roles
        DEFAULT_ROLES.forEach((name, desc) -> {
            if (!roleRepository.existsByRoleName(name)) {
                roleRepository.save(Role.builder().roleName(name).description(desc).build());
                log.info("Seeded role {}", name);
            }
        });

        // 2. Main Branch
        Branch mainBranch = branchRepository.findAll().stream().findFirst().orElseGet(() -> {
            log.info("Seeded default branch");
            return branchRepository.save(Branch.builder()
                    .branchName("Phòng khám Thú y Veterian")
                    .address("123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh")
                    .phoneNumber("02812345678")
                    .build());
        });

        // 3. Admin Account
        AppProperties.Seed seed = appProperties.seed();
        if (!userAccountRepository.existsByUsername(seed.adminUsername())) {
            Role adminRole = roleRepository.findByRoleName(RoleName.ADMIN).orElseThrow();
            userAccountRepository.save(UserAccount.builder()
                    .username(seed.adminUsername())
                    .passwordHash(passwordEncoder.encode(seed.adminPassword()))
                    .fullName("System Administrator")
                    .email(seed.adminEmail())
                    .phoneNumber("0900000000")
                    .status(AccountStatus.ACTIVE)
                    .role(adminRole)
                    .branch(mainBranch)
                    .failedLoginAttempts(0)
                    .build());
            log.info("Seeded admin account '{}'", seed.adminUsername());
        }

        // 4. Veterinarian Account (BS. CKI Nguyễn Văn Minh)
        UserAccount vetAccount;
        if (!userAccountRepository.existsByUsername("vet")) {
            Role vetRole = roleRepository.findByRoleName(RoleName.VETERINARIAN).orElseThrow();
            vetAccount = userAccountRepository.save(UserAccount.builder()
                    .username("vet")
                    .passwordHash(passwordEncoder.encode("Vet@123"))
                    .fullName("BS. CKI Nguyễn Văn Minh")
                    .email("vet.minh@pcms.com")
                    .phoneNumber("0912345678")
                    .status(AccountStatus.ACTIVE)
                    .role(vetRole)
                    .branch(mainBranch)
                    .failedLoginAttempts(0)
                    .build());
            log.info("Seeded veterinarian account 'vet'");
        } else {
            vetAccount = userAccountRepository.findByUsername("vet").orElse(null);
        }

        // 5. Pet Owner Account (Lê Hoàng Nam)
        UserAccount ownerAccount;
        if (!userAccountRepository.existsByUsername("petowner")) {
            Role ownerRole = roleRepository.findByRoleName(RoleName.PET_OWNER).orElseThrow();
            ownerAccount = userAccountRepository.save(UserAccount.builder()
                    .username("petowner")
                    .passwordHash(passwordEncoder.encode("Owner@123"))
                    .fullName("Lê Hoàng Nam")
                    .email("nam.le@gmail.com")
                    .phoneNumber("0987654321")
                    .status(AccountStatus.ACTIVE)
                    .role(ownerRole)
                    .branch(null)
                    .failedLoginAttempts(0)
                    .build());
            log.info("Seeded pet owner account 'petowner'");
        } else {
            ownerAccount = userAccountRepository.findByUsername("petowner").orElse(null);
        }

        // 6. PetOwner entity
        PetOwner petOwner = null;
        if (ownerAccount != null) {
            petOwner = petOwnerRepository.findByUserAccount_UserId(ownerAccount.getUserId()).orElseGet(() ->
                    petOwnerRepository.save(PetOwner.builder()
                            .userAccount(ownerAccount)
                            .fullName("Lê Hoàng Nam")
                            .phoneNumber("0987654321")
                            .email("nam.le@gmail.com")
                            .address("Số 45/2 Đường số 10, Thảo Điền, TP. Thủ Đức")
                            .build())
            );
        }

        // 7. Seed Services Catalog
        com.pcms.entity.Service sGeneralExam = null;
        com.pcms.entity.Service sUltrasound = null;
        com.pcms.entity.Service sXRay = null;
        com.pcms.entity.Service sBloodTest = null;
        com.pcms.entity.Service sVaccine = null;

        if (serviceRepository.count() == 0) {
            sGeneralExam = serviceRepository.save(com.pcms.entity.Service.builder()
                    .serviceName("Khám lâm sàng tổng quát")
                    .description("Khám tai, mắt, mũi, họng, kiểm tra nhịp tim, phổi, nhiệt độ & sờ nắn ổ bụng")
                    .price(new BigDecimal("150000.00"))
                    .status("ACTIVE")
                    .build());

            sUltrasound = serviceRepository.save(com.pcms.entity.Service.builder()
                    .serviceName("Siêu âm màu Doppler ổ bụng")
                    .description("Khảo sát gan, thận, bàng quang, lách, dạ dày và ruột trên máy siêu âm màu hiện đại")
                    .price(new BigDecimal("350000.00"))
                    .status("ACTIVE")
                    .build());

            sXRay = serviceRepository.save(com.pcms.entity.Service.builder()
                    .serviceName("Chụp X-Quang kỹ thuật số (2 tư thế)")
                    .description("Chụp X-quang kỹ thuật số lồng ngực / chi / cột sống chất lượng cao")
                    .price(new BigDecimal("300000.00"))
                    .status("ACTIVE")
                    .build());

            sBloodTest = serviceRepository.save(com.pcms.entity.Service.builder()
                    .serviceName("Xét nghiệm tổng phân tích tế bào máu (CBC)")
                    .description("Đếm hồng cầu, bạch cầu, tiểu cầu, tầm soát nhiễm trùng & thiếu máu")
                    .price(new BigDecimal("250000.00"))
                    .status("ACTIVE")
                    .build());

            sVaccine = serviceRepository.save(com.pcms.entity.Service.builder()
                    .serviceName("Tiêm vắc-xin phòng 7 bệnh chó/mèo")
                    .description("Vắc-xin phòng bệnh Care, Parvo, Viêm gan, Ho cũi chó, Leptospira...")
                    .price(new BigDecimal("220000.00"))
                    .status("ACTIVE")
                    .build());

            serviceRepository.save(com.pcms.entity.Service.builder()
                    .serviceName("Cạo vôi răng & đánh bóng chuyên sâu")
                    .description("Làm sạch mảng bám vôi răng bằng sóng siêu âm, khử mùi hôi miệng")
                    .price(new BigDecimal("400000.00"))
                    .status("ACTIVE")
                    .build());

            log.info("Seeded standard services catalog");
        } else {
            List<com.pcms.entity.Service> services = serviceRepository.findAll();
            if (!services.isEmpty()) sGeneralExam = services.get(0);
            if (services.size() > 1) sUltrasound = services.get(1);
            if (services.size() > 3) sBloodTest = services.get(3);
        }

        // 8. Seed Medicines Catalog
        Medicine medAmox = null;
        Medicine medMelo = null;
        Medicine medProKolin = null;

        if (medicineRepository.count() == 0) {
            medAmox = medicineRepository.save(Medicine.builder()
                    .medicineName("Amoxicillin + Clavulanate 250mg")
                    .unit("Viên")
                    .unitPrice(new BigDecimal("18000.00"))
                    .status("ACTIVE")
                    .minThreshold(30)
                    .build());

            medMelo = medicineRepository.save(Medicine.builder()
                    .medicineName("Meloxicam Giảm đau kháng viêm 1.5mg/ml (10ml)")
                    .unit("Chai")
                    .unitPrice(new BigDecimal("165000.00"))
                    .status("ACTIVE")
                    .minThreshold(15)
                    .build());

            medProKolin = medicineRepository.save(Medicine.builder()
                    .medicineName("Men tiêu hóa Protexin Pro-Kolin Paste (15ml)")
                    .unit("Tuýp")
                    .unitPrice(new BigDecimal("210000.00"))
                    .status("ACTIVE")
                    .minThreshold(10)
                    .build());

            medicineRepository.save(Medicine.builder()
                    .medicineName("Advocate Chó nhỏ trị ghẻ, ve rận & giun tim (0.4ml)")
                    .unit("Tuýp")
                    .unitPrice(new BigDecimal("195000.00"))
                    .status("ACTIVE")
                    .minThreshold(20)
                    .build());

            medicineRepository.save(Medicine.builder()
                    .medicineName("Thuốc nhỏ mắt Tobrex 0.3% (5ml)")
                    .unit("Lọ")
                    .unitPrice(new BigDecimal("85000.00"))
                    .status("ACTIVE")
                    .minThreshold(25)
                    .build());

            log.info("Seeded standard medicines catalog");
        } else {
            List<Medicine> meds = medicineRepository.findAll();
            if (!meds.isEmpty()) medAmox = meds.get(0);
            if (meds.size() > 1) medMelo = meds.get(1);
            if (meds.size() > 2) medProKolin = meds.get(2);
        }

        // 9. Seed Pets
        Pet petMilo = null;
        Pet petBong = null;
        Pet petLucky = null;

        if (petOwner != null && petRepository.count() == 0) {
            petMilo = petRepository.save(Pet.builder()
                    .petOwner(petOwner)
                    .petName("Milo")
                    .species("Chó")
                    .breed("Corgi Pembroke")
                    .gender("Đực")
                    .dateOfBirth(LocalDate.now().minusYears(2).minusMonths(3))
                    .weight(new BigDecimal("11.50"))
                    .build());

            petBong = petRepository.save(Pet.builder()
                    .petOwner(petOwner)
                    .petName("Bông")
                    .species("Mèo")
                    .breed("Mèo Anh lông ngắn (British Shorthair)")
                    .gender("Cái")
                    .dateOfBirth(LocalDate.now().minusYears(1).minusMonths(5))
                    .weight(new BigDecimal("4.20"))
                    .build());

            petLucky = petRepository.save(Pet.builder()
                    .petOwner(petOwner)
                    .petName("Lucky")
                    .species("Chó")
                    .breed("Toy Poodle")
                    .gender("Đực")
                    .dateOfBirth(LocalDate.now().minusYears(3))
                    .weight(new BigDecimal("5.00"))
                    .build());

            log.info("Seeded pets: Milo, Bông, Lucky");
        } else {
            List<Pet> pets = petRepository.findAll();
            if (!pets.isEmpty()) petMilo = pets.get(0);
            if (pets.size() > 1) petBong = pets.get(1);
            if (pets.size() > 2) petLucky = pets.get(2);
        }

        // 10. Seed Appointments & Medical Record for today
        if (petMilo != null && vetAccount != null && appointmentRepository.count() == 0) {
            LocalDateTime now = LocalDateTime.now();

            // Ca 1: Milo đang khám hôm nay
            Appointment appt1 = appointmentRepository.save(Appointment.builder()
                    .petOwner(petOwner)
                    .pet(petMilo)
                    .veterinarian(vetAccount)
                    .appointmentDate(now.withHour(9).withMinute(0))
                    .reason("Milo bỏ ăn 2 hôm nay, nôn ra dịch bọt vàng, mệt mỏi ít chạy nhảy")
                    .status("IN_PROGRESS")
                    .notes("Đã check-in tiếp nhận lúc 08:50")
                    .build());

            // Tạo bệnh án đang khám cho Milo
            MedicalRecord record1 = medicalRecordRepository.save(MedicalRecord.builder()
                    .pet(petMilo)
                    .veterinarian(vetAccount)
                    .appointment(appt1)
                    .visitDate(now.withHour(9).withMinute(15))
                    .symptoms("Bé ủ rũ, niêm mạc mắt hơi nhợt, nhiệt độ 39.2°C (sốt nhẹ), ấn đau vùng thượng vị dạ dày.")
                    .diagnosis("Nghi ngờ Viêm dạ dày ruột cấp tính (Acute Gastroenteritis) / Dị vật dạ dày")
                    .treatmentPlan("1. Siêu âm ổ bụng tầm soát dị vật\n2. Làm xét nghiệm CBC kiểm tra bạch cầu\n3. Truyền dịch Ringer Lactate bù nước\n4. Kê kháng sinh và men vi sinh bảo vệ niêm mạc")
                    .status("IN_PROGRESS")
                    .build());

            // Y lệnh dịch vụ cho Milo
            if (sGeneralExam != null) {
                medicalRecordDetailRepository.save(MedicalRecordDetail.builder()
                        .medicalRecord(record1)
                        .service(sGeneralExam)
                        .quantity(1)
                        .notes("Khám toàn thân, nghe tim phổi")
                        .build());
            }
            if (sUltrasound != null) {
                medicalRecordDetailRepository.save(MedicalRecordDetail.builder()
                        .medicalRecord(record1)
                        .service(sUltrasound)
                        .quantity(1)
                        .notes("Siêu âm ổ bụng: thành dạ dày dày nhẹ, không phát hiện dị vật cản quang lớn")
                        .build());
            }
            if (sBloodTest != null) {
                medicalRecordDetailRepository.save(MedicalRecordDetail.builder()
                        .medicalRecord(record1)
                        .service(sBloodTest)
                        .quantity(1)
                        .notes("Bạch cầu tăng nhẹ (16.8 G/L) biểu hiện phản ứng viêm")
                        .build());
            }

            // Đơn thuốc cho Milo
            Prescription presc1 = prescriptionRepository.save(Prescription.builder()
                    .medicalRecord(record1)
                    .prescribedDate(LocalDate.now())
                    .instructions("Cho uống sau ăn 30 phút. Không cho gặm xương hoặc thức ăn dầu mỡ trong 5 ngày tới.")
                    .build());

            if (medAmox != null) {
                prescriptionDetailRepository.save(PrescriptionDetail.builder()
                        .prescription(presc1)
                        .medicine(medAmox)
                        .dosage("Uống 1 viên / lần, ngày 2 lần (sáng - chiều) sau ăn")
                        .quantity(10)
                        .notes("Uống liên tục đủ 5 ngày")
                        .build());
            }
            if (medProKolin != null) {
                prescriptionDetailRepository.save(PrescriptionDetail.builder()
                        .prescription(presc1)
                        .medicine(medProKolin)
                        .dosage("Bơm trực tiếp vào miệng 2ml / lần, ngày 2 lần")
                        .quantity(1)
                        .notes("Men tiêu hóa ổn định đường ruột")
                        .build());
            }

            // Lịch tái khám cho Milo
            followUpRepository.save(FollowUp.builder()
                    .pet(petMilo)
                    .medicalRecord(record1)
                    .followUpDate(LocalDate.now().plusDays(5))
                    .followUpType("Tái khám đánh giá đáp ứng kháng sinh")
                    .notes("Kiểm tra lại triệu chứng nôn và phân, cân lại trọng lượng")
                    .status("PENDING")
                    .build());

            // Ca 2: Mèo Bông chờ khám hôm nay
            if (petBong != null) {
                appointmentRepository.save(Appointment.builder()
                        .petOwner(petOwner)
                        .pet(petBong)
                        .veterinarian(vetAccount)
                        .appointmentDate(now.withHour(11).withMinute(30))
                        .reason("Tiêm vắc-xin nhắc lại định kỳ hàng năm & cạo vôi răng")
                        .status("CHECKED_IN")
                        .notes("Khách đã đến phòng chờ tầng 1")
                        .build());
            }

            // Ca 3: Lucky ca chiều
            if (petLucky != null) {
                appointmentRepository.save(Appointment.builder()
                        .petOwner(petOwner)
                        .pet(petLucky)
                        .veterinarian(vetAccount)
                        .appointmentDate(now.withHour(15).withMinute(0))
                        .reason("Gãi tai liên tục, tai đỏ có nhiều chất nhờn màu nâu đen")
                        .status("WAITING")
                        .notes("Hẹn trước qua app")
                        .build());
            }

            // Ca lịch sử cũ của Milo cách đây 1 tháng (COMPLETED)
            Appointment pastAppt = appointmentRepository.save(Appointment.builder()
                    .petOwner(petOwner)
                    .pet(petMilo)
                    .veterinarian(vetAccount)
                    .appointmentDate(now.minusMonths(1).withHour(10).withMinute(0))
                    .reason("Khám sức khỏe định kỳ & tiêm phòng dại")
                    .status("COMPLETED")
                    .notes("Đã hoàn tất thanh toán")
                    .build());

            MedicalRecord pastRecord = medicalRecordRepository.save(MedicalRecord.builder()
                    .pet(petMilo)
                    .veterinarian(vetAccount)
                    .appointment(pastAppt)
                    .visitDate(now.minusMonths(1).withHour(10).withMinute(15))
                    .symptoms("Sức khỏe tốt, lanh lợi, ăn uống bình thường.")
                    .diagnosis("Khám tổng quát bình thường, đủ điều kiện tiêm phòng")
                    .treatmentPlan("Tiêm phòng vắc-xin dại (Rabisin), dặn dò theo dõi phản ứng sau tiêm 24h")
                    .status("COMPLETED")
                    .build());

            if (sGeneralExam != null) {
                medicalRecordDetailRepository.save(MedicalRecordDetail.builder()
                        .medicalRecord(pastRecord)
                        .service(sGeneralExam)
                        .quantity(1)
                        .notes("Khám thể trạng tổng quát")
                        .build());
            }

            log.info("Seeded rich appointments, medical records, service orders, prescriptions and follow-ups");
        }
    }
}
