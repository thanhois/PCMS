import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import DataTable from '../../components/admin/ui/DataTable';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { exportToCsv, formatVnd } from '../../utils/csvExport';

const INITIAL_SERVICE_FORM = {
  serviceId: null,
  serviceName: '',
  description: '',
  price: '',
  status: 'ACTIVE',
};

function validateServiceForm(form, existingServices = []) {
  const errs = {};
  const trimmedName = (form.serviceName || '').trim();
  if (!trimmedName || trimmedName.length < 3) {
    errs.serviceName = 'Tên dịch vụ phải có ít nhất 3 ký tự';
  } else if (trimmedName.length > 150) {
    errs.serviceName = 'Tên dịch vụ không vượt quá 150 ký tự';
  } else if (
    existingServices.some(
      (s) =>
        s.serviceId !== form.serviceId &&
        s.serviceName?.trim().toLowerCase() === trimmedName.toLowerCase()
    )
  ) {
    errs.serviceName = 'Tên dịch vụ này đã tồn tại trong danh mục';
  }

  const rawPrice = String(form.price ?? '').trim();
  const priceNum = Number(rawPrice);
  if (rawPrice === '' || Number.isNaN(priceNum) || !Number.isInteger(priceNum)) {
    errs.price = 'Đơn giá dịch vụ phải là số nguyên hợp lệ (VNĐ)';
  } else if (priceNum < 1000) {
    errs.price = 'Đơn giá dịch vụ tối thiểu từ 1,000 VNĐ trở lên';
  } else if (priceNum > 100000000) {
    errs.price = 'Đơn giá dịch vụ không vượt quá 100,000,000 VNĐ';
  }

  if (form.description && form.description.length > 1000) {
    errs.description = 'Mô tả không vượt quá 1000 ký tự';
  }
  return errs;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [banner, setBanner] = useState(null);

  // Modal Thêm / Sửa dịch vụ
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_SERVICE_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Hộp thoại xác nhận Vô hiệu hóa / Kích hoạt dịch vụ
  const [confirmState, setConfirmState] = useState({
    open: false,
    service: null,
    nextStatus: null,
    loading: false,
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getServices();
      setServices(res || []);
    } catch (err) {
      setError(err?.message || 'Đã có lỗi khi tải danh mục dịch vụ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = services.filter((srv) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      srv.serviceName.toLowerCase().includes(q) ||
      (srv.description || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || srv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreateModal = () => {
    setFormData(INITIAL_SERVICE_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (srv) => {
    setFormData({
      serviceId: srv.serviceId,
      serviceName: srv.serviceName,
      description: srv.description || '',
      price: String(srv.price),
      status: srv.status || 'ACTIVE',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    const errs = validateServiceForm(updated, services);
    setFormErrors((prev) => ({ ...prev, [name]: errs[name] || '' }));
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    const errs = validateServiceForm(formData, services);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const saved = await adminApi.saveService(formData);
      setBanner({
        type: 'success',
        text: formData.serviceId
          ? `Đã cập nhật dịch vụ "${saved.serviceName}" thành công.`
          : `Đã thêm dịch vụ mới "${saved.serviceName}" vào danh mục.`,
      });
      setModalOpen(false);
      await fetchServices();
    } catch (err) {
      if (err?.fieldErrors) {
        setFormErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setBanner({
        type: 'error',
        text: err?.message || 'Không thể lưu dịch vụ.',
      });
    } finally {
      setSaving(false);
    }
  };

  const askToggleStatus = (srv) => {
    const nextStatus = srv.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmState({
      open: true,
      service: srv,
      nextStatus,
      loading: false,
    });
  };

  const handleConfirmToggle = async () => {
    const { service, nextStatus } = confirmState;
    if (!service) return;

    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await adminApi.toggleServiceStatus(service.serviceId, nextStatus);
      setBanner({
        type: 'success',
        text:
          nextStatus === 'ACTIVE'
            ? `Đã kích hoạt lại dịch vụ "${service.serviceName}".`
            : `Đã vô hiệu hóa dịch vụ "${service.serviceName}".`,
      });
      setConfirmState({ open: false, service: null, nextStatus: null, loading: false });
      await fetchServices();
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
      'danh-muc-dich-vu-pcms.csv',
      [
        { header: 'Mã dịch vụ (serviceId)', accessor: (r) => r.serviceId },
        { header: 'Tên dịch vụ (serviceName)', accessor: (r) => r.serviceName },
        { header: 'Mô tả (description)', accessor: (r) => r.description || '' },
        { header: 'Đơn giá niêm yết (VND)', accessor: (r) => r.price },
        { header: 'Trạng thái', accessor: (r) => r.status },
      ],
      filteredServices
    );
  };

  const columns = [
    {
      key: 'serviceId',
      header: 'Mã DV',
      width: '85px',
      render: (r) => <strong>#{r.serviceId}</strong>,
    },
    {
      key: 'serviceName',
      header: 'Tên dịch vụ (serviceName)',
      width: '280px',
      render: (r) => (
        <span style={{ fontWeight: 600, color: 'var(--pcms-text-primary)' }}>{r.serviceName}</span>
      ),
    },
    {
      key: 'description',
      header: 'Mô tả chi tiết (description)',
      render: (r) => r.description || <span style={{ color: 'var(--pcms-text-light)' }}>—</span>,
    },
    {
      key: 'price',
      header: 'Đơn giá (price)',
      width: '150px',
      render: (r) => (
        <strong style={{ color: 'var(--pcms-primary)' }}>{formatVnd(r.price)}</strong>
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

  const isEditMode = Boolean(formData.serviceId);

  return (
    <>
      <PageHeader
        title="Danh mục Dịch vụ (Service Catalog)"
        subtitle="Quản lý danh mục dịch vụ khám chữa bệnh, tiêm phòng, xét nghiệm, phẫu thuật và spa/grooming (Bảng Service)"
        actions={
          <button type="button" className="pcms-btn pcms-btn-primary" onClick={openCreateModal}>
            + Thêm dịch vụ mới
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
              placeholder="Tìm theo tên hoặc mô tả dịch vụ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="pcms-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái dịch vụ"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang cung cấp (ACTIVE)</option>
              <option value="INACTIVE">Ngừng cung cấp (INACTIVE)</option>
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
        title={`Danh sách Dịch vụ Phòng khám (${filteredServices.length})`}
        subtitle="Bảng giá niêm yết áp dụng khi Bác sĩ chỉ định dịch vụ trong hồ sơ bệnh án (MedicalRecordDetail)"
        columns={columns}
        data={filteredServices}
        rowKey="serviceId"
        loading={loading}
        error={error}
        onRetry={fetchServices}
        onExportCsv={handleExportCsv}
        emptyTitle="Chưa có dịch vụ nào"
        emptyMessage="Không tìm thấy dịch vụ nào khớp với bộ lọc hiện tại."
      />

      {/* Modal Thêm / Sửa Dịch vụ */}
      {modalOpen ? (
        <div className="pcms-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pcms-modal-card" style={{ maxWidth: 520 }}>
            <h3 className="pcms-modal-title">
              {isEditMode ? `Cập nhật dịch vụ #${formData.serviceId}` : 'Thêm dịch vụ phòng khám mới'}
            </h3>
            <p className="pcms-modal-desc">
              Điền tên dịch vụ, đơn giá niêm yết (VNĐ) và mô tả quy trình thực hiện.
            </p>

            <form onSubmit={handleSaveService} noValidate>
              <div className="pcms-form-grid">
                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="srv-name">
                    Tên dịch vụ (serviceName) *
                  </label>
                  <input
                    id="srv-name"
                    name="serviceName"
                    type="text"
                    className={`pcms-input ${formErrors.serviceName ? 'has-error' : ''}`}
                    placeholder="Ví dụ: Siêu âm ổ bụng tổng quát"
                    value={formData.serviceName}
                    onChange={handleFormChange}
                  />
                  {formErrors.serviceName ? (
                    <span className="pcms-field-error">{formErrors.serviceName}</span>
                  ) : null}
                </div>

                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="srv-price">
                    Đơn giá niêm yết (VNĐ) *
                  </label>
                  <input
                    id="srv-price"
                    name="price"
                    type="number"
                    min="0"
                    step="1000"
                    className={`pcms-input ${formErrors.price ? 'has-error' : ''}`}
                    placeholder="Ví dụ: 300000"
                    value={formData.price}
                    onChange={handleFormChange}
                  />
                  {formErrors.price ? (
                    <span className="pcms-field-error">{formErrors.price}</span>
                  ) : null}
                </div>

                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="srv-desc">
                    Mô tả chi tiết (description)
                  </label>
                  <textarea
                    id="srv-desc"
                    name="description"
                    rows={3}
                    className={`pcms-input ${formErrors.description ? 'has-error' : ''}`}
                    style={{ height: 'auto', padding: '10px 12px' }}
                    placeholder="Mô tả hạng mục khám, thiết bị sử dụng hoặc lưu ý..."
                    value={formData.description}
                    onChange={handleFormChange}
                  />
                  {formErrors.description ? (
                    <span className="pcms-field-error">{formErrors.description}</span>
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
                  {saving ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Hộp thoại Xác nhận Vô hiệu hóa / Kích hoạt dịch vụ */}
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.nextStatus === 'INACTIVE'
            ? 'Xác nhận vô hiệu hóa dịch vụ'
            : 'Xác nhận kích hoạt lại dịch vụ'
        }
        description={
          confirmState.nextStatus === 'INACTIVE'
            ? `Dịch vụ "${confirmState.service?.serviceName}" sẽ tạm ngừng hiển thị khi Bác sĩ hoặc Lễ tân tạo chỉ định mới. Các hồ sơ bệnh án cũ vẫn được giữ nguyên.`
            : `Kích hoạt lại dịch vụ "${confirmState.service?.serviceName}" để tiếp tục phục vụ tại phòng khám?`
        }
        confirmLabel={
          confirmState.nextStatus === 'INACTIVE' ? 'Vô hiệu hóa dịch vụ' : 'Kích hoạt lại'
        }
        variant={confirmState.nextStatus === 'INACTIVE' ? 'danger' : 'primary'}
        loading={confirmState.loading}
        onConfirm={handleConfirmToggle}
        onCancel={() =>
          setConfirmState({ open: false, service: null, nextStatus: null, loading: false })
        }
      />
    </>
  );
}
