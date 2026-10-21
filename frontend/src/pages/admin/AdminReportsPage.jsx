import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import ChartCard from '../../components/admin/ui/ChartCard';
import DataTable from '../../components/admin/ui/DataTable';
import KpiCard from '../../components/admin/ui/KpiCard';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { exportToCsv, formatVnd } from '../../utils/csvExport';

const REVENUE_SERIES_LEGEND = [
  { key: 'examinationRevenue', label: 'Khám lâm sàng', color: 'var(--pcms-chart-blue)' },
  { key: 'vaccinationRevenue', label: 'Tiêm phòng Vaccine', color: 'var(--pcms-chart-amber)' },
  { key: 'surgerySpaRevenue', label: 'Phẫu thuật & Spa', color: 'var(--pcms-chart-emerald-dark)' },
  { key: 'pharmacyRevenue', label: 'Dược phẩm & Thuốc', color: 'var(--pcms-chart-teal)' },
];

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('REVENUE'); // 'REVENUE' | 'INVENTORY' | 'APPOINTMENTS'
  const [fromDate, setFromDate] = useState('2026-03-01');
  const [toDate, setToDate] = useState('2026-10-31');
  const [dateError, setDateError] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    revenueRows: [],
    inventoryRows: [],
    appointmentRows: [],
  });

  const fetchReports = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    setDateError('');
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getReports({ fromDate, toDate });
      setReportData({
        revenueRows: res.revenueRows || [],
        inventoryRows: res.inventoryRows || [],
        appointmentRows: res.appointmentRows || [],
      });
    } catch (err) {
      setError(err?.message || 'Đã xảy ra lỗi khi tải báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFromDateChange = (e) => {
    const nextFrom = e.target.value;
    setFromDate(nextFrom);
    if (nextFrom && toDate && nextFrom > toDate) {
      setDateError('Khoảng ngày không hợp lệ: "Từ ngày" không được lớn hơn "Đến ngày".');
    } else {
      setDateError('');
    }
  };

  const handleToDateChange = (e) => {
    const nextTo = e.target.value;
    setToDate(nextTo);
    if (fromDate && nextTo && fromDate > nextTo) {
      setDateError('Khoảng ngày không hợp lệ: "Đến ngày" không được nhỏ hơn "Từ ngày".');
    } else {
      setDateError('');
    }
  };

  const handleResetDates = () => {
    setFromDate('2026-03-01');
    setToDate('2026-10-31');
    setDateError('');
  };

  // ==================== 1. DỮ LIỆU & CỘT BÁO CÁO DOANH THU ====================
  const revenueRows = reportData.revenueRows;
  const totalGross = revenueRows.reduce((s, r) => s + r.grossAmount, 0);
  const totalDiscount = revenueRows.reduce((s, r) => s + r.discountTotal, 0);
  const totalNet = revenueRows.reduce((s, r) => s + r.netAmount, 0);
  const totalInvoices = revenueRows.reduce((s, r) => s + r.invoiceCount, 0);

  const maxRevBar = Math.max(
    100000000,
    ...revenueRows.flatMap((m) => [
      m.examinationRevenue,
      m.vaccinationRevenue,
      m.surgerySpaRevenue,
      m.pharmacyRevenue,
    ])
  );
  const revTicks = [
    Math.round(maxRevBar / 1000000),
    Math.round((maxRevBar * 0.75) / 1000000),
    Math.round((maxRevBar * 0.5) / 1000000),
    Math.round((maxRevBar * 0.25) / 1000000),
    0,
  ];

  const revenueColumns = [
    {
      key: 'month',
      header: 'Kỳ báo cáo',
      render: (r) => <strong>{r.month}</strong>,
    },
    {
      key: 'invoiceCount',
      header: 'Số hóa đơn',
      render: (r) => `${r.invoiceCount} HĐ`,
    },
    {
      key: 'examinationRevenue',
      header: 'Khám lâm sàng',
      render: (r) => formatVnd(r.examinationRevenue),
    },
    {
      key: 'vaccinationRevenue',
      header: 'Tiêm phòng',
      render: (r) => formatVnd(r.vaccinationRevenue),
    },
    {
      key: 'surgerySpaRevenue',
      header: 'Phẫu thuật & Spa',
      render: (r) => formatVnd(r.surgerySpaRevenue),
    },
    {
      key: 'pharmacyRevenue',
      header: 'Dược phẩm',
      render: (r) => formatVnd(r.pharmacyRevenue),
    },
    {
      key: 'discountTotal',
      header: 'Chiết khấu',
      render: (r) => <span style={{ color: 'var(--pcms-danger-text)' }}>-{formatVnd(r.discountTotal)}</span>,
    },
    {
      key: 'netAmount',
      header: 'Doanh thu thực thu',
      render: (r) => (
        <strong style={{ color: 'var(--pcms-success-text)' }}>{formatVnd(r.netAmount)}</strong>
      ),
    },
  ];

  const exportRevenueCsv = () => {
    exportToCsv(
      `bao-cao-doanh-thu-${fromDate}-den-${toDate}.csv`,
      [
        { header: 'Kỳ báo cáo', accessor: (r) => r.month },
        { header: 'Số hóa đơn', accessor: (r) => r.invoiceCount },
        { header: 'Khám lâm sàng (VND)', accessor: (r) => r.examinationRevenue },
        { header: 'Tiêm phòng (VND)', accessor: (r) => r.vaccinationRevenue },
        { header: 'Phẫu thuật & Spa (VND)', accessor: (r) => r.surgerySpaRevenue },
        { header: 'Dược phẩm (VND)', accessor: (r) => r.pharmacyRevenue },
        { header: 'Chiết khấu (VND)', accessor: (r) => r.discountTotal },
        { header: 'Doanh thu thực thu (VND)', accessor: (r) => r.netAmount },
      ],
      revenueRows
    );
  };

  // ==================== 2. DỮ LIỆU & CỘT BÁO CÁO TỒN KHO ====================
  const inventoryRows = reportData.inventoryRows;
  const lowStockMedsCount = inventoryRows.filter((m) => m.lowStock).length;
  const totalStockValue = inventoryRows.reduce(
    (s, m) => s + Number(m.totalStock || 0) * Number(m.unitPrice || 0),
    0
  );
  const totalBatchesCount = inventoryRows.reduce((s, m) => s + Number(m.batchCount || 0), 0);
  const maxStockChart = Math.max(100, ...inventoryRows.map((m) => m.totalStock || 0));

  const inventoryColumns = [
    {
      key: 'medicineId',
      header: 'Mã thuốc',
      width: '85px',
      render: (r) => <strong>#{r.medicineId}</strong>,
    },
    {
      key: 'medicineName',
      header: 'Tên thuốc / Hàm lượng',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--pcms-text-primary)' }}>{r.medicineName}</div>
          <small style={{ color: 'var(--pcms-text-muted)' }}>Số lô: {r.batchCount} lô</small>
        </div>
      ),
    },
    { key: 'unit', header: 'Đơn vị tính', width: '110px' },
    {
      key: 'unitPrice',
      header: 'Đơn giá bán',
      width: '135px',
      render: (r) => formatVnd(r.unitPrice),
    },
    {
      key: 'totalStock',
      header: 'Tổng tồn kho',
      width: '130px',
      render: (r) => (
        <strong style={{ color: r.lowStock ? 'var(--pcms-danger-text)' : 'var(--pcms-text-primary)' }}>
          {r.totalStock} {r.unit}
        </strong>
      ),
    },
    {
      key: 'nearestExpirationDate',
      header: 'Hạn dùng gần nhất',
      width: '145px',
      render: (r) => r.nearestExpirationDate || '—',
    },
    {
      key: 'stockAlert',
      header: 'Cảnh báo tồn kho',
      width: '165px',
      render: (r) =>
        r.totalStock === 0 ? (
          <StatusBadge label="Hết hàng (0)" variant="danger" />
        ) : r.lowStock ? (
          <StatusBadge label={`Dưới ngưỡng (<${r.minThreshold})`} variant="warning" />
        ) : (
          <StatusBadge label="Đủ tồn kho" variant="success" />
        ),
    },
  ];

  const exportInventoryCsv = () => {
    exportToCsv(
      `tong-hop-ton-kho-thuoc-${toDate}.csv`,
      [
        { header: 'Mã thuốc', accessor: (r) => r.medicineId },
        { header: 'Tên thuốc', accessor: (r) => r.medicineName },
        { header: 'Đơn vị', accessor: (r) => r.unit },
        { header: 'Đơn giá (VND)', accessor: (r) => r.unitPrice },
        { header: 'Tổng tồn kho', accessor: (r) => r.totalStock },
        { header: 'Ngưỡng tối thiểu', accessor: (r) => r.minThreshold },
        { header: 'Hạn dùng gần nhất', accessor: (r) => r.nearestExpirationDate || '' },
        { header: 'Trạng thái tồn', accessor: (r) => (r.lowStock ? 'Cần nhập thêm' : 'Ổn định') },
      ],
      inventoryRows
    );
  };

  // ==================== 3. DỮ LIỆU & CỘT THỐNG KÊ LỊCH HẸN ====================
  const appointmentRows = reportData.appointmentRows;
  const totalAppts = appointmentRows.reduce((s, a) => s + a.count, 0);
  const completedAppts = appointmentRows.find((a) => a.status === 'COMPLETED')?.count || 0;
  const cancelledOrRejected = appointmentRows
    .filter((a) => a.status === 'CANCELLED' || a.status === 'REJECTED')
    .reduce((s, a) => s + a.count, 0);
  const completionRate = totalAppts > 0 ? ((completedAppts / totalAppts) * 100).toFixed(1) : '0.0';

  const appointmentColumns = [
    {
      key: 'status',
      header: 'Mã trạng thái (Appointment.status)',
      width: '240px',
      render: (r) => <StatusBadge status={r.status} label={r.label} />,
    },
    {
      key: 'code',
      header: 'Mã chuẩn DB',
      width: '180px',
      render: (r) => <code>{r.status}</code>,
    },
    {
      key: 'count',
      header: 'Số lượng ca',
      width: '150px',
      render: (r) => <strong>{r.count} lịch hẹn</strong>,
    },
    {
      key: 'ratio',
      header: 'Tỷ trọng (%)',
      render: (r) => {
        const pct = totalAppts > 0 ? ((r.count / totalAppts) * 100).toFixed(1) : '0.0';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="pcms-status-bar-track" style={{ maxWidth: 220 }}>
              <div
                className="pcms-status-bar-fill"
                style={{ width: `${pct}%`, backgroundColor: r.color }}
              />
            </div>
            <strong>{pct}%</strong>
          </div>
        );
      },
    },
  ];

  const exportAppointmentsCsv = () => {
    exportToCsv(
      `thong-ke-lich-hen-${fromDate}-den-${toDate}.csv`,
      [
        { header: 'Mã trạng thái', accessor: (r) => r.status },
        { header: 'Tên trạng thái', accessor: (r) => r.label },
        { header: 'Số lượng lịch hẹn', accessor: (r) => r.count },
        {
          header: 'Tỷ lệ (%)',
          accessor: (r) => (totalAppts > 0 ? ((r.count / totalAppts) * 100).toFixed(1) : '0'),
        },
      ],
      appointmentRows
    );
  };

  return (
    <>
      <PageHeader
        title="Báo cáo & Thống kê (Reports)"
        subtitle="Tổng hợp Doanh thu phòng khám, Tồn kho dược phẩm và Thống kê lịch hẹn kèm xuất file CSV"
        actions={
          <div className="pcms-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'REVENUE'}
              className={`pcms-tab-btn ${activeTab === 'REVENUE' ? 'active' : ''}`}
              onClick={() => setActiveTab('REVENUE')}
            >
              💰 Báo cáo Doanh thu
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'INVENTORY'}
              className={`pcms-tab-btn ${activeTab === 'INVENTORY' ? 'active' : ''}`}
              onClick={() => setActiveTab('INVENTORY')}
            >
              💊 Tổng hợp Tồn kho
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'APPOINTMENTS'}
              className={`pcms-tab-btn ${activeTab === 'APPOINTMENTS' ? 'active' : ''}`}
              onClick={() => setActiveTab('APPOINTMENTS')}
            >
              📅 Thống kê Lịch hẹn
            </button>
          </div>
        }
      />

      {/* Bộ lọc khoảng ngày chung cho báo cáo */}
      <section className="pcms-card" style={{ padding: '14px 20px' }}>
        <div className="pcms-filter-bar" style={{ justifyContent: 'space-between' }}>
          <div className="pcms-filter-bar">
            <label className="pcms-label" htmlFor="rep-from">
              Từ ngày:
            </label>
            <input
              id="rep-from"
              type="date"
              max={toDate || undefined}
              className={`pcms-input ${dateError ? 'has-error' : ''}`}
              value={fromDate}
              onChange={handleFromDateChange}
            />

            <label className="pcms-label" htmlFor="rep-to">
              Đến ngày:
            </label>
            <input
              id="rep-to"
              type="date"
              min={fromDate || undefined}
              className={`pcms-input ${dateError ? 'has-error' : ''}`}
              value={toDate}
              onChange={handleToDateChange}
            />

            <button type="button" className="pcms-btn pcms-btn-outline" onClick={handleResetDates}>
              Đặt lại kỳ chuẩn
            </button>
            {dateError ? <span className="pcms-field-error">{dateError}</span> : null}
          </div>
        </div>
      </section>

      {/* ==================== TAB 1: REVENUE REPORT ==================== */}
      {activeTab === 'REVENUE' ? (
        <>
          <div className="pcms-kpi-grid">
            <KpiCard
              label="Tổng doanh thu gộp"
              value={loading ? '...' : formatVnd(totalGross)}
              trendText={`Trong kỳ ${fromDate} → ${toDate}`}
              icon="💵"
            />
            <KpiCard
              label="Tổng chiết khấu / giảm giá"
              value={loading ? '...' : formatVnd(totalDiscount)}
              trendText="Khuyến mãi & ưu đãi khách hàng"
              trendDirection="warning"
              icon="🏷️"
              iconBg="var(--pcms-warning-bg)"
              iconColor="var(--pcms-warning-text)"
            />
            <KpiCard
              label="Doanh thu thực thu (Net)"
              value={loading ? '...' : formatVnd(totalNet)}
              trendText="Đã trừ chiết khấu hóa đơn"
              trendDirection="up"
              icon="📈"
              iconBg="var(--pcms-success-bg)"
              iconColor="var(--pcms-success-text)"
            />
            <KpiCard
              label="Tổng số hóa đơn thanh toán"
              value={loading ? '...' : `${totalInvoices} HĐ`}
              trendText="Hóa đơn trạng thái PAID"
              icon="🧾"
              iconBg="var(--pcms-info-bg)"
              iconColor="var(--pcms-info-text)"
            />
          </div>

          <ChartCard
            title="Biểu đồ Doanh thu theo Tháng (Revenue Trend)"
            subtitle="So sánh cơ cấu doanh thu giữa Khám lâm sàng, Tiêm phòng, Phẫu thuật/Spa và Dược phẩm"
            legend={REVENUE_SERIES_LEGEND.map((l) => ({ label: l.label, color: l.color }))}
          >
            {loading ? (
              <div className="pcms-state-box">
                <h4>Đang tải biểu đồ doanh thu...</h4>
              </div>
            ) : error ? (
              <div className="pcms-state-box">
                <h4 style={{ color: 'var(--pcms-danger-text)' }}>Không thể tải biểu đồ</h4>
                <p>{error}</p>
              </div>
            ) : revenueRows.length === 0 ? (
              <div className="pcms-state-box">
                <h4>Không có dữ liệu doanh thu trong khoảng ngày này</h4>
              </div>
            ) : (
              <div className="pcms-vchart-container">
                {revTicks.map((tick) => (
                  <div key={tick} className="pcms-vchart-grid-row">
                    <span className="pcms-vchart-yaxis-label">{tick}tr</span>
                  </div>
                ))}
                <div className="pcms-vchart-bars-layer">
                  {revenueRows.map((item) => (
                    <div key={item.month} className="pcms-vchart-group">
                      <div className="pcms-vchart-Cluster">
                        {REVENUE_SERIES_LEGEND.map((s) => {
                          const val = item[s.key] || 0;
                          const pct = Math.max(3, Math.round((val / maxRevBar) * 100));
                          return (
                            <div
                              key={s.key}
                              className="pcms-vchart-bar"
                              style={{ height: `${pct}%`, backgroundColor: s.color }}
                              title={`${item.month} — ${s.label}: ${formatVnd(val)}`}
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

          <DataTable
            title="Bảng Chi tiết Doanh thu theo Kỳ"
            subtitle="Dữ liệu tổng hợp từ bảng Invoice và Payment"
            columns={revenueColumns}
            data={revenueRows}
            rowKey="month"
            loading={loading}
            error={error}
            onRetry={fetchReports}
            onExportCsv={exportRevenueCsv}
          />
        </>
      ) : null}

      {/* ==================== TAB 2: INVENTORY SUMMARY ==================== */}
      {activeTab === 'INVENTORY' ? (
        <>
          <div className="pcms-kpi-grid">
            <KpiCard
              label="Tổng danh mục thuốc"
              value={loading ? '...' : `${inventoryRows.length} loại thuốc`}
              trendText="Trong danh mục Medicine"
              icon="💊"
            />
            <KpiCard
              label="Thuốc dưới ngưỡng tồn"
              value={loading ? '...' : `${lowStockMedsCount} mặt hàng`}
              trendText="Cần thông báo Quản lý kho nhập hàng"
              trendDirection={lowStockMedsCount > 0 ? 'warning' : 'up'}
              icon="⚠️"
              iconBg="var(--pcms-warning-bg)"
              iconColor="var(--pcms-warning-text)"
            />
            <KpiCard
              label="Tổng số lô thuốc (Batch)"
              value={loading ? '...' : `${totalBatchesCount} lô`}
              trendText="Quản lý theo hạn dùng (InventoryBatch)"
              icon="📦"
              iconBg="var(--pcms-info-bg)"
              iconColor="var(--pcms-info-text)"
            />
            <KpiCard
              label="Ước tính giá trị tồn kho"
              value={loading ? '...' : formatVnd(totalStockValue)}
              trendText="Tính theo đơn giá niêm yết"
              trendDirection="up"
              icon="🏦"
              iconBg="var(--pcms-success-bg)"
              iconColor="var(--pcms-success-text)"
            />
          </div>

          <ChartCard
            title="Biểu đồ Đối chiếu Mức Tồn kho & Ngưỡng Tối thiểu"
            subtitle="So sánh số lượng tồn thực tế (tổng từ InventoryBatch) với ngưỡng cảnh báo tối thiểu"
            legend={[
              { label: 'Tồn kho ổn định', color: 'var(--pcms-chart-emerald)' },
              { label: 'Chạm/Dưới ngưỡng tối thiểu', color: 'var(--pcms-warning-solid)' },
            ]}
          >
            {loading ? (
              <div className="pcms-state-box">
                <h4>Đang tải biểu đồ tồn kho...</h4>
              </div>
            ) : error ? (
              <div className="pcms-state-box">
                <h4 style={{ color: 'var(--pcms-danger-text)' }}>Lỗi tải biểu đồ tồn kho</h4>
                <p>{error}</p>
              </div>
            ) : inventoryRows.length === 0 ? (
              <div className="pcms-state-box">
                <h4>Không có dữ liệu tồn kho</h4>
              </div>
            ) : (
              <div className="pcms-status-bar-list">
                {inventoryRows.map((med) => {
                  const pct = Math.min(100, Math.round((med.totalStock / maxStockChart) * 100));
                  return (
                    <div key={med.medicineId} className="pcms-status-bar-item">
                      <div className="pcms-status-bar-meta">
                        <strong>{med.medicineName}</strong>
                        <span>
                          Tồn: <strong>{med.totalStock}</strong> {med.unit} (Ngưỡng tối thiểu:{' '}
                          {med.minThreshold} {med.unit})
                        </span>
                      </div>
                      <div className="pcms-status-bar-track">
                        <div
                          className="pcms-status-bar-fill"
                          style={{
                            width: `${Math.max(4, pct)}%`,
                            backgroundColor: med.lowStock
                              ? 'var(--pcms-warning-solid)'
                              : 'var(--pcms-chart-emerald)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          <DataTable
            title="Bảng Tổng hợp Tồn kho Dược phẩm (Inventory Summary)"
            subtitle="Tổng hợp số lượng tồn từ các lô thuốc chưa hết hạn (InventoryBatch)"
            columns={inventoryColumns}
            data={inventoryRows}
            rowKey="medicineId"
            loading={loading}
            error={error}
            onRetry={fetchReports}
            onExportCsv={exportInventoryCsv}
          />
        </>
      ) : null}

      {/* ==================== TAB 3: APPOINTMENT STATS ==================== */}
      {activeTab === 'APPOINTMENTS' ? (
        <>
          <div className="pcms-kpi-grid">
            <KpiCard
              label="Tổng số lịch hẹn trong kỳ"
              value={loading ? '...' : `${totalAppts} ca`}
              trendText={`Từ ${fromDate} đến ${toDate}`}
              icon="📅"
            />
            <KpiCard
              label="Số ca khám hoàn thành"
              value={loading ? '...' : `${completedAppts} ca`}
              trendText={`Đạt tỷ lệ ${completionRate}%`}
              trendDirection="up"
              icon="✅"
              iconBg="var(--pcms-success-bg)"
              iconColor="var(--pcms-success-text)"
            />
            <KpiCard
              label="Đang xử lý / Chờ khám"
              value={loading ? '...' : `${totalAppts - completedAppts - cancelledOrRejected} ca`}
              trendText="Gồm Đã duyệt, Check-in & Chờ duyệt"
              icon="⏳"
              iconBg="var(--pcms-info-bg)"
              iconColor="var(--pcms-info-text)"
            />
            <KpiCard
              label="Số ca Hủy / Từ chối"
              value={loading ? '...' : `${cancelledOrRejected} ca`}
              trendText="Khách báo hủy hoặc không đủ điều kiện"
              trendDirection="down"
              icon="✕"
              iconBg="var(--pcms-danger-bg)"
              iconColor="var(--pcms-danger-text)"
            />
          </div>

          <ChartCard
            title="Biểu đồ Phân bổ Lịch hẹn theo Trạng thái"
            subtitle="Thống kê khối lượng lịch hẹn theo vòng đời xử lý tại phòng khám"
            legend={appointmentRows.map((a) => ({ label: a.label, color: a.color }))}
          >
            {loading ? (
              <div className="pcms-state-box">
                <h4>Đang tải biểu đồ lịch hẹn...</h4>
              </div>
            ) : error ? (
              <div className="pcms-state-box">
                <h4 style={{ color: 'var(--pcms-danger-text)' }}>Lỗi tải biểu đồ</h4>
                <p>{error}</p>
              </div>
            ) : appointmentRows.length === 0 ? (
              <div className="pcms-state-box">
                <h4>Không có dữ liệu lịch hẹn</h4>
              </div>
            ) : (
              <div className="pcms-status-bar-list">
                {appointmentRows.map((item) => {
                  const pct = totalAppts > 0 ? Math.round((item.count / totalAppts) * 100) : 0;
                  return (
                    <div key={item.status} className="pcms-status-bar-item">
                      <div className="pcms-status-bar-meta">
                        <StatusBadge status={item.status} label={item.label} />
                        <span>
                          <strong>{item.count}</strong> lịch hẹn ({pct}%)
                        </span>
                      </div>
                      <div className="pcms-status-bar-track">
                        <div
                          className="pcms-status-bar-fill"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          <DataTable
            title="Bảng Thống kê Chi tiết Lịch hẹn theo Trạng thái (Appointment Stats)"
            subtitle="Tổng hợp theo các trạng thái chuẩn của bảng Appointment"
            columns={appointmentColumns}
            data={appointmentRows}
            rowKey="status"
            loading={loading}
            error={error}
            onRetry={fetchReports}
            onExportCsv={exportAppointmentsCsv}
          />
        </>
      ) : null}
    </>
  );
}
