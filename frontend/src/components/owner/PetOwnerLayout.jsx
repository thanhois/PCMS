
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/petOwnerLayout.css';

export default function PetOwnerLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="pet-owner-layout">
      {/* Header */}
      <header className="pet-owner-header">
        <div className="pet-owner-header-inner">
          {/* Brand */}
          <NavLink to="/owner" className="pet-owner-brand">
            Veterian
          </NavLink>

          {/* Navigation */}
          <nav className="pet-owner-nav">
            <NavLink
              to="/owner"
              end
              className={({ isActive }) =>
                `pet-owner-nav-link ${isActive ? 'active' : ''}`
              }
            >
              Trang chủ
            </NavLink>

            <NavLink
              to="/booking"
              className={({ isActive }) =>
                `pet-owner-nav-link ${isActive ? 'active' : ''}`
              }
            >
              Đặt lịch khám
            </NavLink>

            <NavLink
              to="/owner/medical-history"
              className={({ isActive }) =>
                `pet-owner-nav-link ${isActive ? 'active' : ''}`
              }
            >
              Sổ khám bệnh
            </NavLink>

            <NavLink
              to="/owner/invoices"
              className={({ isActive }) =>
                `pet-owner-nav-link ${isActive ? 'active' : ''}`
              }
            >
              Hóa đơn của tôi
            </NavLink>
          </nav>

          {/* User information */}
          <div className="pet-owner-user">
            <span className="pet-owner-user-name">
              Xin chào, {user?.fullName || 'Chủ thú cưng'}
            </span>

            <button
              type="button"
              className="pet-owner-logout"
              onClick={logout}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="pet-owner-main">
        <Outlet />
      </main>
    </div>
  );
}
