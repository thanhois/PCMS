import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import vetApi from '../../api/vetApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/adminTheme.css';
import '../../styles/vetTheme.css';

const MAIN_NAV_ITEMS = [
  { to: '/vet/workbench', label: 'Ca khám hôm nay', hasBadge: true },
  { to: '/vet/records', label: 'Hồ sơ bệnh án' },
  { to: '/vet/pets', label: 'Tra cứu & Bệnh sử thú cưng' },
];

export default function VetLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
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

  const loadSummary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await vetApi.getWorklistSummary({ date: today });
      if (data && data.waitingCount !== undefined) {
        setWaitingCount((data.waitingCount || 0) + (data.inProgressCount || 0));
      }
    } catch {
      // Ignored in background
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    const q = globalSearch.trim().toLowerCase();
    if (!q) return;
    if (q.includes('bệnh án') || q.includes('hồ sơ') || q.includes('mr')) navigate('/vet/records');
    else if (q.includes('pet') || q.includes('thú') || q.includes('bệnh sử')) navigate('/vet/pets');
    else navigate('/vet/workbench');
  };

  const displayName = user?.fullName || user?.username || 'Bác sĩ Thú y';
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

          <Link to="/vet/workbench" className="pcms-brand-link">
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Khám Chữa Bệnh & Bệnh Án</span>
            </div>
          </Link>
        </div>

        <form className="pcms-topbar-center" onSubmit={handleGlobalSearchSubmit}>
          <div className="pcms-search-box">
            <input
              ref={searchInputRef}
              type="search"
              className="pcms-search-input"
              placeholder="Tìm ca khám hôm nay, hồ sơ bệnh án, thú cưng..."
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
              <span>Ca chờ</span>
              {waitingCount > 0 ? <span className="pcms-notif-badge">{waitingCount}</span> : null}
            </button>

            {notifOpen ? (
              <div className="pcms-dropdown-menu" style={{ width: 300 }}>
                <div className="pcms-dropdown-header">
                  <strong>Phòng khám lâm sàng ({waitingCount})</strong>
                  <span>Trạng thái ca bệnh trong ngày</span>
                </div>
                {waitingCount > 0 ? (
                  <Link
                    to="/vet/workbench"
                    className="pcms-dropdown-item"
                    onClick={() => setNotifOpen(false)}
                  >
                    <span>Có {waitingCount} ca đang chờ hoặc đang khám hôm nay</span>
                  </Link>
                ) : (
                  <div className="pcms-dropdown-item" style={{ color: 'var(--pcms-text-muted)' }}>
                    <span>Hiện chưa có ca bệnh nào đang chờ khám</span>
                  </div>
                )}
                <Link
                  to="/vet/records"
                  className="pcms-dropdown-item"
                  onClick={() => setNotifOpen(false)}
                >
                  <span>Tra cứu hồ sơ bệnh án điện tử</span>
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
                  <span>{user?.email || 'vet@pcms.vn'} • {user?.role}</span>
                </div>
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
          <nav className="pcms-sidebar-nav" aria-label="Menu bác sĩ thú y">
            <div className="pcms-sidebar-section-label">Chuyên môn lâm sàng</div>
            {MAIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `pcms-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="pcms-nav-label">{item.label}</span>
                {item.hasBadge && waitingCount > 0 ? (
                  <span className="pcms-nav-count-badge">{waitingCount}</span>
                ) : null}
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
              <span>PCMS Clinical</span>
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
