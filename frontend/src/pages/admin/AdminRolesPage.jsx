import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import DataTable from '../../components/admin/ui/DataTable';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';

export default function AdminRolesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [accounts, setAccounts] = useState([]);

  const [banner, setBanner] = useState(null);

  // State cho cụm Gán Role nhanh cho tài khoản
  const [selectedUserId, setSelectedUserId] = useState('');
  const [targetRoleName, setTargetRoleName] = useState('VETERINARIAN');
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getRolesAndPermissions();
      setRoles(res.roles || []);
      setPermissions(res.permissions || []);
      setRolePermissions(res.rolePermissions || {});
      setAccounts(res.accounts || []);

      if (res.accounts?.length > 0 && !selectedUserId) {
        const firstStaff = res.accounts.find((a) => a.roleName !== 'ADMIN') || res.accounts[0];
        setSelectedUserId(String(firstStaff.userId));
        setTargetRoleName(firstStaff.roleName === 'ADMIN' ? 'VETERINARIAN' : firstStaff.roleName);
      }
    } catch (err) {
      setError(err?.message || 'Đã có lỗi khi tải dữ liệu phân quyền.');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Xử lý gán Role cho tài khoản nhân viên
  const handleUserSelectChange = (e) => {
    const uid = e.target.value;
    setSelectedUserId(uid);
    const acc = accounts.find((a) => String(a.userId) === String(uid));
    if (acc) {
      setTargetRoleName(acc.roleName);
    }
  };

  const selectedAccount = accounts.find((a) => String(a.userId) === String(selectedUserId));
  const isSameRole = selectedAccount && selectedAccount.roleName === targetRoleName;

  const handleAssignRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !targetRoleName) return;
    if (isSameRole) {
      setBanner({
        type: 'info',
        text: `Nhân viên "${selectedAccount.fullName}" hiện đã có vai trò ${targetRoleName}. Vui lòng chọn vai trò khác nếu muốn thay đổi.`,
      });
      return;
    }

    setAssigning(true);
    setBanner(null);
    try {
      const updated = await adminApi.assignAccountRole(Number(selectedUserId), targetRoleName);
      setAccounts((prev) =>
        prev.map((a) => (a.userId === updated.userId ? updated : a))
      );
      setBanner({
        type: 'success',
        text: `Đã gán vai trò "${targetRoleName}" cho nhân viên "${updated.fullName}" (@${updated.username}).`,
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err?.message || 'Không thể gán vai trò cho tài khoản.',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleQuickRoleChange = async (acc, newRoleName) => {
    if (acc.roleName === newRoleName) return;
    setBanner(null);
    try {
      const updated = await adminApi.assignAccountRole(acc.userId, newRoleName);
      setAccounts((prev) =>
        prev.map((a) => (a.userId === updated.userId ? updated : a))
      );
      setBanner({
        type: 'success',
        text: `Đã cập nhật vai trò của "${updated.fullName}" (@${updated.username}) thành ${newRoleName}.`,
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err?.message || 'Không thể đổi vai trò.',
      });
    }
  };

  const roleColumns = [
    {
      key: 'roleId',
      header: 'ID',
      width: '70px',
      render: (r) => <strong>#{r.roleId}</strong>,
    },
    {
      key: 'roleName',
      header: 'Vai trò (Role)',
      width: '185px',
      render: (r) => <StatusBadge status={r.roleName} />,
    },
    {
      key: 'description',
      header: 'Mô tả chức trách',
      width: '300px',
    },
    {
      key: 'defaultPermissions',
      header: 'Các quyền hạn mặc định của vai trò',
      render: (r) => {
        const permIds = rolePermissions[r.roleName] || [];
        const assignedPerms = permissions.filter((p) => permIds.includes(p.permissionId));
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {assignedPerms.map((p) => (
              <StatusBadge key={p.permissionId} label={p.permissionName} variant="neutral" />
            ))}
          </div>
        );
      },
    },
  ];

  const staffRoleColumns = [
    {
      key: 'userId',
      header: 'Mã NV',
      width: '80px',
      render: (acc) => <strong>#{acc.userId}</strong>,
    },
    {
      key: 'fullName',
      header: 'Nhân viên',
      render: (acc) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--pcms-text-primary)' }}>{acc.fullName}</div>
          <small style={{ color: 'var(--pcms-text-link)' }}>@{acc.username}</small>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'status',
      header: 'Trạng thái TK',
      width: '140px',
      render: (acc) => <StatusBadge status={acc.status} />,
    },
    {
      key: 'roleName',
      header: 'Vai trò hiện tại',
      width: '165px',
      render: (acc) => <StatusBadge status={acc.roleName} />,
    },
    {
      key: 'changeRole',
      header: 'Đổi vai trò nhanh',
      width: '220px',
      render: (acc) =>
        acc.roleName === 'ADMIN' ? (
          <span style={{ fontSize: 12.5, color: 'var(--pcms-text-muted)', fontWeight: 500 }}>
            Cố định (Quản trị viên)
          </span>
        ) : (
          <select
            className="pcms-select"
            style={{ width: '100%', height: 32, fontSize: 12.5 }}
            value={acc.roleName}
            title="Chọn để đổi vai trò nhân viên"
            onChange={(e) => handleQuickRoleChange(acc, e.target.value)}
          >
            {roles
              .filter((r) => r.roleName !== 'PET_OWNER' && r.roleName !== 'ADMIN')
              .map((r) => (
                <option key={r.roleId} value={r.roleName}>
                  {r.roleName}
                </option>
              ))}
          </select>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Vai trò & Phân quyền (Roles & Permissions)"
        subtitle="Xem quyền hạn mặc định của từng vai trò (Bảng Role) và gán vai trò cho tài khoản nhân viên"
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-outline"
            onClick={fetchData}
            disabled={loading}
          >
            ↻ Làm mới
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

      {/* 1. Gán Vai trò cho Tài khoản Nhân viên */}
      {!loading && !error && accounts.length > 0 ? (
        <section className="pcms-card">
          <div className="pcms-card-header">
            <div>
              <h3 className="pcms-card-title">Gán Vai trò cho Tài khoản Nhân viên</h3>
              <p className="pcms-card-subtitle">
                Chọn nhân sự và cấp vai trò tương ứng (hoặc đổi trực tiếp ở bảng danh sách bên dưới)
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAssignRoleSubmit}
            className="pcms-filter-bar"
            style={{ alignItems: 'flex-end', gap: 14 }}
          >
            <div className="pcms-field" style={{ flex: 1, minWidth: 260 }}>
              <label className="pcms-label" htmlFor="assign-user">
                Tài khoản nhân viên
              </label>
              <select
                id="assign-user"
                className="pcms-select"
                value={selectedUserId}
                onChange={handleUserSelectChange}
              >
                {accounts
                  .filter((acc) => acc.roleName !== 'ADMIN')
                  .map((acc) => (
                    <option key={acc.userId} value={acc.userId}>
                      #{acc.userId} — {acc.fullName} (@{acc.username}) [Hiện tại: {acc.roleName}]
                    </option>
                  ))}
              </select>
            </div>

            <div className="pcms-field" style={{ minWidth: 220 }}>
              <label className="pcms-label" htmlFor="assign-role">
                Vai trò cần gán
              </label>
              <select
                id="assign-role"
                className="pcms-select"
                value={targetRoleName}
                onChange={(e) => setTargetRoleName(e.target.value)}
              >
                {roles
                  .filter((r) => r.roleName !== 'PET_OWNER' && r.roleName !== 'ADMIN')
                  .map((r) => (
                    <option key={r.roleId} value={r.roleName}>
                      {r.roleName}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              className="pcms-btn pcms-btn-primary"
              disabled={assigning || isSameRole}
              title={isSameRole ? 'Nhân viên đang ở vai trò này' : ''}
            >
              {assigning ? 'Đang lưu...' : 'Áp dụng vai trò'}
            </button>
          </form>
        </section>
      ) : null}

      {/* 2. Bảng phân công vai trò nhân sự */}
      <DataTable
        title={`Bảng Phân công Vai trò Nhân sự (${accounts.length})`}
        subtitle="Có thể chọn nhanh vai trò ở cột bên phải để thay đổi quyền truy cập của nhân viên"
        columns={staffRoleColumns}
        data={accounts}
        rowKey="userId"
        loading={loading}
        error={error}
        onRetry={fetchData}
      />

      {/* 3. Bảng Vai trò & Quyền mặc định (Read-only) */}
      <DataTable
        title="Danh mục Vai trò & Quyền hạn Mặc định (Bảng Role)"
        subtitle="Quyền hạn được thiết lập mặc định theo từng chức danh trong phòng khám"
        columns={roleColumns}
        data={roles}
        rowKey="roleId"
        loading={loading}
        error={error}
        onRetry={fetchData}
        emptyTitle="Chưa có dữ liệu vai trò"
        emptyMessage="Không tìm thấy danh sách vai trò trong hệ thống."
      />
    </>
  );
}
