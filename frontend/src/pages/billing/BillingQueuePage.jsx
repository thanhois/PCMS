import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import billingApi from '../../api/billingApi';
import PageHeader from '../../components/admin/ui/PageHeader';
import DataTable from '../../components/admin/ui/DataTable';
import StatusBadge from '../../components/admin/ui/StatusBadge';

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

export default function BillingQueuePage() {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');

  const loadInvoices = async (targetStatus = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const response = await billingApi.getPaymentQueue(targetStatus);
      setInvoices(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadInvoices(statusFilter));
  }, [statusFilter]);

  const filteredInvoices = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return invoices;

    return invoices.filter((invoice) => {
      const invoiceId = String(invoice.invoiceId || '').toLowerCase();
      const petName = String(invoice.petName || '').toLowerCase();
      const ownerName = String(invoice.ownerName || '').toLowerCase();
      const ownerPhone = String(invoice.ownerPhone || '').toLowerCase();

      return (
        invoiceId.includes(normalizedKeyword) ||
        petName.includes(normalizedKeyword) ||
        ownerName.includes(normalizedKeyword) ||
        ownerPhone.includes(normalizedKeyword)
      );
    });
  }, [invoices, keyword]);

  const totalNetAmount = useMemo(() => {
    return filteredInvoices.reduce((total, invoice) => {
      if (invoice.status === 'VOID') return total;
      const amount =
        Number(invoice.totalAmount || 0) -
        Number(invoice.discountAmount || 0);
      return total + Math.max(amount, 0);
    }, 0);
  }, [filteredInvoices]);

  const columns = [
    {
      key: 'invoiceId',
      header: 'Mã hóa đơn',
      render: (row) => <strong>HD-{row.invoiceId}</strong>,
    },
    {
      key: 'petName',
      header: 'Thú cưng',
      render: (row) => row.petName || '—',
    },
    {
      key: 'ownerName',
      header: 'Chủ thú cưng',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.ownerName || '—'}</div>
          {row.ownerPhone && (
            <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
              {row.ownerPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Ngày lập',
      render: (row) => formatDate(row.invoiceDate),
    },
    {
      key: 'totalAmount',
      header: 'Tổng tiền',
      align: 'right',
      render: (row) => formatVnd(row.totalAmount),
    },
    {
      key: 'discountAmount',
      header: 'Giảm giá',
      align: 'right',
      render: (row) => formatVnd(row.discountAmount),
    },
    {
      key: 'amountDue',
      header: 'Thực thu',
      align: 'right',
      render: (row) => {
        const amountDue =
          Number(row.totalAmount || 0) -
          Number(row.discountAmount || 0);
        return <strong>{formatVnd(Math.max(amountDue, 0))}</strong>;
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          className="pcms-btn pcms-btn-primary pcms-btn-sm"
          onClick={() => navigate(`/billing/invoices/${row.invoiceId}`)}
        >
          {row.status === 'PAID' ? 'Xem & In biên lai' : 'Chi tiết'}
        </button>
      ),
    },
  ];

  return (
    <div className="pcms-page">
      <PageHeader
        title="Thanh toán & Hóa đơn"
        subtitle="Theo dõi hàng đợi thu ngân, xử lý thanh toán trừ kho FEFO và in biên lai điện tử."
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-outline"
            onClick={() => loadInvoices(statusFilter)}
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />

      {error && (
        <div className="pcms-alert pcms-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="pcms-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="pcms-card">
          <div className="pcms-card-subtitle">Số hóa đơn theo bộ lọc</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--pcms-primary)', marginTop: 6 }}>
            {filteredInvoices.length}
          </div>
        </div>

        <div className="pcms-card">
          <div className="pcms-card-subtitle">
            {statusFilter === 'PAID' ? 'Tổng doanh thu đã thu' : 'Tổng giá trị hóa đơn'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--pcms-text-primary)', marginTop: 6 }}>
            {formatVnd(totalNetAmount)}
          </div>
        </div>
      </div>

      <div className="pcms-card" style={{ marginBottom: 16 }}>
        <div className="pcms-filter-bar" style={{ justifyContent: 'space-between' }}>
          <div className="pcms-tabs">
            {[
              { key: 'PENDING', label: 'Chờ thanh toán' },
              { key: 'PAID', label: 'Đã thanh toán' },
              { key: 'VOID', label: 'Đã hủy (Void)' },
              { key: 'ALL', label: 'Tất cả' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`pcms-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="search"
              className="pcms-input"
              style={{ minWidth: 260 }}
              placeholder="Tìm mã HĐ, tên thú cưng, chủ nuôi, SĐT..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <span style={{ color: 'var(--pcms-text-muted)', fontSize: 13 }}>
              {filteredInvoices.length} / {invoices.length} hóa đơn
            </span>
          </div>
        </div>
      </div>

      <DataTable
        title="Danh sách hóa đơn viện phí"
        subtitle="Chọn Chi tiết để thu tiền hoặc Xem & In biên lai cho hóa đơn đã thanh toán."
        columns={columns}
        data={filteredInvoices}
        rowKey="invoiceId"
        loading={loading}
        error=""
        emptyTitle="Không tìm thấy hóa đơn phù hợp"
        emptyMessage="Hiện không có hóa đơn nào khớp với bộ lọc đang chọn."
        onRetry={() => loadInvoices(statusFilter)}
      />
    </div>
  );
}
