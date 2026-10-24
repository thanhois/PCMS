import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/vetTheme.css';

/**
 * Route Guard bảo vệ cụm /vet/*:
 * - Yêu cầu đăng nhập.
 * - Chỉ cho phép role VETERINARIAN hoặc ADMIN truy cập.
 */
export default function VetRouteGuard() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          infoMessage: 'Vui lòng đăng nhập bằng tài khoản Bác sĩ thú y để truy cập Bàn làm việc chuyên môn.',
        }}
      />
    );
  }

  const role = user.role;
  if (role !== 'VETERINARIAN' && role !== 'ADMIN') {
    return (
      <div className="vet-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div className="vet-card" style={{ maxWidth: 480, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧑‍⚕️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
            403 — Khu vực dành riêng cho Bác sĩ thú y
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Tài khoản hiện tại của bạn (<strong>{user.fullName}</strong> — vai trò <code>{user.role}</code>) không có quyền truy cập Bàn làm việc lâm sàng & Bệnh án của Bác sĩ thú y.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Link to="/" className="vet-btn vet-btn-outline">
              Về trang chủ
            </Link>
            <button type="button" className="vet-btn vet-btn-primary" onClick={logout}>
              Đăng nhập tài khoản Bác sĩ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
