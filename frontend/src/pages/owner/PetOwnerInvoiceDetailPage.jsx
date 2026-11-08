import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import ownerApi from '../../api/ownerApi';
import { useDialog } from '../../context/DialogContext';
import '../../styles/petOwnerInvoice.css';

export default function PetOwnerInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const dialog = useDialog();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const [cardForm, setCardForm] = useState({
    cardNumber: '4000 1234 5678 9010',
    cardHolder: 'LE HOANG NAM',
    expiry: '12/28',
    cvv: '123',
  });

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ownerApi.getMyInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error('Lỗi tải chi tiết hóa đơn:', err);
      setError(err.message || 'Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadInvoice);
  }, [invoiceId]);

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString('vi-VN') + ' ₫';

  const formatDate = (date) =>
    date ? new Date(date).toLocaleString('vi-VN') : '—';

  const handleCopy = (text, fieldName) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  const handleConfirmPayment = async () => {
    if (!invoice) return;
    try {
      setPaymentLoading(true);
      await ownerApi.payMyInvoice(invoice.invoiceId, {
        paymentMethod,
        mockResult: 'SUCCESS',
      });
      setToastMessage({
        type: 'success',
        text: `Thanh toán thành công hóa đơn #${invoice.invoiceId} (${formatMoney(invoice.totalAmount)})!`,
      });
      setShowPayModal(false);
      await loadInvoice();
    } catch (err) {
      console.error('Lỗi thanh toán:', err);
      dialog.alert({
        title: 'Thanh toán thất bại',
        message: err.response?.data?.message || err.message || 'Thanh toán thất bại.',
        type: 'error',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="owner-invoices-loading" style={{ padding: 60 }}>
        Đang tải chi tiết hóa đơn #{invoiceId}...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="owner-invoice-detail-card" style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#c0392b' }}>Không tìm thấy hóa đơn</h2>
        <p style={{ color: '#64748b' }}>{error || 'Hóa đơn không tồn tại hoặc bạn không có quyền xem.'}</p>
        <button
          type="button"
          className="pet-owner-view-btn"
          onClick={() => navigate('/owner/invoices')}
          style={{ marginTop: 12 }}
        >
          ← Quay lại danh sách hóa đơn
        </button>
      </div>
    );
  }

  const isPending = invoice.status === 'PENDING';
  const isPaid = invoice.status === 'PAID';
  const payments = invoice.payments || [];
  const services = invoice.serviceItems || [];
  const medicines = invoice.medicineItems || [];

  const bankInfo = {
    bankName: 'MB Bank (Ngân hàng TMCP Quân Đội)',
    accountNumber: '0912000001',
    accountName: 'PHONG KHAM THU Y PCMS',
    transferContent: `PCMS INV-${invoice.invoiceId}`,
  };

  const qrPayload = `https://img.vietqr.io/image/MB-0912000001-compact.png?amount=${invoice.totalAmount}&addInfo=${encodeURIComponent(bankInfo.transferContent)}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  return (
    <div className="pet-owner-invoices">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 99999,
            background: 'linear-gradient(135deg, #087f75 0%, #0d9488 100%)',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(8, 127, 117, 0.35)',
            fontWeight: 700,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: 16,
              cursor: 'pointer',
              marginLeft: 10,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          type="button"
          className="pet-owner-view-btn"
          onClick={() => navigate('/owner/invoices')}
        >
          ← Quay lại danh sách hóa đơn
        </button>

        {isPending && (
          <button
            type="button"
            className="pet-owner-pay-btn"
            style={{ padding: '9px 22px', fontSize: 14 }}
            onClick={() => setShowPayModal(true)}
          >
            <span>💳</span>
            <span>Thanh toán ngay</span>
          </button>
        )}
      </div>

      {/* Status banner */}
      {isPending && (
        <div className="owner-invoice-alert pending">
          <div>
            <strong>⏳ Hóa đơn đang chờ thanh toán</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13.5 }}>
              Quý khách có thể quét mã QR ngân hàng hoặc thanh toán thẻ trực tuyến ngay tại đây để hoàn tất dịch vụ.
            </p>
          </div>
          <button
            type="button"
            className="pet-owner-pay-btn"
            onClick={() => setShowPayModal(true)}
          >
            Thanh toán ngay
          </button>
        </div>
      )}

      {isPaid && (
        <div className="owner-invoice-alert paid">
          <div>
            <strong>✓ Hóa đơn đã được thanh toán hoàn tất</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13.5 }}>
              Biên lai thanh toán điện tử đã được lưu trữ an toàn trong hồ sơ của thú cưng.
            </p>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Đã thanh toán: {formatMoney(invoice.totalAmount)}
          </span>
        </div>
      )}

      {/* Detail Card */}
      <div className="owner-invoice-detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #edf4f2', paddingBottom: 20, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#1b3534' }}>
              Hóa đơn dịch vụ #{invoice.invoiceId}
            </h1>
            <p style={{ margin: 0, color: '#718181', fontSize: 14 }}>
              Ngày lập: {formatDate(invoice.invoiceDate)}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12.5, color: '#718181', marginBottom: 4 }}>Tổng cộng</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#087f75' }}>
              {formatMoney(invoice.totalAmount)}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 28, background: '#fbfdfc', padding: 20, borderRadius: 12, border: '1px solid #e5eeec' }}>
          <div>
            <span style={{ fontSize: 12, color: '#718181', display: 'block', marginBottom: 4 }}>THÚ CƯNG</span>
            <strong style={{ fontSize: 15, color: '#1b3534' }}>{invoice.petName || '—'}</strong>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#718181', display: 'block', marginBottom: 4 }}>CHỦ THÚ CƯNG</span>
            <strong style={{ fontSize: 15, color: '#1b3534' }}>{invoice.ownerName || 'Lê Hoàng Nam'}</strong>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#718181', display: 'block', marginBottom: 4 }}>HỒ SƠ KHÁM</span>
            <strong style={{ fontSize: 15, color: '#087f75' }}>
              {invoice.recordId ? `#MR-${invoice.recordId}` : '—'}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#718181', display: 'block', marginBottom: 4 }}>TRẠNG THÁI</span>
            <span className={`owner-invoices-status ${invoice.status === 'PAID' ? 'paid' : invoice.status === 'PENDING' ? 'pending' : 'void'}`}>
              {invoice.status === 'PAID' ? '✓ Đã thanh toán' : invoice.status === 'PENDING' ? '⏳ Chờ thanh toán' : '✕ Đã hủy'}
            </span>
          </div>
        </div>

        {/* Service items */}
        {services.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <h3 style={{ fontSize: 16, fontWeight: 750, color: '#1b3534', marginBottom: 12 }}>
              Dịch vụ khám & Cận lâm sàng
            </h3>
            <table className="owner-invoices-table" style={{ border: '1px solid #edf4f2', borderRadius: 8 }}>
              <thead>
                <tr>
                  <th>Tên dịch vụ</th>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.serviceName}</td>
                    <td style={{ textAlign: 'center' }}>{s.quantity || 1}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(s.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(s.subTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Medicine items */}
        {medicines.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <h3 style={{ fontSize: 16, fontWeight: 750, color: '#1b3534', marginBottom: 12 }}>
              Đơn thuốc & Dược phẩm
            </h3>
            <table className="owner-invoices-table" style={{ border: '1px solid #edf4f2', borderRadius: 8 }}>
              <thead>
                <tr>
                  <th>Tên thuốc</th>
                  <th style={{ textAlign: 'center' }}>Đơn vị</th>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.medicineName}</td>
                    <td style={{ textAlign: 'center' }}>{m.unit}</td>
                    <td style={{ textAlign: 'center' }}>{m.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(m.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(m.subTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment history */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 750, color: '#1b3534', marginBottom: 12 }}>
            Lịch sử giao dịch thanh toán
          </h3>
          {payments.length === 0 ? (
            <div style={{ padding: 18, background: '#fbfdfc', borderRadius: 8, color: '#718181', fontSize: 13.5, border: '1px dashed #d7e5e2' }}>
              Chưa có giao dịch thanh toán nào được ghi nhận cho hóa đơn này.
            </div>
          ) : (
            <table className="owner-invoices-table" style={{ border: '1px solid #edf4f2', borderRadius: 8 }}>
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Thời gian</th>
                  <th>Phương thức</th>
                  <th style={{ textAlign: 'right' }}>Số tiền đã thu</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.paymentId}>
                    <td><strong>#PAY-{p.paymentId}</strong></td>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td>
                      <span style={{ padding: '3px 9px', borderRadius: 6, background: '#edf7f5', color: '#087f75', fontWeight: 600, fontSize: 12 }}>
                        {p.paymentMethod === 'CARD' ? 'Thẻ Quốc tế / ATM' : p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản QR' : 'Tiền mặt'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#087f75' }}>
                      {formatMoney(p.amountPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="pay-modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="pay-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pay-modal-header">
              <div>
                <h3 className="pay-modal-title">Thanh toán Hóa đơn #{invoice.invoiceId}</h3>
                <p className="pay-modal-subtitle">Bé: {invoice.petName || 'Thú cưng'}</p>
              </div>
              <button
                type="button"
                className="pay-modal-close"
                onClick={() => setShowPayModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="pay-modal-body">
              <div className="pay-amount-box">
                <span className="pay-amount-label">Số tiền thanh toán:</span>
                <span className="pay-amount-value">{formatMoney(invoice.totalAmount)}</span>
              </div>

              <div className="pay-method-tabs">
                <button
                  type="button"
                  className={`pay-method-tab ${paymentMethod === 'BANK_TRANSFER' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                >
                  <span>📱</span>
                  <span>Quét mã VietQR / Ngân hàng</span>
                </button>
                <button
                  type="button"
                  className={`pay-method-tab ${paymentMethod === 'CARD' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('CARD')}
                >
                  <span>💳</span>
                  <span>Thẻ Visa / Master / ATM</span>
                </button>
              </div>

              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="pay-qr-container">
                  <div className="pay-qr-box">
                    <QRCodeSVG
                      value={qrPayload}
                      size={170}
                      level="M"
                      includeMargin
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#087f75', fontWeight: 700, marginBottom: 14 }}>
                    Quét mã QR bằng App Ngân hàng hoặc Ví điện tử
                  </div>

                  <div className="pay-bank-details">
                    <div className="pay-bank-row">
                      <span className="pay-bank-label">Ngân hàng:</span>
                      <span className="pay-bank-val">{bankInfo.bankName}</span>
                    </div>
                    <div className="pay-bank-row">
                      <span className="pay-bank-label">Số tài khoản:</span>
                      <span className="pay-bank-val">
                        <code>{bankInfo.accountNumber}</code>
                        <button
                          type="button"
                          className="pay-copy-btn"
                          onClick={() => handleCopy(bankInfo.accountNumber, 'acc')}
                        >
                          {copiedField === 'acc' ? 'Đã chép!' : 'Sao chép'}
                        </button>
                      </span>
                    </div>
                    <div className="pay-bank-row">
                      <span className="pay-bank-label">Chủ tài khoản:</span>
                      <span className="pay-bank-val">{bankInfo.accountName}</span>
                    </div>
                    <div className="pay-bank-row">
                      <span className="pay-bank-label">Số tiền:</span>
                      <span className="pay-bank-val" style={{ color: '#087f75' }}>
                        {formatMoney(invoice.totalAmount)}
                      </span>
                    </div>
                    <div className="pay-bank-row">
                      <span className="pay-bank-label">Nội dung CK:</span>
                      <span className="pay-bank-val">
                        <code>{bankInfo.transferContent}</code>
                        <button
                          type="button"
                          className="pay-copy-btn"
                          onClick={() => handleCopy(bankInfo.transferContent, 'content')}
                        >
                          {copiedField === 'content' ? 'Đã chép!' : 'Sao chép'}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="pay-card-form">
                  <div className="pay-input-group">
                    <label>Số thẻ thanh toán (Demo Mock Gateway):</label>
                    <input
                      type="text"
                      value={cardForm.cardNumber}
                      onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                    />
                  </div>
                  <div className="pay-input-group">
                    <label>Tên in trên thẻ:</label>
                    <input
                      type="text"
                      value={cardForm.cardHolder}
                      onChange={(e) => setCardForm({ ...cardForm, cardHolder: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="pay-input-group">
                      <label>Ngày hết hạn (MM/YY):</label>
                      <input
                        type="text"
                        value={cardForm.expiry}
                        onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                      />
                    </div>
                    <div className="pay-input-group">
                      <label>CVV:</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pay-modal-footer">
              <button
                type="button"
                className="pay-btn-cancel"
                onClick={() => setShowPayModal(false)}
                disabled={paymentLoading}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="pay-btn-submit"
                onClick={handleConfirmPayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Đang xử lý...' : paymentMethod === 'BANK_TRANSFER' ? '✓ Tôi đã chuyển khoản thành công' : '🔒 Xác nhận thanh toán'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
