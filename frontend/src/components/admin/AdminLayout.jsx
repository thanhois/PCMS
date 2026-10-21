import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

const MAIN_NAV_ITEMS = [
  {
    to: '/admin/overview',
    label: 'Tổng quan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
  },
  {
    to: '/admin/accounts',
    label: 'Tài khoản nhân viên',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/roles',
    label: 'Vai trò & Phân quyền',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    to: '/admin/services',
    label: 'Danh mục dịch vụ',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    to: '/admin/medicines',
    label: 'Danh mục thuốc',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    ),
  },
  {
    to: '/admin/reports',
    label: 'Báo cáo thống kê',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const BOTTOM_NAV_ITEMS = [
  {
    to: '/admin/audit-logs',
    label: 'Nhật ký hệ thống',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    adminApi
      .getOverviewSummary()
      .then((res) => setLowStockCount(Number(res?.kpis?.lowStockMedicines || 0)))
      .catch(() => {});
  }, []);

  // Phím tắt Ctrl+K / Cmd+K focus vào ô tìm kiếm trên Top Bar
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

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
        setNotifOpen(false);
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
    if (q.includes('thuốc') || q.includes('med')) navigate('/admin/medicines');
    else if (q.includes('dịch vụ') || q.includes('service')) navigate('/admin/services');
    else if (q.includes('quyền') || q.includes('role')) navigate('/admin/roles');
    else if (q.includes('log') || q.includes('nhật ký')) navigate('/admin/audit-logs');
    else if (q.includes('báo cáo') || q.includes('report')) navigate('/admin/reports');
    else navigate('/admin/accounts');
  };

  const displayName = user?.fullName || user?.username || 'Admin';
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <div className="pcms-admin-shell">
      {/* ==================== TOP BAR (Tím Gradient) ==================== */}
      <header className="pcms-topbar">
        <div className="pcms-topbar-left">
          <button
            type="button"
            className="pcms-sidebar-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-label="Thu gọn hoặc mở rộng menu trái"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link to="/admin/overview" className="pcms-brand-link">
            <span className="pcms-brand-mark" aria-hidden="true">
              +
            </span>
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Quản trị Phòng khám Thú y</span>
            </div>
          </Link>
        </div>

        {/* Ô tìm kiếm ở giữa */}
        <form className="pcms-topbar-center" onSubmit={handleGlobalSearchSubmit}>
          <div className="pcms-search-box">
            <span className="pcms-search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="search"
              className="pcms-search-input"
              placeholder="Tìm nhanh nhân viên, dịch vụ, thuốc, báo cáo..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            <kbd className="pcms-search-kbd">⌘K</kbd>
          </div>
        </form>

        {/* Cụm thông báo + menu tài khoản bên phải */}
        <div className="pcms-topbar-right" ref={dropdownRef}>
          <div className="pcms-user-menu-wrap">
            <button
              type="button"
              className="pcms-topbar-icon-btn"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setUserMenuOpen(false);
              }}
              aria-label="Thông báo hệ thống"
              title="Cảnh báo hệ thống"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {lowStockCount > 0 ? <span className="pcms-notif-badge">{lowStockCount}</span> : null}
            </button>

            {notifOpen ? (
              <div className="pcms-dropdown-menu" style={{ width: 300 }}>
                <div className="pcms-dropdown-header">
                  <strong>Thông báo quản trị ({lowStockCount})</strong>
                  <span>Cảnh báo tồn kho & nhật ký thực tế</span>
                </div>
                {lowStockCount > 0 ? (
                  <Link
                    to="/admin/medicines"
                    className="pcms-dropdown-item"
                    onClick={() => setNotifOpen(false)}
                  >
                    <span>⚠️ {lowStockCount} mặt hàng thuốc đang chạm/dưới ngưỡng tồn tối thiểu</span>
                  </Link>
                ) : (
                  <div className="pcms-dropdown-item" style={{ color: 'var(--pcms-text-muted)' }}>
                    <span>✓ Hiện không có cảnh báo tồn kho nào</span>
                  </div>
                )}
                <Link
                  to="/admin/audit-logs"
                  className="pcms-dropdown-item"
                  onClick={() => setNotifOpen(false)}
                >
                  <span>📋 Xem nhật ký hoạt động hệ thống</span>
                </Link>
              </div>
            ) : null}
          </div>

          <div className="pcms-user-menu-wrap">
            <button
              type="button"
              className="pcms-user-trigger"
              onClick={() => {
                setUserMenuOpen((prev) => !prev);
                setNotifOpen(false);
              }}
            >
              <span className="pcms-user-avatar">{avatarChar}</span>
              <span>{displayName}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {userMenuOpen ? (
              <div className="pcms-dropdown-menu">
                <div className="pcms-dropdown-header">
                  <strong>{displayName}</strong>
                  <span>{user?.email || 'admin@pcms.vn'} • ADMIN</span>
                </div>
                <Link to="/" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>🏠 Về Trang chủ khách hàng</span>
                </Link>
                <Link
                  to="/admin/audit-logs"
                  className="pcms-dropdown-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <span>🛡️ Nhật ký bảo mật</span>
                </Link>
                <button type="button" className="pcms-dropdown-item danger" onClick={handleLogout}>
                  <span>🚪 Đăng xuất</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ==================== BODY: SIDEBAR + CONTENT ==================== */}
      <div className="pcms-admin-body">
        <aside className={`pcms-sidebar ${collapsed ? 'collapsed' : ''}`}>
          <nav className="pcms-sidebar-nav" aria-label="Menu quản trị chính">
            <div className="pcms-sidebar-section-label">Quản trị hệ thống</div>
            {MAIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `pcms-nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="pcms-nav-icon">{item.icon}</span>
                <span className="pcms-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Nhóm menu dưới cùng tách bằng đường kẻ */}
          <div className="pcms-sidebar-bottom">
            {BOTTOM_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `pcms-nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="pcms-nav-icon">{item.icon}</span>
                <span className="pcms-nav-label">{item.label}</span>
              </NavLink>
            ))}

            <Link
              to="/"
              className="pcms-nav-item"
              title={collapsed ? 'Về Trang chủ' : undefined}
            >
              <span className="pcms-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
              </span>
              <span className="pcms-nav-label">Trang chủ phòng khám</span>
            </Link>

            <div className="pcms-sidebar-meta">
              {!collapsed ? <span>PCMS Admin</span> : null}
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
