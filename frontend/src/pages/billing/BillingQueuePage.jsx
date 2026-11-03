
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

  return date.toLocaleDateString('vi-VN');
};

export default function BillingQueuePage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await billingApi.getPaymentQueue();

      setInvoices(
        Array.isArray(response?.data) ? response.data : []
      );
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) return invoices;

    return invoices.filter((invoice) => {
      const invoiceId = String(invoice.invoiceId || '').toLowerCase();
      const petName = String(invoice.petName || '').toLowerCase();
      const ownerName = String(invoice.ownerName || '').toLowerCase();

      return (
        invoiceId.includes(normalizedKeyword) ||
        petName.includes(normalizedKeyword) ||
        ownerName.includes(normalizedKeyword)
      );
    });
  }, [invoices, keyword]);

  const totalPendingAmount = useMemo(() => {
    return invoices.reduce((total, invoice) => {
      const amount =
        Number(invoice.totalAmount || 0) -
        Number(invoice.discountAmount || 0);

      return total + Math.max(amount, 0);
    }, 0);
  }, [invoices]);

  const columns = [
    {
      key: 'invoiceId',
      header: 'Mã hóa đơn',
      render: (row) => (
        <strong>HD-{row.invoiceId}</strong>
      ),
    },
    {
      key: 'petName',
      header: 'Thú cưng',
      render: (row) => row.petName || '—',
    },
    {
      key: 'ownerName',
      header: 'Chủ thú cưng',
      render: (row) => row.ownerName || '—',
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
      header: 'Cần thanh toán',
      align: 'right',
      render: (row) => {
        const amountDue =
          Number(row.totalAmount || 0) -
          Number(row.discountAmount || 0);

        return (
          <strong>{formatVnd(Math.max(amountDue, 0))}</strong>
        );
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
          className="pcms-btn pcms-btn-primary"
          onClick={() =>
            navigate(`/admin/billing/invoices/${row.invoiceId}`)
          }
        >
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Thanh toán hóa đơn"
        subtitle="Theo dõi các hóa đơn đang chờ thanh toán và xử lý giao dịch tại quầy."
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-secondary"
            onClick={loadInvoices}
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />

      {error && (
        <div className="pcms-alert pcms-alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="pcms-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="pcms-card">
          <div className="pcms-card-label">
            Số hóa đơn chờ thanh toán
          </div>
          <div className="pcms-card-value">
            {invoices.length}
          </div>
        </div>

        <div className="pcms-card">
          <div className="pcms-card-label">
            Tổng tiền cần thu
          </div>
          <div className="pcms-card-value">
            {formatVnd(totalPendingAmount)}
          </div>
        </div>
      </div>

      <div className="pcms-card" style={{ marginBottom: 16 }}>
        <div className="pcms-filter-bar">
          <input
            type="search"
            className="pcms-input"
            placeholder="Tìm theo mã hóa đơn, tên thú cưng hoặc chủ thú cưng..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          <span style={{ color: 'var(--pcms-text-muted)' }}>
            {filteredInvoices.length} / {invoices.length} hóa đơn
          </span>
        </div>
      </div>

      <DataTable
        title="Danh sách hóa đơn chờ thanh toán"
        subtitle="Chọn Chi tiết để xem thông tin hóa đơn và thực hiện thanh toán."
        columns={columns}
        data={filteredInvoices}
        rowKey="invoiceId"
        loading={loading}
        error=""
        emptyTitle={
          keyword
            ? 'Không tìm thấy hóa đơn phù hợp'
            : 'Không có hóa đơn chờ thanh toán'
        }
        emptyMessage={
          keyword
            ? 'Thử tìm kiếm bằng mã hóa đơn hoặc tên khác.'
            : 'Hiện tại không có hóa đơn nào cần thanh toán.'
        }
        onRetry={loadInvoices}
      />
    </div>
  );
}
