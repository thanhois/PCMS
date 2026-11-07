-- ====================================================================================
-- HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y - VETERIAN PCMS
-- FILE SETUP DATABASE & SEED DATA DÀNH CHO SQL SERVER (ĐỒNG BỘ SDD v1.0 & SRS v1.0)
-- ====================================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PCMS')
BEGIN
    CREATE DATABASE [PCMS] COLLATE Vietnamese_CI_AS;
    PRINT N'=> Đã tạo mới Database [PCMS] thành công!';
END
GO

USE [PCMS];
GO

-- Xóa bảng cũ theo thứ tự ràng buộc khóa ngoại (nếu có)
DROP TABLE IF EXISTS DoctorScheduleSlot;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Invoice;
DROP TABLE IF EXISTS FollowUp;
DROP TABLE IF EXISTS PrescriptionDetail;
DROP TABLE IF EXISTS Prescription;
DROP TABLE IF EXISTS MedicalRecordDetail;
DROP TABLE IF EXISTS MedicalRecord;
DROP TABLE IF EXISTS Appointment;
DROP TABLE IF EXISTS InventoryBatch;
DROP TABLE IF EXISTS Medicine;
DROP TABLE IF EXISTS Service;
DROP TABLE IF EXISTS Pet;
DROP TABLE IF EXISTS PetOwner;
DROP TABLE IF EXISTS AuditLog;
DROP TABLE IF EXISTS UserAccount;
DROP TABLE IF EXISTS Branch;
DROP TABLE IF EXISTS Role;
GO

-- 1. Bảng Role (Vai trò hệ thống)
CREATE TABLE Role (
    roleId INT IDENTITY(1,1) PRIMARY KEY,
    roleName NVARCHAR(50) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    permissionCodes NVARCHAR(2000) NULL
);

-- 2. Bảng Branch (Chi nhánh phòng khám)
CREATE TABLE Branch (
    branchId INT IDENTITY(1,1) PRIMARY KEY,
    branchName NVARCHAR(150) NOT NULL,
    address NVARCHAR(255) NOT NULL,
    phoneNumber NVARCHAR(20) NOT NULL
);

-- 3. Bảng UserAccount (Tài khoản người dùng: Admin, Vet, Receptionist, Inventory, Owner)
CREATE TABLE UserAccount (
    userId INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL UNIQUE,
    passwordHash NVARCHAR(100) NOT NULL,
    fullName NVARCHAR(150) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    phoneNumber NVARCHAR(20) NOT NULL UNIQUE,
    gender NVARCHAR(20) NULL,
    address NVARCHAR(255) NULL,
    mustChangePassword BIT NOT NULL DEFAULT 0,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    roleId INT NOT NULL,
    branchId INT NULL,
    failedLoginAttempts INT NOT NULL DEFAULT 0,
    lockUntil DATETIME2 NULL,
    resetTokenHash NVARCHAR(64) NULL,
    resetTokenExpiry DATETIME2 NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NULL,
    CONSTRAINT CK_UserAccount_Status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED')),
    CONSTRAINT CK_UserAccount_FailedAttempts CHECK (failedLoginAttempts >= 0),
    CONSTRAINT FK_User_Role FOREIGN KEY (roleId) REFERENCES Role(roleId),
    CONSTRAINT FK_User_Branch FOREIGN KEY (branchId) REFERENCES Branch(branchId)
);

-- 4. Bảng PetOwner (Hồ sơ chủ thú cưng)
CREATE TABLE PetOwner (
    ownerId INT IDENTITY(1,1) PRIMARY KEY,
    fullName NVARCHAR(150) NOT NULL,
    phoneNumber NVARCHAR(20) NOT NULL UNIQUE,
    email NVARCHAR(150) NULL,
    address NVARCHAR(255) NULL,
    userId INT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT CK_PetOwner_Status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT FK_PetOwner_User FOREIGN KEY (userId) REFERENCES UserAccount(userId)
);

-- 5. Bảng Pet (Hồ sơ thú cưng)
CREATE TABLE Pet (
    petId INT IDENTITY(1,1) PRIMARY KEY,
    ownerId INT NOT NULL,
    petName NVARCHAR(100) NOT NULL,
    species NVARCHAR(50) NOT NULL,
    breed NVARCHAR(100) NULL,
    color NVARCHAR(50) NULL,
    gender NVARCHAR(20) NULL DEFAULT N'UNKNOWN',
    dateOfBirth DATE NULL,
    weight DECIMAL(6,2) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT CK_Pet_Weight CHECK (weight IS NULL OR weight > 0),
    CONSTRAINT CK_Pet_Status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT FK_Pet_Owner FOREIGN KEY (ownerId) REFERENCES PetOwner(ownerId)
);

-- 6. Bảng Service (Danh mục dịch vụ khám, xét nghiệm, spa)
CREATE TABLE Service (
    serviceId INT IDENTITY(1,1) PRIMARY KEY,
    serviceName NVARCHAR(150) NOT NULL UNIQUE,
    description NVARCHAR(1000) NULL,
    price DECIMAL(12,2) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT CK_Service_Price CHECK (price >= 0),
    CONSTRAINT CK_Service_Status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- 7. Bảng Medicine (Danh mục thuốc trong kho)
CREATE TABLE Medicine (
    medicineId INT IDENTITY(1,1) PRIMARY KEY,
    medicineName NVARCHAR(150) NOT NULL UNIQUE,
    unit NVARCHAR(50) NOT NULL,
    unitPrice DECIMAL(12,2) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    minThreshold INT NOT NULL DEFAULT 20,
    CONSTRAINT CK_Medicine_Price CHECK (unitPrice >= 0),
    CONSTRAINT CK_Medicine_Threshold CHECK (minThreshold >= 0),
    CONSTRAINT CK_Medicine_Status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- 8. Bảng InventoryBatch (Lô thuốc tồn kho)
CREATE TABLE InventoryBatch (
    batchId INT IDENTITY(1,1) PRIMARY KEY,
    medicineId INT NOT NULL,
    batchNumber NVARCHAR(80) NOT NULL,
    expirationDate DATE NOT NULL,
    quantityInStock INT NOT NULL,
    supplier NVARCHAR(150) NULL,
    version INT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_InventoryBatch_Medicine_BatchNumber UNIQUE (medicineId, batchNumber),
    CONSTRAINT CK_InventoryBatch_Quantity CHECK (quantityInStock >= 0),
    CONSTRAINT FK_Batch_Medicine FOREIGN KEY (medicineId) REFERENCES Medicine(medicineId)
);

-- 9. Bảng Appointment (Lịch hẹn khám)
CREATE TABLE Appointment (
    appointmentId INT IDENTITY(1,1) PRIMARY KEY,
    ownerId INT NOT NULL,
    petId INT NOT NULL,
    appointmentDate DATETIME2 NOT NULL,
    reason NVARCHAR(500) NULL,
    status NVARCHAR(30) NOT NULL,
    veterinarianId INT NULL,
    serviceId INT NULL,
    shift NVARCHAR(20) NULL,
    notes NVARCHAR(1000) NULL,
    rejectionReason NVARCHAR(500) NULL,
    checkInTime DATETIME2 NULL,
    CONSTRAINT CK_Appointment_Status CHECK (status IN ('PENDING_APPROVAL', 'CONFIRMED', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    CONSTRAINT FK_Appointment_Owner FOREIGN KEY (ownerId) REFERENCES PetOwner(ownerId),
    CONSTRAINT FK_Appointment_Pet FOREIGN KEY (petId) REFERENCES Pet(petId),
    CONSTRAINT FK_Appointment_Vet FOREIGN KEY (veterinarianId) REFERENCES UserAccount(userId),
    CONSTRAINT FK_Appointment_Service FOREIGN KEY (serviceId) REFERENCES Service(serviceId)
);

-- 10. Bảng MedicalRecord (Hồ sơ bệnh án điện tử)
CREATE TABLE MedicalRecord (
    recordId INT IDENTITY(1,1) PRIMARY KEY,
    petId INT NOT NULL,
    veterinarianId INT NOT NULL,
    appointmentId INT NULL,
    visitDate DATETIME2 NOT NULL,
    symptoms NVARCHAR(1000) NOT NULL,
    diagnosis NVARCHAR(1000) NOT NULL,
    treatmentPlan NVARCHAR(2000) NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    CONSTRAINT CK_MedicalRecord_Status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT FK_Record_Pet FOREIGN KEY (petId) REFERENCES Pet(petId),
    CONSTRAINT FK_Record_Vet FOREIGN KEY (veterinarianId) REFERENCES UserAccount(userId),
    CONSTRAINT FK_Record_Appointment FOREIGN KEY (appointmentId) REFERENCES Appointment(appointmentId)
);

-- 11. Bảng MedicalRecordDetail (Y lệnh dịch vụ & xét nghiệm cận lâm sàng)
CREATE TABLE MedicalRecordDetail (
    recordDetailId INT IDENTITY(1,1) PRIMARY KEY,
    recordId INT NOT NULL,
    serviceId INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    notes NVARCHAR(500) NULL,
    CONSTRAINT UQ_MedicalRecordDetail_Record_Service UNIQUE (recordId, serviceId),
    CONSTRAINT CK_MedicalRecordDetail_Quantity CHECK (quantity > 0),
    CONSTRAINT FK_Detail_Record FOREIGN KEY (recordId) REFERENCES MedicalRecord(recordId) ON DELETE CASCADE,
    CONSTRAINT FK_Detail_Service FOREIGN KEY (serviceId) REFERENCES Service(serviceId)
);

-- 12. Bảng Prescription (Đơn thuốc điện tử)
CREATE TABLE Prescription (
    prescriptionId INT IDENTITY(1,1) PRIMARY KEY,
    recordId INT NOT NULL UNIQUE,
    prescribedDate DATE NOT NULL,
    instructions NVARCHAR(1000) NULL,
    CONSTRAINT FK_Prescription_Record FOREIGN KEY (recordId) REFERENCES MedicalRecord(recordId) ON DELETE CASCADE
);

-- 13. Bảng PrescriptionDetail (Chi tiết thuốc trong đơn)
CREATE TABLE PrescriptionDetail (
    prescriptionDetailId INT IDENTITY(1,1) PRIMARY KEY,
    prescriptionId INT NOT NULL,
    medicineId INT NOT NULL,
    dosage NVARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    notes NVARCHAR(500) NULL,
    CONSTRAINT CK_PrescriptionDetail_Quantity CHECK (quantity > 0),
    CONSTRAINT FK_PDetail_Prescription FOREIGN KEY (prescriptionId) REFERENCES Prescription(prescriptionId) ON DELETE CASCADE,
    CONSTRAINT FK_PDetail_Medicine FOREIGN KEY (medicineId) REFERENCES Medicine(medicineId)
);

-- 14. Bảng FollowUp (Lịch hẹn tái khám & theo dõi)
CREATE TABLE FollowUp (
    followUpId INT IDENTITY(1,1) PRIMARY KEY,
    petId INT NOT NULL,
    recordId INT NOT NULL,
    followUpDate DATE NOT NULL,
    followUpType NVARCHAR(100) NOT NULL,
    notes NVARCHAR(1000) NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
    CONSTRAINT CK_FollowUp_Status CHECK (status IN ('PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT FK_FollowUp_Pet FOREIGN KEY (petId) REFERENCES Pet(petId),
    CONSTRAINT FK_FollowUp_Record FOREIGN KEY (recordId) REFERENCES MedicalRecord(recordId) ON DELETE CASCADE
);

-- 15. Bảng Invoice (Hóa đơn viện phí & thuốc)
CREATE TABLE Invoice (
    invoiceId INT IDENTITY(1,1) PRIMARY KEY,
    recordId INT NOT NULL UNIQUE,
    invoiceDate DATETIME2 NOT NULL,
    totalAmount DECIMAL(12,2) NOT NULL,
    discountAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
    version INT NOT NULL DEFAULT 0,
    CONSTRAINT CK_Invoice_Amounts CHECK (totalAmount >= 0 AND discountAmount >= 0 AND discountAmount <= totalAmount),
    CONSTRAINT CK_Invoice_Status CHECK (status IN ('PENDING', 'PAID', 'VOID')),
    CONSTRAINT FK_Invoice_Record FOREIGN KEY (recordId) REFERENCES MedicalRecord(recordId)
);

-- 16. Bảng Payment (Giao dịch thanh toán)
CREATE TABLE Payment (
    paymentId INT IDENTITY(1,1) PRIMARY KEY,
    invoiceId INT NOT NULL UNIQUE,
    paymentDate DATETIME2 NOT NULL,
    paymentMethod NVARCHAR(50) NOT NULL,
    amountPaid DECIMAL(12,2) NOT NULL,
    CONSTRAINT CK_Payment_Amount CHECK (amountPaid >= 0),
    CONSTRAINT CK_Payment_Method CHECK (paymentMethod IN ('CASH', 'CARD', 'BANK_TRANSFER')),
    CONSTRAINT FK_Payment_Invoice FOREIGN KEY (invoiceId) REFERENCES Invoice(invoiceId)
);

-- 17. Bảng AuditLog (Nhật ký hoạt động hệ thống)
CREATE TABLE AuditLog (
    logId INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    actionTime DATETIME2 NOT NULL DEFAULT GETDATE(),
    actionType NVARCHAR(100) NULL,
    affectedResource NVARCHAR(255) NULL,
    outcome NVARCHAR(50) NULL DEFAULT 'SUCCESS',
    actionDetails NVARCHAR(2000) NOT NULL,
    CONSTRAINT FK_AuditLog_User FOREIGN KEY (userId) REFERENCES UserAccount(userId)
);

-- 18. Bảng DoctorScheduleSlot (Khung giờ làm việc & ca trực Bác sĩ - SRS 4.1.25)
CREATE TABLE DoctorScheduleSlot (
    slotId INT IDENTITY(1,1) PRIMARY KEY,
    veterinarianId INT NOT NULL,
    slotDate DATE NOT NULL,
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    notes NVARCHAR(255) NULL,
    CONSTRAINT CK_DoctorScheduleSlot_Time CHECK (startTime < endTime),
    CONSTRAINT CK_DoctorScheduleSlot_Status CHECK (status IN ('AVAILABLE', 'BOOKED', 'BLOCKED')),
    CONSTRAINT FK_DoctorSlot_Vet FOREIGN KEY (veterinarianId) REFERENCES UserAccount(userId)
);
GO

-- ====================================================================================
-- NẠP DỮ LIỆU MẪU CÓ SẴN (SEED DATA)
-- ====================================================================================

SET IDENTITY_INSERT Role ON;
INSERT INTO Role (roleId, roleName, description) VALUES
(1, N'ADMIN', N'Quản trị viên hệ thống — Toàn quyền cấu hình, nhân sự, danh mục, báo cáo & nhật ký'),
(2, N'VETERINARIAN', N'Bác sĩ thú y — Khám lâm sàng, lập bệnh án điện tử, kê đơn & lịch tiêm chủng'),
(3, N'RECEPTIONIST', N'Lễ tân — Tiếp nhận lịch hẹn, check-in, đăng ký walk-in & thu ngân hóa đơn'),
(4, N'INVENTORY_MANAGER', N'Thủ kho — Quản lý danh mục thuốc, nhập lô tồn kho, điều chỉnh & cảnh báo hạn dùng'),
(5, N'PET_OWNER', N'Chủ thú cưng — Đặt lịch khám trực tuyến, theo dõi hồ sơ thú cưng & hóa đơn');
SET IDENTITY_INSERT Role OFF;

SET IDENTITY_INSERT Branch ON;
INSERT INTO Branch (branchId, branchName, address, phoneNumber) VALUES
(1, N'Phòng khám Thú y Veterian Central', N'123 Nguyễn Văn Linh, P. Tân Phong, Quận 7, TP. Hồ Chí Minh', N'02812345678');
SET IDENTITY_INSERT Branch OFF;

SET IDENTITY_INSERT UserAccount ON;
INSERT INTO UserAccount (userId, username, passwordHash, fullName, email, phoneNumber, status, roleId, branchId, failedLoginAttempts, mustChangePassword, createdAt) VALUES
(1, N'admin', N'$2a$10$dA3V9T904.Sh9ERX5kzpZeX2ridOiIXRPcWZ02tyF9cXRa.2G4Rl6', N'System Administrator', N'admin@pcms.com', N'0900000000', N'ACTIVE', 1, 1, 0, 0, GETDATE()),
(2, N'vet', N'$2a$10$zj/VgxTCEfIaDBJRzcUiEuAX1FiNjojdVA6J4rk3DVlu2ghEuO0.6', N'BS. CKI Nguyễn Văn Minh', N'vet.minh@pcms.com', N'0912345678', N'ACTIVE', 2, 1, 0, 0, GETDATE()),
(3, N'petowner', N'$2a$10$wMhHBv1l1Xv8QTbQPVOX6uk.oUc/s2MPXLQbIyScRCO4xWX6hl47O', N'Lê Hoàng Nam', N'nam.le@gmail.com', N'0987654321', N'ACTIVE', 5, NULL, 0, 0, GETDATE()),
(4, N'receptionist', N'$2a$10$wMhHBv1l1Xv8QTbQPVOX6uk.oUc/s2MPXLQbIyScRCO4xWX6hl47O', N'Lê Thị Thu Ngân (Lễ tân)', N'receptionist@pcms.com', N'0933333333', N'ACTIVE', 3, 1, 0, 0, GETDATE()),
(5, N'inventory', N'$2a$10$wMhHBv1l1Xv8QTbQPVOX6uk.oUc/s2MPXLQbIyScRCO4xWX6hl47O', N'Nguyễn Văn Hùng (Thủ kho)', N'inventory@pcms.com', N'0900000001', N'ACTIVE', 4, 1, 0, 0, GETDATE());
SET IDENTITY_INSERT UserAccount OFF;

SET IDENTITY_INSERT PetOwner ON;
INSERT INTO PetOwner (ownerId, fullName, phoneNumber, email, address, userId, status) VALUES
(1, N'Lê Hoàng Nam', N'0987654321', N'nam.le@gmail.com', N'Số 45/2 Đường số 10, Thảo Điền, TP. Thủ Đức', 3, N'ACTIVE');
SET IDENTITY_INSERT PetOwner OFF;

SET IDENTITY_INSERT Pet ON;
INSERT INTO Pet (petId, ownerId, petName, species, breed, color, gender, dateOfBirth, weight, status) VALUES
(1, 1, N'Milo', N'Chó', N'Corgi Pembroke', N'Vàng trắng', N'Đực', DATEADD(MONTH, -26, CAST(GETDATE() AS DATE)), 11.50, N'ACTIVE'),
(2, 1, N'Bông', N'Mèo', N'Mèo Anh lông ngắn', N'Xám xanh', N'Cái', DATEADD(MONTH, -16, CAST(GETDATE() AS DATE)), 4.20, N'ACTIVE'),
(3, 1, N'Lucky', N'Chó', N'Toy Poodle', N'Nâu đỏ', N'Đực', DATEADD(MONTH, -36, CAST(GETDATE() AS DATE)), 5.00, N'ACTIVE');
SET IDENTITY_INSERT Pet OFF;

SET IDENTITY_INSERT Service ON;
INSERT INTO Service (serviceId, serviceName, description, price, status) VALUES
(1, N'Khám lâm sàng tổng quát', N'Khám tai, mắt, mũi, họng, kiểm tra nhịp tim, phổi, nhiệt độ & sờ nắn ổ bụng', 150000.00, N'ACTIVE'),
(2, N'Siêu âm màu Doppler ổ bụng', N'Khảo sát gan, thận, bàng quang, lách, dạ dày và ruột trên máy siêu âm màu hiện đại', 350000.00, N'ACTIVE'),
(3, N'Chụp X-Quang kỹ thuật số (2 tư thế)', N'Chụp X-quang kỹ thuật số lồng ngực / chi / cột sống chất lượng cao', 300000.00, N'ACTIVE'),
(4, N'Xét nghiệm tổng phân tích tế bào máu (CBC)', N'Đếm hồng cầu, bạch cầu, tiểu cầu, tầm soát nhiễm trùng & thiếu máu', 250000.00, N'ACTIVE'),
(5, N'Tiêm vắc-xin phòng 7 bệnh chó/mèo', N'Vắc-xin phòng bệnh Care, Parvo, Viêm gan, Ho cũi chó, Leptospira...', 220000.00, N'ACTIVE'),
(6, N'Cạo vôi răng & đánh bóng chuyên sâu', N'Làm sạch mảng bám vôi răng bằng sóng siêu âm, khử mùi hôi miệng', 400000.00, N'ACTIVE');
SET IDENTITY_INSERT Service OFF;

SET IDENTITY_INSERT Medicine ON;
INSERT INTO Medicine (medicineId, medicineName, unit, unitPrice, status, minThreshold) VALUES
(1, N'Amoxicillin + Clavulanate 250mg', N'Viên', 18000.00, N'ACTIVE', 30),
(2, N'Meloxicam Giảm đau kháng viêm 1.5mg/ml (10ml)', N'Chai', 165000.00, N'ACTIVE', 15),
(3, N'Men tiêu hóa Protexin Pro-Kolin Paste (15ml)', N'Tuýp', 210000.00, N'ACTIVE', 10),
(4, N'Advocate Chó nhỏ trị ghẻ, ve rận & giun tim (0.4ml)', N'Tuýp', 195000.00, N'ACTIVE', 20),
(5, N'Thuốc nhỏ mắt Tobrex 0.3% (5ml)', N'Lọ', 85000.00, N'ACTIVE', 25),
(6, N'Vemedim Gluco K-C bồi bổ thể lực (100ml)', N'Chai', 75000.00, N'ACTIVE', 20);
SET IDENTITY_INSERT Medicine OFF;

SET IDENTITY_INSERT InventoryBatch ON;
INSERT INTO InventoryBatch (batchId, medicineId, batchNumber, expirationDate, quantityInStock, supplier, version) VALUES
(1, 1, N'BATCH-AMX-2026-01', DATEADD(MONTH, 18, CAST(GETDATE() AS DATE)), 250, N'Dược Thú Y Vemedim', 0),
(2, 2, N'BATCH-MEL-2026-02', DATEADD(MONTH, 12, CAST(GETDATE() AS DATE)), 80, N'Công ty CP Thuốc Thú Y TW1', 0),
(3, 3, N'BATCH-PRO-2026-03', DATEADD(MONTH, 10, CAST(GETDATE() AS DATE)), 65, N'Protexin Veterinary UK', 0);
SET IDENTITY_INSERT InventoryBatch OFF;

SET IDENTITY_INSERT Appointment ON;
INSERT INTO Appointment (appointmentId, ownerId, petId, appointmentDate, reason, status, veterinarianId, serviceId, shift, checkInTime, notes) VALUES
(1, 1, 1, DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), N'Milo bỏ ăn 2 hôm nay, nôn ra dịch bọt vàng, mệt mỏi ít chạy nhảy', N'IN_PROGRESS', 2, 1, N'MORNING', DATEADD(MINUTE, -10, DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), N'Đã check-in tiếp nhận lúc 08:50'),
(2, 1, 2, DATEADD(HOUR, 11, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), N'Tiêm vắc-xin nhắc lại định kỳ hàng năm & cạo vôi răng', N'CHECKED_IN', 2, 5, N'MORNING', DATEADD(MINUTE, -15, DATEADD(HOUR, 11, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), N'Khách đã đến phòng chờ tầng 1'),
(3, 1, 3, DATEADD(HOUR, 15, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), N'Gãi tai liên tục, tai đỏ có nhiều chất nhờn màu nâu đen', N'CONFIRMED', 2, 1, N'AFTERNOON', NULL, N'Hẹn trước qua app'),
(4, 1, 1, DATEADD(MONTH, -1, CAST(GETDATE() AS DATETIME2)), N'Khám sức khỏe định kỳ & tiêm phòng dại', N'COMPLETED', 2, 1, N'MORNING', DATEADD(MONTH, -1, CAST(GETDATE() AS DATETIME2)), N'Đã khám và thanh toán đầy đủ'),
(5, 1, 2, DATEADD(DAY, 1, DATEADD(HOUR, 10, CAST(CAST(GETDATE() AS DATE) AS DATETIME2))), N'Khách đặt online: Siêu âm ổ bụng & kiểm tra tổng quát cho bé Bông', N'PENDING_APPROVAL', 2, 2, N'MORNING', NULL, N'Khách đặt qua cổng trực tuyến, mong muốn bác sĩ Minh khám');
SET IDENTITY_INSERT Appointment OFF;

SET IDENTITY_INSERT MedicalRecord ON;
INSERT INTO MedicalRecord (recordId, petId, veterinarianId, appointmentId, visitDate, symptoms, diagnosis, treatmentPlan, status) VALUES
(1, 1, 2, 1, DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)),
 N'Bé ủ rũ, niêm mạc mắt hơi nhợt, nhiệt độ 39.2°C (sốt nhẹ), ấn đau vùng thượng vị dạ dày.',
 N'Nghi ngờ Viêm dạ dày ruột cấp tính (Acute Gastroenteritis) / Dị vật dạ dày',
 N'1. Siêu âm ổ bụng tầm soát dị vật
2. Làm xét nghiệm CBC kiểm tra bạch cầu
3. Truyền dịch Ringer Lactate bù nước
4. Kê kháng sinh và men vi sinh bảo vệ niêm mạc',
 N'IN_PROGRESS'),
(2, 1, 2, 4, DATEADD(MONTH, -1, CAST(GETDATE() AS DATETIME2)),
 N'Sức khỏe tốt, lanh lợi, ăn uống bình thường.',
 N'Khám tổng quát bình thường, đủ điều kiện tiêm phòng',
 N'Tiêm phòng vắc-xin dại (Rabisin), dặn dò theo dõi phản ứng sau tiêm 24h',
 N'COMPLETED');
SET IDENTITY_INSERT MedicalRecord OFF;

SET IDENTITY_INSERT MedicalRecordDetail ON;
INSERT INTO MedicalRecordDetail (recordDetailId, recordId, serviceId, quantity, notes) VALUES
(1, 1, 1, 1, N'Khám toàn thân, nghe tim phổi'),
(2, 1, 2, 1, N'Siêu âm ổ bụng: thành dạ dày dày nhẹ, không phát hiện dị vật cản quang lớn'),
(3, 1, 4, 1, N'Bạch cầu tăng nhẹ (16.8 G/L) biểu hiện phản ứng viêm'),
(4, 2, 1, 1, N'Khám thể trạng tổng quát trước khi tiêm vắc xin');
SET IDENTITY_INSERT MedicalRecordDetail OFF;

SET IDENTITY_INSERT Prescription ON;
INSERT INTO Prescription (prescriptionId, recordId, prescribedDate, instructions) VALUES
(1, 1, CAST(GETDATE() AS DATE), N'Cho uống sau ăn 30 phút. Không cho gặm xương hoặc thức ăn dầu mỡ trong 5 ngày tới.');
SET IDENTITY_INSERT Prescription OFF;

SET IDENTITY_INSERT PrescriptionDetail ON;
INSERT INTO PrescriptionDetail (prescriptionDetailId, prescriptionId, medicineId, dosage, quantity, notes) VALUES
(1, 1, 1, N'Uống 1 viên / lần, ngày 2 lần (sáng - chiều) sau ăn', 10, N'Uống liên tục đủ 5 ngày'),
(2, 1, 3, N'Bơm trực tiếp vào miệng 2ml / lần, ngày 2 lần', 1, N'Men tiêu hóa ổn định đường ruột');
SET IDENTITY_INSERT PrescriptionDetail OFF;

SET IDENTITY_INSERT FollowUp ON;
INSERT INTO FollowUp (followUpId, petId, recordId, followUpDate, followUpType, notes, status) VALUES
(1, 1, 1, DATEADD(DAY, 5, CAST(GETDATE() AS DATE)), N'Tái khám đánh giá đáp ứng kháng sinh', N'Kiểm tra lại triệu chứng nôn và phân, cân lại trọng lượng', N'PENDING');
SET IDENTITY_INSERT FollowUp OFF;

SET IDENTITY_INSERT Invoice ON;
INSERT INTO Invoice (invoiceId, recordId, invoiceDate, totalAmount, discountAmount, status, version) VALUES
(1, 1, GETDATE(), 1140000.00, 0.00, N'PENDING', 0);
SET IDENTITY_INSERT Invoice OFF;

SET IDENTITY_INSERT AuditLog ON;
INSERT INTO AuditLog (logId, userId, actionTime, actionType, affectedResource, outcome, actionDetails) VALUES
(1, 1, DATEADD(HOUR, -5, GETDATE()), N'SYSTEM_INIT', N'PCMS', N'SUCCESS', N'[SYSTEM_INIT] [PCMS] Khởi tạo cấu hình ban đầu cho phòng khám'),
(2, 2, DATEADD(HOUR, -3, GETDATE()), N'EXAM_START', N'MedicalRecord #1', N'SUCCESS', N'[EXAM_START] [MedicalRecord #1] Bác sĩ BS. CKI Nguyễn Văn Minh bắt đầu khám ca bệnh #1 (Pet: Milo)'),
(3, 2, DATEADD(HOUR, -2, GETDATE()), N'SERVICE_ORDER', N'MedicalRecord #1', N'SUCCESS', N'[SERVICE_ORDER] [MedicalRecord #1] Lên y lệnh dịch vụ: Siêu âm màu Doppler ổ bụng cho bệnh án #1'),
(4, 2, DATEADD(HOUR, -1, GETDATE()), N'PRESCRIPTION_SAVE', N'MedicalRecord #1', N'SUCCESS', N'[PRESCRIPTION_SAVE] [MedicalRecord #1] Lưu đơn thuốc điện tử cho bệnh án #1'),
(5, 2, DATEADD(MINUTE, -30, GETDATE()), N'FOLLOW_UP_CREATE', N'MedicalRecord #1', N'SUCCESS', N'[FOLLOW_UP_CREATE] [MedicalRecord #1] Hẹn lịch tái khám cho bé Milo');
SET IDENTITY_INSERT AuditLog OFF;
GO
