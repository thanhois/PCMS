import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

/**
 * Route Guard bảo vệ cụm /receptionist/*:
 * - Chưa đăng nhập -> chuyển hướng về /login.
 * - Cho phép RECEPTIONIST và ADMIN truy cập.
 */
export default function ReceptionistRouteGuard() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          infoMessage: 'Vui lòng đăng nhập bằng tài khoản Lễ tân (RECEPTIONIST) để truy cập bàn tiếp đón.',
        }}
      />
    );
  }

  if (user.role !== 'RECEPTIONIST' && user.role !== 'ADMIN') {
    return (
      <div className="pcms-admin-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div className="pcms-card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h2 className="pcms-card-title" style={{ fontSize: 20, marginBottom: 8 }}>
            403 — Khu vực dành cho Lễ tân
          </h2>
          <p className="pcms-card-subtitle" style={{ marginBottom: 20 }}>
            Tài khoản hiện tại (<strong>{user.fullName}</strong> — vai trò <code>{user.role}</code>) không có quyền truy
            cập khu vực nghiệp vụ Lễ tân PCMS.
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
