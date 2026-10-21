import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import DataTable from '../../components/admin/ui/DataTable';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { exportToCsv } from '../../utils/csvExport';
import { EMAIL_REGEX, STRONG_PASSWORD_REGEX, VN_PHONE_REGEX } from '../../utils/validators';

const STAFF_ROLES = [
  { value: 'VETERINARIAN', label: 'Bác sĩ thú y (VETERINARIAN)' },
  { value: 'RECEPTIONIST', label: 'Lễ tân (RECEPTIONIST)' },
  { value: 'INVENTORY_MANAGER', label: 'Quản lý kho (INVENTORY_MANAGER)' },
];

const INITIAL_FORM = {
  userId: null,
  fullName: '',
  username: '',
  email: '',
  phoneNumber: '',
  roleName: 'VETERINARIAN',
  temporaryPassword: 'Password123',
};

function validateAccountForm(form, isEdit, existingRows = []) {
  const errs = {};
  const trimmedName = (form.fullName || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    errs.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
  } else if (trimmedName.length > 150) {
    errs.fullName = 'Họ và tên không vượt quá 150 ký tự';
  } else if (!/^[\p{L}\s.'-]+$/u.test(trimmedName)) {
    errs.fullName = 'Họ và tên chỉ được chứa chữ cái, khoảng trắng và dấu chấm';
  }

  if (!isEdit) {
    const trimmedUser = (form.username || '').trim();
    if (!trimmedUser || !/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,48}[a-zA-Z0-9])?$/.test(trimmedUser)) {
      errs.username = 'Username từ 3–50 ký tự (chữ, số, dấu chấm/gạch ngang ở giữa)';
    } else if (
      existingRows.some((r) => r.username?.toLowerCase() === trimmedUser.toLowerCase())
    ) {
      errs.username = 'Tên đăng nhập này đã tồn tại';
    }

    const trimmedEmail = (form.email || '').trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      errs.email = 'Địa chỉ email không đúng định dạng';
    } else if (trimmedEmail.length > 150) {
      errs.email = 'Email không vượt quá 150 ký tự';
    } else if (
      existingRows.some((r) => r.email?.toLowerCase() === trimmedEmail.toLowerCase())
    ) {
      errs.email = 'Email này đã tồn tại trong hệ thống';
    }

    if (!form.temporaryPassword || /\s/.test(form.temporaryPassword)) {
      errs.temporaryPassword = 'Mật khẩu không được để trống hoặc chứa khoảng trắng';
    } else if (
      form.temporaryPassword.length > 72 ||
      !STRONG_PASSWORD_REGEX.test(form.temporaryPassword)
    ) {
      errs.temporaryPassword = 'Mật khẩu 8–72 ký tự, gồm chữ hoa, chữ thường và chữ số';
    }
  }

  const trimmedPhone = (form.phoneNumber || '').trim();
  if (!trimmedPhone || !VN_PHONE_REGEX.test(trimmedPhone)) {
    errs.phoneNumber = 'Số điện thoại VN hợp lệ gồm 10 số (ví dụ: 0912345678)';
  } else if (
    existingRows.some(
      (r) => r.userId !== form.userId && r.phoneNumber?.trim() === trimmedPhone
    )
  ) {
    errs.phoneNumber = 'Số điện thoại này đã được sử dụng bởi nhân viên khác';
  }

  if (!form.roleName) {
    errs.roleName = 'Vui lòng chọn vai trò';
  } else if (!isEdit && form.roleName === 'ADMIN') {
    errs.roleName = 'Không được phép gán vai trò ADMIN cho tài khoản mới';
  }
  return errs;
}

export default function AdminAccountsPage() {
  // Bộ lọc & phân trang
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  // Dữ liệu bảng
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Thông báo kết quả thao tác
  const [banner, setBanner] = useState(null); // { type: 'success'|'error'|'info', text: string }

  // Modal Tạo / Sửa tài khoản
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Hộp thoại xác nhận hành động (Khóa/Mở khóa & Reset mật khẩu)
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: null, // 'TOGGLE_STATUS' | 'RESET_PASSWORD'
    account: null,
    nextStatus: null,
    loading: false,
  });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getAccounts({
        search,
        role: roleFilter,
        status: statusFilter,
        page,
        pageSize,
      });
      setRows(res.items || []);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err?.message || 'Đã có lỗi khi tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Reset về trang 1 khi đổi bộ lọc (theo đúng quy tắc trong RDS)
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Mở modal Tạo mới
  const openCreateModal = () => {
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  // Mở modal Chỉnh sửa
  const openEditModal = (acc) => {
    setFormData({
      userId: acc.userId,
      fullName: acc.fullName,
      username: acc.username,
      email: acc.email,
      phoneNumber: acc.phoneNumber,
      roleName: acc.roleName,
      temporaryPassword: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    const errs = validateAccountForm(updated, Boolean(updated.userId), rows);
    setFormErrors((prev) => ({ ...prev, [name]: errs[name] || '' }));
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(formData.userId);
    const errs = validateAccountForm(formData, isEdit, rows);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.updateAccount(formData.userId, formData);
        setBanner({
          type: 'success',
          text: `Đã cập nhật thông tin tài khoản nhân viên "${formData.fullName}".`,
        });
      } else {
        await adminApi.createAccount(formData);
        setBanner({
          type: 'success',
          text: `Đã tạo tài khoản "${formData.username}" (${formData.fullName}) thành công!`,
        });
        setPage(1);
      }
      setModalOpen(false);
      await fetchAccounts();
    } catch (err) {
      if (err?.fieldErrors) {
        setFormErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setBanner({
        type: 'error',
        text: err?.message || 'Không thể lưu thông tin tài khoản.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Xác nhận Vô hiệu hóa / Kích hoạt lại
  const askToggleStatus = (acc) => {
    const nextStatus = acc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmState({
      open: true,
      type: 'TOGGLE_STATUS',
      account: acc,
      nextStatus,
      loading: false,
    });
  };

  // Xác nhận Đặt lại mật khẩu
  const askResetPassword = (acc) => {
    setConfirmState({
      open: true,
      type: 'RESET_PASSWORD',
      account: acc,
      nextStatus: null,
      loading: false,
    });
  };

  const handleConfirmAction = async () => {
    const { type, account, nextStatus } = confirmState;
    if (!account) return;

    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      if (type === 'TOGGLE_STATUS') {
        await adminApi.toggleAccountStatus(account.userId, nextStatus);
        setBanner({
          type: 'success',
          text:
            nextStatus === 'ACTIVE'
              ? `Đã kích hoạt lại tài khoản "${account.fullName}" (${account.username}).`
              : `Đã vô hiệu hóa tài khoản "${account.fullName}" (${account.username}).`,
        });
      } else if (type === 'RESET_PASSWORD') {
        const res = await adminApi.resetAccountPassword(account.userId);
        setBanner({
          type: 'info',
          text: `🔑 Mật khẩu tạm thời mới của "${account.fullName}" (${account.username}): ${res.temporaryPassword} — Vui lòng sao chép gửi cho nhân viên.`,
        });
      }
      setConfirmState({ open: false, type: null, account: null, nextStatus: null, loading: false });
      await fetchAccounts();
    } catch (err) {
      setBanner({
        type: 'error',
        text: err?.message || 'Thao tác thất bại, vui lòng thử lại.',
      });
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleExportCsv = () => {
    exportToCsv(
      'danh-sach-tai-khoan-nhan-vien.csv',
      [
        { header: 'ID', accessor: (r) => r.userId },
        { header: 'Username', accessor: (r) => r.username },
        { header: 'Họ và tên', accessor: (r) => r.fullName },
        { header: 'Email', accessor: (r) => r.email },
        { header: 'Số điện thoại', accessor: (r) => r.phoneNumber },
        { header: 'Vai trò', accessor: (r) => r.roleName },
        { header: 'Trạng thái', accessor: (r) => r.status },
        { header: 'Ngày tạo', accessor: (r) => (r.createdAt || '').slice(0, 10) },
      ],
      rows
    );
  };

  const columns = [
    {
      key: 'userId',
      header: 'Mã NV',
      width: '80px',
      render: (row) => <strong>#{row.userId}</strong>,
    },
    {
      key: 'fullName',
      header: 'Họ và tên / Username',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--pcms-text-primary)' }}>{row.fullName}</div>
          <small style={{ color: 'var(--pcms-text-link)' }}>@{row.username}</small>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Liên hệ (Email & SĐT)',
      render: (row) => (
        <div>
          <div>{row.email}</div>
          <small style={{ color: 'var(--pcms-text-muted)' }}>{row.phoneNumber}</small>
        </div>
      ),
    },
    {
      key: 'roleName',
      header: 'Vai trò',
      width: '155px',
      render: (row) => <StatusBadge status={row.roleName} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '140px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      width: '115px',
      render: (row) => (row.createdAt ? row.createdAt.slice(0, 10) : '—'),
    },
    {
      key: 'actions',
      header: 'Thao tác quản trị',
      width: '275px',
      render: (row) => (
        <div className="pcms-row-actions">
          <button
            type="button"
            className="pcms-btn pcms-btn-outline pcms-btn-xs"
            onClick={() => openEditModal(row)}
          >
            Sửa
          </button>

          <button
            type="button"
            className="pcms-btn pcms-btn-outline pcms-btn-xs"
            onClick={() => askResetPassword(row)}
          >
            Đặt lại MK
          </button>

          <button
            type="button"
            className={`pcms-btn pcms-btn-xs ${
              row.status === 'ACTIVE' ? 'pcms-btn-danger' : 'pcms-btn-primary'
            }`}
            onClick={() => askToggleStatus(row)}
            disabled={row.username === 'admin'}
            title={row.username === 'admin' ? 'Không thể tự khóa tài khoản Admin gốc' : ''}
          >
            {row.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
          </button>
        </div>
      ),
    },
  ];

  const isEditMode = Boolean(formData.userId);

  return (
    <>
      <PageHeader
        title="Quản lý Tài khoản Nhân viên (Accounts)"
        subtitle="Danh sách nhân sự phòng khám: tìm kiếm, lọc theo vai trò/trạng thái, phân trang, tạo mới, cập nhật và đặt lại mật khẩu"
        actions={
          <button type="button" className="pcms-btn pcms-btn-primary" onClick={openCreateModal}>
            + Tạo tài khoản nhân viên
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

      {/* Thanh bộ lọc tìm kiếm */}
      <section className="pcms-card" style={{ padding: '14px 20px' }}>
        <div className="pcms-filter-bar" style={{ justifyContent: 'space-between' }}>
          <div className="pcms-filter-bar" style={{ flex: 1 }}>
            <input
              type="search"
              className="pcms-input"
              style={{ minWidth: 260 }}
              placeholder="Tìm theo họ tên, username, email, SĐT..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />

            <select
              className="pcms-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo vai trò"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
              <option value="VETERINARIAN">Bác sĩ thú y (VETERINARIAN)</option>
              <option value="RECEPTIONIST">Lễ tân (RECEPTIONIST)</option>
              <option value="INVENTORY_MANAGER">Quản lý kho (INVENTORY_MANAGER)</option>
            </select>

            <select
              className="pcms-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo trạng thái"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
            </select>

            <button type="button" className="pcms-btn pcms-btn-outline" onClick={handleClearFilters}>
              Xóa lọc
            </button>
          </div>
        </div>
      </section>

      {/* Bảng dữ liệu tài khoản */}
      <DataTable
        title={`Danh sách Nhân viên Phòng khám (${totalItems})`}
        subtitle="Hiển thị các tài khoản nhân sự nội bộ trong hệ thống PCMS"
        columns={columns}
        data={rows}
        rowKey="userId"
        loading={loading}
        error={error}
        onRetry={fetchAccounts}
        onExportCsv={handleExportCsv}
        emptyTitle="Không tìm thấy tài khoản nhân viên"
        emptyMessage="Không có tài khoản nào khớp với từ khóa hoặc bộ lọc vai trò/trạng thái hiện tại."
      />

      {/* Thanh phân trang */}
      {!loading && !error && totalItems > 0 ? (
        <div className="pcms-card" style={{ padding: '12px 20px' }}>
          <div className="pcms-pagination" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <span>
              Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng cộng{' '}
              <strong>{totalItems}</strong> nhân viên)
            </span>
            <div className="pcms-page-btns">
              <button
                type="button"
                className="pcms-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trước
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`pcms-page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="pcms-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Tạo / Sửa Tài khoản Nhân viên */}
      {modalOpen ? (
        <div className="pcms-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pcms-modal-card" style={{ maxWidth: 540 }}>
            <h3 className="pcms-modal-title">
              {isEditMode ? `Chỉnh sửa nhân viên #${formData.userId}` : 'Tạo tài khoản nhân viên mới'}
            </h3>
            <p className="pcms-modal-desc">
              {isEditMode
                ? 'Cập nhật họ tên, số điện thoại và vai trò công tác (Email và Username cố định theo BR-01).'
                : 'Nhập thông tin nhân sự để cấp tài khoản truy cập hệ thống PCMS.'}
            </p>

            <form onSubmit={handleSaveAccount} noValidate>
              <div className="pcms-form-grid">
                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="acc-fullName">
                    Họ và tên nhân viên *
                  </label>
                  <input
                    id="acc-fullName"
                    name="fullName"
                    type="text"
                    className={`pcms-input ${formErrors.fullName ? 'has-error' : ''}`}
                    placeholder="Ví dụ: BS. Nguyễn Hoàng Nam"
                    value={formData.fullName}
                    onChange={handleFormChange}
                  />
                  {formErrors.fullName ? (
                    <span className="pcms-field-error">{formErrors.fullName}</span>
                  ) : null}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label" htmlFor="acc-username">
                    Tên đăng nhập (Username) *
                  </label>
                  <input
                    id="acc-username"
                    name="username"
                    type="text"
                    disabled={isEditMode}
                    className={`pcms-input ${formErrors.username ? 'has-error' : ''}`}
                    placeholder="Ví dụ: vet.nam"
                    value={formData.username}
                    onChange={handleFormChange}
                  />
                  {formErrors.username ? (
                    <span className="pcms-field-error">{formErrors.username}</span>
                  ) : null}
                </div>

                <div className="pcms-field">
                  <label className="pcms-label" htmlFor="acc-phone">
                    Số điện thoại *
                  </label>
                  <input
                    id="acc-phone"
                    name="phoneNumber"
                    type="tel"
                    className={`pcms-input ${formErrors.phoneNumber ? 'has-error' : ''}`}
                    placeholder="0912345678"
                    value={formData.phoneNumber}
                    onChange={handleFormChange}
                  />
                  {formErrors.phoneNumber ? (
                    <span className="pcms-field-error">{formErrors.phoneNumber}</span>
                  ) : null}
                </div>

                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="acc-email">
                    Địa chỉ Email công vụ *
                  </label>
                  <input
                    id="acc-email"
                    name="email"
                    type="email"
                    disabled={isEditMode}
                    className={`pcms-input ${formErrors.email ? 'has-error' : ''}`}
                    placeholder="nhanvien@pcms.vn"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                  {formErrors.email ? (
                    <span className="pcms-field-error">{formErrors.email}</span>
                  ) : null}
                </div>

                <div className="pcms-field full">
                  <label className="pcms-label" htmlFor="acc-role">
                    Vai trò trong phòng khám *
                  </label>
                  <select
                    id="acc-role"
                    name="roleName"
                    disabled={formData.roleName === 'ADMIN'}
                    className={`pcms-select ${formErrors.roleName ? 'has-error' : ''}`}
                    value={formData.roleName}
                    onChange={handleFormChange}
                  >
                    {formData.roleName === 'ADMIN' ? (
                      <option value="ADMIN">Quản trị viên (ADMIN — Cố định)</option>
                    ) : null}
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.roleName ? (
                    <span className="pcms-field-error">{formErrors.roleName}</span>
                  ) : null}
                </div>

                {!isEditMode ? (
                  <div className="pcms-field full">
                    <label className="pcms-label" htmlFor="acc-pass">
                      Mật khẩu tạm thời ban đầu *
                    </label>
                    <input
                      id="acc-pass"
                      name="temporaryPassword"
                      type="text"
                      className={`pcms-input ${formErrors.temporaryPassword ? 'has-error' : ''}`}
                      placeholder="Tối thiểu 8 ký tự gồm chữ hoa, thường, số"
                      value={formData.temporaryPassword}
                      onChange={handleFormChange}
                    />
                    {formErrors.temporaryPassword ? (
                      <span className="pcms-field-error">{formErrors.temporaryPassword}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="pcms-modal-actions" style={{ marginTop: 22 }}>
                <button
                  type="button"
                  className="pcms-btn pcms-btn-outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="pcms-btn pcms-btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : isEditMode ? 'Lưu cập nhật' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Hộp thoại Xác nhận hành động nguy hiểm */}
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.type === 'RESET_PASSWORD'
            ? 'Xác nhận đặt lại mật khẩu nhân viên'
            : confirmState.nextStatus === 'INACTIVE'
              ? 'Xác nhận vô hiệu hóa tài khoản'
              : 'Xác nhận kích hoạt lại tài khoản'
        }
        description={
          confirmState.type === 'RESET_PASSWORD'
            ? `Hệ thống sẽ sinh một mật khẩu tạm thời mới cho nhân viên "${confirmState.account?.fullName}" (@${confirmState.account?.username}). Mật khẩu cũ sẽ không còn hiệu lực.`
            : confirmState.nextStatus === 'INACTIVE'
              ? `Khi vô hiệu hóa, nhân viên "${confirmState.account?.fullName}" (@${confirmState.account?.username}) sẽ bị thu hồi quyền đăng nhập vào hệ thống PCMS ngay lập tức.`
              : `Kích hoạt lại tài khoản và đặt lại bộ đếm đăng nhập sai về 0 cho nhân viên "${confirmState.account?.fullName}" (@${confirmState.account?.username})?`
        }
        confirmLabel={
          confirmState.type === 'RESET_PASSWORD'
            ? 'Đặt lại mật khẩu'
            : confirmState.nextStatus === 'INACTIVE'
              ? 'Vô hiệu hóa ngay'
              : 'Kích hoạt lại'
        }
        variant={
          confirmState.type === 'RESET_PASSWORD' || confirmState.nextStatus === 'INACTIVE'
            ? 'danger'
            : 'primary'
        }
        loading={confirmState.loading}
        onConfirm={handleConfirmAction}
        onCancel={() =>
          setConfirmState({ open: false, type: null, account: null, nextStatus: null, loading: false })
        }
      />
    </>
  );
}
