$baseUrl = "http://localhost:8080"
$ErrorActionPreference = "Stop"

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    $params = @{
        Method      = $Method
        Uri         = "$baseUrl$Uri"
        Headers     = $Headers
        ContentType = "application/json; charset=utf-8"
    }
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; Error = $null }
    } catch {
        $errDetail = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errDetail = $reader.ReadToEnd()
        }
        return @{ Success = $false; Data = $null; Error = $errDetail; StatusCode = $_.Exception.Response.StatusCode }
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "           KIỂM TRA CÁC LUỒNG LOGIC HỆ THỐNG PCMS          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# -------------------------------------------------------------
# 1. AUTHENTICATION & ROLE-BASED ACCESS
# -------------------------------------------------------------
Write-Host "`n[LUỒNG 1] ĐĂNG NHẬP CÁC TÀI KHOẢN HỆ THỐNG..." -ForegroundColor Yellow

$rolesToTest = @(
    @{ Name = "ADMIN"; User = "admin"; Pass = "Admin@123" },
    @{ Name = "VETERINARIAN"; User = "vet"; Pass = "Vet@123" },
    @{ Name = "RECEPTIONIST"; User = "receptionist"; Pass = "Receptionist@123" },
    @{ Name = "PET_OWNER"; User = "petowner"; Pass = "Owner@123" }
)

$tokens = @{}

foreach ($r in $rolesToTest) {
    $res = Invoke-Api -Method POST -Uri "/api/auth/login" -Body @{
        username = $r.User
        password = $r.Pass
    }
    if ($res.Success -and $res.Data.token) {
        Write-Host "  -> [OK] Login $($r.Name) ($($r.User)): Role = $($res.Data.role), Name = $($res.Data.fullName)" -ForegroundColor Green
        $tokens[$r.Name] = $res.Data.token
    } else {
        Write-Host "  -> [FAIL] Login $($r.Name) ($($r.User)): $($res.Error)" -ForegroundColor Red
    }
}

# -------------------------------------------------------------
# 2. KIỂM TRA ĐĂNG KÝ CHỦ THÚ CƯNG MỚI (REGISTER)
# -------------------------------------------------------------
Write-Host "`n[LUỒNG 2] ĐĂNG KÝ TÀI KHOẢN KHÁCH HÀNG MỚI..." -ForegroundColor Yellow
$randomUser = "testuser_" + (Get-Random -Minimum 1000 -Maximum 9999)
$regRes = Invoke-Api -Method POST -Uri "/api/auth/register" -Body @{
    username = $randomUser
    password = "Password@123"
    fullName = "Nguyen Van Test"
    email = "$randomUser@example.com"
    phoneNumber = "0988112233"
}
if ($regRes.Success) {
    Write-Host "  -> [OK] Đăng ký thành công tài khoản '$randomUser': Role = $($regRes.Data.role)" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] Đăng ký thất bại: $($regRes.Error)" -ForegroundColor Red
}

# -------------------------------------------------------------
# 3. LUỒNG QUẢN TRỊ VIÊN (ADMIN)
# -------------------------------------------------------------
Write-Host "`n[LUỒNG 3] QUẢN TRỊ VIÊN (ADMIN)..." -ForegroundColor Yellow
$adminHeader = @{ Authorization = "Bearer " + $tokens["ADMIN"] }

$overview = Invoke-Api -Method GET -Uri "/api/admin/overview" -Headers $adminHeader
if ($overview.Success) {
    Write-Host "  -> [OK] GET /api/admin/overview: Active Users = $($overview.Data.kpis.totalActiveUsers), Total Revenue = $($overview.Data.kpis.totalRevenue)" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/admin/overview: $($overview.Error)" -ForegroundColor Red
}

$users = Invoke-Api -Method GET -Uri "/api/admin/users" -Headers $adminHeader
if ($users.Success) {
    Write-Host "  -> [OK] GET /api/admin/users: Tìm thấy $($users.Data.Length) tài khoản" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/admin/users: $($users.Error)" -ForegroundColor Red
}

$services = Invoke-Api -Method GET -Uri "/api/admin/services" -Headers $adminHeader
if ($services.Success) {
    Write-Host "  -> [OK] GET /api/admin/services: Tìm thấy $($services.Data.Length) dịch vụ" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/admin/services: $($services.Error)" -ForegroundColor Red
}

$reports = Invoke-Api -Method GET -Uri "/api/admin/reports" -Headers $adminHeader
if ($reports.Success) {
    Write-Host "  -> [OK] GET /api/admin/reports: Báo cáo tải thành công" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/admin/reports: $($reports.Error)" -ForegroundColor Red
}

# -------------------------------------------------------------
# 4. LUỒNG LỄ TÂN (RECEPTIONIST)
# -------------------------------------------------------------
Write-Host "`n[LUỒNG 4] LỄ TÂN (RECEPTIONIST)..." -ForegroundColor Yellow
$recHeader = @{ Authorization = "Bearer " + $tokens["RECEPTIONIST"] }

$recDash = Invoke-Api -Method GET -Uri "/api/receptionist/dashboard" -Headers $recHeader
if ($recDash.Success) {
    Write-Host "  -> [OK] GET /api/receptionist/dashboard: Lịch hôm nay = $($recDash.Data.stats.todayAppointments), Đang chờ = $($recDash.Data.stats.inQueuePatients)" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/receptionist/dashboard: $($recDash.Error)" -ForegroundColor Red
}

$recCust = Invoke-Api -Method GET -Uri "/api/receptionist/customers" -Headers $recHeader
if ($recCust.Success) {
    Write-Host "  -> [OK] GET /api/receptionist/customers: Tìm thấy $($recCust.Data.Length) khách hàng" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/receptionist/customers: $($recCust.Error)" -ForegroundColor Red
}

# Tạo một khách hàng mới và thú cưng qua Lễ tân
$newCustRes = Invoke-Api -Method POST -Uri "/api/receptionist/customers" -Headers $recHeader -Body @{
    fullName = "Trần Thị Mai"
    phoneNumber = "0918889999"
    email = "mai.tran@gmail.com"
    address = "456 CMT8, Quận 3, TP.HCM"
    initialPetName = "Bông Bông"
    initialPetSpecies = "Mèo"
    initialPetBreed = "Anh lông ngắn"
    initialPetGender = "Cái"
    initialPetAge = 2
}
$createdPetId = $null
$createdOwnerId = $null
if ($newCustRes.Success) {
    Write-Host "  -> [OK] POST /api/receptionist/customers: Đăng ký khách '$($newCustRes.Data.fullName)', Pet = '$($newCustRes.Data.pet.name)' (ID: $($newCustRes.Data.pet.petId))" -ForegroundColor Green
    $createdPetId = $newCustRes.Data.pet.petId
    $createdOwnerId = $newCustRes.Data.ownerId
} else {
    Write-Host "  -> [FAIL] POST /api/receptionist/customers: $($newCustRes.Error)" -ForegroundColor Red
}

# Đặt lịch hẹn khám cho thú cưng vừa tạo
$todayStr = (Get-Date).ToString("yyyy-MM-dd")
$todayTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
$createdApptId = $null
if ($createdPetId) {
    $bookRes = Invoke-Api -Method POST -Uri "/api/receptionist/appointments" -Headers $recHeader -Body @{
        petId = $createdPetId
        appointmentDateTime = $todayTime
        reason = "Mèo nôn mửa và bỏ ăn 2 ngày nay"
        notes = "Khách hàng đặt khám trực tiếp tại quầy"
    }
    if ($bookRes.Success) {
        $createdApptId = $bookRes.Data.appointmentId
        Write-Host "  -> [OK] POST /api/receptionist/appointments: Tạo lịch hẹn #$createdApptId lúc $todayTime" -ForegroundColor Green
        
        # Check-in lịch hẹn chuyển vào hàng chờ bác sĩ
        $checkinRes = Invoke-Api -Method PATCH -Uri "/api/receptionist/appointments/$createdApptId/check-in" -Headers $recHeader
        if ($checkinRes.Success) {
            Write-Host "  -> [OK] PATCH /api/receptionist/appointments/$createdApptId/check-in: Check-in thành công! Trạng thái = $($checkinRes.Data.status)" -ForegroundColor Green
        } else {
            Write-Host "  -> [FAIL] Check-in lịch hẹn: $($checkinRes.Error)" -ForegroundColor Red
        }
    } else {
        Write-Host "  -> [FAIL] Tạo lịch hẹn: $($bookRes.Error)" -ForegroundColor Red
    }
}

# -------------------------------------------------------------
# 5. LUỒNG BÁC SĨ THÚ Y (VETERINARIAN)
# -------------------------------------------------------------
Write-Host "`n[LUỒNG 5] BÁC SĨ THÚ Y (VETERINARIAN)..." -ForegroundColor Yellow
$vetHeader = @{ Authorization = "Bearer " + $tokens["VETERINARIAN"] }

$vetQueue = Invoke-Api -Method GET -Uri "/api/vet/workbench/queue?date=$todayStr" -Headers $vetHeader
if ($vetQueue.Success) {
    Write-Host "  -> [OK] GET /api/vet/workbench/queue: Hàng chờ hôm nay có $($vetQueue.Data.Length) ca khám" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/vet/workbench/queue: $($vetQueue.Error)" -ForegroundColor Red
}

$vetServices = Invoke-Api -Method GET -Uri "/api/vet/catalog/services" -Headers $vetHeader
$vetMedicines = Invoke-Api -Method GET -Uri "/api/vet/catalog/medicines" -Headers $vetHeader
Write-Host "  -> [OK] Danh mục bác sĩ: $($vetServices.Data.Length) dịch vụ, $($vetMedicines.Data.Length) loại thuốc" -ForegroundColor Green

# Tạo hồ sơ bệnh án khám bệnh cho ca khám trên
$medRecordId = $null
if ($createdPetId -and $createdApptId) {
    $serviceId = $vetServices.Data[0].serviceId
    $medicineId = $vetMedicines.Data[0].medicineId

    $recordBody = @{
        petId = $createdPetId
        appointmentId = $createdApptId
        weight = 3.8
        temperature = 39.2
        symptoms = "Mèo bỏ ăn, nôn bọt trắng, sốt nhẹ 39.2C, bụng chướng nhẹ"
        diagnosis = "Viêm dạ dày ruột cấp tính (Acute Gastroenteritis)"
        prognosis = "Khả quan nếu tuân thủ đơn thuốc và ăn kiêng"
        treatmentPlan = "Bù nước điện giải, kháng sinh đường tiêu hoá, thuốc bảo vệ niêm mạc dạ dày"
        followUpDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
        followUpNotes = "Tái khám sau 3 ngày kiểm tra tình trạng nôn và thể trọng"
        services = @(
            @{ serviceId = $serviceId; notes = "Khám lâm sàng tổng quát ổ bụng"; quantity = 1 }
        )
        prescriptions = @(
            @{
                medicineId = $medicineId
                dosage = "Uống 1/2 viên mỗi 12 giờ sau ăn"
                frequency = "2 lần/ngày"
                durationDays = 5
                quantity = 5
                instructions = "Nghiền nhỏ trộn cùng thức ăn ướt hoặc sốt dinh dưỡng"
            }
        )
    }

    $createRecordRes = Invoke-Api -Method POST -Uri "/api/vet/records" -Headers $vetHeader -Body $recordBody
    if ($createRecordRes.Success) {
        $medRecordId = $createRecordRes.Data.recordId
        Write-Host "  -> [OK] POST /api/vet/records: Lập bệnh án thành công! Record ID: $medRecordId, Trạng thái: $($createRecordRes.Data.status)" -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] POST /api/vet/records: $($createRecordRes.Error)" -ForegroundColor Red
    }
}

# Kiểm tra xem lịch sử khám của thú cưng
if ($createdPetId) {
    $petHistory = Invoke-Api -Method GET -Uri "/api/vet/pets/$createdPetId/history" -Headers $vetHeader
    if ($petHistory.Success) {
        Write-Host "  -> [OK] GET /api/vet/pets/$createdPetId/history: Tải thành công $($petHistory.Data.visits.Length) lượt khám của bé $($petHistory.Data.pet.name)" -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] GET pet history: $($petHistory.Error)" -ForegroundColor Red
    }
}

# -------------------------------------------------------------
# 6. LUỒNG THANH TOÁN HOÁ ĐƠN (RECEPTIONIST BILLING)
# -------------------------------------------------------------
Write-Host "`n[LUỒNG 6] THANH TOÁN HOÁ ĐƠN (INVOICE & PAYMENT)..." -ForegroundColor Yellow
$invoicesRes = Invoke-Api -Method GET -Uri "/api/receptionist/invoices" -Headers $recHeader
if ($invoicesRes.Success) {
    Write-Host "  -> [OK] GET /api/receptionist/invoices: Tìm thấy $($invoicesRes.Data.Length) hoá đơn" -ForegroundColor Green
    $unpaidInvoice = $invoicesRes.Data | Where-Object { $_.paymentStatus -eq "UNPAID" } | Select-Object -First 1
    if ($unpaidInvoice) {
        $invId = $unpaidInvoice.invoiceId
        Write-Host "  -> Tìm thấy hoá đơn chưa trả #$invId (Tổng: $($unpaidInvoice.totalAmount) VND). Tiến hành thanh toán..." -ForegroundColor Cyan
        $payRes = Invoke-Api -Method POST -Uri "/api/receptionist/invoices/$invId/pay" -Headers $recHeader -Body @{
            paymentMethod = "CASH"
            notes = "Khách thanh toán tiền mặt tại quầy lễ tân"
        }
        if ($payRes.Success) {
            Write-Host "  -> [OK] POST /api/receptionist/invoices/$invId/pay: Thanh toán thành công! Trạng thái: $($payRes.Data.paymentStatus)" -ForegroundColor Green
        } else {
            Write-Host "  -> [FAIL] Thanh toán hoá đơn #$invId: $($payRes.Error)" -ForegroundColor Red
        }
    } else {
        Write-Host "  -> Không có hoá đơn nào ở trạng thái UNPAID" -ForegroundColor Gray
    }
} else {
    Write-Host "  -> [FAIL] GET /api/receptionist/invoices: $($invoicesRes.Error)" -ForegroundColor Red
}

# -------------------------------------------------------------
# 7. LUỒNG CỔNG CHỦ NUÔI (PET OWNER PORTAL)
# -------------------------------------------------------------
Write-Host "`n[LUỒNG 7] CỔNG THÔNG TIN CHỦ THÚ CƯNG (PET OWNER PORTAL)..." -ForegroundColor Yellow
$ownerHeader = @{ Authorization = "Bearer " + $tokens["PET_OWNER"] }

$myPets = Invoke-Api -Method GET -Uri "/api/owner/pets" -Headers $ownerHeader
if ($myPets.Success) {
    Write-Host "  -> [OK] GET /api/owner/pets: Chủ nuôi có $($myPets.Data.Length) thú cưng" -ForegroundColor Green
    if ($myPets.Data.Length -gt 0) {
        $firstPet = $myPets.Data[0]
        $petHist = Invoke-Api -Method GET -Uri "/api/owner/pets/$($firstPet.petId)/history" -Headers $ownerHeader
        if ($petHist.Success) {
            Write-Host "  -> [OK] GET /api/owner/pets/$($firstPet.petId)/history: Xem được $($petHist.Data.visits.Length) lượt khám của bé $($firstPet.name)" -ForegroundColor Green
        } else {
            Write-Host "  -> [FAIL] GET owner pet history: $($petHist.Error)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  -> [FAIL] GET /api/owner/pets: $($myPets.Error)" -ForegroundColor Red
}

$myAppts = Invoke-Api -Method GET -Uri "/api/owner/appointments" -Headers $ownerHeader
if ($myAppts.Success) {
    Write-Host "  -> [OK] GET /api/owner/appointments: Chủ nuôi có $($myAppts.Data.Length) lịch hẹn" -ForegroundColor Green
} else {
    Write-Host "  -> [FAIL] GET /api/owner/appointments: $($myAppts.Error)" -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "          HOÀN THÀNH TẤT CẢ CÁC BƯỚC TEST LOGIC           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
