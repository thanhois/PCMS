import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

const MAIN_NAV_ITEMS = [
  { to: '/admin/overview', label: 'Tổng quan' },
  { to: '/admin/accounts', label: 'Tài khoản nhân viên' },
  { to: '/admin/roles', label: 'Vai trò & Phân quyền' },
  { to: '/admin/services', label: 'Danh mục dịch vụ' },
  { to: '/admin/medicines', label: 'Danh mục thuốc' },
  { to: '/admin/reports', label: 'Báo cáo thống kê' },
  { to: '/admin/batches', label: 'Quản lý lô thuốc' },
  { to: '/admin/billing', label: 'Thanh toán hóa đơn' },
];

const BOTTOM_NAV_ITEMS = [
  { to: '/admin/audit-logs', label: 'Nhật ký hệ thống' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

    if (q.includes('kho') || q.includes('lô thuốc') || q.includes('batch')) {
      navigate('/admin/batches');
    } else if (q.includes('hóa đơn') || q.includes('thanh toán') || q.includes('billing')) {
      navigate('/admin/billing');
    } else if (q.includes('thuốc') || q.includes('med')) {
      navigate('/admin/medicines');
    } else if (q.includes('dịch vụ') || q.includes('service')) {
      navigate('/admin/services');
    } else if (q.includes('quyền') || q.includes('role')) {
      navigate('/admin/roles');
    } else if (q.includes('log') || q.includes('nhật ký')) {
      navigate('/admin/audit-logs');
    } else if (q.includes('báo cáo') || q.includes('report')) {
      navigate('/admin/reports');
    } else {
      navigate('/admin/accounts');
    }
  };

  const displayName = user?.fullName || user?.username || 'Admin';
  const avatarChar = displayName.charAt(0).toUpperCase();

  const isItemActive = (to) => {
    if (to === '/admin/overview') {
      return location.pathname === '/admin/overview' || location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

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

          <Link to="/admin/overview" className="pcms-brand-link">
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Quản trị Phòng khám Thú y</span>
            </div>
          </Link>
        </div>

        <form className="pcms-topbar-center" onSubmit={handleGlobalSearchSubmit}>
          <div className="pcms-search-box">
            <input
              ref={searchInputRef}
              type="search"
              className="pcms-search-input"
              placeholder="Tìm nhanh nhân viên, dịch vụ, thuốc, báo cáo..."
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
              className="pcms-topbar-icon-btn"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setUserMenuOpen(false);
              }}
            >
              <span>Thông báo</span>
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
                    <span>{lowStockCount} mặt hàng thuốc đang chạm/dưới ngưỡng tồn tối thiểu</span>
                  </Link>
                ) : (
                  <div className="pcms-dropdown-item" style={{ color: 'var(--pcms-text-muted)' }}>
                    <span>Hiện không có cảnh báo tồn kho nào</span>
                  </div>
                )}
                <Link
                  to="/admin/audit-logs"
                  className="pcms-dropdown-item"
                  onClick={() => setNotifOpen(false)}
                >
                  <span>Xem nhật ký hoạt động hệ thống</span>
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
            </button>

            {userMenuOpen ? (
              <div className="pcms-dropdown-menu">
                <div className="pcms-dropdown-header">
                  <strong>{displayName}</strong>
                  <span>{user?.email || 'admin@pcms.vn'} • ADMIN</span>
                </div>
                <Link to="/profile" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Hồ sơ & Đổi mật khẩu</span>
                </Link>
                <Link to="/" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>Về Trang chủ khách hàng</span>
                </Link>
                <Link
                  to="/admin/audit-logs"
                  className="pcms-dropdown-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <span>Nhật ký bảo mật</span>
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
        <aside className={`pcms-sidebar no-print ${collapsed ? 'collapsed' : ''}`}>
          <nav className="pcms-sidebar-nav" aria-label="Menu quản trị chính">
            <div className="pcms-sidebar-section-label">Quản trị hệ thống</div>
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
            {BOTTOM_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={() => `pcms-nav-item ${isItemActive(item.to) ? 'active' : ''}`}
              >
                <span className="pcms-nav-label">{item.label}</span>
              </NavLink>
            ))}

            <Link to="/" className="pcms-nav-item">
              <span className="pcms-nav-label">Trang chủ phòng khám</span>
            </Link>

            <div className="pcms-sidebar-meta">
              <span>PCMS Admin</span>
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
