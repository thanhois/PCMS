
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import billingApi from '../../api/billingApi';
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

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

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

      // Hỗ trợ trường hợp Backend trả kèm danh sách payments.
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
    loadInvoice();
  }, [invoiceId]);

  const totalAmount = Number(invoice?.totalAmount || 0);
  const discountAmount = Number(invoice?.discountAmount || 0);
  const amountDue = Math.max(totalAmount - discountAmount, 0);

  const isPending = invoice?.status === 'PENDING';
  const demoQrValue =
  `PCMS-DEMO|INVOICE=${invoiceId}|AMOUNT=${Math.round(amountDue)}|CURRENCY=VND`;
  const paymentHistory = useMemo(() => {
    return [...payments].sort((a, b) => {
      return new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0);
    });
  }, [payments]);

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
    : `Xác nhận thanh toán hóa đơn HD-${invoiceId} với số tiền ${formatVnd(amountDue)}?`;

  if (!window.confirm(confirmationMessage)) {
    return;
  }

  setSubmitting(true);
  setError('');
  setSuccess('');

  try {
    const paymentPayload = { paymentMethod };

    if (paymentMethod === 'BANK_TRANSFER') {
      // Nguoi dung chu dong xac nhan giao dich chuyen khoan demo
      paymentPayload.mockResult = 'SUCCESS';
    } else if (paymentMethod !== 'CARD') {
      paymentPayload.mockResult = mockResult;
    }

    await billingApi.confirmPayment(invoiceId, paymentPayload);

    if (paymentMethod === 'CARD') {
      setSuccess('Thanh toán thẻ thành công qua Mock Payment Gateway.');
    } else if (paymentMethod === 'BANK_TRANSFER') {
      setSuccess('Thanh toán chuyển khoản DEMO thành công.');
    } else {
      setSuccess('Thanh toán thành công.');
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
      `Bạn có chắc chắn muốn hủy hóa đơn HD-${invoiceId}?`
    )) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await billingApi.voidInvoice(invoiceId, { reason });

      setSuccess('Hủy hóa đơn thành công.');
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
      <div>
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
      <div>
        <PageHeader
          title="Chi tiết hóa đơn"
          subtitle={`Mã hóa đơn: HD-${invoiceId}`}
        />

        {error && (
          <div className="pcms-alert pcms-alert-danger" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          className="pcms-btn pcms-btn-secondary"
          onClick={() => navigate('/admin/billing')}
        >
          ← Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Hóa đơn HD-${invoice.invoiceId}`}
        subtitle="Thông tin chi tiết và xử lý thanh toán hóa đơn."
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-secondary"
            onClick={() => navigate('/admin/billing')}
          >
            ← Danh sách hóa đơn
          </button>
        }
      />

      {error && (
        <div className="pcms-alert pcms-alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="pcms-alert pcms-alert-success" role="status">
          {success}
        </div>
      )}

      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Thông tin hóa đơn</h2>
            <p style={{ color: 'var(--pcms-text-muted)', marginBottom: 0 }}>
              Mã hóa đơn: HD-{invoice.invoiceId}
            </p>
          </div>

          <StatusBadge status={invoice.status} />
        </div>

        <div className="pcms-form-grid">
          <div className="pcms-field">
            <label className="pcms-label">Mã hồ sơ khám</label>
            <div>{invoice.recordId ?? '—'}</div>
          </div>

          <div className="pcms-field">
            <label className="pcms-label">Tên thú cưng</label>
            <div>{invoice.petName || '—'}</div>
          </div>

          <div className="pcms-field">
            <label className="pcms-label">Chủ thú cưng</label>
            <div>{invoice.ownerName || '—'}</div>
          </div>

          <div className="pcms-field">
            <label className="pcms-label">Ngày lập hóa đơn</label>
            <div>{formatDate(invoice.invoiceDate)}</div>
          </div>
        </div>
      </div>

      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Tổng kết thanh toán</h2>

        <div className="pcms-form-grid">
          <div className="pcms-field">
            <label className="pcms-label">Tổng tiền dịch vụ và thuốc</label>
            <strong>{formatVnd(totalAmount)}</strong>
          </div>

          <div className="pcms-field">
            <label className="pcms-label">Số tiền giảm giá</label>
            <strong>{formatVnd(discountAmount)}</strong>
          </div>

          <div className="pcms-field">
            <label className="pcms-label">Cần thanh toán</label>
            <strong style={{ fontSize: 22 }}>
              {formatVnd(amountDue)}
            </strong>
          </div>
        </div>
      </div>

      {isPending && (
        <>
          <div className="pcms-card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0 }}>Cập nhật giảm giá</h2>

            <form onSubmit={handleUpdateDiscount}>
              <div className="pcms-field">
                <label className="pcms-label">
                  Số tiền giảm giá (VNĐ)
                </label>

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

                <small>
                  Số tiền giảm giá không được vượt quá tổng hóa đơn.
                </small>
              </div>

              <div className="pcms-modal-actions">
                <button
                  type="submit"
                  className="pcms-btn pcms-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : 'Cập nhật giảm giá'}
                </button>
              </div>
            </form>
          </div>

          <div className="pcms-card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0 }}>Xác nhận thanh toán</h2>

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
    <small>
      Giao dịch được xử lý tự động bởi Mock Payment Gateway.
      Kết quả thành công hoặc thất bại do Backend mô phỏng.
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
      borderRadius: 8
    }}
  >
    <div
      style={{
        fontWeight: 'bold',
        color: '#b45309',
        marginBottom: 12
      }}
    >
      DEMO – NOT FOR REAL PAYMENT
    </div>

    <p>
      Mã QR dưới đây chỉ phục vụ trình diễn chức năng
      chuyển khoản của PCMS.
    </p>

    <div style={{ margin: '20px auto' }}>
      <QRCodeSVG
        value={demoQrValue}
        size={220}
        level="M"
        includeMargin
      />
    </div>

    <div style={{ marginBottom: 8 }}>
      <strong>Hóa đơn:</strong> HD-{invoiceId}
    </div>

    <div style={{ marginBottom: 8 }}>
      <strong>Số tiền:</strong> {formatVnd(amountDue)}
    </div>

    <div style={{ marginBottom: 12 }}>
      <strong>Nội dung demo:</strong>
      <div
        style={{
          marginTop: 6,
          padding: 10,
          background: '#f5f5f5',
          borderRadius: 6,
          wordBreak: 'break-all'
        }}
      >
        {demoQrValue}
      </div>
    </div>

    <small style={{ color: '#b45309' }}>
      QR này không liên kết ngân hàng, không tạo giao dịch
      và không thể dùng để chuyển tiền thật.
    </small>
  </div>
) : (
  <div className="pcms-field">
    <label className="pcms-label">
      Kết quả giao dịch mô phỏng
    </label>

    <select
      className="pcms-select"
      value={mockResult}
      onChange={(e) => setMockResult(e.target.value)}
    >
      <option value="SUCCESS">Thành công</option>
      <option value="FAILED">Thất bại</option>
    </select>

    <small>
      Đây là kết quả giao dịch mô phỏng, chưa kết nối
      cổng thanh toán thật.
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
                <span style={{ color: 'var(--pcms-text-muted)' }}>
                  Số tiền thanh toán:
                </span>
                <strong style={{ display: 'block', fontSize: 22 }}>
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

          <div className="pcms-card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0 }}>Hủy hóa đơn</h2>

            <div className="pcms-field">
              <label className="pcms-label">Lý do hủy *</label>

              <textarea
                className="pcms-input"
                rows="3"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Nhập lý do hủy hóa đơn..."
              />
            </div>

            <div className="pcms-modal-actions">
              <button
                type="button"
                className="pcms-btn pcms-btn-danger"
                onClick={handleVoidInvoice}
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Hủy hóa đơn'}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="pcms-card">
        <h2 style={{ marginTop: 0 }}>Lịch sử thanh toán</h2>

        {paymentHistory.length === 0 ? (
          <p style={{ color: 'var(--pcms-text-muted)' }}>
            Backend hiện chưa trả về danh sách giao dịch thanh toán cho hóa đơn này.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pcms-table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Ngày thanh toán</th>
                  <th>Phương thức</th>
                  <th style={{ textAlign: 'right' }}>Số tiền</th>
                </tr>
              </thead>

              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.paymentId}>
                    <td>{payment.paymentId}</td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>{payment.paymentMethod || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
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
