import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import DataTable from '../../components/admin/ui/DataTable';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import { exportToCsv } from '../../utils/csvExport';

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động' },
  { value: 'LOGIN', label: 'Đăng nhập (LOGIN)' },
  { value: 'REGISTER_ACCOUNT', label: 'Đăng ký tài khoản (REGISTER_ACCOUNT)' },
  { value: 'CREATE_ACCOUNT', label: 'Tạo tài khoản (CREATE_ACCOUNT)' },
  { value: 'UPDATE_ACCOUNT', label: 'Cập nhật tài khoản (UPDATE_ACCOUNT)' },
  { value: 'ASSIGN_ROLE', label: 'Gán vai trò (ASSIGN_ROLE)' },
  { value: 'LOCK_ACCOUNT', label: 'Khóa tài khoản tự động (LOCK_ACCOUNT)' },
  { value: 'DEACTIVATE_ACCOUNT', label: 'Vô hiệu hóa tài khoản (DEACTIVATE_ACCOUNT)' },
  { value: 'ACTIVATE_ACCOUNT', label: 'Kích hoạt tài khoản (ACTIVATE_ACCOUNT)' },
  { value: 'RESET_PASSWORD', label: 'Đặt lại mật khẩu (RESET_PASSWORD)' },
  { value: 'CREATE_SERVICE', label: 'Thêm dịch vụ (CREATE_SERVICE)' },
  { value: 'UPDATE_SERVICE', label: 'Cập nhật dịch vụ (UPDATE_SERVICE)' },
  { value: 'DEACTIVATE_SERVICE', label: 'Vô hiệu hóa dịch vụ (DEACTIVATE_SERVICE)' },
  { value: 'ACTIVATE_SERVICE', label: 'Kích hoạt dịch vụ (ACTIVATE_SERVICE)' },
  { value: 'CREATE_MEDICINE', label: 'Thêm thuốc (CREATE_MEDICINE)' },
  { value: 'UPDATE_MEDICINE', label: 'Cập nhật thuốc (UPDATE_MEDICINE)' },
  { value: 'DEACTIVATE_MEDICINE', label: 'Vô hiệu hóa thuốc (DEACTIVATE_MEDICINE)' },
  { value: 'ACTIVATE_MEDICINE', label: 'Kích hoạt thuốc (ACTIVATE_MEDICINE)' },
  { value: 'CONFIRM_PAYMENT', label: 'Xác nhận thanh toán (CONFIRM_PAYMENT)' },
  { value: 'CREATE_MEDICAL_RECORD', label: 'Tạo hồ sơ bệnh án (CREATE_MEDICAL_RECORD)' },
];

const ACTION_BADGE_MAP = {
  LOGIN: { label: 'Đăng nhập', variant: 'info' },
  REGISTER_ACCOUNT: { label: 'Đăng ký TK', variant: 'success' },
  UPDATE_PERMISSION: { label: 'Phân quyền', variant: 'purple' },
  ASSIGN_ROLE: { label: 'Gán vai trò', variant: 'purple' },
  CREATE_ACCOUNT: { label: 'Tạo tài khoản', variant: 'info' },
  UPDATE_ACCOUNT: { label: 'Cập nhật TK', variant: 'info' },
  LOCK_ACCOUNT: { label: 'Khóa tài khoản', variant: 'danger' },
  DEACTIVATE_ACCOUNT: { label: 'Vô hiệu hóa TK', variant: 'danger' },
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
  CREATE_MEDICAL_RECORD: { label: 'Lập bệnh án', variant: 'info' },
};

export default function AdminAuditLogsPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    adminApi
      .getAccounts({ page: 1, pageSize: 50 })
      .then((res) => setStaffList(res.items || []))
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError('Khoảng ngày không hợp lệ: "Từ ngày" không được lớn hơn "Đến ngày".');
      return;
    }
    setDateError('');
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getAuditLogs({
        fromDate,
        toDate,
        username: usernameFilter,
        actionType: actionFilter,
      });

      const q = keyword.trim().toLowerCase();
      const filteredByKeyword = !q
        ? res
        : res.filter(
            (item) =>
              item.actionDetails.toLowerCase().includes(q) ||
              item.targetEntity.toLowerCase().includes(q) ||
              item.fullName.toLowerCase().includes(q) ||
              item.username.toLowerCase().includes(q)
          );

      setLogs(filteredByKeyword);
    } catch (err) {
      setError(err?.message || 'Đã có lỗi khi tải nhật ký hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, usernameFilter, actionFilter, keyword]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setDateError('');
    setUsernameFilter('ALL');
    setActionFilter('ALL');
    setKeyword('');
  };

  const handleExportCsv = () => {
    exportToCsv(
      'nhat-ky-he-thong-audit-log.csv',
      [
        { header: 'Mã Log (logId)', accessor: (r) => r.logId },
        { header: 'Thời gian (actionTime)', accessor: (r) => r.actionTime.replace('T', ' ') },
        { header: 'Người thực hiện', accessor: (r) => `${r.fullName} (@${r.username})` },
        { header: 'Hành động', accessor: (r) => r.actionType },
        { header: 'Đối tượng tác động', accessor: (r) => r.targetEntity },
        { header: 'Chi tiết thao tác (actionDetails)', accessor: (r) => r.actionDetails },
      ],
      logs
    );
  };

  const columns = [
    {
      key: 'logId',
      header: 'Mã Log',
      width: '85px',
      render: (r) => <strong>#{r.logId}</strong>,
    },
    {
      key: 'actionTime',
      header: 'Thời gian (actionTime)',
      width: '165px',
      render: (r) => (
        <span style={{ color: 'var(--pcms-text-link)', fontWeight: 500 }}>
          {r.actionTime.replace('T', ' ')}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Người thực hiện',
      width: '195px',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--pcms-text-primary)' }}>{r.fullName}</div>
          <small style={{ color: 'var(--pcms-text-muted)' }}>@{r.username}</small>
        </div>
      ),
    },
    {
      key: 'actionType',
      header: 'Hành động',
      width: '160px',
      render: (r) => {
        const mapped = ACTION_BADGE_MAP[r.actionType] || {
          label: r.actionType,
          variant: 'neutral',
        };
        return <StatusBadge label={mapped.label} variant={mapped.variant} />;
      },
    },
    {
      key: 'targetEntity',
      header: 'Đối tượng',
      width: '210px',
      render: (r) => <code>{r.targetEntity}</code>,
    },
    {
      key: 'actionDetails',
      header: 'Nội dung chi tiết (actionDetails)',
      render: (r) => r.actionDetails,
    },
  ];

  return (
    <>
      <PageHeader
        title="Nhật ký Hệ thống (Audit Log)"
        subtitle="Theo dõi toàn bộ lịch sử thao tác người dùng (thời gian, người thực hiện, hành động, đối tượng) để kiểm toán bảo mật"
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-outline"
            onClick={fetchLogs}
            disabled={loading}
          >
            ↻ Làm mới
          </button>
        }
      />

      {/* Bộ lọc ngày / người thực hiện / hành động */}
      <section className="pcms-card" style={{ padding: '14px 20px' }}>
        <div className="pcms-filter-bar">
          <input
            type="search"
            className="pcms-input"
            style={{ minWidth: 230 }}
            placeholder="Tìm trong chi tiết hoặc đối tượng..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          <select
            className="pcms-select"
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            aria-label="Lọc theo người thực hiện"
          >
            <option value="ALL">Tất cả người thực hiện</option>
            {staffList.map((u) => (
              <option key={u.userId} value={u.username}>
                {u.fullName} (@{u.username})
              </option>
            ))}
          </select>

          <select
            className="pcms-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Lọc theo hành động"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className="pcms-label" htmlFor="log-from">
            Từ ngày:
          </label>
          <input
            id="log-from"
            type="date"
            max={toDate || undefined}
            className={`pcms-input ${dateError ? 'has-error' : ''}`}
            value={fromDate}
            onChange={handleFromDateChange}
            title="Từ ngày"
          />

          <label className="pcms-label" htmlFor="log-to">
            Đến ngày:
          </label>
          <input
            id="log-to"
            type="date"
            min={fromDate || undefined}
            className={`pcms-input ${dateError ? 'has-error' : ''}`}
            value={toDate}
            onChange={handleToDateChange}
            title="Đến ngày"
          />

          <button type="button" className="pcms-btn pcms-btn-outline" onClick={handleResetFilters}>
            Xóa lọc
          </button>
          {dateError ? <span className="pcms-field-error">{dateError}</span> : null}
        </div>
      </section>

      <DataTable
        title={`Lịch sử Nhật ký Hoạt động (${logs.length} bản ghi)`}
        subtitle="Dữ liệu trích xuất từ bảng AuditLog (logId, userId, actionTime, actionDetails)"
        columns={columns}
        data={logs}
        rowKey="logId"
        loading={loading}
        error={error}
        onRetry={fetchLogs}
        onExportCsv={handleExportCsv}
        emptyTitle="Không có bản ghi nhật ký nào"
        emptyMessage="Chưa có hoạt động nào khớp với điều kiện lọc ngày, người thực hiện hoặc hành động."
      />
    </>
  );
}
