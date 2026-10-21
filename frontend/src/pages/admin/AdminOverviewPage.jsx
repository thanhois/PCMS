import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import ChartCard from '../../components/admin/ui/ChartCard';
import DataTable from '../../components/admin/ui/DataTable';
import KpiCard from '../../components/admin/ui/KpiCard';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { exportToCsv, formatVnd } from '../../utils/csvExport';

const REVENUE_LEGEND = [
  { key: 'examinationRevenue', label: 'Khám lâm sàng', color: 'var(--pcms-chart-blue)' },
  { key: 'vaccinationRevenue', label: 'Tiêm phòng Vaccine', color: 'var(--pcms-chart-amber)' },
  { key: 'surgerySpaRevenue', label: 'Phẫu thuật & Spa', color: 'var(--pcms-chart-emerald-dark)' },
  { key: 'pharmacyRevenue', label: 'Dược phẩm & Thuốc', color: 'var(--pcms-chart-teal)' },
];

const ACTION_BADGE_MAP = {
  LOGIN: { label: 'Đăng nhập', variant: 'info' },
  REGISTER_ACCOUNT: { label: 'Đăng ký TK', variant: 'success' },
  UPDATE_PERMISSION: { label: 'Phân quyền', variant: 'purple' },
  ASSIGN_ROLE: { label: 'Gán vai trò', variant: 'purple' },
  CREATE_ACCOUNT: { label: 'Tạo tài khoản', variant: 'info' },
  UPDATE_ACCOUNT: { label: 'Cập nhật TK', variant: 'info' },
  LOCK_ACCOUNT: { label: 'Khóa tài khoản', variant: 'danger' },
  DEACTIVATE_ACCOUNT: { label: 'Ngưng TK', variant: 'danger' },
  ACTIVATE_ACCOUNT: { label: 'Kích hoạt TK', variant: 'success' },
  RESET_PASSWORD: { label: 'Reset mật khẩu', variant: 'warning' },
  CREATE_SERVICE: { label: 'Thêm dịch vụ', variant: 'success' },
  UPDATE_SERVICE: { label: 'Sửa dịch vụ', variant: 'info' },
  DEACTIVATE_SERVICE: { label: 'Ngưng dịch vụ', variant: 'danger' },
  ACTIVATE_SERVICE: { label: 'Mở dịch vụ', variant: 'success' },
  CREATE_MEDICINE: { label: 'Thêm thuốc', variant: 'success' },
  UPDATE_MEDICINE: { label: 'Cập nhật thuốc', variant: 'warning' },
  DEACTIVATE_MEDICINE: { label: 'Ngưng thuốc', variant: 'danger' },
  ACTIVATE_MEDICINE: { label: 'Mở thuốc', variant: 'success' },
  CONFIRM_PAYMENT: { label: 'Thu ngân', variant: 'solid-green' },
  CREATE_MEDICAL_RECORD: { label: 'Bệnh án', variant: 'info' },
  UPDATE_BRANCH: { label: 'Chi nhánh', variant: 'neutral' },
};

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getOverviewSummary({
        year: '2026',
      });
      setOverview(data);
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu tổng quan hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const kpis = overview?.kpis || {
    todayAppointments: 0,
    yesterdayAppointments: 0,
    totalAppointments: 0,
    monthlyRevenue: 0,
    previousMonthRevenue: 0,
    totalInvoices: 0,
    lowStockMedicines: 0,
    totalMedicines: 0,
    activeStaffCount: 0,
  };

  // Tính toán dòng phụ đề (trendText) thực tế từ dữ liệu DB
  const apptTrendText =
    kpis.yesterdayAppointments > 0
      ? (() => {
          const diff = Math.round(
            ((kpis.todayAppointments - kpis.yesterdayAppointments) / kpis.yesterdayAppointments) * 100
          );
          return `${diff >= 0 ? `↑ +${diff}%` : `↓ ${diff}%`} so với hôm qua (${kpis.yesterdayAppointments} ca)`;
        })()
      : `Tổng lịch hẹn trên hệ thống: ${kpis.totalAppointments ?? 0} ca`;
  const apptTrendDir =
    kpis.yesterdayAppointments > 0
      ? kpis.todayAppointments >= kpis.yesterdayAppointments
        ? 'up'
        : 'down'
      : 'neutral';

  const revTrendText =
    kpis.previousMonthRevenue > 0
      ? (() => {
          const diff = (
            ((kpis.monthlyRevenue - kpis.previousMonthRevenue) / kpis.previousMonthRevenue) *
            100
          ).toFixed(1);
          return `${Number(diff) >= 0 ? `↑ +${diff}%` : `↓ ${diff}%`} so với tháng trước`;
        })()
      : kpis.totalInvoices > 0
        ? `Tổng hóa đơn đã lập: ${kpis.totalInvoices} HĐ`
        : 'Chưa phát sinh hóa đơn trong tháng này';
  const revTrendDir =
    kpis.previousMonthRevenue > 0
      ? kpis.monthlyRevenue >= kpis.previousMonthRevenue
        ? 'up'
        : 'down'
      : 'neutral';

  const revenueSeries = overview?.monthlyRevenueSeries || [];
  const appointmentBreakdown = overview?.appointmentStatusBreakdown || [];
  const recentAuditLogs = overview?.recentAuditLogs || [];

  // Tìm đỉnh trục Y cho biểu đồ cột doanh thu (đơn vị: triệu đồng)
  const maxBarValue = Math.max(
    100000000,
    ...revenueSeries.flatMap((m) => [
      m.examinationRevenue,
      m.vaccinationRevenue,
      m.surgerySpaRevenue,
      m.pharmacyRevenue,
    ])
  );
  const yAxisTicks = [
    Math.round(maxBarValue / 1000000),
    Math.round((maxBarValue * 0.75) / 1000000),
    Math.round((maxBarValue * 0.5) / 1000000),
    Math.round((maxBarValue * 0.25) / 1000000),
    0,
  ];

  const totalAppointmentsInChart = appointmentBreakdown.reduce((s, i) => s + i.count, 0) || 1;

  const handleExportRecentLogsCsv = () => {
    exportToCsv(
      'nhat-ky-hoat-dong-gan-day.csv',
      [
        { header: 'Mã Log', accessor: (r) => r.logId },
        { header: 'Thời gian', accessor: (r) => r.actionTime.replace('T', ' ') },
        { header: 'Người thực hiện', accessor: (r) => `${r.fullName} (${r.username})` },
        { header: 'Hành động', accessor: (r) => r.actionType },
        { header: 'Đối tượng', accessor: (r) => r.targetEntity },
        { header: 'Chi tiết', accessor: (r) => r.actionDetails },
      ],
      recentAuditLogs
    );
  };

  const logColumns = [
    {
      key: 'actionTime',
      header: 'Thời gian',
      width: '155px',
      render: (row) => (
        <span style={{ color: 'var(--pcms-text-link)', fontWeight: 500 }}>
          {row.actionTime.replace('T', ' ').slice(0, 16)}
        </span>
      ),
    },
    {
      key: 'fullName',
      header: 'Người thực hiện',
      width: '190px',
      render: (row) => (
        <Link to="/admin/accounts" className="pcms-table-link">
          {row.fullName}
        </Link>
      ),
    },
    {
      key: 'actionDetails',
      header: 'Nội dung thao tác & Đối tượng',
      render: (row) => (
        <div>
          <div style={{ color: 'var(--pcms-text-primary)', fontWeight: 500 }}>{row.actionDetails}</div>
          <small style={{ color: 'var(--pcms-text-muted)' }}>Đối tượng: {row.targetEntity}</small>
        </div>
      ),
    },
    {
      key: 'actionType',
      header: 'Phân loại',
      width: '140px',
      render: (row) => {
        const mapped = ACTION_BADGE_MAP[row.actionType] || {
          label: row.actionType,
          variant: 'neutral',
        };
        return <StatusBadge label={mapped.label} variant={mapped.variant} />;
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '120px',
      render: () => <StatusBadge label="Đã ghi nhận" variant="success" />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tổng quan Hệ thống (Overview)"
        subtitle="Theo dõi các chỉ số vận hành cốt lõi, biến động doanh thu và trạng thái lịch hẹn toàn hệ thống PCMS"
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-outline"
            onClick={fetchOverview}
            disabled={loading}
          >
            ↻ Làm mới
          </button>
        }
      />

      {/* ==================== 1. BỐN THẺ KPI CỐT LÕI ==================== */}
      <div className="pcms-kpi-grid">
        <KpiCard
          label="Lịch hẹn hôm nay"
          value={loading ? '...' : kpis.todayAppointments}
          trendText={apptTrendText}
          trendDirection={apptTrendDir}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          iconBg="var(--pcms-purple-bg)"
          iconColor="var(--pcms-primary)"
        />

        <KpiCard
          label="Doanh thu tháng hiện tại"
          value={loading ? '...' : formatVnd(kpis.monthlyRevenue)}
          trendText={revTrendText}
          trendDirection={revTrendDir}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          iconBg="var(--pcms-success-bg)"
          iconColor="var(--pcms-success-text)"
        />

        <KpiCard
          label="Số thuốc dưới ngưỡng tồn"
          value={loading ? '...' : `${kpis.lowStockMedicines} mặt hàng`}
          trendText={
            kpis.totalMedicines === 0
              ? 'Chưa có thuốc nào trong danh mục'
              : kpis.lowStockMedicines > 0
                ? '⚠️ Cần báo Quản lý kho nhập bổ sung'
                : `✓ Tất cả ${kpis.totalMedicines} mặt hàng đều đủ tồn`
          }
          trendDirection={
            kpis.totalMedicines === 0
              ? 'neutral'
              : kpis.lowStockMedicines > 0
                ? 'warning'
                : 'up'
          }
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
              <path d="m8.5 8.5 7 7" />
            </svg>
          }
          iconBg="var(--pcms-warning-bg)"
          iconColor="var(--pcms-warning-text)"
        />

        <KpiCard
          label="Nhân viên đang hoạt động"
          value={loading ? '...' : `${kpis.activeStaffCount} nhân sự`}
          trendText="Bác sĩ thú y, Lễ tân, Quản lý kho & Admin"
          trendDirection="neutral"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          iconBg="var(--pcms-info-bg)"
          iconColor="var(--pcms-info-text)"
        />
      </div>

      {/* ==================== 2. HAI BIỂU ĐỒ CHÍNH ==================== */}
      <div className="pcms-overview-charts-grid">
        {/* Biểu đồ 1: Doanh thu theo tháng (Grouped Vertical Bar Chart giống ảnh mẫu) */}
        <ChartCard
          title="Biểu đồ Doanh thu theo Tháng (Triệu VNĐ)"
          subtitle="Phân tách doanh thu theo nhóm Khám lâm sàng, Tiêm phòng, Phẫu thuật/Spa và Dược phẩm"
          legend={REVENUE_LEGEND.map((l) => ({ label: l.label, color: l.color }))}
          actions={
            <Link to="/admin/reports" className="pcms-btn pcms-btn-outline">
              Chi tiết báo cáo →
            </Link>
          }
        >
          {loading ? (
            <div className="pcms-state-box">
              <h4>Đang tải biểu đồ doanh thu...</h4>
            </div>
          ) : error ? (
            <div className="pcms-state-box">
              <h4 style={{ color: 'var(--pcms-danger-text)' }}>Lỗi tải biểu đồ</h4>
              <p>{error}</p>
              <button type="button" className="pcms-btn pcms-btn-outline" onClick={fetchOverview}>
                Thử lại
              </button>
            </div>
          ) : revenueSeries.length === 0 ? (
            <div className="pcms-state-box">
              <h4>Chưa có dữ liệu doanh thu</h4>
              <p>Không có bản ghi hóa đơn thanh toán nào trong kỳ được chọn.</p>
            </div>
          ) : (
            <div className="pcms-vchart-container">
              {yAxisTicks.map((tick) => (
                <div key={tick} className="pcms-vchart-grid-row">
                  <span className="pcms-vchart-yaxis-label">{tick}tr</span>
                </div>
              ))}

              <div className="pcms-vchart-bars-layer">
                {revenueSeries.map((item) => (
                  <div key={item.month} className="pcms-vchart-group">
                    <div className="pcms-vchart-Cluster">
                      {REVENUE_LEGEND.map((series) => {
                        const val = item[series.key] || 0;
                        const pct = Math.max(3, Math.round((val / maxBarValue) * 100));
                        return (
                          <div
                            key={series.key}
                            className="pcms-vchart-bar"
                            style={{
                              height: `${pct}%`,
                              backgroundColor: series.color,
                            }}
                            title={`${item.month} — ${series.label}: ${formatVnd(val)}`}
                          />
                        );
                      })}
                    </div>
                    <span className="pcms-vchart-xlabel">{item.shortMonth}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Biểu đồ 2: Lịch hẹn theo trạng thái */}
        <ChartCard
          title="Biểu đồ Lịch hẹn theo Trạng thái"
          subtitle="Tỷ lệ xử lý lịch hẹn khám trong tháng hiện tại (khớp bảng Appointment)"
          legend={appointmentBreakdown.map((item) => ({
            label: `${item.label} (${item.count})`,
            color: item.color,
          }))}
        >
          {loading ? (
            <div className="pcms-state-box">
              <h4>Đang tải thống kê lịch hẹn...</h4>
            </div>
          ) : error ? (
            <div className="pcms-state-box">
              <h4 style={{ color: 'var(--pcms-danger-text)' }}>Không thể tải thống kê</h4>
              <p>{error}</p>
            </div>
          ) : appointmentBreakdown.length === 0 ? (
            <div className="pcms-state-box">
              <h4>Chưa có lịch hẹn</h4>
              <p>Không có dữ liệu lịch hẹn trong khoảng thời gian này.</p>
            </div>
          ) : (
            <div className="pcms-status-bar-list">
              {appointmentBreakdown.map((item) => {
                const percent = Math.round((item.count / totalAppointmentsInChart) * 100);
                return (
                  <div key={item.status} className="pcms-status-bar-item">
                    <div className="pcms-status-bar-meta">
                      <StatusBadge status={item.status} label={item.label} />
                      <span>
                        <strong>{item.count}</strong> ca ({percent}%)
                      </span>
                    </div>
                    <div className="pcms-status-bar-track">
                      <div
                        className="pcms-status-bar-fill"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ==================== 3. BẢNG HOẠT ĐỘNG HỆ THỐNG GẦN ĐÂY ==================== */}
      <DataTable
        title="Hoạt động Quản trị & Hệ thống Gần đây"
        subtitle="Danh sách các thao tác cấu hình, phân quyền và vận hành mới nhất được ghi nhận vào AuditLog"
        columns={logColumns}
        data={recentAuditLogs}
        rowKey="logId"
        loading={loading}
        error={error}
        onRetry={fetchOverview}
        onExportCsv={handleExportRecentLogsCsv}
        actions={
          <Link to="/admin/audit-logs" className="pcms-btn pcms-btn-outline">
            Xem toàn bộ Audit Log
          </Link>
        }
      />
    </>
  );
}
