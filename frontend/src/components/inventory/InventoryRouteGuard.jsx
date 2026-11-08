import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

export default function InventoryRouteGuard() {
  const { isAuthenticated, isLoggingOut, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={
          isLoggingOut
            ? null
            : {
                from: location.pathname,
                infoMessage: 'Vui lòng đăng nhập để truy cập khu vực quản lý kho.',
              }
        }
      />
    );
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/batches" replace />;
  }

  const allowedRoles = ['INVENTORY_MANAGER'];

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="pcms-admin-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div className="pcms-card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h2 className="pcms-card-title" style={{ fontSize: 20, marginBottom: 8 }}>
            403 — Khu vực dành cho Quản lý kho
          </h2>
          <p className="pcms-card-subtitle" style={{ marginBottom: 20 }}>
            Tài khoản hiện tại (<strong>{user.fullName}</strong> — vai trò <code>{user.role}</code>) không có quyền truy
            cập phân hệ Quản lý Kho Dược phẩm PCMS.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <Link to="/" className="pcms-btn pcms-btn-outline">
              Về trang chủ
            </Link>
            <button type="button" className="pcms-btn pcms-btn-primary" onClick={logout}>
              Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
