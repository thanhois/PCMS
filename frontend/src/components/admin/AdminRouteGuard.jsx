import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

/**
 * Route Guard bảo vệ cụm /admin/*:
 * - Chưa đăng nhập (token in-memory trống) -> chuyển hướng về /login kèm vị trí trang cũ.
 * - Đã đăng nhập nhưng không phải role ADMIN -> hiển thị cảnh báo 403.
 */
export default function AdminRouteGuard() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          infoMessage: 'Vui lòng đăng nhập bằng tài khoản Quản trị viên (ADMIN) để truy cập trang quản trị.',
        }}
      />
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="pcms-admin-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div className="pcms-card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h2 className="pcms-card-title" style={{ fontSize: 20, marginBottom: 8 }}>
            403 — Khu vực chỉ dành cho Quản trị viên
          </h2>
          <p className="pcms-card-subtitle" style={{ marginBottom: 20 }}>
            Tài khoản hiện tại (<strong>{user.fullName}</strong> — vai trò <code>{user.role}</code>) không có quyền truy
            cập bảng điều khiển Quản trị hệ thống PCMS.
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
