import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';

import billingApi from '../../api/billingApi';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';

const formatVnd = (value) =>
  Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('vi-VN');
};

export default function InvoiceManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const billingPrefix = location.pathname.startsWith('/admin') ? '/admin/billing' : '/billing';

  const [invoices, setInvoices] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await billingApi.getAllInvoices();
      setInvoices(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadInvoices);
  }, []);

  const filteredInvoices = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return invoices
      .filter((invoice) => {
        const matchesStatus =
          statusFilter === 'ALL' || invoice.status === statusFilter;

        const searchableText = [
          invoice.invoiceId,
          invoice.recordId,
          invoice.petName,
          invoice.ownerName,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');

        const matchesKeyword =
          !normalizedKeyword || searchableText.includes(normalizedKeyword);

        return matchesStatus && matchesKeyword;
      })
      .sort(
        (a, b) =>
          new Date(b.invoiceDate || 0) -
          new Date(a.invoiceDate || 0)
      );
  }, [invoices, keyword, statusFilter]);

  const statusCounts = useMemo(() => ({
    ALL: invoices.length,
    PENDING: invoices.filter((item) => item.status === 'PENDING').length,
    PAID: invoices.filter((item) => item.status === 'PAID').length,
    VOID: invoices.filter((item) => item.status === 'VOID').length,
  }), [invoices]);

  return (
    <div>
      <PageHeader
        title="Quản lý hóa đơn"
        subtitle="Tra cứu và theo dõi toàn bộ hóa đơn trong hệ thống."
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-secondary"
            onClick={loadInvoices}
            disabled={loading}
          >
            <RefreshCw size={15} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />

      {error && (
        <div className="pcms-alert pcms-alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="pcms-kpi-grid billing-status-summary">
        {[
          { key: 'ALL', label: 'Tất cả hóa đơn' },
          { key: 'PENDING', label: 'Chờ thanh toán' },
          { key: 'PAID', label: 'Đã thanh toán' },
          { key: 'VOID', label: 'Đã hủy' },
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            className={`billing-status-card ${
              statusFilter === item.key ? 'active' : ''
            }`}
            onClick={() => setStatusFilter(item.key)}
          >
            <span>{item.label}</span>
            <strong>{statusCounts[item.key]}</strong>
          </button>
        ))}
      </div>

      <section className="pcms-card">
        <div className="billing-invoice-toolbar">
          <div className="billing-invoice-search">
            <Search size={17} />
            <input
              type="search"
              className="pcms-input"
              placeholder="Tìm mã hóa đơn, thú cưng hoặc chủ thú cưng..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>

          <select
            className="pcms-select billing-status-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="VOID">Đã hủy</option>
          </select>

          <span className="billing-result-count">
            {filteredInvoices.length} / {invoices.length} hóa đơn
          </span>
        </div>

        {loading ? (
          <div className="pcms-state-box">Đang tải danh sách hóa đơn...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="pcms-state-box">
            <h4>Không tìm thấy hóa đơn</h4>
            <p>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <div className="pcms-table-wrap">
            <table className="pcms-table">
              <thead>
                <tr>
                  <th>Mã hóa đơn</th>
                  <th>Mã hồ sơ</th>
                  <th>Thú cưng</th>
                  <th>Chủ thú cưng</th>
                  <th>Ngày lập</th>
                  <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                  <th style={{ textAlign: 'right' }}>Giảm giá</th>
                  <th style={{ textAlign: 'right' }}>Cần thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map((invoice) => {
                  const totalAmount = Number(invoice.totalAmount || 0);
                  const discountAmount = Number(invoice.discountAmount || 0);
                  const amountDue = Math.max(
                    totalAmount - discountAmount,
                    0
                  );

                  return (
                    <tr key={invoice.invoiceId}>
                      <td>
                        <strong>HD-{invoice.invoiceId}</strong>
                      </td>
                      <td>{invoice.recordId ?? '—'}</td>
                      <td>{invoice.petName || '—'}</td>
                      <td>{invoice.ownerName || '—'}</td>
                      <td>{formatDate(invoice.invoiceDate)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatVnd(totalAmount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatVnd(discountAmount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{formatVnd(amountDue)}</strong>
                      </td>
                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="pcms-btn pcms-btn-primary pcms-btn-xs"
                          onClick={() =>
                            navigate(`${billingPrefix}/invoices/${invoice.invoiceId}`)
                          }
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}