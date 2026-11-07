import { useCallback, useEffect, useMemo, useState } from 'react';
import inventoryApi from '../../api/inventoryApi';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import DataTable from '../../components/admin/ui/DataTable';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { exportToCsv, formatVnd } from '../../utils/csvExport';

const COMMON_UNITS = ['Viên', 'Hộp', 'Chai', 'Chai 30ml', 'Chai 100ml', 'Tuýp', 'Ống tiêm', 'Gói'];

const INITIAL_MED_FORM = {
  medicineId: null,
  medicineName: '',
  unit: 'Viên',
  unitPrice: '',
  minThreshold: '20',
};

function validateMedicineForm(form, existingMedicines = []) {
  const errs = {};
  const trimmedName = (form.medicineName || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    errs.medicineName = 'Tên thuốc phải có ít nhất 2 ký tự';
  } else if (trimmedName.length > 150) {
    errs.medicineName = 'Tên thuốc không vượt quá 150 ký tự';
  } else if (
    existingMedicines.some(
      (m) =>
        m.medicineId !== form.medicineId &&
        m.medicineName?.trim().toLowerCase() === trimmedName.toLowerCase()
    )
  ) {
    errs.medicineName = 'Tên thuốc này đã tồn tại trong danh mục';
  }

  const trimmedUnit = (form.unit || '').trim();
  if (!trimmedUnit) {
    errs.unit = 'Vui lòng nhập hoặc chọn đơn vị tính';
  } else if (trimmedUnit.length > 50) {
    errs.unit = 'Đơn vị tính không vượt quá 50 ký tự';
  }

  const rawPrice = String(form.unitPrice ?? '').trim();
  const priceNum = Number(rawPrice);
  if (rawPrice === '' || Number.isNaN(priceNum) || !Number.isInteger(priceNum)) {
    errs.unitPrice = 'Đơn giá bán phải là số nguyên hợp lệ (VNĐ)';
  } else if (priceNum < 500) {
    errs.unitPrice = 'Đơn giá bán tối thiểu từ 500 VNĐ trở lên';
  } else if (priceNum > 100000000) {
    errs.unitPrice = 'Đơn giá bán không vượt quá 100,000,000 VNĐ';
  }

  const rawThreshold = String(form.minThreshold ?? '').trim();
  const thresholdNum = Number(rawThreshold);
  if (rawThreshold === '' || Number.isNaN(thresholdNum) || !Number.isInteger(thresholdNum)) {
    errs.minThreshold = 'Ngưỡng cảnh báo tối thiểu phải là số nguyên';
  } else if (thresholdNum < 1 || thresholdNum > 100000) {
    errs.minThreshold = 'Ngưỡng cảnh báo tối thiểu phải từ 1 đến 100,000';
  }

  return errs;
}

export default function InventoryMedicinesPage() {
  const [rawMedicines, setRawMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [banner, setBanner] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_MED_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    medicine: null,
    nextStatus: null,
    loading: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [medRes, batchRes] = await Promise.all([
        inventoryApi.getMedicines(),
        inventoryApi.getInventoryBatches(),
      ]);
      setRawMedicines(Array.isArray(medRes?.data) ? medRes.data : []);
      setBatches(Array.isArray(batchRes?.data) ? batchRes.data : []);
    } catch (err) {
      setError(err?.message || 'Đã có lỗi khi tải danh mục thuốc.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const medicines = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const byMed = {};
    batches.forEach((b) => {
      const mid = b.medicineId;
      if (!byMed[mid]) {
        byMed[mid] = { totalStock: 0, availableStock: 0, nearestExpiry: null };
      }
      const qty = Number(b.quantityInStock || 0);
      byMed[mid].totalStock += qty;
      const exp = b.expirationDate ? String(b.expirationDate).slice(0, 10) : null;
      if (qty > 0 && (!exp || exp >= todayStr)) {
        byMed[mid].availableStock += qty;
      }
      if (qty > 0 && exp && (!byMed[mid].nearestExpiry || exp < byMed[mid].nearestExpiry)) {
        byMed[mid].nearestExpiry = exp;
      }
    });

    return rawMedicines.map((m) => {
      const stat = byMed[m.medicineId] || { totalStock: 0, availableStock: 0, nearestExpiry: null };
      const minThreshold = Number(m.minThreshold ?? 20);
      return {
        ...m,
        minThreshold,
        totalStock: stat.totalStock,
        availableStock: stat.availableStock,
        nearestExpirationDate: stat.nearestExpiry,
        lowStock: stat.availableStock <= minThreshold,
      };
    });
  }, [rawMedicines, batches]);

  const filteredMedicines = medicines.filter((med) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (med.medicineName || '').toLowerCase().includes(q) ||
      (med.unit || '').toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'LOW_STOCK' ? med.lowStock : med.status === statusFilter);

    return matchSearch && matchStatus;
  });

  const openCreateModal = () => {
    setFormData(INITIAL_MED_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (med) => {
    setFormData({
      medicineId: med.medicineId,
      medicineName: med.medicineName,
      unit: med.unit,
      unitPrice: String(med.unitPrice),
      minThreshold: String(med.minThreshold || 20),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    const errs = validateMedicineForm(updated, medicines);
    setFormErrors((prev) => ({ ...prev, [name]: errs[name] || '' }));
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    const errs = validateMedicineForm(formData, medicines);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        medicineName: formData.medicineName.trim(),
        unit: formData.unit.trim(),
        unitPrice: Number(formData.unitPrice),
        minThreshold: Number(formData.minThreshold),
      };
      if (formData.medicineId) {
        await inventoryApi.updateMedicine(formData.medicineId, payload);
        setBanner({
          type: 'success',
          text: `Đã cập nhật thông tin thuốc "${payload.medicineName}".`,
        });
      } else {
        await inventoryApi.createMedicine(payload);
        setBanner({
          type: 'success',
          text: `Đã thêm thuốc mới "${payload.medicineName}" (${payload.unit}) vào danh mục.`,
        });
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      if (err?.fieldErrors) {
        setFormErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setBanner({
        type: 'error',
        text: err?.message || 'Không thể lưu thông tin thuốc.',
      });
    } finally {
      setSaving(false);
    }
  };

  const askToggleStatus = (med) => {
    const nextStatus = med.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmState({
      open: true,
      medicine: med,
      nextStatus,
      loading: false,
    });
  };

  const handleConfirmToggle = async () => {
    const { medicine, nextStatus } = confirmState;
    if (!medicine) return;

    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await inventoryApi.updateMedicineStatus(medicine.medicineId, nextStatus);
      setBanner({
        type: 'success',
        text:
          nextStatus === 'ACTIVE'
            ? `Đã kích hoạt lưu hành lại thuốc "${medicine.medicineName}".`
            : `Đã ngừng lưu hành thuốc "${medicine.medicineName}".`,
      });
      setConfirmState({ open: false, medicine: null, nextStatus: null, loading: false });
      await fetchData();
    } catch (err) {
      setBanner({
        type: 'error',
        text: err?.message || 'Thao tác thất bại.',
      });
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleExportCsv = () => {
    exportToCsv(
      'danh-muc-thuoc-kho-pcms.csv',
      [
        { header: 'Mã thuốc (medicineId)', accessor: (r) => r.medicineId },
        { header: 'Tên thuốc (medicineName)', accessor: (r) => r.medicineName },
        { header: 'Đơn vị tính (unit)', accessor: (r) => r.unit },
        { header: 'Đơn giá bán (VND)', accessor: (r) => r.unitPrice },
        { header: 'Tồn khả dụng', accessor: (r) => r.availableStock },
        { header: 'Ngưỡng cảnh báo tối thiểu', accessor: (r) => r.minThreshold },
        { header: 'Hạn dùng gần nhất', accessor: (r) => r.nearestExpirationDate || '' },
        { header: 'Trạng thái lưu hành', accessor: (r) => r.status },
      ],
      filteredMedicines
    );
  };

  const columns = [
    {
      key: 'medicineId',
      header: 'Mã thuốc',
      width: '85px',
      render: (r) => <strong>#{r.medicineId}</strong>,
    },
    {
      key: 'medicineName',
      header: 'Tên thuốc & Hàm lượng',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--pcms-text-primary)' }}>{r.medicineName}</div>
          <small style={{ color: 'var(--pcms-text-muted)' }}>
            Ngưỡng cảnh báo tối thiểu: {r.minThreshold} {r.unit}
          </small>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Đơn vị',
      width: '115px',
    },
    {
      key: 'unitPrice',
      header: 'Đơn giá bán',
      width: '145px',
      render: (r) => (
        <strong style={{ color: 'var(--pcms-primary)' }}>{formatVnd(r.unitPrice)}</strong>
      ),
    },
    {
      key: 'availableStock',
      header: 'Tồn khả dụng',
      width: '165px',
      render: (r) => (
        <div>
          <strong style={{ color: r.lowStock ? 'var(--pcms-danger-text)' : 'var(--pcms-text-primary)' }}>
            {r.availableStock} {r.unit}
          </strong>
          {r.lowStock ? (
            <div>
              <small style={{ color: 'var(--pcms-warning-text)', fontWeight: 600 }}>
                Chạm ngưỡng tồn
              </small>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '140px',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: '210px',
      render: (r) => (
        <div className="pcms-row-actions">
          <button
            type="button"
            className="pcms-btn pcms-btn-outline pcms-btn-xs"
            onClick={() => openEditModal(r)}
          >
            Sửa
          </button>
          <button
            type="button"
            className={`pcms-btn pcms-btn-xs ${
              r.status === 'ACTIVE' ? 'pcms-btn-danger' : 'pcms-btn-primary'
            }`}
            onClick={() => askToggleStatus(r)}
          >
            {r.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
          </button>
        </div>
      ),
    },
  ];

  const isEditMode = Boolean(formData.medicineId);

  return (
    <>
      <PageHeader
        title="Danh mục Thuốc (Medicine Catalog)"
        subtitle="Quản lý danh mục thuốc, đơn vị tính, đơn giá niêm yết và ngưỡng cảnh báo tồn tối thiểu"
        actions={
          <button type="button" className="pcms-btn pcms-btn-primary" onClick={openCreateModal}>
            + Thêm thuốc mới
          </button>
        }
      />

      {banner ? (
        <div className={`pcms-alert pcms-alert-${banner.type}`} role="status">
          <span>{banner.text}</span>
          <button
            type="button"
            className="pcms-btn pcms-btn-outline pcms-btn-xs"
            onClick={() => setBanner(null)}
          >
            Đóng
          </button>
        </div>
      ) : null}

      <section className="pcms-card" style={{ padding: '14px 20px' }}>
        <div className="pcms-filter-bar" style={{ justifyContent: 'space-between' }}>
          <div className="pcms-filter-bar">
            <input
              type="search"
              className="pcms-input"
              style={{ minWidth: 280 }}
              placeholder="Tìm theo tên thuốc hoặc đơn vị tính..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="pcms-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái thuốc"
            >
              <option value="ALL">Tất cả thuốc</option>
              <option value="ACTIVE">Đang lưu hành (ACTIVE)</option>
              <option value="INACTIVE">Ngừng lưu hành (INACTIVE)</option>
              <option value="LOW_STOCK">Đang chạm/dưới ngưỡng tồn</option>
            </select>

            <button
              type="button"
              className="pcms-btn pcms-btn-outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </section>

      <DataTable
        title={`Danh mục Thuốc Phòng khám (${filteredMedicines.length})`}
        subtitle="Thuốc ngừng lưu hành sẽ không xuất hiện trong danh sách kê đơn mới của Bác sĩ."
        columns={columns}
        data={filteredMedicines}
        rowKey="medicineId"
        loading={loading}
        error={error}
        onRetry={fetchData}
        onExportCsv={handleExportCsv}
        emptyTitle="Chưa có dữ liệu thuốc"
        emptyMessage="Không tìm thấy mặt hàng thuốc nào khớp với điều kiện lọc hiện tại."
      />

      {modalOpen ? (
        <div className="pcms-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pcms-modal-card" style={{ maxWidth: 520 }}>
            <h3 className="pcms-modal-title">
              {isEditMode ? `Cập nhật thuốc #${formData.medicineId}` : 'Thêm thuốc mới vào danh mục'}
            </h3>
            <p className="pcms-modal-desc">
              Cấu hình tên thuốc, hàm lượng, đơn vị tính, đơn giá bán và ngưỡng cảnh báo tồn tối thiểu.
            </p>

            <form onSubmit={handleSaveMedicine} noValidate>
              <div className="pcms-form-grid">
                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="inv-med-name">
                    Tên thuốc & Hàm lượng *
                  </label>
                  <input
                    id="inv-med-name"
                    name="medicineName"
                    type="text"
                    className={`pcms-input ${formErrors.medicineName ? 'has-error' : ''}`}
                    placeholder="Ví dụ: Amoxi-Clav 250mg"
                    value={formData.medicineName}
                    onChange={handleFormChange}
                  />
                  {formErrors.medicineName ? (
                    <span className="pcms-field-error">{formErrors.medicineName}</span>
                  ) : null}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label" htmlFor="inv-med-unit">
                    Đơn vị tính *
                  </label>
                  <input
                    id="inv-med-unit"
                    name="unit"
                    list="inv-med-unit-list"
                    type="text"
                    className={`pcms-input ${formErrors.unit ? 'has-error' : ''}`}
                    placeholder="Viên, Hộp, Chai..."
                    value={formData.unit}
                    onChange={handleFormChange}
                  />
                  <datalist id="inv-med-unit-list">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                  {formErrors.unit ? <span className="pcms-field-error">{formErrors.unit}</span> : null}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label" htmlFor="inv-med-price">
                    Đơn giá bán (VNĐ) *
                  </label>
                  <input
                    id="inv-med-price"
                    name="unitPrice"
                    type="number"
                    min="0"
                    step="500"
                    className={`pcms-input ${formErrors.unitPrice ? 'has-error' : ''}`}
                    placeholder="Ví dụ: 12000"
                    value={formData.unitPrice}
                    onChange={handleFormChange}
                  />
                  {formErrors.unitPrice ? (
                    <span className="pcms-field-error">{formErrors.unitPrice}</span>
                  ) : null}
                </div>

                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="inv-med-threshold">
                    Ngưỡng cảnh báo tồn tối thiểu *
                  </label>
                  <input
                    id="inv-med-threshold"
                    name="minThreshold"
                    type="number"
                    min="1"
                    className={`pcms-input ${formErrors.minThreshold ? 'has-error' : ''}`}
                    value={formData.minThreshold}
                    onChange={handleFormChange}
                  />
                  {formErrors.minThreshold ? (
                    <span className="pcms-field-error">{formErrors.minThreshold}</span>
                  ) : null}
                </div>
              </div>

              <div className="pcms-modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="pcms-btn pcms-btn-outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="pcms-btn pcms-btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : isEditMode ? 'Lưu cập nhật' : 'Thêm thuốc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.nextStatus === 'INACTIVE'
            ? 'Xác nhận ngừng lưu hành thuốc'
            : 'Xác nhận kích hoạt lưu hành lại thuốc'
        }
        description={
          confirmState.nextStatus === 'INACTIVE'
            ? `Khi vô hiệu hóa, thuốc "${confirmState.medicine?.medicineName}" sẽ không thể được chọn khi Bác sĩ kê đơn mới.`
            : `Cho phép thuốc "${confirmState.medicine?.medicineName}" xuất hiện trở lại trong danh mục kê đơn của Bác sĩ?`
        }
        confirmLabel={
          confirmState.nextStatus === 'INACTIVE' ? 'Vô hiệu hóa thuốc' : 'Kích hoạt lại'
        }
        variant={confirmState.nextStatus === 'INACTIVE' ? 'danger' : 'primary'}
        loading={confirmState.loading}
        onConfirm={handleConfirmToggle}
        onCancel={() =>
          setConfirmState({ open: false, medicine: null, nextStatus: null, loading: false })
        }
      />
    </>
  );
}
