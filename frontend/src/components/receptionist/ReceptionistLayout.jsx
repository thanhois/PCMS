import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import receptionistApi from '../../api/receptionistApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';

const MAIN_NAV_ITEMS = [
  {
    to: '/receptionist/dashboard',
    label: 'Bàn tiếp đón hôm nay',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
  },
  {
    to: '/receptionist/appointments',
    label: 'Quản lý lịch hẹn',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/receptionist/check-in',
    label: 'Check-in & Walk-in',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    to: '/receptionist/customers',
    label: 'Hồ sơ Chủ nuôi & Thú cưng',
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
    to: '/receptionist/services',
    label: 'Tra cứu bảng giá dịch vụ',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
];

export default function ReceptionistLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    receptionistApi
      .getDashboardSummary()
      .then((res) => setPendingApprovalCount(Number(res?.kpis?.pendingApprovalCount || 0)))
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
    if (q.includes('check') || q.includes('walk') || q.includes('vãng lai')) navigate('/receptionist/check-in');
    else if (q.includes('dịch vụ') || q.includes('giá') || q.includes('service')) navigate('/receptionist/services');
    else if (q.includes('khách') || q.includes('chủ') || q.includes('thú') || q.includes('pet')) navigate('/receptionist/customers');
    else navigate('/receptionist/appointments');
  };

  const displayName = user?.fullName || user?.username || 'Lễ tân';
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
            aria-label="Thu gọn hoặc mở rộng menu trái"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link to="/receptionist/dashboard" className="pcms-brand-link">
            <span className="pcms-brand-mark" aria-hidden="true">
              +
            </span>
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Quầy Lễ tân & Tiếp đón</span>
            </div>
          </Link>
        </div>

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
              placeholder="Tìm lịch hẹn, check-in, chủ nuôi, thú cưng, bảng giá..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            <kbd className="pcms-search-kbd">⌘K</kbd>
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
              aria-label="Thông báo lịch hẹn chờ duyệt"
              title="Lịch hẹn chờ duyệt"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {pendingApprovalCount > 0 ? <span className="pcms-notif-badge">{pendingApprovalCount}</span> : null}
            </button>

            {notifOpen ? (
              <div className="pcms-dropdown-menu" style={{ width: 300 }}>
                <div className="pcms-dropdown-header">
                  <strong>Thông báo Lễ tân ({pendingApprovalCount})</strong>
                  <span>Yêu cầu đặt lịch trực tuyến</span>
                </div>
                {pendingApprovalCount > 0 ? (
                  <Link
                    to="/receptionist/appointments"
                    className="pcms-dropdown-item"
                    onClick={() => setNotifOpen(false)}
                  >
                    <span>⏳ Có {pendingApprovalCount} yêu cầu đặt lịch đang chờ Lễ tân phê duyệt</span>
                  </Link>
                ) : (
                  <div className="pcms-dropdown-item" style={{ color: 'var(--pcms-text-muted)' }}>
                    <span>✓ Tất cả yêu cầu đặt lịch đã được xử lý</span>
                  </div>
                )}
                <Link
                  to="/receptionist/check-in"
                  className="pcms-dropdown-item"
                  onClick={() => setNotifOpen(false)}
                >
                  <span>🐾 Mở màn hình Check-in & Tiếp nhận Walk-in</span>
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
                  <span>{user?.email || 'receptionist@pcms.vn'} • {user?.role}</span>
                </div>
                <Link to="/" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span>🏠 Về Trang chủ phòng khám</span>
                </Link>
                {user?.role === 'ADMIN' ? (
                  <Link to="/admin/overview" className="pcms-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <span>⚙️ Chuyển sang Cổng Quản trị (Admin)</span>
                  </Link>
                ) : null}
                <button type="button" className="pcms-dropdown-item danger" onClick={handleLogout}>
                  <span>🚪 Đăng xuất</span>
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
                className={({ isActive }) => `pcms-nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="pcms-nav-icon">{item.icon}</span>
                <span className="pcms-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="pcms-sidebar-bottom">
            <Link to="/" className="pcms-nav-item" title={collapsed ? 'Về Trang chủ' : undefined}>
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
              {!collapsed ? <span>PCMS Reception</span> : null}
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
