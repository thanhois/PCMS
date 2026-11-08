import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import billingApi from '../../api/billingApi';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';

const formatVnd = (value) => {
  return Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const formatPaymentMethod = (method) => {
  switch ((method || '').toUpperCase()) {
    case 'CASH':
      return 'Tiền mặt';
    case 'CARD':
      return 'Thẻ ngân hàng';
    case 'BANK_TRANSFER':
      return 'Chuyển khoản ngân hàng';
    default:
      return method || '—';
  }
};

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const billingPrefix = location.pathname.startsWith('/admin')
    ? '/admin/billing'
    : location.pathname.startsWith('/receptionist')
    ? '/receptionist/billing'
    : '/billing';

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [mockResult, setMockResult] = useState('SUCCESS');
  const [voidReason, setVoidReason] = useState('');

  const loadInvoice = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await billingApi.getInvoiceById(invoiceId);
      const data = response?.data;

      if (!data) {
        setInvoice(null);
        setPayments([]);
        setError('Không tìm thấy thông tin hóa đơn.');
        return;
      }

      setInvoice(data);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setDiscountInput(String(data.discountAmount ?? 0));
    } catch (err) {
      setInvoice(null);
      setError(err?.message || 'Không thể tải thông tin hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadInvoice);
  }, [invoiceId]);

  const totalAmount = Number(invoice?.totalAmount || 0);
  const discountAmount = Number(invoice?.discountAmount || 0);
  const amountDue = Math.max(totalAmount - discountAmount, 0);

  const isPending = invoice?.status === 'PENDING';
  const isPaid = invoice?.status === 'PAID';
  const isVoid = invoice?.status === 'VOID';

  const serviceItems = Array.isArray(invoice?.serviceItems) ? invoice.serviceItems : [];
  const medicineItems = Array.isArray(invoice?.medicineItems) ? invoice.medicineItems : [];

  const demoQrValue =
    `PCMS-DEMO|INVOICE=${invoiceId}|AMOUNT=${Math.round(amountDue)}|CURRENCY=VND`;
  const paymentHistory = useMemo(() => {
    return [...payments].sort((a, b) => {
      return new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0);
    });
  }, [payments]);

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleUpdateDiscount = async (e) => {
    e.preventDefault();

    const discount = Number(discountInput);

    if (
      discountInput.trim() === '' ||
      !Number.isFinite(discount) ||
      discount < 0
    ) {
      setError('Số tiền giảm giá phải là số không âm hợp lệ.');
      return;
    }

    if (discount > totalAmount) {
      setError('Số tiền giảm giá không được lớn hơn tổng hóa đơn.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await billingApi.updateInvoice(invoiceId, {
        discountAmount: discount,
      });

      setSuccess('Cập nhật giảm giá thành công.');
      await loadInvoice();
    } catch (err) {
      setError(err?.message || 'Không thể cập nhật giảm giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    const isDemoBankTransfer = paymentMethod === 'BANK_TRANSFER';

    const confirmationMessage = isDemoBankTransfer
      ? `Xác nhận thanh toán CHUYỂN KHOẢN DEMO cho hóa đơn HD-${invoiceId} với số tiền ${formatVnd(amountDue)}?\n\nĐây chỉ là giao dịch mô phỏng, không có tiền thật được chuyển.`
      : `Xác nhận thanh toán hóa đơn HD-${invoiceId} với số tiền ${formatVnd(amountDue)}? Hệ thống sẽ tự động trừ tồn kho thuốc theo nguyên tắc FEFO.`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const paymentPayload = { paymentMethod };

      if (paymentMethod === 'BANK_TRANSFER') {
        paymentPayload.mockResult = 'SUCCESS';
      } else if (paymentMethod !== 'CARD') {
        paymentPayload.mockResult = mockResult;
      }

      await billingApi.confirmPayment(invoiceId, paymentPayload);

      if (paymentMethod === 'CARD') {
        setSuccess('Thanh toán thẻ thành công qua Mock Payment Gateway. Đã trừ kho FEFO.');
      } else if (paymentMethod === 'BANK_TRANSFER') {
        setSuccess('Thanh toán chuyển khoản DEMO thành công. Đã trừ kho FEFO.');
      } else {
        setSuccess('Thanh toán thành công. Đã ghi nhận giao dịch và trừ kho FEFO.');
      }

      await loadInvoice();
    } catch (err) {
      setError(err?.message || 'Không thể thực hiện thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidInvoice = async () => {
    const reason = voidReason.trim();

    if (!reason) {
      setError('Vui lòng nhập lý do hủy hóa đơn.');
      return;
    }

    if (!window.confirm(
      `Bạn có chắc chắn muốn hủy hóa đơn HD-${invoiceId}? Thao tác này không thể hoàn tác.`
    )) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await billingApi.voidInvoice(invoiceId, { reason });

      setSuccess('Hủy hóa đơn (VOID) thành công.');
      setVoidReason('');

      await loadInvoice();
    } catch (err) {
      setError(err?.message || 'Không thể hủy hóa đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div className="pcms-page">
        <PageHeader
          title="Chi tiết hóa đơn"
          subtitle="Đang tải thông tin hóa đơn..."
        />
        <div className="pcms-card">Vui lòng chờ...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="pcms-page">
        <PageHeader
          title="Chi tiết hóa đơn"
          subtitle={`Mã hóa đơn: HD-${invoiceId}`}
        />

        {error && (
          <div className="pcms-alert pcms-alert-error" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          className="pcms-btn pcms-btn-secondary"
          onClick={() => navigate(`${billingPrefix}/invoices`)}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="pcms-page">
      <div className="no-print">
        <PageHeader
          title={`Hóa đơn HD-${invoice.invoiceId}`}
          subtitle="Đối chiếu chi phí dịch vụ, đơn thuốc, xác nhận thanh toán và in biên lai viện phí."
          actions={
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="pcms-btn pcms-btn-primary"
                onClick={handlePrintReceipt}
              >
                In biên lai / Hóa đơn
              </button>
              <button
                type="button"
                className="pcms-btn pcms-btn-secondary"
                onClick={() => navigate(`${billingPrefix}/invoices`)}
              >
                ← Quản lý hóa đơn
              </button>
            </div>
          }
        />
      </div>

      {error && (
        <div className="pcms-alert pcms-alert-error no-print" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {success && (
        <div className="pcms-alert pcms-alert-success no-print" role="status" style={{ marginBottom: 16 }}>
          {success}
        </div>
      )}

      {/* Printable Official Clinic Receipt Card (UC27) */}
      <div className="pcms-card" style={{ marginBottom: 20, position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 16,
            marginBottom: 20,
            borderBottom: '2px solid var(--pcms-primary)',
          }}
        >
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--pcms-primary)' }}>
              PHÒNG KHÁM THÚ Y PCMS CLINIC
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--pcms-text-muted)', marginTop: 4 }}>
              Địa chỉ: 123 Nguyễn Văn Linh, P. Tân Phong, Quận 7, TP. Hồ Chí Minh
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--pcms-text-muted)' }}>
              Hotline: 028.1234.5678
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--pcms-text-primary)' }}>
              {isPaid ? 'BIÊN LAI THU TIỀN VIỆN PHÍ' : 'HÓA ĐƠN VIỆN PHÍ'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--pcms-text-secondary)', marginTop: 4 }}>
              Số hóa đơn: <strong>HD-{invoice.invoiceId}</strong> • Mã bệnh án: <strong>#MR-{invoice.recordId ?? '—'}</strong>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--pcms-text-muted)', marginTop: 2 }}>
              Ngày lập: {formatDate(invoice.invoiceDate)}
            </div>
            <div className="no-print" style={{ marginTop: 8 }}>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* PAID / VOID Stamp Watermark (UC27 BR-01) */}
        {(isPaid || isVoid) && (
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'flex-end' }}>
            {isPaid ? (
              <span className="pcms-paid-stamp">PAID — ĐÃ THANH TOÁN</span>
            ) : (
              <span className="pcms-void-stamp">VOID — HÓA ĐƠN ĐÃ HỦY</span>
            )}
          </div>
        )}

        {/* Owner & Pet Information */}
        <div
          className="pcms-form-grid"
          style={{
            background: 'var(--pcms-bg-subtle)',
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid var(--pcms-border-subtle)',
          }}
        >
          <div className="pcms-field">
            <label className="pcms-label">Chủ nuôi thanh toán</label>
            <div style={{ fontWeight: 700 }}>{invoice.ownerName || '—'}</div>
            {invoice.ownerPhone && (
              <div style={{ fontSize: 12.5, color: 'var(--pcms-text-muted)' }}>
                SĐT: {invoice.ownerPhone}
              </div>
            )}
            {invoice.ownerAddress && (
              <div style={{ fontSize: 12.5, color: 'var(--pcms-text-muted)' }}>
                Địa chỉ: {invoice.ownerAddress}
              </div>
            )}
          </div>

          <div className="pcms-field">
            <label className="pcms-label">Thú cưng & Bác sĩ điều trị</label>
            <div style={{ fontWeight: 700 }}>
              {invoice.petName || '—'}
              {invoice.petSpecies ? ` (${invoice.petSpecies}${invoice.petBreed ? ` - ${invoice.petBreed}` : ''})` : ''}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--pcms-text-muted)' }}>
              Bác sĩ phụ trách: {invoice.veterinarianName || '—'}
            </div>
          </div>
        </div>

        {/* Line Items Table: Services + Medicines */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, marginTop: 0, marginBottom: 10 }}>
            Chi tiết dịch vụ lâm sàng & đơn thuốc
          </h3>
          <div className="pcms-table-wrap">
            <table className="pcms-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Nội dung dịch vụ / Dược phẩm</th>
                  <th style={{ width: 90 }}>ĐVT</th>
                  <th style={{ width: 80, textAlign: 'center' }}>SL</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ width: 150, textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.length === 0 && medicineItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="pcms-empty-cell">
                      Không có dòng chi tiết dịch vụ/thuốc ghi nhận.
                    </td>
                  </tr>
                ) : (
                  <>
                    {serviceItems.map((item, idx) => (
                      <tr key={`svc-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>[Dịch vụ] {item.itemName}</div>
                          {item.notes && (
                            <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{item.notes}</div>
                          )}
                        </td>
                        <td>{item.unit}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatVnd(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatVnd(item.subTotal)}</td>
                      </tr>
                    ))}
                    {medicineItems.map((item, idx) => (
                      <tr key={`med-${idx}`}>
                        <td>{serviceItems.length + idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>[Thuốc] {item.itemName}</div>
                          {item.notes && (
                            <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{item.notes}</div>
                          )}
                        </td>
                        <td>{item.unit}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatVnd(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatVnd(item.subTotal)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 20,
            paddingTop: 14,
            borderTop: '1px solid var(--pcms-border-subtle)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--pcms-text-secondary)' }}>
            {paymentHistory.length > 0 && (
              <>
                <div>
                  Phương thức thanh toán:{' '}
                  <strong>{formatPaymentMethod(paymentHistory[0].paymentMethod)}</strong>
                </div>
                <div>
                  Thời gian thanh toán:{' '}
                  <strong>{formatDate(paymentHistory[0].paymentDate)}</strong>
                </div>
                <div>
                  Mã giao dịch: <strong>PAY-{paymentHistory[0].paymentId}</strong>
                </div>
              </>
            )}
          </div>

          <div style={{ minWidth: 280, textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13.5 }}>
              <span style={{ color: 'var(--pcms-text-muted)' }}>Tổng cộng dịch vụ & thuốc:</span>
              <strong>{formatVnd(totalAmount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
              <span style={{ color: 'var(--pcms-text-muted)' }}>Chiết khấu / Giảm giá:</span>
              <strong>- {formatVnd(discountAmount)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px dashed var(--pcms-border)',
                fontSize: 18,
                color: 'var(--pcms-primary)',
              }}
            >
              <strong>{isPaid ? 'Đã thu:' : 'Cần thanh toán:'}</strong>
              <strong>{formatVnd(amountDue)}</strong>
            </div>
          </div>
        </div>

        {/* Print signature row */}
        <div
          className="pcms-print-only"
          style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', fontSize: 13 }}>
            <div>
              <strong>Khách hàng / Chủ nuôi</strong>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: 56 }} />
              <div>{invoice.ownerName || ''}</div>
            </div>
            <div>
              <strong>Thu ngân phòng khám</strong>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>(Ký và đóng dấu xác nhận)</div>
              <div style={{ height: 56 }} />
              <div>{user?.fullName || 'Thu ngân PCMS'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Actions (Hidden when printing) */}
      {isPending && (
        <div className="no-print">
          <div className="pcms-card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Cập nhật giảm giá</h2>

            <form onSubmit={handleUpdateDiscount}>
              <div className="pcms-field" style={{ marginBottom: 14 }}>
                <label className="pcms-label">Số tiền giảm giá (VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  step="1"
                  className="pcms-input"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="Nhập số tiền giảm giá"
                />
                <small style={{ color: 'var(--pcms-text-muted)' }}>
                  Số tiền giảm giá không được vượt quá tổng hóa đơn ({formatVnd(totalAmount)}).
                </small>
              </div>

              <div className="pcms-modal-actions">
                <button
                  type="submit"
                  className="pcms-btn pcms-btn-outline"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu giảm giá'}
                </button>
              </div>
            </form>
          </div>

          <div className="pcms-card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Xác nhận thanh toán</h2>

            <div className="pcms-form-grid">
              <div className="pcms-field">
                <label className="pcms-label">Phương thức thanh toán</label>
                <select
                  className="pcms-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="CARD">Thẻ ngân hàng</option>
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                </select>
              </div>

              {paymentMethod === 'CARD' ? (
                <div className="pcms-field">
                  <label className="pcms-label">Xử lý thanh toán thẻ</label>
                  <small style={{ color: 'var(--pcms-text-muted)' }}>
                    Giao dịch được xử lý tự động bởi Mock Payment Gateway. Kết quả thành công hoặc thất bại do Backend mô phỏng.
                  </small>
                </div>
              ) : paymentMethod === 'BANK_TRANSFER' ? (
                <div
                  className="pcms-field"
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: 20,
                    border: '1px solid #f0ad4e',
                    borderRadius: 8,
                    background: '#fffdfa',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: '#b45309',
                      marginBottom: 12,
                    }}
                  >
                    DEMO – NOT FOR REAL PAYMENT
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--pcms-text-muted)' }}>
                    Mã QR dưới đây chỉ phục vụ trình diễn chức năng chuyển khoản của hệ thống PCMS.
                  </p>

                  <div style={{ margin: '16px auto', display: 'inline-block', padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <QRCodeSVG
                      value={demoQrValue}
                      size={200}
                      level="M"
                      includeMargin
                    />
                  </div>

                  <div style={{ marginBottom: 6, fontSize: 13 }}>
                    <strong>Hóa đơn:</strong> HD-{invoiceId}
                  </div>

                  <div style={{ marginBottom: 6, fontSize: 13 }}>
                    <strong>Số tiền:</strong> {formatVnd(amountDue)}
                  </div>

                  <div style={{ marginBottom: 12, fontSize: 12 }}>
                    <strong>Nội dung thanh toán:</strong>
                    <div
                      style={{
                        marginTop: 6,
                        padding: 8,
                        background: '#f8fafc',
                        borderRadius: 6,
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        fontSize: 11,
                      }}
                    >
                      {demoQrValue}
                    </div>
                  </div>

                  <small style={{ color: '#b45309', display: 'block' }}>
                    QR này không liên kết ngân hàng thật, không tạo giao dịch và không thể dùng để chuyển tiền thật.
                  </small>
                </div>
              ) : (
                <div className="pcms-field">
                  <label className="pcms-label">Kết quả giao dịch mô phỏng</label>
                  <select
                    className="pcms-select"
                    value={mockResult}
                    onChange={(e) => setMockResult(e.target.value)}
                  >
                    <option value="SUCCESS">Thành công</option>
                    <option value="FAILED">Thất bại</option>
                  </select>
                  <small style={{ color: 'var(--pcms-text-muted)' }}>
                    Mô phỏng phản hồi từ cổng thanh toán tiền mặt.
                  </small>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 20,
              }}
            >
              <div>
                <span style={{ color: 'var(--pcms-text-muted)', fontSize: 13 }}>
                  Số tiền thực thu:
                </span>
                <strong style={{ display: 'block', fontSize: 22, color: 'var(--pcms-primary)' }}>
                  {formatVnd(amountDue)}
                </strong>
              </div>

              <button
                type="button"
                className="pcms-btn pcms-btn-primary"
                onClick={handleConfirmPayment}
                disabled={submitting || amountDue <= 0}
              >
                {submitting
                  ? 'Đang xử lý...'
                  : paymentMethod === 'BANK_TRANSFER'
                    ? 'Xác nhận đã chuyển khoản (DEMO)'
                    : 'Xác nhận thanh toán'}
              </button>
            </div>
          </div>

          {/* P5.2: Void Invoice restricted strictly to ADMIN (UC25, SRS 4.2 & Table 5.2) */}
          {isAdmin && (
            <div className="pcms-card" style={{ marginBottom: 20 }}>
              <h2 style={{ marginTop: 0, fontSize: 16, color: 'var(--pcms-danger-text)' }}>
                Hủy hóa đơn sai sót (Dành cho Quản trị viên)
              </h2>

              <div className="pcms-field" style={{ marginBottom: 14 }}>
                <label className="pcms-label">Lý do hủy hóa đơn *</label>
                <textarea
                  className="pcms-textarea"
                  rows="3"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Nhập lý do hủy hóa đơn sai sót để lưu vào Nhật ký kiểm toán..."
                />
              </div>

              <div className="pcms-modal-actions">
                <button
                  type="button"
                  className="pcms-btn pcms-btn-danger"
                  onClick={handleVoidInvoice}
                  disabled={submitting}
                >
                  {submitting ? 'Đang xử lý...' : 'Hủy hóa đơn (VOID)'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment History Table */}
      <div className="pcms-card no-print">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Lịch sử giao dịch thanh toán</h2>

        {paymentHistory.length === 0 ? (
          <p style={{ color: 'var(--pcms-text-muted)', marginBottom: 0 }}>
            Chưa có giao dịch thanh toán nào được ghi nhận cho hóa đơn này.
          </p>
        ) : (
          <div className="pcms-table-wrap">
            <table className="pcms-table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Ngày thanh toán</th>
                  <th>Phương thức</th>
                  <th style={{ textAlign: 'right' }}>Số tiền đã thu</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.paymentId}>
                    <td><strong>PAY-{payment.paymentId}</strong></td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>{formatPaymentMethod(payment.paymentMethod)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatVnd(payment.amountPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
