import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
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

export default function AdminMedicinesPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK'

  const [banner, setBanner] = useState(null);

  // Modal Thêm / Sửa thuốc
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_MED_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Hộp thoại xác nhận Vô hiệu hóa / Kích hoạt lại thuốc
  const [confirmState, setConfirmState] = useState({
    open: false,
    medicine: null,
    nextStatus: null,
    loading: false,
  });

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getMedicines();
      setMedicines(res || []);
    } catch (err) {
      setError(err?.message || 'Đã có lỗi khi tải danh mục thuốc.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const filteredMedicines = medicines.filter((med) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      med.medicineName.toLowerCase().includes(q) ||
      med.unit.toLowerCase().includes(q);

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
      const saved = await adminApi.saveMedicine(formData);
      setBanner({
        type: 'success',
        text: formData.medicineId
          ? `Đã cập nhật thông tin thuốc "${saved.medicineName}".`
          : `Đã thêm thuốc mới "${saved.medicineName}" (${saved.unit}) vào danh mục.`,
      });
      setModalOpen(false);
      await fetchMedicines();
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
      await adminApi.toggleMedicineStatus(medicine.medicineId, nextStatus);
      setBanner({
        type: 'success',
        text:
          nextStatus === 'ACTIVE'
            ? `Đã kích hoạt lưu hành lại thuốc "${medicine.medicineName}".`
            : `Đã ngừng lưu hành thuốc "${medicine.medicineName}".`,
      });
      setConfirmState({ open: false, medicine: null, nextStatus: null, loading: false });
      await fetchMedicines();
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
      'danh-muc-thuoc-pcms.csv',
      [
        { header: 'Mã thuốc (medicineId)', accessor: (r) => r.medicineId },
        { header: 'Tên thuốc (medicineName)', accessor: (r) => r.medicineName },
        { header: 'Đơn vị tính (unit)', accessor: (r) => r.unit },
        { header: 'Đơn giá bán (VND)', accessor: (r) => r.unitPrice },
        { header: 'Tổng tồn kho hiện tại', accessor: (r) => r.totalStock },
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
      header: 'Tên thuốc & Hàm lượng (medicineName)',
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
      header: 'Đơn vị (unit)',
      width: '115px',
    },
    {
      key: 'unitPrice',
      header: 'Đơn giá (unitPrice)',
      width: '145px',
      render: (r) => (
        <strong style={{ color: 'var(--pcms-primary)' }}>{formatVnd(r.unitPrice)}</strong>
      ),
    },
    {
      key: 'totalStock',
      header: 'Tồn kho (Chỉ xem)',
      width: '165px',
      render: (r) => (
        <div>
          <strong style={{ color: r.lowStock ? 'var(--pcms-danger-text)' : 'var(--pcms-text-primary)' }}>
            {r.totalStock} {r.unit}
          </strong>
          {r.lowStock ? (
            <div>
              <small style={{ color: 'var(--pcms-warning-text)', fontWeight: 600 }}>
                ⚠️ Dưới ngưỡng tồn
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
      header: 'Thao tác danh mục',
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
        title="Danh mục Thuốc (Medicines)"
        subtitle="Quản trị danh mục thuốc, đơn vị tính, đơn giá niêm yết và trạng thái lưu hành (Bảng Medicine)"
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
              <option value="LOW_STOCK">⚠️ Đang dưới ngưỡng tồn kho</option>
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
        subtitle="Lưu ý nghiệp vụ: Admin quản lý danh mục và đơn giá chuẩn; nghiệp vụ nhập/xuất lô thuốc (InventoryBatch) do Quản lý kho thực hiện."
        columns={columns}
        data={filteredMedicines}
        rowKey="medicineId"
        loading={loading}
        error={error}
        onRetry={fetchMedicines}
        onExportCsv={handleExportCsv}
        emptyTitle="Chưa có dữ liệu thuốc"
        emptyMessage="Không tìm thấy mặt hàng thuốc nào khớp với điều kiện lọc hiện tại."
      />

      {/* Modal Thêm / Sửa Danh mục Thuốc */}
      {modalOpen ? (
        <div className="pcms-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pcms-modal-card" style={{ maxWidth: 520 }}>
            <h3 className="pcms-modal-title">
              {isEditMode ? `Cập nhật thuốc #${formData.medicineId}` : 'Thêm thuốc mới vào danh mục'}
            </h3>
            <p className="pcms-modal-desc">
              Cấu hình tên thuốc, hàm lượng, đơn vị tính và đơn giá bán chuẩn trong hệ thống.
            </p>

            <form onSubmit={handleSaveMedicine} noValidate>
              <div className="pcms-form-grid">
                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="med-name">
                    Tên thuốc & Hàm lượng (medicineName) *
                  </label>
                  <input
                    id="med-name"
                    name="medicineName"
                    type="text"
                    className={`pcms-input ${formErrors.medicineName ? 'has-error' : ''}`}
                    placeholder="Ví dụ: Amoxi-Clav 250mg (Kháng sinh phổ rộng)"
                    value={formData.medicineName}
                    onChange={handleFormChange}
                  />
                  {formErrors.medicineName ? (
                    <span className="pcms-field-error">{formErrors.medicineName}</span>
                  ) : null}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label" htmlFor="med-unit">
                    Đơn vị tính (unit) *
                  </label>
                  <input
                    id="med-unit"
                    name="unit"
                    list="med-unit-list"
                    type="text"
                    className={`pcms-input ${formErrors.unit ? 'has-error' : ''}`}
                    placeholder="Viên, Hộp, Chai..."
                    value={formData.unit}
                    onChange={handleFormChange}
                  />
                  <datalist id="med-unit-list">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                  {formErrors.unit ? <span className="pcms-field-error">{formErrors.unit}</span> : null}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label" htmlFor="med-price">
                    Đơn giá bán (VNĐ) *
                  </label>
                  <input
                    id="med-price"
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
                  <label className="pcms-label" htmlFor="med-threshold">
                    Ngưỡng cảnh báo tồn tối thiểu *
                  </label>
                  <input
                    id="med-threshold"
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

      {/* Hộp thoại Xác nhận Vô hiệu hóa / Kích hoạt lại thuốc */}
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.nextStatus === 'INACTIVE'
            ? 'Xác nhận ngừng lưu hành thuốc'
            : 'Xác nhận kích hoạt lưu hành lại thuốc'
        }
        description={
          confirmState.nextStatus === 'INACTIVE'
            ? `Khi vô hiệu hóa, thuốc "${confirmState.medicine?.medicineName}" sẽ không thể được chọn khi Bác sĩ kê đơn thuốc mới (PrescriptionDetail).`
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
