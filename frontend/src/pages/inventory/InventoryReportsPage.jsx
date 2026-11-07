import { useCallback, useEffect, useMemo, useState } from 'react';
import inventoryApi from '../../api/inventoryApi';
import DataTable from '../../components/admin/ui/DataTable';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { exportToCsv, formatVnd } from '../../utils/csvExport';

export default function InventoryReportsPage() {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [medRes, batchRes] = await Promise.all([
        inventoryApi.getMedicines(),
        inventoryApi.getInventoryBatches(),
      ]);
      setMedicines(Array.isArray(medRes?.data) ? medRes.data : []);
      setBatches(Array.isArray(batchRes?.data) ? batchRes.data : []);
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu báo cáo tồn kho.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchReportData);
  }, [fetchReportData]);

  const { stockRows, alertBatches, kpis } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const byMed = {};
    const expiringOrExpired = [];

    batches.forEach((b) => {
      const mid = b.medicineId;
      if (!byMed[mid]) {
        byMed[mid] = { totalStock: 0, availableStock: 0, batchCount: 0, nearestExpiry: null };
      }
      const qty = Number(b.quantityInStock || 0);
      byMed[mid].totalStock += qty;
      byMed[mid].batchCount += 1;

      if (b.expirationDate) {
        const expDate = new Date(b.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        if (!Number.isNaN(expDate.getTime())) {
          const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (qty > 0 && daysLeft >= 0) {
            byMed[mid].availableStock += qty;
            const iso = String(b.expirationDate).slice(0, 10);
            if (!byMed[mid].nearestExpiry || iso < byMed[mid].nearestExpiry) {
              byMed[mid].nearestExpiry = iso;
            }
          }
          if (qty > 0 && daysLeft <= 30) {
            expiringOrExpired.push({
              ...b,
              daysLeft,
              alertState: daysLeft < 0 ? 'EXPIRED' : 'EXPIRING_SOON',
            });
          }
        }
      } else if (qty > 0) {
        byMed[mid].availableStock += qty;
      }
    });

    expiringOrExpired.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

    const rows = medicines.map((m) => {
      const stat = byMed[m.medicineId] || {
        totalStock: 0,
        availableStock: 0,
        batchCount: 0,
        nearestExpiry: null,
      };
      const minThreshold = Number(m.minThreshold ?? 20);
      const stockValue = stat.availableStock * Number(m.unitPrice || 0);
      return {
        ...m,
        minThreshold,
        totalStock: stat.totalStock,
        availableStock: stat.availableStock,
        batchCount: stat.batchCount,
        nearestExpiry: stat.nearestExpiry,
        stockValue,
        lowStock: stat.availableStock <= minThreshold,
      };
    });

    const totalInventoryValue = rows.reduce((sum, r) => sum + r.stockValue, 0);
    const lowStockCount = rows.filter((r) => r.status === 'ACTIVE' && r.lowStock).length;

    return {
      stockRows: rows,
      alertBatches: expiringOrExpired,
      kpis: {
        totalMedicines: rows.length,
        totalInventoryValue,
        lowStockCount,
        expiringCount: expiringOrExpired.length,
      },
    };
  }, [medicines, batches]);

  const filteredStockRows = useMemo(() => {
    if (stockFilter === 'LOW_STOCK') {
      return stockRows.filter((r) => r.lowStock);
    }
    if (stockFilter === 'ACTIVE') {
      return stockRows.filter((r) => r.status === 'ACTIVE');
    }
    return stockRows;
  }, [stockRows, stockFilter]);

  const handleExportStockCsv = () => {
    exportToCsv(
      'bao-cao-ton-kho-pcms.csv',
      [
        { header: 'Mã thuốc', accessor: (r) => r.medicineId },
        { header: 'Tên thuốc', accessor: (r) => r.medicineName },
        { header: 'Đơn vị', accessor: (r) => r.unit },
        { header: 'Đơn giá (VND)', accessor: (r) => r.unitPrice },
        { header: 'Tồn khả dụng', accessor: (r) => r.availableStock },
        { header: 'Tổng tồn vật lý', accessor: (r) => r.totalStock },
        { header: 'Ngưỡng cảnh báo', accessor: (r) => r.minThreshold },
        { header: 'Giá trị tồn khả dụng (VND)', accessor: (r) => r.stockValue },
        { header: 'Hạn dùng gần nhất', accessor: (r) => r.nearestExpiry || '' },
        { header: 'Cảnh báo tồn thấp', accessor: (r) => (r.lowStock ? 'CẢNH BÁO' : 'ĐỦ TỒN') },
      ],
      filteredStockRows
    );
  };

  const stockColumns = [
    {
      key: 'medicineId',
      header: 'Mã thuốc',
      width: '85px',
      render: (r) => <strong>#{r.medicineId}</strong>,
    },
    {
      key: 'medicineName',
      header: 'Mặt hàng thuốc',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.medicineName}</div>
          <small style={{ color: 'var(--pcms-text-muted)' }}>
            Số lô: {r.batchCount} • Ngưỡng tối thiểu: {r.minThreshold} {r.unit}
          </small>
        </div>
      ),
    },
    {
      key: 'availableStock',
      header: 'Tồn khả dụng',
      width: '150px',
      render: (r) => (
        <strong style={{ color: r.lowStock ? 'var(--pcms-danger-text)' : 'var(--pcms-text-primary)' }}>
          {r.availableStock.toLocaleString('vi-VN')} {r.unit}
        </strong>
      ),
    },
    {
      key: 'stockValue',
      header: 'Giá trị tồn',
      width: '160px',
      render: (r) => <strong>{formatVnd(r.stockValue)}</strong>,
    },
    {
      key: 'nearestExpiry',
      header: 'HSD gần nhất (FEFO)',
      width: '150px',
      render: (r) => r.nearestExpiry || '—',
    },
    {
      key: 'alert',
      header: 'Tình trạng tồn',
      width: '150px',
      render: (r) =>
        r.lowStock ? (
          <StatusBadge label="Cần nhập bổ sung" variant="warning" />
        ) : (
          <StatusBadge label="Đủ định mức" variant="success" />
        ),
    },
  ];

  const batchAlertColumns = [
    {
      key: 'batchNumber',
      header: 'Mã lô',
      width: '140px',
      render: (r) => <strong>{r.batchNumber}</strong>,
    },
    {
      key: 'medicineName',
      header: 'Tên thuốc',
    },
    {
      key: 'quantityInStock',
      header: 'Số lượng còn lại',
      width: '140px',
      render: (r) => <strong>{Number(r.quantityInStock || 0).toLocaleString('vi-VN')}</strong>,
    },
    {
      key: 'expirationDate',
      header: 'Hạn sử dụng',
      width: '140px',
      render: (r) => String(r.expirationDate || '').slice(0, 10) || '—',
    },
    {
      key: 'alertState',
      header: 'Mức cảnh báo',
      width: '170px',
      render: (r) =>
        r.daysLeft < 0 ? (
          <StatusBadge label="Đã hết hạn" variant="danger" />
        ) : (
          <StatusBadge label={`Còn ${r.daysLeft} ngày`} variant="warning" />
        ),
    },
  ];

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Báo cáo Tồn kho & Cảnh báo Cận hạn"
          subtitle="Tổng hợp định mức tồn kho dược phẩm, giá trị kho hiện hành và danh sách lô thuốc sắp hết hạn theo chuẩn FEFO"
          actions={
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="pcms-btn pcms-btn-outline"
                onClick={handleExportStockCsv}
              >
                Xuất CSV (Excel)
              </button>
              <button
                type="button"
                className="pcms-btn pcms-btn-primary"
                onClick={() => window.print()}
              >
                In / Xuất PDF báo cáo
              </button>
            </div>
          }
        />
      </div>

      <div className="pcms-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="pcms-card">
          <div className="pcms-card-label">Tổng mặt hàng thuốc</div>
          <div className="pcms-card-value">{kpis.totalMedicines}</div>
        </div>
        <div className="pcms-card">
          <div className="pcms-card-label">Giá trị tồn kho khả dụng</div>
          <div className="pcms-card-value">{formatVnd(kpis.totalInventoryValue)}</div>
        </div>
        <div className="pcms-card">
          <div className="pcms-card-label">Thuốc chạm ngưỡng cảnh báo</div>
          <div className="pcms-card-value" style={{ color: 'var(--pcms-warning-text)' }}>
            {kpis.lowStockCount}
          </div>
        </div>
        <div className="pcms-card">
          <div className="pcms-card-label">Lô cận hạn (≤30 ngày) / Hết hạn</div>
          <div className="pcms-card-value" style={{ color: 'var(--pcms-danger-text)' }}>
            {kpis.expiringCount}
          </div>
        </div>
      </div>

      <section className="pcms-card no-print" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div className="pcms-filter-bar">
          <span style={{ fontWeight: 600 }}>Chế độ xem bảng tồn kho:</span>
          <select
            className="pcms-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="ALL">Toàn bộ danh mục ({stockRows.length})</option>
            <option value="ACTIVE">Chỉ thuốc đang lưu hành</option>
            <option value="LOW_STOCK">Chỉ thuốc dưới ngưỡng tồn ({kpis.lowStockCount})</option>
          </select>
        </div>
      </section>

      <div style={{ marginBottom: 24 }}>
        <DataTable
          title={`Bảng Tổng hợp Tồn kho Theo Mặt hàng (${filteredStockRows.length})`}
          subtitle="Tồn khả dụng chỉ tính các lô còn hạn sử dụng (expirationDate >= hôm nay)."
          columns={stockColumns}
          data={filteredStockRows}
          rowKey="medicineId"
          loading={loading}
          error={error}
          onRetry={fetchReportData}
          emptyTitle="Chưa có dữ liệu tồn kho"
          emptyMessage="Không có mặt hàng thuốc nào thỏa điều kiện lọc."
        />
      </div>

      <DataTable
        title={`Cảnh báo Lô thuốc Cận hạn (≤ 30 ngày) & Đã hết hạn (${alertBatches.length})`}
        subtitle="Ưu tiên xuất trước theo nguyên tắc FEFO hoặc lập phiếu điều chỉnh hủy đối với lô đã hết hạn."
        columns={batchAlertColumns}
        data={alertBatches}
        rowKey="batchId"
        loading={loading}
        error=""
        emptyTitle="Không có lô thuốc cận hạn hoặc hết hạn"
        emptyMessage="Tất cả các lô còn tồn kho hiện tại đều có hạn sử dụng trên 30 ngày."
      />
    </div>
  );
}
