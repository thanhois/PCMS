-- ====================================================================================
-- HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y - VETERIAN PCMS
-- FILE SETUP DATABASE & SEED DATA DÀNH CHO SQL SERVER
-- Tài khoản SQL Server: sa
-- Mật khẩu SQL Server:  Sa@123456Abc!
-- ====================================================================================

USE master;
GO

PRINT N'==============================================================================';
PRINT N'1. CẤU HÌNH XÁC THỰC MIXED MODE (SQL SERVER & WINDOWS AUTHENTICATION)';
PRINT N'==============================================================================';
EXEC xp_instance_regwrite 
    N'HKEY_LOCAL_MACHINE', 
    N'Software\Microsoft\MSSQLServer\MSSQLServer', 
    N'LoginMode', 
    REG_DWORD, 
    2;
GO

PRINT N'------------------------------------------------------------------------------';
PRINT N'2. CẤU HÌNH & KÍCH HOẠT TÀI KHOẢN SA VỚI MẬT KHẨU Sa@123456Abc!';
PRINT N'------------------------------------------------------------------------------';
IF EXISTS (SELECT name FROM sys.server_principals WHERE name = N'sa')
BEGIN
    ALTER LOGIN [sa] WITH PASSWORD = N'Sa@123456Abc!', CHECK_EXPIRATION = OFF, CHECK_POLICY = OFF;
    ALTER LOGIN [sa] ENABLE;
    PRINT N'=> Đã cập nhật mật khẩu và kích hoạt tài khoản sa!';
END
ELSE
BEGIN
    CREATE LOGIN [sa] WITH PASSWORD = N'Sa@123456Abc!', CHECK_EXPIRATION = OFF, CHECK_POLICY = OFF;
    ALTER SERVER ROLE [sysadmin] ADD MEMBER [sa];
    PRINT N'=> Đã tạo mới tài khoản sa thành công!';
END
GO

PRINT N'------------------------------------------------------------------------------';
PRINT N'3. TẠO DATABASE [PCMS]';
PRINT N'------------------------------------------------------------------------------';
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PCMS')
BEGIN
    CREATE DATABASE [PCMS] COLLATE Vietnamese_CI_AS;
    PRINT N'=> Đã tạo mới Database [PCMS] thành công!';
END
ELSE
BEGIN
    PRINT N'=> Database [PCMS] đã tồn tại, tiến hành làm mới cấu trúc bảng và nạp dữ liệu...';
END
GO

USE [PCMS];
GO

-- Gán quyền sở hữu database PCMS cho tài khoản sa
ALTER AUTHORIZATION ON DATABASE::[PCMS] TO [sa];
GO

PRINT N'------------------------------------------------------------------------------';
PRINT N'4. TẠO CẤU TRÚC BẢNG (DDL SCHEMA) CHO DỰ ÁN PCMS';
PRINT N'------------------------------------------------------------------------------';

-- Xóa bảng cũ theo thứ tự ràng buộc khóa ngoại (nếu có)
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
    description NVARCHAR(255) NULL
);

-- 2. Bảng Branch (Chi nhánh phòng khám)
CREATE TABLE Branch (
    branchId INT IDENTITY(1,1) PRIMARY KEY,
    branchName NVARCHAR(150) NOT NULL,
    address NVARCHAR(255) NOT NULL,
    phoneNumber NVARCHAR(20) NOT NULL
);

-- 3. Bảng UserAccount (Tài khoản người dùng: Admin, Vet, Receptionist, Owner)
CREATE TABLE UserAccount (
    userId INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL UNIQUE,
    passwordHash NVARCHAR(100) NOT NULL,
    fullName NVARCHAR(150) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    phoneNumber NVARCHAR(20) NOT NULL UNIQUE,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    roleId INT NOT NULL,
    branchId INT NULL,
    failedLoginAttempts INT NOT NULL DEFAULT 0,
    lockUntil DATETIME2 NULL,
    resetTokenHash NVARCHAR(64) NULL,
    resetTokenExpiry DATETIME2 NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NULL,
    CONSTRAINT FK_User_Role FOREIGN KEY (roleId) REFERENCES Role(roleId),
    CONSTRAINT FK_User_Branch FOREIGN KEY (branchId) REFERENCES Branch(branchId)
);

-- 4. Bảng PetOwner (Hồ sơ chủ thú cưng)
CREATE TABLE PetOwner (
    ownerId INT IDENTITY(1,1) PRIMARY KEY,
    fullName NVARCHAR(150) NOT NULL,
    phoneNumber NVARCHAR(20) NOT NULL,
    email NVARCHAR(150) NULL,
    address NVARCHAR(255) NULL,
    userId INT NULL,
    CONSTRAINT FK_PetOwner_User FOREIGN KEY (userId) REFERENCES UserAccount(userId)
);

-- 5. Bảng Pet (Hồ sơ thú cưng)
CREATE TABLE Pet (
    petId INT IDENTITY(1,1) PRIMARY KEY,
    ownerId INT NOT NULL,
    petName NVARCHAR(100) NOT NULL,
    species NVARCHAR(50) NOT NULL,
    breed NVARCHAR(100) NULL,
    gender NVARCHAR(20) NOT NULL,
    dateOfBirth DATE NULL,
    weight DECIMAL(6,2) NULL,
    CONSTRAINT FK_Pet_Owner FOREIGN KEY (ownerId) REFERENCES PetOwner(ownerId)
);

-- 6. Bảng Service (Danh mục dịch vụ khám, xét nghiệm, spa)
CREATE TABLE Service (
    serviceId INT IDENTITY(1,1) PRIMARY KEY,
    serviceName NVARCHAR(150) NOT NULL UNIQUE,
    description NVARCHAR(1000) NULL,
    price DECIMAL(12,2) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

-- 7. Bảng Medicine (Danh mục thuốc trong kho)
CREATE TABLE Medicine (
    medicineId INT IDENTITY(1,1) PRIMARY KEY,
    medicineName NVARCHAR(150) NOT NULL,
    unit NVARCHAR(50) NOT NULL,
    unitPrice DECIMAL(12,2) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    minThreshold INT NOT NULL DEFAULT 20
);

-- 8. Bảng InventoryBatch (Lô thuốc tồn kho)
CREATE TABLE InventoryBatch (
    batchId INT IDENTITY(1,1) PRIMARY KEY,
    medicineId INT NOT NULL,
    batchNumber NVARCHAR(80) NOT NULL,
    expirationDate DATE NOT NULL,
    quantityInStock INT NOT NULL,
    supplier NVARCHAR(150) NULL,
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
    notes NVARCHAR(1000) NULL,
    CONSTRAINT FK_Appointment_Owner FOREIGN KEY (ownerId) REFERENCES PetOwner(ownerId),
    CONSTRAINT FK_Appointment_Pet FOREIGN KEY (petId) REFERENCES Pet(petId),
    CONSTRAINT FK_Appointment_Vet FOREIGN KEY (veterinarianId) REFERENCES UserAccount(userId)
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
    CONSTRAINT FK_Invoice_Record FOREIGN KEY (recordId) REFERENCES MedicalRecord(recordId)
);

-- 16. Bảng Payment (Giao dịch thanh toán)
CREATE TABLE Payment (
    paymentId INT IDENTITY(1,1) PRIMARY KEY,
    invoiceId INT NOT NULL,
    paymentDate DATETIME2 NOT NULL,
    paymentMethod NVARCHAR(50) NOT NULL,
    amountPaid DECIMAL(12,2) NOT NULL,
    CONSTRAINT FK_Payment_Invoice FOREIGN KEY (invoiceId) REFERENCES Invoice(invoiceId)
);

-- 17. Bảng AuditLog (Nhật ký hoạt động hệ thống)
CREATE TABLE AuditLog (
    logId INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    actionTime DATETIME2 NOT NULL DEFAULT GETDATE(),
    actionDetails NVARCHAR(2000) NOT NULL,
    CONSTRAINT FK_AuditLog_User FOREIGN KEY (userId) REFERENCES UserAccount(userId)
);
GO

PRINT N'------------------------------------------------------------------------------';
PRINT N'5. NẠP DỮ LIỆU MẪU CÓ SẴN (SEED DATA) ĐỂ CHẠY TOÀN BỘ HỆ THỐNG PCMS';
PRINT N'------------------------------------------------------------------------------';

-- 1. Nạp Vai trò
SET IDENTITY_INSERT Role ON;
INSERT INTO Role (roleId, roleName, description) VALUES
(1, N'ADMIN', N'Quản trị viên hệ thống — Toàn quyền cấu hình, nhân sự, danh mục, báo cáo & nhật ký'),
(2, N'VETERINARIAN', N'Bác sĩ thú y — Khám lâm sàng, lập bệnh án điện tử, kê đơn & lịch tiêm chủng'),
(3, N'RECEPTIONIST', N'Lễ tân — Tiếp nhận lịch hẹn, check-in, đăng ký walk-in & thu ngân hóa đơn'),
(4, N'INVENTORY_MANAGER', N'Thủ kho — Quản lý danh mục thuốc, nhập lô tồn kho, điều chỉnh & cảnh báo hạn dùng'),
(5, N'PET_OWNER', N'Chủ thú cưng — Đặt lịch khám trực tuyến, theo dõi hồ sơ thú cưng & hóa đơn');
SET IDENTITY_INSERT Role OFF;

-- 2. Nạp Chi nhánh
SET IDENTITY_INSERT Branch ON;
INSERT INTO Branch (branchId, branchName, address, phoneNumber) VALUES
(1, N'Phòng khám Thú y Veterian Central', N'123 Nguyễn Văn Linh, P. Tân Phong, Quận 7, TP. Hồ Chí Minh', N'02812345678');
SET IDENTITY_INSERT Branch OFF;

-- 3. Nạp Tài khoản người dùng (Mật khẩu đã được mã hóa bằng chuẩn BCrypt)
-- admin: Admin@123
-- vet:   Vet@123
-- petowner: Owner@123
SET IDENTITY_INSERT UserAccount ON;
INSERT INTO UserAccount (userId, username, passwordHash, fullName, email, phoneNumber, status, roleId, branchId, failedLoginAttempts, createdAt) VALUES
(1, N'admin', N'$2a$10$dA3V9T904.Sh9ERX5kzpZeX2ridOiIXRPcWZ02tyF9cXRa.2G4Rl6', N'System Administrator', N'admin@pcms.com', N'0900000000', N'ACTIVE', 1, 1, 0, GETDATE()),
(2, N'vet', N'$2a$10$zj/VgxTCEfIaDBJRzcUiEuAX1FiNjojdVA6J4rk3DVlu2ghEuO0.6', N'BS. CKI Nguyễn Văn Minh', N'vet.minh@pcms.com', N'0912345678', N'ACTIVE', 2, 1, 0, GETDATE()),
(3, N'petowner', N'$2a$10$wMhHBv1l1Xv8QTbQPVOX6uk.oUc/s2MPXLQbIyScRCO4xWX6hl47O', N'Lê Hoàng Nam', N'nam.le@gmail.com', N'0987654321', N'ACTIVE', 5, NULL, 0, GETDATE());
SET IDENTITY_INSERT UserAccount OFF;

-- 4. Nạp Chủ thú cưng
SET IDENTITY_INSERT PetOwner ON;
INSERT INTO PetOwner (ownerId, fullName, phoneNumber, email, address, userId) VALUES
(1, N'Lê Hoàng Nam', N'0987654321', N'nam.le@gmail.com', N'Số 45/2 Đường số 10, Thảo Điền, TP. Thủ Đức', 3);
SET IDENTITY_INSERT PetOwner OFF;

-- 5. Nạp Danh sách Thú cưng
SET IDENTITY_INSERT Pet ON;
INSERT INTO Pet (petId, ownerId, petName, species, breed, gender, dateOfBirth, weight) VALUES
(1, 1, N'Milo', N'Chó', N'Corgi Pembroke', N'Đực', DATEADD(MONTH, -26, CAST(GETDATE() AS DATE)), 11.50),
(2, 1, N'Bông', N'Mèo', N'Mèo Anh lông ngắn', N'Cái', DATEADD(MONTH, -16, CAST(GETDATE() AS DATE)), 4.20),
(3, 1, N'Lucky', N'Chó', N'Toy Poodle', N'Đực', DATEADD(MONTH, -36, CAST(GETDATE() AS DATE)), 5.00);
SET IDENTITY_INSERT Pet OFF;

-- 6. Nạp Danh mục Dịch vụ
SET IDENTITY_INSERT Service ON;
INSERT INTO Service (serviceId, serviceName, description, price, status) VALUES
(1, N'Khám lâm sàng tổng quát', N'Khám tai, mắt, mũi, họng, kiểm tra nhịp tim, phổi, nhiệt độ & sờ nắn ổ bụng', 150000.00, N'ACTIVE'),
(2, N'Siêu âm màu Doppler ổ bụng', N'Khảo sát gan, thận, bàng quang, lách, dạ dày và ruột trên máy siêu âm màu hiện đại', 350000.00, N'ACTIVE'),
(3, N'Chụp X-Quang kỹ thuật số (2 tư thế)', N'Chụp X-quang kỹ thuật số lồng ngực / chi / cột sống chất lượng cao', 300000.00, N'ACTIVE'),
(4, N'Xét nghiệm tổng phân tích tế bào máu (CBC)', N'Đếm hồng cầu, bạch cầu, tiểu cầu, tầm soát nhiễm trùng & thiếu máu', 250000.00, N'ACTIVE'),
(5, N'Tiêm vắc-xin phòng 7 bệnh chó/mèo', N'Vắc-xin phòng bệnh Care, Parvo, Viêm gan, Ho cũi chó, Leptospira...', 220000.00, N'ACTIVE'),
(6, N'Cạo vôi răng & đánh bóng chuyên sâu', N'Làm sạch mảng bám vôi răng bằng sóng siêu âm, khử mùi hôi miệng', 400000.00, N'ACTIVE');
SET IDENTITY_INSERT Service OFF;

-- 7. Nạp Danh mục Thuốc
SET IDENTITY_INSERT Medicine ON;
INSERT INTO Medicine (medicineId, medicineName, unit, unitPrice, status, minThreshold) VALUES
(1, N'Amoxicillin + Clavulanate 250mg', N'Viên', 18000.00, N'ACTIVE', 30),
(2, N'Meloxicam Giảm đau kháng viêm 1.5mg/ml (10ml)', N'Chai', 165000.00, N'ACTIVE', 15),
(3, N'Men tiêu hóa Protexin Pro-Kolin Paste (15ml)', N'Tuýp', 210000.00, N'ACTIVE', 10),
(4, N'Advocate Chó nhỏ trị ghẻ, ve rận & giun tim (0.4ml)', N'Tuýp', 195000.00, N'ACTIVE', 20),
(5, N'Thuốc nhỏ mắt Tobrex 0.3% (5ml)', N'Lọ', 85000.00, N'ACTIVE', 25),
(6, N'Vemedim Gluco K-C bồi bổ thể lực (100ml)', N'Chai', 75000.00, N'ACTIVE', 20);
SET IDENTITY_INSERT Medicine OFF;

-- 8. Nạp Lô thuốc tồn kho
SET IDENTITY_INSERT InventoryBatch ON;
INSERT INTO InventoryBatch (batchId, medicineId, batchNumber, expirationDate, quantityInStock, supplier) VALUES
(1, 1, N'BATCH-AMX-2026-01', DATEADD(MONTH, 18, CAST(GETDATE() AS DATE)), 250, N'Dược Thú Y Vemedim'),
(2, 2, N'BATCH-MEL-2026-02', DATEADD(MONTH, 12, CAST(GETDATE() AS DATE)), 80, N'Công ty CP Thuốc Thú Y TW1'),
(3, 3, N'BATCH-PRO-2026-03', DATEADD(MONTH, 10, CAST(GETDATE() AS DATE)), 65, N'Protexin Veterinary UK');
SET IDENTITY_INSERT InventoryBatch OFF;

-- 9. Nạp Ca Lịch hẹn khám
SET IDENTITY_INSERT Appointment ON;
INSERT INTO Appointment (appointmentId, ownerId, petId, appointmentDate, reason, status, veterinarianId, notes) VALUES
(1, 1, 1, DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), N'Milo bỏ ăn 2 hôm nay, nôn ra dịch bọt vàng, mệt mỏi ít chạy nhảy', N'IN_PROGRESS', 2, N'Đã check-in tiếp nhận lúc 08:50'),
(2, 1, 2, DATEADD(HOUR, 11, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), N'Tiêm vắc-xin nhắc lại định kỳ hàng năm & cạo vôi răng', N'CHECKED_IN', 2, N'Khách đã đến phòng chờ tầng 1'),
(3, 1, 3, DATEADD(HOUR, 15, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), N'Gãi tai liên tục, tai đỏ có nhiều chất nhờn màu nâu đen', N'WAITING', 2, N'Hẹn trước qua app'),
(4, 1, 1, DATEADD(MONTH, -1, CAST(GETDATE() AS DATETIME2)), N'Khám sức khỏe định kỳ & tiêm phòng dại', N'COMPLETED', 2, N'Đã khám và thanh toán đầy đủ');
SET IDENTITY_INSERT Appointment OFF;

-- 10. Nạp Bệnh án điện tử
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

-- 11. Nạp Y lệnh Dịch vụ & Xét nghiệm
SET IDENTITY_INSERT MedicalRecordDetail ON;
INSERT INTO MedicalRecordDetail (recordDetailId, recordId, serviceId, quantity, notes) VALUES
(1, 1, 1, 1, N'Khám toàn thân, nghe tim phổi'),
(2, 1, 2, 1, N'Siêu âm ổ bụng: thành dạ dày dày nhẹ, không phát hiện dị vật cản quang lớn'),
(3, 1, 4, 1, N'Bạch cầu tăng nhẹ (16.8 G/L) biểu hiện phản ứng viêm'),
(4, 2, 1, 1, N'Khám thể trạng tổng quát trước khi tiêm vắc xin');
SET IDENTITY_INSERT MedicalRecordDetail OFF;

-- 12. Nạp Đơn thuốc
SET IDENTITY_INSERT Prescription ON;
INSERT INTO Prescription (prescriptionId, recordId, prescribedDate, instructions) VALUES
(1, 1, CAST(GETDATE() AS DATE), N'Cho uống sau ăn 30 phút. Không cho gặm xương hoặc thức ăn dầu mỡ trong 5 ngày tới.');
SET IDENTITY_INSERT Prescription OFF;

-- 13. Nạp Chi tiết đơn thuốc
SET IDENTITY_INSERT PrescriptionDetail ON;
INSERT INTO PrescriptionDetail (prescriptionDetailId, prescriptionId, medicineId, dosage, quantity, notes) VALUES
(1, 1, 1, N'Uống 1 viên / lần, ngày 2 lần (sáng - chiều) sau ăn', 10, N'Uống liên tục đủ 5 ngày'),
(2, 1, 3, N'Bơm trực tiếp vào miệng 2ml / lần, ngày 2 lần', 1, N'Men tiêu hóa ổn định đường ruột');
SET IDENTITY_INSERT PrescriptionDetail OFF;

-- 14. Nạp Lịch hẹn tái khám
SET IDENTITY_INSERT FollowUp ON;
INSERT INTO FollowUp (followUpId, petId, recordId, followUpDate, followUpType, notes, status) VALUES
(1, 1, 1, DATEADD(DAY, 5, CAST(GETDATE() AS DATE)), N'Tái khám đánh giá đáp ứng kháng sinh', N'Kiểm tra lại triệu chứng nôn và phân, cân lại trọng lượng', N'PENDING');
SET IDENTITY_INSERT FollowUp OFF;

-- 15. Nạp Hóa đơn
SET IDENTITY_INSERT Invoice ON;
INSERT INTO Invoice (invoiceId, recordId, invoiceDate, totalAmount, discountAmount, status) VALUES
(1, 1, GETDATE(), 1140000.00, 0.00, N'PENDING');
SET IDENTITY_INSERT Invoice OFF;

-- 16. Nạp Nhật ký hệ thống (Audit Log)
SET IDENTITY_INSERT AuditLog ON;
INSERT INTO AuditLog (logId, userId, actionTime, actionDetails) VALUES
(1, 1, DATEADD(HOUR, -5, GETDATE()), N'[HỆ THỐNG] Khởi tạo cấu hình ban đầu cho phòng khám'),
(2, 2, DATEADD(HOUR, -3, GETDATE()), N'[BÁC SĨ THÚ Y] Bác sĩ BS. CKI Nguyễn Văn Minh bắt đầu khám ca bệnh #1 (Pet: Milo)'),
(3, 2, DATEADD(HOUR, -2, GETDATE()), N'[BÁC SĨ THÚ Y] Lên y lệnh dịch vụ: Siêu âm màu Doppler ổ bụng cho bệnh án #1'),
(4, 2, DATEADD(HOUR, -1, GETDATE()), N'[BÁC SĨ THÚ Y] Lưu đơn thuốc điện tử cho bệnh án #1'),
(5, 2, DATEADD(MINUTE, -30, GETDATE()), N'[BÁC SĨ THÚ Y] Hẹn lịch tái khám cho bé Milo');
SET IDENTITY_INSERT AuditLog OFF;

PRINT N'==============================================================================';
PRINT N'🎉 NẠP TOÀN BỘ CƠ SỞ DỮ LIỆU & SEED DATA CHO DỰ ÁN PCMS THÀNH CÔNG!';
PRINT N'Tài khoản đăng nhập kiểm thử:';
PRINT N'1. ADMIN:        username = admin     | password = Admin@123';
PRINT N'2. VETERINARIAN: username = vet       | password = Vet@123';
PRINT N'3. PET OWNER:    username = petowner  | password = Owner@123';
PRINT N'==============================================================================';
GO
