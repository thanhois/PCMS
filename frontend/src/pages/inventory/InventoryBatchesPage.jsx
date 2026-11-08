
import { useEffect, useMemo, useState } from 'react';
import inventoryApi from '../../api/inventoryApi';
import PageHeader from '../../components/admin/ui/PageHeader';
import DataTable from '../../components/admin/ui/DataTable';
import StatusBadge from '../../components/admin/ui/StatusBadge';

const EMPTY_RECEIVE_FORM = {
  medicineId: '',
  batchNumber: '',
  expirationDate: '',
  quantity: '',
  supplier: '',
};

const EMPTY_ADJUST_FORM = {
  quantityChange: '',
  reason: '',
};

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('vi-VN');
};

const getExpiryInfo = (expirationDate) => {
  if (!expirationDate) {
    return { label: 'Chưa có hạn', variant: 'neutral' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);

  if (Number.isNaN(expiry.getTime())) {
    return { label: 'Không hợp lệ', variant: 'neutral' };
  }

  if (expiry < today) {
    return { label: 'Đã hết hạn', variant: 'danger' };
  }

  const daysLeft = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 30) {
    return { label: `Còn ${daysLeft} ngày`, variant: 'warning' };
  }

  return { label: 'Còn hạn', variant: 'success' };
};

export default function InventoryBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [receiveForm, setReceiveForm] = useState(EMPTY_RECEIVE_FORM);
  const [adjustForm, setAdjustForm] = useState(EMPTY_ADJUST_FORM);

  const [receiveErrors, setReceiveErrors] = useState({});
  const [adjustErrors, setAdjustErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [batchResponse, medicineResponse] = await Promise.all([
        inventoryApi.getInventoryBatches(),
        inventoryApi.getMedicines(),
      ]);

      setBatches(Array.isArray(batchResponse?.data) ? batchResponse.data : []);
      setMedicines(
        Array.isArray(medicineResponse?.data) ? medicineResponse.data : []
      );
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu kho thuốc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const activeMedicines = useMemo(
    () => medicines.filter((medicine) => medicine.status === 'ACTIVE'),
    [medicines]
  );

  const totalStock = useMemo(
    () =>
      batches.reduce(
        (total, batch) => total + Number(batch.quantityInStock || 0),
        0
      ),
    [batches]
  );

  const expiredBatchCount = useMemo(
    () =>
      batches.filter(
        (batch) => getExpiryInfo(batch.expirationDate).label === 'Đã hết hạn'
      ).length,
    [batches]
  );

  const lowStockMedicineCount = useMemo(() => {
    const stockByMedicine = {};

    batches.forEach((batch) => {
      const medicineId = batch.medicineId;
      stockByMedicine[medicineId] =
        (stockByMedicine[medicineId] || 0) +
        Number(batch.quantityInStock || 0);
    });

    return medicines.filter((medicine) => {
      const stock = stockByMedicine[medicine.medicineId] || 0;
      return stock <= Number(medicine.minThreshold || 0);
    }).length;
  }, [batches, medicines]);
    const filteredBatches = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch =
        !keyword ||
        (batch.batchNumber || '').toLowerCase().includes(keyword) ||
        (batch.medicineName || '').toLowerCase().includes(keyword);

      const expiryInfo = getExpiryInfo(batch.expirationDate);

      let matchesExpiry;

      switch (expiryFilter) {
        case 'VALID':
          matchesExpiry = expiryInfo.variant === 'success';
          break;
        case 'EXPIRING':
          matchesExpiry = expiryInfo.variant === 'warning';
          break;
        case 'EXPIRED':
          matchesExpiry = expiryInfo.variant === 'danger';
          break;
        case 'UNKNOWN':
          matchesExpiry = expiryInfo.variant === 'neutral';
          break;
        default:
          matchesExpiry = true;
      }

      return matchesSearch && matchesExpiry;
    });
  }, [batches, searchTerm, expiryFilter]);

  const openReceiveModal = () => {
    setReceiveForm(EMPTY_RECEIVE_FORM);
    setReceiveErrors({});
    setError('');
    setSuccess('');
    setReceiveModalOpen(true);
  };

  const closeReceiveModal = () => {
    if (submitting) return;
    setReceiveModalOpen(false);
  };

  const handleReceiveChange = (e) => {
    const { name, value } = e.target;

    setReceiveForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setReceiveErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const validateReceiveForm = () => {
    const errors = {};

    if (!receiveForm.medicineId) {
      errors.medicineId = 'Vui lòng chọn thuốc.';
    }

    if (!receiveForm.batchNumber.trim()) {
      errors.batchNumber = 'Vui lòng nhập mã lô thuốc.';
    }

    if (!receiveForm.expirationDate) {
      errors.expirationDate = 'Vui lòng chọn hạn sử dụng.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiry = new Date(receiveForm.expirationDate);
      expiry.setHours(0, 0, 0, 0);

      if (expiry <= today) {
        errors.expirationDate = 'Hạn sử dụng phải sau ngày hôm nay.';
      }
    }

    const quantity = Number(receiveForm.quantity);

    if (!receiveForm.quantity || !Number.isInteger(quantity) || quantity <= 0) {
      errors.quantity = 'Số lượng phải là số nguyên lớn hơn 0.';
    }

    setReceiveErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();

    if (!validateReceiveForm()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        medicineId: Number(receiveForm.medicineId),
        batchNumber: receiveForm.batchNumber.trim(),
        expirationDate: receiveForm.expirationDate,
        quantity: Number(receiveForm.quantity),
        supplier: receiveForm.supplier.trim(),
      };

      await inventoryApi.receiveStock(payload);

      setReceiveModalOpen(false);
      setReceiveForm(EMPTY_RECEIVE_FORM);
      setSuccess('Nhập lô thuốc vào kho thành công.');

      await loadData();
    } catch (err) {
      setError(err?.message || 'Không thể nhập lô thuốc.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustModal = (batch) => {
    setSelectedBatch(batch);
    setAdjustForm(EMPTY_ADJUST_FORM);
    setAdjustErrors({});
    setError('');
    setSuccess('');
    setAdjustModalOpen(true);
  };

  const closeAdjustModal = () => {
    if (submitting) return;
    setAdjustModalOpen(false);
    setSelectedBatch(null);
  };

  const handleAdjustChange = (e) => {
    const { name, value } = e.target;

    setAdjustForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setAdjustErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const validateAdjustForm = () => {
    const errors = {};
    const change = Number(adjustForm.quantityChange);

    if (
      adjustForm.quantityChange === '' ||
      !Number.isInteger(change) ||
      change === 0
    ) {
      errors.quantityChange = 'Số lượng điều chỉnh phải là số nguyên khác 0.';
    } else if (
      Number(selectedBatch?.quantityInStock || 0) + change < 0
    ) {
      errors.quantityChange = 'Số lượng điều chỉnh không được làm tồn kho âm.';
    }

    if (!adjustForm.reason.trim()) {
      errors.reason = 'Vui lòng nhập lý do điều chỉnh.';
    }

    setAdjustErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();

    if (!validateAdjustForm() || !selectedBatch) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await inventoryApi.adjustStock(selectedBatch.batchId, {
        quantityChange: Number(adjustForm.quantityChange),
        reason: adjustForm.reason.trim(),
      });

      setAdjustModalOpen(false);
      setSelectedBatch(null);
      setSuccess('Điều chỉnh tồn kho thành công.');

      await loadData();
    } catch (err) {
      setError(err?.message || 'Không thể điều chỉnh tồn kho.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'batchNumber',
      header: 'Mã lô',
      render: (row) => <strong>{row.batchNumber || '—'}</strong>,
    },
    {
      key: 'medicineName',
      header: 'Tên thuốc',
      render: (row) => row.medicineName || '—',
    },
    {
      key: 'expirationDate',
      header: 'Hạn sử dụng',
      render: (row) => formatDate(row.expirationDate),
    },
    {
      key: 'quantityInStock',
      header: 'Tồn kho',
      align: 'right',
      render: (row) => (
        <strong>{Number(row.quantityInStock || 0).toLocaleString('vi-VN')}</strong>
      ),
    },
    {
      key: 'supplier',
      header: 'Nhà cung cấp',
      render: (row) => row.supplier || '—',
    },
    {
      key: 'expiryStatus',
      header: 'Tình trạng',
      render: (row) => {
        const info = getExpiryInfo(row.expirationDate);
        return <StatusBadge label={info.label} variant={info.variant} />;
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          className="pcms-btn pcms-btn-secondary"
          onClick={() => openAdjustModal(row)}
        >
          Điều chỉnh
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý lô thuốc"
        subtitle="Theo dõi số lượng tồn kho, hạn sử dụng và thực hiện nhập hoặc điều chỉnh lô thuốc."
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-primary"
            onClick={openReceiveModal}
          >
            + Nhập lô thuốc
          </button>
        }
      />

      {error && (
        <div className="pcms-alert pcms-alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="pcms-alert pcms-alert-success" role="status">
          {success}
        </div>
      )}

      <div className="pcms-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="pcms-card">
          <div className="pcms-card-label">Tổng số lô thuốc</div>
          <div className="pcms-card-value">{batches.length}</div>
        </div>

        <div className="pcms-card">
          <div className="pcms-card-label">Tổng số lượng tồn</div>
          <div className="pcms-card-value">
            {totalStock.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="pcms-card">
          <div className="pcms-card-label">Thuốc chạm ngưỡng tồn</div>
          <div className="pcms-card-value">{lowStockMedicineCount}</div>
        </div>

        <div className="pcms-card">
          <div className="pcms-card-label">Lô đã hết hạn</div>
          <div className="pcms-card-value">{expiredBatchCount}</div>
        </div>
      </div>
            <div
        className="pcms-card"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          className="pcms-input"
          style={{ flex: '1 1 260px' }}
          placeholder="Tìm theo mã lô hoặc tên thuốc..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="pcms-select"
          style={{ flex: '1 1 200px' }}
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
        >
          <option value="ALL">Tất cả tình trạng</option>
          <option value="VALID">Còn hạn</option>
          <option value="EXPIRING">Sắp hết hạn (30 ngày)</option>
          <option value="EXPIRED">Đã hết hạn</option>
          <option value="UNKNOWN">Chưa có hạn / Không hợp lệ</option>
        </select>

        <button
          type="button"
          className="pcms-btn pcms-btn-secondary"
          onClick={() => {
            setSearchTerm('');
            setExpiryFilter('ALL');
          }}
        >
          Xóa bộ lọc
        </button>
      </div>

      <DataTable
        title="Danh sách lô thuốc"
        subtitle="Dữ liệu được lấy từ các lô thuốc hiện có trong kho."
        columns={columns}
        data={filteredBatches}
        rowKey="batchId"
        loading={loading}
        error=""
        emptyTitle="Chưa có lô thuốc"
        emptyMessage="Không tìm thấy lô thuốc phù hợp với điều kiện tìm kiếm hoặc lọc."
        onRetry={loadData}
      />

      {/* Modal nhập lô thuốc */}
      {receiveModalOpen && (
        <div className="pcms-modal-backdrop">
          <div className="pcms-modal-card">
            <h2 className="pcms-modal-title">Nhập lô thuốc mới</h2>
            <p className="pcms-modal-desc">
              Điền thông tin lô thuốc cần nhập vào kho.
            </p>

            <form onSubmit={handleReceiveSubmit}>
              <div className="pcms-form-grid">
                <div className="pcms-field">
                  <label className="pcms-label">Tên thuốc *</label>
                  <select
                    className="pcms-select"
                    name="medicineId"
                    value={receiveForm.medicineId}
                    onChange={handleReceiveChange}
                  >
                    <option value="">-- Chọn thuốc --</option>
                    {activeMedicines.map((medicine) => (
                      <option
                        key={medicine.medicineId}
                        value={medicine.medicineId}
                      >
                        {medicine.medicineName}
                      </option>
                    ))}
                  </select>
                  {receiveErrors.medicineId && (
                    <span className="pcms-field-error">
                      {receiveErrors.medicineId}
                    </span>
                  )}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label">Mã lô *</label>
                  <input
                    className="pcms-input"
                    name="batchNumber"
                    value={receiveForm.batchNumber}
                    onChange={handleReceiveChange}
                    placeholder="Ví dụ: LOT-2026-001"
                  />
                  {receiveErrors.batchNumber && (
                    <span className="pcms-field-error">
                      {receiveErrors.batchNumber}
                    </span>
                  )}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label">Hạn sử dụng *</label>
                  <input
                    type="date"
                    className="pcms-input"
                    name="expirationDate"
                    value={receiveForm.expirationDate}
                    onChange={handleReceiveChange}
                  />
                  {receiveErrors.expirationDate && (
                    <span className="pcms-field-error">
                      {receiveErrors.expirationDate}
                    </span>
                  )}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label">Số lượng nhập *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="pcms-input"
                    name="quantity"
                    value={receiveForm.quantity}
                    onChange={handleReceiveChange}
                    placeholder="Nhập số lượng"
                  />
                  {receiveErrors.quantity && (
                    <span className="pcms-field-error">
                      {receiveErrors.quantity}
                    </span>
                  )}
                </div>

                <div className="pcms-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="pcms-label">Nhà cung cấp</label>
                  <input
                    className="pcms-input"
                    name="supplier"
                    value={receiveForm.supplier}
                    onChange={handleReceiveChange}
                    placeholder="Nhập tên nhà cung cấp (nếu có)"
                  />
                </div>
              </div>

              <div className="pcms-modal-actions">
                <button
                  type="button"
                  className="pcms-btn pcms-btn-secondary"
                  onClick={closeReceiveModal}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="pcms-btn pcms-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal điều chỉnh tồn kho */}
      {adjustModalOpen && selectedBatch && (
        <div className="pcms-modal-backdrop">
          <div className="pcms-modal-card">
            <h2 className="pcms-modal-title">Điều chỉnh tồn kho</h2>
            <p className="pcms-modal-desc">
              {selectedBatch.medicineName} — Lô {selectedBatch.batchNumber}
            </p>

            <div className="pcms-alert">
              Số lượng hiện tại:{' '}
              <strong>
                {Number(selectedBatch.quantityInStock || 0).toLocaleString('vi-VN')}
              </strong>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className="pcms-field">
                <label className="pcms-label">
                  Số lượng thay đổi *
                </label>
                <input
                  type="number"
                  step="1"
                  className="pcms-input"
                  name="quantityChange"
                  value={adjustForm.quantityChange}
                  onChange={handleAdjustChange}
                  placeholder="Ví dụ: 10 hoặc -5"
                />
                <small>
                  Nhập số dương để tăng tồn kho, số âm để giảm tồn kho.
                </small>
                {adjustErrors.quantityChange && (
                  <span className="pcms-field-error">
                    {adjustErrors.quantityChange}
                  </span>
                )}
              </div>

              <div className="pcms-field" style={{ marginTop: 14 }}>
                <label className="pcms-label">Lý do điều chỉnh *</label>
                <textarea
                  className="pcms-input"
                  name="reason"
                  value={adjustForm.reason}
                  onChange={handleAdjustChange}
                  rows="3"
                  placeholder="Ví dụ: Kiểm kê thực tế, thuốc bị hỏng..."
                />
                {adjustErrors.reason && (
                  <span className="pcms-field-error">
                    {adjustErrors.reason}
                  </span>
                )}
              </div>

              <div className="pcms-modal-actions">
                <button
                  type="button"
                  className="pcms-btn pcms-btn-secondary"
                  onClick={closeAdjustModal}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="pcms-btn pcms-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
