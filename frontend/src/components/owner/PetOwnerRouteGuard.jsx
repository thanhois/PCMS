
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PetOwnerRouteGuard() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          infoMessage: 'Vui lòng đăng nhập để xem thông tin thú cưng và hóa đơn.',
        }}
      />
    );
  }

  if (user.role !== 'PET_OWNER') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>403 — Không có quyền truy cập</h2>

        <p>
          Tài khoản hiện tại ({user.fullName} — vai trò {user.role})
          không có quyền truy cập khu vực dành cho chủ thú cưng.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <Link to="/">Về trang chủ</Link>

          <button type="button" onClick={logout}>
            Đăng nhập tài khoản khác
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
