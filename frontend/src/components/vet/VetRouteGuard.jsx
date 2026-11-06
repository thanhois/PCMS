import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

export default function VetRouteGuard() {
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
                infoMessage: 'Vui lòng đăng nhập bằng tài khoản Bác sĩ thú y để truy cập Bàn làm việc chuyên môn.',
              }
        }
      />
    );
  }

  const role = user.role;
  if (role !== 'VETERINARIAN' && role !== 'ADMIN') {
    return (
      <div className="pcms-admin-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div className="pcms-card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h2 className="pcms-card-title" style={{ fontSize: 20, marginBottom: 8 }}>
            403 — Khu vực dành cho Bác sĩ thú y
          </h2>
          <p className="pcms-card-subtitle" style={{ marginBottom: 20 }}>
            Tài khoản hiện tại (<strong>{user.fullName}</strong> — vai trò <code>{user.role}</code>) không có quyền truy
            cập Bàn làm việc lâm sàng & Bệnh án của Bác sĩ thú y.
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
