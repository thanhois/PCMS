import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../common/NotificationBell';
import '../../styles/adminTheme.css';

const MAIN_NAV_ITEMS = [
  { to: '/receptionist/dashboard', label: 'Bàn tiếp đón hôm nay' },
  { to: '/receptionist/appointments', label: 'Quản lý lịch hẹn' },
  { to: '/receptionist/check-in', label: 'Check-in & Walk-in' },
  { to: '/receptionist/customers', label: 'Hồ sơ Chủ nuôi & Thú cưng' },
  { to: '/receptionist/services', label: 'Tra cứu bảng giá dịch vụ' },
  { to: '/receptionist/billing', label: 'Thu ngân & Hóa đơn' },
];

export default function ReceptionistLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    const q = globalSearch.trim().toLowerCase();
    if (!q) return;
    if (q.includes('hóa đơn') || q.includes('thanh toán') || q.includes('billing') || q.includes('thu ngân')) navigate('/receptionist/billing');
    else if (q.includes('check') || q.includes('walk') || q.includes('vãng lai')) navigate('/receptionist/check-in');
    else if (q.includes('dịch vụ') || q.includes('giá') || q.includes('service')) navigate('/receptionist/services');
    else if (q.includes('khách') || q.includes('chủ') || q.includes('thú') || q.includes('pet')) navigate('/receptionist/customers');
    else navigate('/receptionist/appointments');
  };

  const displayName = user?.fullName || user?.username || 'Lễ tân';
  const avatarChar = displayName.charAt(0).toUpperCase();

  const isItemActive = (to) => {
    if (to === '/receptionist/dashboard') {
      return location.pathname === '/receptionist/dashboard' || location.pathname === '/receptionist' || location.pathname === '/receptionist/';
    }
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

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

          <Link to="/receptionist/dashboard" className="pcms-brand-link">
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Quầy Lễ tân & Tiếp đón</span>
            </div>
          </Link>
        </div>

        <form className="pcms-topbar-center" onSubmit={handleGlobalSearchSubmit}>
          <div className="pcms-search-box">
            <input
              ref={searchInputRef}
              type="search"
              className="pcms-search-input"
              placeholder="Tìm lịch hẹn, check-in, chủ nuôi, thú cưng, bảng giá..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            <kbd className="pcms-search-kbd">Ctrl+K</kbd>
          </div>
        </form>

        <div className="pcms-topbar-right" ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NotificationBell variant="purple" />

          <div className="pcms-user-menu-wrap">
            <button
              type="button"
              className="pcms-user-trigger"
              onClick={() => {
                setUserMenuOpen((prev) => !prev);
              }}
            >
              <span className="pcms-user-avatar">{avatarChar}</span>
              <span>{displayName}</span>
            </button>

            {userMenuOpen ? (
              <div className="pcms-dropdown-menu">
                <div className="pcms-dropdown-header">
                  <strong>{displayName}</strong>
                  <span>{user?.email || 'receptionist@pcms.vn'} • {user?.role}</span>
                </div>
                <Link to="/profile" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Hồ sơ & Đổi mật khẩu</span>
                </Link>
                <Link to="/" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Về Trang chủ phòng khám</span>
                </Link>
                {user?.role === 'ADMIN' ? (
                  <Link to="/admin/overview" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <span>Chuyển sang Cổng Quản trị (Admin)</span>
                  </Link>
                ) : null}
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
          <nav className="pcms-sidebar-nav" aria-label="Menu lễ tân chính">
            <div className="pcms-sidebar-section-label">Nghiệp vụ Lễ tân</div>
            {MAIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={() => `pcms-nav-item ${isItemActive(item.to) ? 'active' : ''}`}
              >
                <span className="pcms-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="pcms-sidebar-bottom">
            {user?.role === 'ADMIN' ? (
              <Link to="/admin/overview" className="pcms-nav-item">
                <span className="pcms-nav-label">Cổng Quản trị Admin</span>
              </Link>
            ) : null}
            <Link to="/" className="pcms-nav-item">
              <span className="pcms-nav-label">Trang chủ phòng khám</span>
            </Link>

            <div className="pcms-sidebar-meta">
              <span>PCMS Reception</span>
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
