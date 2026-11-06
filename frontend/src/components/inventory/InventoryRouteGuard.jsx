import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

  // Cho phép ADMIN và INVENTORY_MANAGER truy cập kho.
  const allowedRoles = ['ADMIN', 'INVENTORY_MANAGER'];

  if (!allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>403 — Không có quyền truy cập</h2>

        <p>
          Tài khoản của bạn không được phép truy cập phân hệ quản lý kho.
        </p>

        <p>
          Vai trò hiện tại: <strong>{user.role}</strong>
        </p>

        <Link to="/">Về trang chủ</Link>

        <button
          type="button"
          onClick={logout}
          style={{ marginLeft: 12 }}
        >
          Đăng nhập tài khoản khác
        </button>
      </div>
    );
  }

  return <Outlet />;
}