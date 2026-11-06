import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VeterianCloudPaw } from './VeterianLogo';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'VETERINARIAN':
        return 'Bác sĩ thú y';
      case 'RECEPTIONIST':
        return 'Lễ tân';
      case 'INVENTORY_MANAGER':
        return 'Thủ kho';
      case 'PET_OWNER':
      default:
        return 'Chủ thú cưng';
    }
  };

  return (
    <header className="vtn-navbar">
      <div className="vtn-container vtn-navbar-inner">
        <div className="vtn-navbar-left">
          <Link to="/" className="vtn-logo-link">
            <VeterianCloudPaw size={34} />
            <span className="vtn-logo-text">PCMS</span>
          </Link>

          <nav className={`vtn-nav-menu ${menuOpen ? 'open' : ''}`}>
            <Link to="/booking" onClick={() => setMenuOpen(false)} style={{ color: '#a78bfa', fontWeight: 700 }}>📅 Đặt lịch khám</Link>
            <a href="#features" onClick={() => setMenuOpen(false)}>Tính năng</a>
            <a href="#services" onClick={() => setMenuOpen(false)}>Dịch vụ</a>
            <a href="#workflow" onClick={() => setMenuOpen(false)}>Quy trình</a>
            <a href="#all-features" onClick={() => setMenuOpen(false)}>Tiện ích</a>
          </nav>
        </div>

        <div className="vtn-navbar-right">
          {isAuthenticated && user ? (
            <div className="vtn-user-pill">
              <span className="vtn-user-avatar">
                {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
              </span>
              <div className="vtn-user-info">
                <strong>{user.fullName}</strong>
                <small>{getRoleLabel(user.role)}</small>
              </div>
              {user.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin/overview"
                    className="vtn-btn-yellow"
                    style={{ padding: '6px 12px', fontSize: 12.5, textDecoration: 'none' }}
                  >
                    Trang Quản trị
                  </Link>
                  <Link
                    to="/receptionist/dashboard"
                    style={{
                      background: '#f59e0b',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12.5,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Quầy Lễ tân
                  </Link>
                  <Link
                    to="/vet/workbench"
                    style={{
                      background: '#0d9488',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12.5,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Bác sĩ thú y
                  </Link>
                </>
              )}
              {user.role === 'RECEPTIONIST' && (
                <Link
                  to="/receptionist/dashboard"
                  className="vtn-btn-yellow"
                  style={{ padding: '6px 14px', fontSize: 12.5, textDecoration: 'none', fontWeight: 700 }}
                >
                  📋 Quầy Lễ tân
                </Link>
              )}
              {user.role === 'VETERINARIAN' && (
                <Link
                  to="/vet/workbench"
                  style={{
                    background: '#0d9488',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  🩺 Ca khám Bác sĩ
                </Link>
              )}
                            {user.role === 'INVENTORY_MANAGER' && (
                <Link
                  to="/inventory/batches"
                  style={{
                    background: '#6366f1',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  📦 Quản lý Kho
                </Link>
              )}
              {user.role === 'PET_OWNER' && (
                <Link
                  to="/owner/medical-history"
                  style={{
                    background: '#0d9488',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  🐾 Sổ khám Thú cưng
                </Link>
              )}
              <button type="button" className="vtn-btn-logout" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="vtn-login-link">
                Đăng nhập
              </Link>
              <Link to="/register" className="vtn-btn-yellow">
                Đăng ký miễn phí
              </Link>
            </>
          )}

          <button
            type="button"
            className="vtn-burger"
            aria-label="Mở menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
