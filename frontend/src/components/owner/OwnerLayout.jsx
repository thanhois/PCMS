import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';
import '../../styles/vetTheme.css';

const MAIN_NAV_ITEMS = [
  { to: '/owner/booking', label: 'Đặt lịch khám trực tuyến' },
  { to: '/owner/medical-history', label: 'Sổ khám bệnh điện tử' },
];

export default function OwnerLayout() {
  const { user, isAuthenticated, isLoggingOut, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                infoMessage: 'Vui lòng đăng nhập để sử dụng cổng dịch vụ Chủ thú cưng.',
              }
        }
      />
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    const q = globalSearch.trim().toLowerCase();
    if (!q) return;
    if (q.includes('sổ') || q.includes('bệnh') || q.includes('thuốc') || q.includes('khám cũ')) {
      navigate('/owner/medical-history');
    } else {
      navigate('/owner/booking');
    }
  };

  const displayName = user?.fullName || user?.username || 'Chủ nuôi';
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <div className="pcms-admin-shell">
      <header className="pcms-topbar">
        <div className="pcms-topbar-left">
          <button
            type="button"
            className="pcms-sidebar-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            Menu
          </button>

          <Link to="/owner/booking" className="pcms-brand-link">
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Cổng Dịch vụ Chủ thú cưng</span>
            </div>
          </Link>
        </div>

        <form className="pcms-topbar-center" onSubmit={handleGlobalSearchSubmit}>
          <div className="pcms-search-box">
            <input
              ref={searchInputRef}
              type="search"
              className="pcms-search-input"
              placeholder="Chuyển nhanh đến đặt lịch khám, sổ khám bệnh điện tử..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            <kbd className="pcms-search-kbd">Ctrl+K</kbd>
          </div>
        </form>

        <div className="pcms-topbar-right" ref={dropdownRef}>
          <div className="pcms-user-menu-wrap">
            <button
              type="button"
              className="pcms-user-trigger"
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              <span className="pcms-user-avatar">{avatarChar}</span>
              <span>{displayName}</span>
            </button>

            {userMenuOpen ? (
              <div className="pcms-dropdown-menu">
                <div className="pcms-dropdown-header">
                  <strong>{displayName}</strong>
                  <span>{user?.email || 'owner@pcms.vn'} • Chủ thú cưng</span>
                </div>
                <Link to="/profile" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Hồ sơ & Đổi mật khẩu</span>
                </Link>
                <Link to="/owner/booking" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Đặt lịch khám trực tuyến</span>
                </Link>
                <Link to="/owner/medical-history" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Sổ khám bệnh điện tử</span>
                </Link>
                <Link to="/" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Về Trang chủ phòng khám</span>
                </Link>
                <button type="button" className="pcms-dropdown-item danger" onClick={handleLogout}>
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="pcms-admin-body">
        <aside className={`pcms-sidebar ${collapsed ? 'collapsed' : ''}`}>
          <nav className="pcms-sidebar-nav" aria-label="Menu chủ thú cưng">
            <div className="pcms-sidebar-section-label">Dịch vụ Khách hàng</div>
            {MAIN_NAV_ITEMS.map((item) => {
              const isBookingAlias =
                item.to === '/owner/booking' &&
                (location.pathname === '/booking' || location.pathname === '/owner/booking');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `pcms-nav-item ${isActive || isBookingAlias ? 'active' : ''}`
                  }
                >
                  <span className="pcms-nav-label">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="pcms-sidebar-bottom">
            <Link to="/" className="pcms-nav-item">
              <span className="pcms-nav-label">Trang chủ phòng khám</span>
            </Link>

            <div className="pcms-sidebar-meta">
              <span>PCMS Portal</span>
              <span>v1.0</span>
            </div>
          </div>
        </aside>

        <main className="pcms-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
