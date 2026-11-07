import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

const MAIN_NAV_ITEMS = [
  { to: '/inventory/batches', label: 'Quản lý lô tồn kho' },
  { to: '/inventory/medicines', label: 'Danh mục thuốc' },
  { to: '/inventory/services', label: 'Danh mục dịch vụ' },
  { to: '/inventory/reports', label: 'Báo cáo tồn kho' },
];

export default function InventoryLayout() {
  const { user, logout } = useAuth();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    navigate('/inventory/batches');
  };

  const displayName = user?.fullName || user?.username || 'Thủ kho';
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <div className="pcms-admin-shell">
      <header className="pcms-topbar no-print">
        <div className="pcms-topbar-left">
          <button
            type="button"
            className="pcms-sidebar-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            Menu
          </button>

          <Link to="/inventory/batches" className="pcms-brand-link">
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Quản lý Kho & Danh mục</span>
            </div>
          </Link>
        </div>

        <form className="pcms-topbar-center" onSubmit={handleGlobalSearchSubmit}>
          <div className="pcms-search-box">
            <input
              ref={searchInputRef}
              type="search"
              className="pcms-search-input"
              placeholder="Tra cứu nhanh lô thuốc, nhà cung cấp, hạn sử dụng..."
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
                  <span>{user?.email || 'inventory@pcms.vn'} • {user?.role}</span>
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
        <aside className={`pcms-sidebar no-print ${collapsed ? 'collapsed' : ''}`}>
          <nav className="pcms-sidebar-nav" aria-label="Menu quản lý kho">
            <div className="pcms-sidebar-section-label">Nghiệp vụ Thủ kho</div>
            {MAIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `pcms-nav-item ${isActive ? 'active' : ''}`}
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
              <span>PCMS Inventory</span>
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
