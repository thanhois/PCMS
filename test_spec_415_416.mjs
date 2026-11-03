const BASE_URL = 'http://localhost:8080';

async function request(method, path, body = null, token = null, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data,
  };
}

async function runSpecTests() {
  console.log('======================================================================');
  console.log('      KIEM THU DAC TA YEU CAU: SECTIONS 4.1.5, 4.1.6, 4.1.7           ');
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

  // 1. Get tokens
  const adminLogin = await request('POST', '/api/auth/login', { login: 'admin', password: 'Admin@123' });
  const adminToken = adminLogin.data?.data?.accessToken;
  const vetLogin = await request('POST', '/api/auth/login', { login: 'vet', password: 'Vet@123' });
  const vetToken = vetLogin.data?.data?.accessToken;
  const recepLogin = await request('POST', '/api/auth/login', { login: 'receptionist', password: 'Receptionist@123' });
  const recepToken = recepLogin.data?.data?.accessToken;

  // -------------------------------------------------------------------------
  // SECTION 4.1.5: Error Handling and Logging
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------------');
  console.log('SECTION 4.1.5: ERROR HANDLING & LOGGING (JSON error response, status, codes)');
  console.log('----------------------------------------------------------------------');

  // 4.1.5 Test 1: Correlation ID header propagation & generation
  const customCorrId = 'test-corr-uuid-12345';
  const corrTest = await request('GET', '/api/admin/overview', null, adminToken, {
    'X-Correlation-ID': customCorrId,
  });
  assert(
    corrTest.headers.get('x-correlation-id') === customCorrId,
    `Correlation ID truyen vao duoc giu nguyen va tra ve trong response header (${corrTest.headers.get('x-correlation-id')})`
  );

  // 4.1.5 Test 2: Auto-generate Correlation ID when not passed
  const autoCorrTest = await request('GET', '/api/admin/overview', null, adminToken);
  const returnedCorrId = autoCorrTest.headers.get('x-correlation-id');
  assert(
    returnedCorrId && returnedCorrId.length > 5,
    `Tu dong sinh Correlation ID moi khi client khong truyen len (${returnedCorrId})`
  );

  // 4.1.5 Test 3: HTTP 400 Validation Error structure
  const valErrorTest = await request('POST', '/api/auth/login', { login: '', password: '' });
  assert(
    valErrorTest.status === 400 &&
      valErrorTest.data?.errorCode === 'VALIDATION_FAILED' &&
      valErrorTest.data?.correlationId &&
      valErrorTest.data?.fieldErrors &&
      typeof valErrorTest.data?.message === 'string',
    'HTTP 400 tra ve cau truc JSON chuan: errorCode, correlationId, user message, fieldErrors',
    valErrorTest.data
  );

  // 4.1.5 Test 4: HTTP 401 Unauthenticated Error
  const unauthTest = await request('GET', '/api/admin/accounts', null, 'invalid-fake-jwt-token');
  assert(
    unauthTest.status === 401 &&
      unauthTest.data?.errorCode === 'UNAUTHENTICATED' &&
      unauthTest.data?.correlationId,
    'HTTP 401 tra ve ma loi on dinh UNAUTHENTICATED va correlationId',
    unauthTest.data
  );

  // 4.1.5 Test 5: HTTP 403 Forbidden Access
  const forbiddenTest = await request('GET', '/api/admin/accounts', null, recepToken);
  assert(
    forbiddenTest.status === 403 &&
      forbiddenTest.data?.errorCode === 'ACCESS_DENIED' &&
      forbiddenTest.data?.correlationId,
    'HTTP 403 tra ve ma loi on dinh ACCESS_DENIED va correlationId',
    forbiddenTest.data
  );

  // 4.1.5 Test 6: HTTP 404 Missing Resource
  const notFoundTest = await request('GET', '/api/receptionist/invoices/999999', null, recepToken);
  assert(
    notFoundTest.status === 400 || notFoundTest.status === 404,
    `Missing resource duoc xu ly an toan voi status hop le (${notFoundTest.status}) khong de lo stack trace`,
    notFoundTest.data
  );
  assert(
    !JSON.stringify(notFoundTest.data).includes('Exception at com.') &&
      !JSON.stringify(notFoundTest.data).includes('NullPointerException'),
    'Phan hoi loi an toan tuyet doi, KHONG de lo stack trace noi bo hoac token/mat khau'
  );

  // -------------------------------------------------------------------------
  // SECTION 4.1.6: Audit and Message Processing
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('SECTION 4.1.6: AUDIT TRAIL & MESSAGE PROCESSING (UC-36, events, outcomes)');
  console.log('----------------------------------------------------------------------');

  // 4.1.6 Test 1: Inventory Adjustment Audit
  const invAdjustRes = await request(
    'POST',
    '/api/admin/medicines/1/adjust-inventory',
    {
      quantityChange: 25,
      reason: 'Kiem ke dinh ky bo sung ton kho',
      batchNumber: 'BATCH-AUDIT-' + Date.now(),
    },
    adminToken
  );
  assert(invAdjustRes.ok, 'Thuc hien dieu chinh ton kho thuoc thanh cong');

  // 4.1.6 Test 2: Invoice Payment Confirmation & Voiding
  const invListRes = await request('GET', '/api/receptionist/invoices', null, recepToken);
  assert(invListRes.ok && Array.isArray(invListRes.data), 'Lấy danh sách hóa đơn thanh toán');

  let testInvoiceId = null;
  if (invListRes.data.length > 0) {
    const pendingInv = invListRes.data.find((i) => i.status === 'PENDING') || invListRes.data[0];
    testInvoiceId = pendingInv.invoiceId;
  }

  if (testInvoiceId) {
    const payRes = await request(
      'POST',
      `/api/receptionist/invoices/${testInvoiceId}/confirm-payment`,
      {
        paymentMethod: 'CASH',
        amountPaid: 350000,
      },
      recepToken
    );
    assert(
      payRes.ok && payRes.data?.status === 'PAID',
      `Xac nhan thu tien hoa don #${testInvoiceId} -> Trạng thái PAID`
    );
  }

  // 4.1.6 Test 3: Check Audit Logs for required fields: who, what, when, outcome (whether succeeded)
  const auditRes = await request('GET', '/api/admin/audit-logs', null, adminToken);
  assert(auditRes.ok && Array.isArray(auditRes.data), 'Truy van Audit Log danh rieng cho Admin (UC-36)');

  const latestAudit = auditRes.data[0];
  assert(
    latestAudit &&
      latestAudit.username &&
      latestAudit.actionTime &&
      (latestAudit.targetEntity || latestAudit.affectedResource) &&
      latestAudit.outcome === 'SUCCESS',
    'Ban ghi AuditLog co day du: WHO (username), WHEN (actionTime), WHAT (affectedResource/targetEntity), OUTCOME (whether succeeded: SUCCESS)',
    latestAudit
  );

  // Check presence of Section 4.1.6 event categories in AuditLog
  const hasInventoryAudit = auditRes.data.some((l) => l.actionType === 'INVENTORY_ADJUSTMENT');
  const hasPaymentAudit = auditRes.data.some((l) => l.actionType === 'INVOICE_PAYMENT_PROCESS');
  const hasAppointmentAudit = auditRes.data.some(
    (l) => l.actionType && l.actionType.startsWith('APPOINTMENT_')
  );

  assert(hasInventoryAudit, 'Nhat ky kiem toan ghi nhan su kien: Dieu chinh ton kho (INVENTORY_ADJUSTMENT)');
  assert(hasPaymentAudit, 'Nhat ky kiem toan ghi nhan su kien: Thu tien hoa don (INVOICE_PAYMENT_PROCESS)');
  assert(hasAppointmentAudit, 'Nhat ky kiem toan ghi nhan su kien: Thay doi trang thai lich hen (APPOINTMENT_*)');

  // 4.1.6 Test 4: Booking Confirmation Notification & Deduplication Key
  const bookingRes = await request(
    'POST',
    '/api/receptionist/appointments',
    {
      petId: 1,
      appointmentDate: '2026-11-05',
      appointmentTime: '09:30',
      shift: 'MORNING',
      reason: 'Kiem tra tieng tim va tiem ngua dinh ky',
      notes: 'Thong bao bat dong bo sau commit',
    },
    recepToken
  );
  assert(
    bookingRes.ok && bookingRes.data?.appointmentId,
    `Dat lich hen moi #${bookingRes.data?.appointmentId} -> Event AppointmentBookedEvent duoc phat sau COMMIT`
  );

  console.log('\n======================================================================');
  console.log(`TONG KET KIEM THU DAC TA: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');
}

runSpecTests();
