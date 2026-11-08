import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

export default function BillingRouteGuard() {
  const { isAuthenticated, isLoggingOut, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
                infoMessage: 'Vui lòng đăng nhập để truy cập phân hệ thanh toán.',
              }
        }
      />
    );
  }

  if (user.role === 'ADMIN') {
    const adminPath = location.pathname.replace(/^\/billing/, '/admin/billing');
    return <Navigate to={adminPath || '/admin/billing'} replace />;
  }

  const allowedRoles = ['RECEPTIONIST'];

  if (!allowedRoles.includes(user.role)) {
    const handleLogout = () => {
      logout();
      navigate('/login', { replace: true });
    };

    return (
      <div className="pcms-admin-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div className="pcms-card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h2 className="pcms-card-title" style={{ fontSize: 20, marginBottom: 8 }}>
            403 — Khu vực dành cho Thu ngân & Lễ tân
          </h2>
          <p className="pcms-card-subtitle" style={{ marginBottom: 20 }}>
            Tài khoản hiện tại (<strong>{user.fullName}</strong> — vai trò <code>{user.role}</code>) không có quyền truy
            cập phân hệ Thanh toán Hóa đơn PCMS.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <Link to="/" className="pcms-btn pcms-btn-outline">
              Về trang chủ
            </Link>
            <button type="button" className="pcms-btn pcms-btn-primary" onClick={handleLogout}>
              Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
