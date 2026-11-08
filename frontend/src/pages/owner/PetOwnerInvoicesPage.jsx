
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ownerApi from '../../api/ownerApi';
import '../../styles/petOwnerInvoice.css';

export default function PetOwnerInvoicesPage() {
  const navigate = useNavigate();

  // =========================
  // 1. STATE
  // =========================
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
  // 3. FORMAT DATA
  // =========================
  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString('vi-VN') + ' ₫';

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleString('vi-VN')
      : '—';

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'VOID':
        return 'Đã hủy';
      default:
        return 'Không xác định';
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
  // 4. INVOICE STATISTICS
  // =========================
  const totalInvoices = invoices.length;

  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === 'PAID'
  ).length;

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === 'PENDING'
  ).length;

  const voidInvoices = invoices.filter(
    (invoice) => invoice.status === 'VOID'
  ).length;

  // =========================
  // 5. SEARCH & FILTER
  // =========================
  const filteredInvoices = invoices.filter((invoice) => {
    const keyword = searchTerm.trim().toLowerCase();

    const invoiceId = String(invoice.invoiceId ?? '').toLowerCase();
    const petName = String(invoice.petName || '').toLowerCase();

    const matchesSearch =
      invoiceId.includes(keyword) ||
      petName.includes(keyword);

    const matchesStatus =
      statusFilter === 'ALL' ||
      invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // =========================
  // 6. RENDER
  // =========================
  return (
    <div className="owner-invoices-page">
      <div className="owner-invoices-container">

        {/* PAGE HEADER */}
        <div className="owner-invoices-header">
          <div>
            <h1 className="owner-invoices-title">
              Hóa đơn của tôi
            </h1>

            <p className="owner-invoices-subtitle">
              Theo dõi các khoản thanh toán và lịch sử hóa đơn dịch vụ thú cưng.
            </p>
          </div>

          <button
            type="button"
            className="owner-invoices-refresh"
            onClick={loadInvoices}
            disabled={loading}
          >
            ↻ Làm mới
          </button>
        </div>

        {/* INVOICE STATISTICS */}
        <div className="owner-invoices-stats">
          <div className="owner-invoices-stat-card">
            <div className="owner-invoices-stat-icon total">
              ▤
            </div>

            <div>
              <p>Tổng hóa đơn</p>
              <h3>{totalInvoices}</h3>
            </div>
          </div>

          <div className="owner-invoices-stat-card">
            <div className="owner-invoices-stat-icon paid">
              ✓
            </div>

            <div>
              <p>Đã thanh toán</p>
              <h3>{paidInvoices}</h3>
            </div>
          </div>

          <div className="owner-invoices-stat-card">
            <div className="owner-invoices-stat-icon pending">
              ◷
            </div>

            <div>
              <p>Chờ thanh toán</p>
              <h3>{pendingInvoices}</h3>
            </div>
          </div>

          <div className="owner-invoices-stat-card">
            <div className="owner-invoices-stat-icon void">
              ×
            </div>

            <div>
              <p>Đã hủy</p>
              <h3>{voidInvoices}</h3>
            </div>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="owner-invoices-error">
            <p>{error}</p>

            <button
              type="button"
              onClick={loadInvoices}
              disabled={loading}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* EMPTY INVOICES */}
        {!loading && !error && invoices.length === 0 && (
          <div className="owner-invoices-empty">
            <p>Bạn chưa có hóa đơn nào.</p>
          </div>
        )}

        {/* INVOICE LIST */}
        {!error && invoices.length > 0 && (
          <div className="owner-invoices-card">

            {/* CARD HEADER */}
            <div className="owner-invoices-card-header">
              <div>
                <h2>Danh sách hóa đơn</h2>
                <p>
                  Thông tin các hóa đơn dịch vụ của thú cưng.
                </p>
              </div>

              <span className="owner-invoices-result-count">
                {filteredInvoices.length} kết quả
              </span>
            </div>

            {/* SEARCH & FILTER */}
            <div className="owner-invoices-toolbar">
              <div className="owner-invoices-search">
                <span>⌕</span>

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
                <option value="PENDING">Chờ thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="VOID">Đã hủy</option>
              </select>
            </div>

            {/* LOADING */}
            {loading && (
              <div className="owner-invoices-loading">
                Đang tải danh sách hóa đơn...
              </div>
            )}

            {/* INVOICE TABLE */}
            {!loading && (
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
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="owner-invoices-empty-row"
                        >
                          Không tìm thấy hóa đơn phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice.invoiceId}>
                          <td>
                            <button
                              type="button"
                              className="owner-invoices-detail-btn"
                              onClick={() =>
                                navigate(
                                  `/owner/invoices/${invoice.invoiceId}`
                                )
                              }
                            >
                              #{invoice.invoiceId}
                              <span>›</span>
                            </button>
                          </td>

                          <td>
                            {invoice.petName || '—'}
                          </td>

                          <td>
                            {formatDate(invoice.invoiceDate)}
                          </td>

                          <td>
                            {formatMoney(invoice.totalAmount)}
                          </td>

                          <td>
                            {formatMoney(invoice.discountAmount)}
                          </td>

                          <td>
                            <span
                              className={`owner-invoices-status ${getStatusClass(invoice.status)}`}
                            >
                              {getStatusLabel(invoice.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
