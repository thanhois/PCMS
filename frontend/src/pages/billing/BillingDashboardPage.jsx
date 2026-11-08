import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  Receipt,
  Wallet,
  RefreshCw,
  Search,
} from 'lucide-react';

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

const getLocalDateKey = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

export default function BillingDashboardPage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await billingApi.getAllInvoices();
      setInvoices(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const statistics = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());

    const pendingInvoices = invoices.filter(
      (invoice) => invoice.status === 'PENDING'
    );

    const paidInvoices = invoices.filter(
      (invoice) => invoice.status === 'PAID'
    );

    let paidTodayCount = 0;
    let revenueToday = 0;

    paidInvoices.forEach((invoice) => {
      const todayPayments = (invoice.payments || []).filter(
        (payment) => getLocalDateKey(payment.paymentDate) === todayKey
      );

      if (todayPayments.length > 0) {
        paidTodayCount += 1;

        todayPayments.forEach((payment) => {
          revenueToday += Number(payment.amountPaid || 0);
        });
      }
    });

    const pendingAmount = pendingInvoices.reduce((total, invoice) => {
      const amount =
        Number(invoice.totalAmount || 0) -
        Number(invoice.discountAmount || 0);

      return total + Math.max(amount, 0);
    }, 0);

    return {
      pendingCount: pendingInvoices.length,
      pendingAmount,
      paidTodayCount,
      revenueToday,
      paidCount: paidInvoices.length,
      voidCount: invoices.filter(
        (invoice) => invoice.status === 'VOID'
      ).length,
    };
  }, [invoices]);

  const recentPendingInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === 'PENDING')
      .sort(
        (a, b) =>
          new Date(b.invoiceDate || 0) -
          new Date(a.invoiceDate || 0)
      )
      .slice(0, 5);
  }, [invoices]);

  return (
    <div>
      <PageHeader
        title="Receptionist Dashboard"
        subtitle="Tổng quan hoạt động tiếp nhận và thanh toán tại quầy."
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

      <div className="pcms-kpi-grid billing-dashboard-kpi">
        <div className="pcms-kpi-card">
          <div>
            <div className="pcms-kpi-label">Hóa đơn chờ thanh toán</div>
            <div className="pcms-kpi-value">
              {loading ? '—' : statistics.pendingCount}
            </div>
            <div className="pcms-kpi-trend">
              {formatVnd(statistics.pendingAmount)}
            </div>
          </div>
          <div className="pcms-kpi-icon billing-kpi-warning">
            <Receipt size={21} />
          </div>
        </div>

        <div className="pcms-kpi-card">
          <div>
            <div className="pcms-kpi-label">Đã thanh toán hôm nay</div>
            <div className="pcms-kpi-value">
              {loading ? '—' : statistics.paidTodayCount}
            </div>
            <div className="pcms-kpi-trend">
              Giao dịch hoàn tất hôm nay
            </div>
          </div>
          <div className="pcms-kpi-icon billing-kpi-success">
            <ClipboardList size={21} />
          </div>
        </div>

        <div className="pcms-kpi-card">
          <div>
            <div className="pcms-kpi-label">Doanh thu hôm nay</div>
            <div className="pcms-kpi-value billing-kpi-money">
              {loading ? '—' : formatVnd(statistics.revenueToday)}
            </div>
            <div className="pcms-kpi-trend">
              Theo giao dịch thanh toán
            </div>
          </div>
          <div className="pcms-kpi-icon billing-kpi-info">
            <Wallet size={21} />
          </div>
        </div>

        <div className="pcms-kpi-card">
          <div>
            <div className="pcms-kpi-label">Tổng hóa đơn đã ghi nhận</div>
            <div className="pcms-kpi-value">
              {loading ? '—' : invoices.length}
            </div>
            <div className="pcms-kpi-trend">
              Đã thanh toán: {statistics.paidCount} · Đã hủy: {statistics.voidCount}
            </div>
          </div>
          <div className="pcms-kpi-icon billing-kpi-neutral">
            <FileText size={21} />
          </div>
        </div>
      </div>

      <div className="billing-dashboard-grid">
        <section className="pcms-card">
          <div className="pcms-card-header">
            <div>
              <h3 className="pcms-card-title">
                Hóa đơn chờ thanh toán gần đây
              </h3>
              <p className="pcms-card-subtitle">
                Các hóa đơn cần được Receptionist xử lý.
              </p>
            </div>

            <button
              type="button"
              className="pcms-btn pcms-btn-outline"
              onClick={() => navigate('/billing/queue')}
            >
              Xem hàng chờ
            </button>
          </div>

          {loading ? (
            <div className="pcms-state-box">Đang tải dữ liệu...</div>
          ) : recentPendingInvoices.length === 0 ? (
            <div className="pcms-state-box">
              <h4>Không có hóa đơn chờ thanh toán</h4>
              <p>Hiện chưa có hóa đơn PENDING cần xử lý.</p>
            </div>
          ) : (
            <div className="pcms-table-wrap">
              <table className="pcms-table">
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Thú cưng</th>
                    <th>Ngày lập</th>
                    <th style={{ textAlign: 'right' }}>Cần thu</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPendingInvoices.map((invoice) => {
                    const amountDue = Math.max(
                      Number(invoice.totalAmount || 0) -
                        Number(invoice.discountAmount || 0),
                      0
                    );

                    return (
                      <tr key={invoice.invoiceId}>
                        <td>
                          <strong>HD-{invoice.invoiceId}</strong>
                        </td>
                        <td>{invoice.petName || '—'}</td>
                        <td>{formatDate(invoice.invoiceDate)}</td>
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
                              navigate(
                                `/billing/invoices/${invoice.invoiceId}`
                              )
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

        <section className="pcms-card billing-quick-actions">
          <h3 className="pcms-card-title">Truy cập nhanh</h3>
          <p className="pcms-card-subtitle">
            Các chức năng thường dùng tại quầy tiếp nhận.
          </p>

          <button
            type="button"
            className="billing-quick-action"
            onClick={() => navigate('/billing/queue')}
          >
            <span className="billing-quick-icon">
              <Receipt size={19} />
            </span>
            <span>
              <strong>Hàng chờ thanh toán</strong>
              <small>Xử lý các hóa đơn đang PENDING</small>
            </span>
          </button>

          <button
            type="button"
            className="billing-quick-action"
            onClick={() => navigate('/billing/invoices')}
          >
            <span className="billing-quick-icon">
              <Search size={19} />
            </span>
            <span>
              <strong>Quản lý hóa đơn</strong>
              <small>Tra cứu PENDING, PAID và VOID</small>
            </span>
          </button>

          <button
            type="button"
            className="billing-quick-action"
            onClick={() => navigate('/billing/invoices')}
          >
            <span className="billing-quick-icon">
              <FileText size={19} />
            </span>
            <span>
              <strong>Tra cứu lịch sử hóa đơn</strong>
              <small>Xem thông tin và trạng thái hóa đơn</small>
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}