const BASE_URL = 'http://localhost:8080';

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

function randDigits(len) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return s;
}

async function runTests() {
  console.log('======================================================================');
  console.log('         KIEM TRA TOAN DIEN CAC LUONG LOGIC HE THONG PCMS             ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, errorDetail = null) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      if (errorDetail) console.error('       Chi tiet loi:', JSON.stringify(errorDetail, null, 2));
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & LOGIN (ADMIN, VET, RECEPTIONIST, PET_OWNER)
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------------');
  console.log('PHAN HE 1: XAC THUC NGUOI DUNG & PHAN QUYEN VAI TRO');
  console.log('----------------------------------------------------------------------');
  const accounts = [
    { role: 'ADMIN', user: 'admin', pass: 'Admin@123' },
    { role: 'VETERINARIAN', user: 'vet', pass: 'Vet@123' },
    { role: 'RECEPTIONIST', user: 'receptionist', pass: 'Receptionist@123' },
    { role: 'PET_OWNER', user: 'petowner', pass: 'Owner@123' }
  ];

  const tokens = {};
  for (const acc of accounts) {
    const res = await request('POST', '/api/auth/login', { login: acc.user, password: acc.pass });
    const token = res.data?.data?.accessToken;
    const ok = res.ok && !!token;
    assert(ok, `Dang nhap vai tro ${acc.role.padEnd(13)} (${acc.user}) -> Token hop le`, res.data);
    if (ok) tokens[acc.role] = token;
  }

  // Dang ky chu nuoi moi
  const rand = randDigits(5);
  const newEmail = `user_${rand}@pcms-test.vn`;
  const newPhone = `09${randDigits(8)}`;
  const regRes = await request('POST', '/api/auth/register', {
    fullName: `Nguyen Thi Test ${rand}`,
    email: newEmail,
    phoneNumber: newPhone,
    address: '123 Vo Van Tan, Q3, TP.HCM',
    password: 'Password@123',
    confirmPassword: 'Password@123'
  });
  assert(regRes.ok, `Dang ky tai khoan chu nuoi moi [${newEmail}]`, regRes.data);

  // Dang nhap bang tai khoan vua tao
  const newLoginRes = await request('POST', '/api/auth/login', { login: newEmail, password: 'Password@123' });
  assert(newLoginRes.ok && newLoginRes.data?.data?.accessToken, `Dang nhap bang tai khoan chu nuoi vua dang ky`, newLoginRes.data);

  // -------------------------------------------------------------------------
  // 2. ADMIN FLOWS
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHAN HE 2: QUAN TRI HE THONG (ADMIN)');
  console.log('----------------------------------------------------------------------');
  const adminToken = tokens['ADMIN'];

  const overviewRes = await request('GET', '/api/admin/overview', null, adminToken);
  assert(overviewRes.ok && overviewRes.data?.kpis, `GET /api/admin/overview (Tong quan KPI)`, overviewRes.data);

  const accountsRes = await request('GET', '/api/admin/accounts', null, adminToken);
  assert(accountsRes.ok && accountsRes.data?.items, `GET /api/admin/accounts (Danh sach tai khoan nhan su & khach)`, accountsRes.data);

  const rolesRes = await request('GET', '/api/admin/roles-permissions', null, adminToken);
  assert(rolesRes.ok && rolesRes.data?.roles, `GET /api/admin/roles-permissions (Cau hinh vai tro & quyen)`, rolesRes.data);

  const servicesRes = await request('GET', '/api/admin/services', null, adminToken);
  assert(servicesRes.ok && Array.isArray(servicesRes.data), `GET /api/admin/services (${servicesRes.data?.length || 0} dich vu)`, servicesRes.data);

  const medsRes = await request('GET', '/api/admin/medicines', null, adminToken);
  assert(medsRes.ok && Array.isArray(medsRes.data), `GET /api/admin/medicines (${medsRes.data?.length || 0} loai thuoc trong kho)`, medsRes.data);

  const reportsRes = await request('GET', '/api/admin/reports', null, adminToken);
  assert(reportsRes.ok && reportsRes.data?.revenueRows, `GET /api/admin/reports (Bao cao doanh thu & hoat dong)`, reportsRes.data);

  const auditRes = await request('GET', '/api/admin/audit-logs', null, adminToken);
  assert(auditRes.ok && (Array.isArray(auditRes.data) || auditRes.data?.items), `GET /api/admin/audit-logs (Nhat ky thao tac he thong)`, auditRes.data);

  // -------------------------------------------------------------------------
  // 3. RECEPTIONIST FLOWS
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHAN HE 3: LE TAN & TIEP NHAN KHAM (RECEPTIONIST)');
  console.log('----------------------------------------------------------------------');
  const recToken = tokens['RECEPTIONIST'];

  const recDash = await request('GET', '/api/receptionist/dashboard', null, recToken);
  assert(recDash.ok && recDash.data?.kpis, `GET /api/receptionist/dashboard (Tong quan lich hen & hang cho)`, recDash.data);

  const recCatalog = await request('GET', '/api/receptionist/catalog', null, recToken);
  assert(recCatalog.ok && recCatalog.data?.services, `GET /api/receptionist/catalog (Tra cuu danh muc dich vu & bac si)`, recCatalog.data);

  // 3.1 Tao ho so chu nuoi moi tai quay
  const ownerPhone = `09${randDigits(8)}`;
  const createOwnerRes = await request('POST', '/api/receptionist/owners', {
    fullName: `Pham Van Chien ${rand}`,
    phoneNumber: ownerPhone,
    email: `chien.${rand}@gmail.com`,
    address: '456 Le Duan, Da Nang'
  }, recToken);
  assert(createOwnerRes.ok && createOwnerRes.data?.ownerId, `POST /api/receptionist/owners (Dang ky chu nuoi tai quay)`, createOwnerRes.data);
  const createdOwnerId = createOwnerRes.data?.ownerId;

  // 3.2 Tao ho so thu cung cho chu nuoi
  let createdPetId = null;
  if (createdOwnerId) {
    const createPetRes = await request('POST', '/api/receptionist/pets', {
      ownerId: createdOwnerId,
      petName: `Lucky ${rand}`,
      species: 'Chó',
      breed: 'Golden Retriever',
      gender: 'Đực',
      age: 2,
      weight: 18.5
    }, recToken);
    assert(createPetRes.ok && createPetRes.data?.petId, `POST /api/receptionist/pets (Them thu cung cho chu nuoi)`, createPetRes.data);
    createdPetId = createPetRes.data?.petId;
  }

  // 3.3 Dat lich hen tuong lai
  let bookedApptId = null;
  if (createdPetId) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const bookApptRes = await request('POST', '/api/receptionist/appointments', {
      petId: createdPetId,
      appointmentDate: tomorrow,
      appointmentTime: '09:30',
      shift: 'MORNING',
      serviceId: 1,
      reason: 'Tiem ngua dinh ky 7 benh & tay giun',
      notes: 'Khach hen gio truoc'
    }, recToken);
    assert(bookApptRes.ok && bookApptRes.data?.appointmentId, `POST /api/receptionist/appointments (Dat lich hen truoc)`, bookApptRes.data);
    bookedApptId = bookApptRes.data?.appointmentId;
  }

  // 3.4 Tiep nhan ca kham truc tiep tai quay (Walk-in) -> Tu dong check-in vao hang cho
  let walkInApptId = null;
  if (createdPetId) {
    const walkInRes = await request('POST', '/api/receptionist/walk-in', {
      petId: createdPetId,
      veterinarianId: 34, // BS. CKI Nguyen Van Minh
      serviceId: 1,
      weight: 18.7,
      notes: 'Cho bi bo an 1 ngay nay, kho khe, ho nhe'
    }, recToken);
    assert(walkInRes.ok && walkInRes.data?.status === 'CHECKED_IN', `POST /api/receptionist/walk-in (Tiep nhan truc tiep -> CHECKED_IN vao hang cho)`, walkInRes.data);
    walkInApptId = walkInRes.data?.appointmentId;
  }

  // -------------------------------------------------------------------------
  // 4. VETERINARIAN FLOWS
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHAN HE 4: BAC SI THU Y KHAM CHUA BENH (VETERINARIAN)');
  console.log('----------------------------------------------------------------------');
  const vetToken = tokens['VETERINARIAN'];
  const todayStr = new Date().toISOString().split('T')[0];

  const vetAppts = await request('GET', `/api/vet/appointments?date=${todayStr}`, null, vetToken);
  assert(vetAppts.ok && (vetAppts.data?.appointments || vetAppts.data?.items), `GET /api/vet/appointments (Hang cho kham cua bac si hom nay)`, vetAppts.data);

  const vetSummary = await request('GET', `/api/vet/appointments/summary?date=${todayStr}`, null, vetToken);
  assert(vetSummary.ok, `GET /api/vet/appointments/summary (Thong ke ca kham trong ngay)`, vetSummary.data);

  let medRecordId = null;
  if (createdPetId && walkInApptId) {
    // 4.1 Bac si bat dau kham
    const startRes = await request('POST', `/api/vet/appointments/${walkInApptId}/start`, null, vetToken);
    assert(startRes.ok && startRes.data?.status === 'IN_PROGRESS', `POST /api/vet/appointments/${walkInApptId}/start (Chuyen trang thai sang IN_PROGRESS)`, startRes.data);

    // 4.2 Bac si tao ho so benh an
    const createRecRes = await request('POST', '/api/vet/medical-records', {
      petId: createdPetId,
      appointmentId: walkInApptId,
      weight: 18.7,
      temperature: 39.3,
      symptoms: 'Sot 39.3C, phoi co ran am rai rac, mat lo do, ho nhe',
      diagnosis: 'Viem phe quan the cap tinh (Acute Bronchitis)',
      prognosis: 'Tien luong tot, dap ung nhanh neu dung khang sinh dung phac do',
      treatmentPlan: 'Khang sinh duong ho hap, khi dung, bo sung vitamin & tang de khang'
    }, vetToken);
    assert(createRecRes.ok && createRecRes.data?.recordId, `POST /api/vet/medical-records (Lap ho so benh an dien tu)`, createRecRes.data);
    medRecordId = createRecRes.data?.recordId;

    if (medRecordId) {
      // 4.3 Chi dinh can lam sang / dich vu
      const addServiceRes = await request('POST', `/api/vet/medical-records/${medRecordId}/services`, {
        serviceId: 1, // Kham lam sang tong quat
        notes: 'Nghe tim phoi & kiem tra duong ho hap tren'
      }, vetToken);
      assert(addServiceRes.ok, `POST /api/vet/medical-records/${medRecordId}/services (Chi dinh dich vu)`, addServiceRes.data);

      // 4.4 Ke don thuoc dien tu
      const rxRes = await request('POST', `/api/vet/medical-records/${medRecordId}/prescription`, {
        details: [
          {
            medicineId: 1, // Amoxicillin / Clavulanate
            dosage: 'Uong 1 vien / lan',
            frequency: '2 lan / ngay',
            durationDays: 7,
            quantity: 14,
            instructions: 'Uong cung voi thuc an hoac sau an'
          }
        ]
      }, vetToken);
      assert(rxRes.ok, `POST /api/vet/medical-records/${medRecordId}/prescription (Ke don thuoc)`, rxRes.data);

      // 4.5 Hen lich tai kham
      const followUpRes = await request('POST', `/api/vet/medical-records/${medRecordId}/follow-ups`, {
        followUpDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        notes: 'Kiem tra lai am phoi va do hoan toan khoe manh'
      }, vetToken);
      assert(followUpRes.ok, `POST /api/vet/medical-records/${medRecordId}/follow-ups (Hen lich tai kham)`, followUpRes.data);

      // 4.6 Hoan tat ca kham benh (Chuyen trang thai benh an va dong bo hoa don)
      const completeRes = await request('POST', `/api/vet/medical-records/${medRecordId}/complete`, null, vetToken);
      assert(completeRes.ok && completeRes.data?.status === 'COMPLETED', `POST /api/vet/medical-records/${medRecordId}/complete (Hoan tat ca kham & chot benh an)`, completeRes.data);
    }
  }

  // 4.7 Xem lich su benh an cua pet
  if (createdPetId) {
    const petHist = await request('GET', `/api/vet/pets/${createdPetId}/history`, null, vetToken);
    assert(petHist.ok && petHist.data?.visits, `GET /api/vet/pets/${createdPetId}/history (Truy van lich su kham cua thu cung)`, petHist.data);
  }

  // -------------------------------------------------------------------------
  // 5. PET OWNER PORTAL FLOWS
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHAN HE 5: CỔNG THÔNG TIN CHỦ NUÔI (PET OWNER PORTAL)');
  console.log('----------------------------------------------------------------------');
  const ownerToken = tokens['PET_OWNER'];

  const myPetsRes = await request('GET', '/api/owner/my-pets', null, ownerToken);
  assert(myPetsRes.ok && Array.isArray(myPetsRes.data), `GET /api/owner/my-pets (${myPetsRes.data?.length || 0} thu cung da lien ket)`, myPetsRes.data);

  if (myPetsRes.data?.length > 0) {
    const firstPet = myPetsRes.data[0];
    const petHistRes = await request('GET', `/api/owner/pets/${firstPet.petId}/medical-history`, null, ownerToken);
    assert(petHistRes.ok && petHistRes.data?.visits, `GET /api/owner/pets/${firstPet.petId}/medical-history (Xem ho so benh an thu cung)`, petHistRes.data);
  }

  console.log('\n======================================================================');
  console.log(`TONG KET KIEM THU: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');
}

runTests().catch(console.error);
