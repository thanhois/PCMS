import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import ownerApi from '../../api/ownerApi';
import { useDialog } from '../../context/DialogContext';
import '../../styles/petOwnerInvoice.css';

export default function PetOwnerInvoicesPage() {
  const navigate = useNavigate();
  const dialog = useDialog();

  // =========================
  // 1. STATE
  // =========================
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER'); // 'BANK_TRANSFER' | 'CARD'
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  // Card form mock state
  const [cardForm, setCardForm] = useState({
    cardNumber: '4000 1234 5678 9010',
    cardHolder: 'LE HOANG NAM',
    expiry: '12/28',
    cvv: '123',
  });

  // =========================
  // 2. LOAD INVOICES
  // =========================
  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ownerApi.getMyInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải hóa đơn:', err);
      setError('Không thể tải danh sách hóa đơn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadInvoices);
  }, []);

  // =========================
  // 3. FORMAT HELPERS
  // =========================
  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString('vi-VN') + ' ₫';

  const formatDate = (date) =>
    date ? new Date(date).toLocaleString('vi-VN') : '—';

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID':
        return '✓ Đã thanh toán';
      case 'PENDING':
        return '⏳ Chờ thanh toán';
      case 'VOID':
        return '✕ Đã hủy';
      default:
        return status || 'Không xác định';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PAID':
        return 'paid';
      case 'PENDING':
        return 'pending';
      case 'VOID':
        return 'void';
      default:
        return 'unknown';
    }
  };

  // =========================
  // 4. STATISTICS
  // =========================
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((i) => i.status === 'PAID').length;
  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING').length;
  const voidInvoices = invoices.filter((i) => i.status === 'VOID').length;

  // =========================
  // 5. SEARCH & FILTER
  // =========================
  const filteredInvoices = invoices.filter((invoice) => {
    const keyword = searchTerm.trim().toLowerCase();
    const matchesKeyword =
      !keyword ||
      String(invoice.invoiceId).includes(keyword) ||
      (invoice.petName || '').toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === 'ALL' || invoice.status === statusFilter;

    return matchesKeyword && matchesStatus;
  });

  // =========================
  // 6. PAYMENT HANDLERS
  // =========================
  const handleOpenPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentMethod('BANK_TRANSFER');
  };

  const handleCopy = (text, fieldName) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    try {
      setPaymentLoading(true);
      const payload = {
        paymentMethod: paymentMethod, // 'BANK_TRANSFER' or 'CARD'
        mockResult: 'SUCCESS',
      };

      await ownerApi.payMyInvoice(selectedInvoice.invoiceId, payload);

      setToastMessage({
        type: 'success',
        text: `Thanh toán thành công hóa đơn #${selectedInvoice.invoiceId} (${formatMoney(selectedInvoice.totalAmount)})!`,
      });
      setSelectedInvoice(null);
      await loadInvoices();
    } catch (err) {
      console.error('Lỗi thanh toán:', err);
      dialog.alert({
        title: 'Thanh toán thất bại',
        message: err.response?.data?.message || err.message || 'Thanh toán thất bại, vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Bank transfer info for VietQR
  const bankInfo = {
    bankName: 'MB Bank (Ngân hàng TMCP Quân Đội)',
    accountNumber: '0912000001',
    accountName: 'PHONG KHAM THU Y PCMS',
    transferContent: selectedInvoice ? `PCMS INV-${selectedInvoice.invoiceId}` : '',
  };

  const qrPayload = selectedInvoice
    ? `https://img.vietqr.io/image/MB-0912000001-compact.png?amount=${selectedInvoice.totalAmount}&addInfo=${encodeURIComponent(bankInfo.transferContent)}&accountName=${encodeURIComponent(bankInfo.accountName)}`
    : '';

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

      {/* Page Header */}
      <div className="owner-invoices-header">
        <div>
          <h1 className="owner-invoices-title">Hóa đơn của tôi</h1>
          <p className="owner-invoices-subtitle">
            Theo dõi viện phí, lịch sử dịch vụ và tiến hành thanh toán trực tuyến nhanh chóng.
          </p>
        </div>

        <button
          type="button"
          className="owner-invoices-refresh"
          onClick={loadInvoices}
          disabled={loading}
        >
          <span>🔄</span>
          <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
        </button>
      </div>

      {/* Statistics Cards (Harmonized with PetOwnerHomePage) */}
      <div className="owner-invoices-stats">
        <div className="owner-invoices-stat-card">
          <div className="owner-invoices-stat-icon">📋</div>
          <p>Tổng số hóa đơn</p>
          <h2>{totalInvoices}</h2>
        </div>

        <div className="owner-invoices-stat-card paid">
          <div className="owner-invoices-stat-icon">✓</div>
          <p>Đã thanh toán</p>
          <h2>{paidInvoices}</h2>
        </div>

        <div className="owner-invoices-stat-card pending">
          <div className="owner-invoices-stat-icon">⏳</div>
          <p>Chờ thanh toán</p>
          <h2>{pendingInvoices}</h2>
        </div>

        <div className="owner-invoices-stat-card void">
          <div className="owner-invoices-stat-icon">✕</div>
          <p>Đã hủy</p>
          <h2>{voidInvoices}</h2>
        </div>
      </div>

      {/* Main Invoices Card */}
      <div className="owner-invoices-card">
        {/* Card Heading */}
        <div className="owner-invoices-card-header">
          <div>
            <h2>Danh sách hóa đơn</h2>
            <p>Toàn bộ hóa đơn dịch vụ khám chữa bệnh của các bé thú cưng.</p>
          </div>

          <span className="owner-invoices-result-count">
            {filteredInvoices.length} hóa đơn
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="owner-invoices-toolbar">
          <div className="owner-invoices-search">
            <span className="owner-invoices-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo mã hóa đơn hoặc tên thú cưng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="owner-invoices-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">⏳ Chờ thanh toán</option>
            <option value="PAID">✓ Đã thanh toán</option>
            <option value="VOID">✕ Đã hủy</option>
          </select>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="owner-invoices-loading">
            Đang tải danh sách hóa đơn từ hệ thống...
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 28, textAlign: 'center', color: '#c0392b' }}>
            <p style={{ fontWeight: 600 }}>{error}</p>
            <button
              type="button"
              className="owner-invoices-refresh"
              onClick={loadInvoices}
              style={{ marginTop: 10 }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Invoices Table */}
        {!loading && !error && (
          <div className="owner-invoices-table-wrapper">
            <table className="owner-invoices-table">
              <thead>
                <tr>
                  <th>Mã hóa đơn</th>
                  <th>Thú cưng</th>
                  <th>Ngày lập</th>
                  <th>Tổng tiền</th>
                  <th>Giảm giá</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="owner-invoices-empty-row">
                      Không tìm thấy hóa đơn nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const isPending = invoice.status === 'PENDING';
                    const isPaid = invoice.status === 'PAID';

                    return (
                      <tr key={invoice.invoiceId}>
                        <td>
                          <button
                            type="button"
                            className="owner-invoices-detail-btn"
                            onClick={() => navigate(`/owner/invoices/${invoice.invoiceId}`)}
                            title="Xem chi tiết hóa đơn"
                          >
                            #{invoice.invoiceId} ›
                          </button>
                        </td>

                        <td>
                          <strong style={{ color: '#1b3534' }}>
                            {invoice.petName || '—'}
                          </strong>
                        </td>

                        <td>{formatDate(invoice.invoiceDate)}</td>

                        <td>
                          <strong style={{ color: '#087f75', fontSize: 14 }}>
                            {formatMoney(invoice.totalAmount)}
                          </strong>
                        </td>

                        <td>{formatMoney(invoice.discountAmount)}</td>

                        <td>
                          <span className={`owner-invoices-status ${getStatusClass(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            {isPending && (
                              <button
                                type="button"
                                className="pet-owner-pay-btn"
                                onClick={() => handleOpenPayment(invoice)}
                              >
                                <span>💳</span>
                                <span>Thanh toán ngay</span>
                              </button>
                            )}

                            {isPaid && (
                              <button
                                type="button"
                                className="pet-owner-view-btn"
                                onClick={() => navigate(`/owner/invoices/${invoice.invoiceId}`)}
                              >
                                <span>📄</span>
                                <span>Xem biên lai</span>
                              </button>
                            )}

                            {invoice.status === 'VOID' && (
                              <span style={{ fontSize: 13, color: '#94a3b8' }}>Đã hủy</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================
          PAYMENT MODAL (Online QR & Card Gateway)
          ========================================================= */}
      {selectedInvoice && (
        <div className="pay-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="pay-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="pay-modal-header">
              <div>
                <h3 className="pay-modal-title">
                  Thanh toán Hóa đơn #{selectedInvoice.invoiceId}
                </h3>
                <p className="pay-modal-subtitle">
                  Thú cưng: <strong>{selectedInvoice.petName || 'Bé cưng'}</strong> • Ngày lập: {formatDate(selectedInvoice.invoiceDate)}
                </p>
              </div>

              <button
                type="button"
                className="pay-modal-close"
                onClick={() => setSelectedInvoice(null)}
              >
                ✕
              </button>
            </div>

            <div className="pay-modal-body">
              {/* Highlight Amount */}
              <div className="pay-amount-box">
                <span className="pay-amount-label">Tổng tiền cần thanh toán:</span>
                <span className="pay-amount-value">{formatMoney(selectedInvoice.totalAmount)}</span>
              </div>

              {/* Payment Method Selector */}
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

              {/* Tab 1: VietQR / Bank Transfer */}
              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="pay-qr-container">
                  <div className="pay-qr-box">
                    <QRCodeSVG
                      value={qrPayload || `https://pcms.vn/pay/${selectedInvoice.invoiceId}`}
                      size={170}
                      level="M"
                      includeMargin
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#087f75', fontWeight: 700, marginBottom: 14 }}>
                    Quét mã QR bằng App Ngân hàng hoặc Ví MoMo / VNPay
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
                          {copiedField === 'acc' ? 'Đã sao chép!' : 'Sao chép'}
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
                        {formatMoney(selectedInvoice.totalAmount)}
                      </span>
                    </div>

                    <div className="pay-bank-row">
                      <span className="pay-bank-label">Nội dung chuyển khoản:</span>
                      <span className="pay-bank-val">
                        <code>{bankInfo.transferContent}</code>
                        <button
                          type="button"
                          className="pay-copy-btn"
                          onClick={() => handleCopy(bankInfo.transferContent, 'content')}
                        >
                          {copiedField === 'content' ? 'Đã sao chép!' : 'Sao chép'}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Online Card Gateway */}
              {paymentMethod === 'CARD' && (
                <div className="pay-card-form">
                  <div className="pay-input-group">
                    <label>Số thẻ thanh toán (Demo Mock Gateway):</label>
                    <input
                      type="text"
                      value={cardForm.cardNumber}
                      onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                      placeholder="4000 1234 5678 9010"
                    />
                  </div>

                  <div className="pay-input-group">
                    <label>Tên in trên thẻ:</label>
                    <input
                      type="text"
                      value={cardForm.cardHolder}
                      onChange={(e) => setCardForm({ ...cardForm, cardHolder: e.target.value.toUpperCase() })}
                      placeholder="LE HOANG NAM"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="pay-input-group">
                      <label>Ngày hết hạn (MM/YY):</label>
                      <input
                        type="text"
                        value={cardForm.expiry}
                        onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                        placeholder="12/28"
                      />
                    </div>
                    <div className="pay-input-group">
                      <label>Mã bảo mật CVV:</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: 8 }}>
                    💡 Cổng thanh toán thẻ kết nối Mock Payment Gateway an toàn. Giao dịch được tự động đối soát và trừ kho dược phẩm FEFO ngay lập tức.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pay-modal-footer">
              <button
                type="button"
                className="pay-btn-cancel"
                onClick={() => setSelectedInvoice(null)}
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
                {paymentLoading ? (
                  'Đang xử lý giao dịch...'
                ) : paymentMethod === 'BANK_TRANSFER' ? (
                  '✓ Tôi đã chuyển khoản thành công'
                ) : (
                  `🔒 Xác nhận thanh toán ${formatMoney(selectedInvoice.totalAmount)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
