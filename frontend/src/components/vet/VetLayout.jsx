import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Dog,
  FileText,
  Home,
  LogOut,
  Stethoscope,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import vetApi from '../../api/vetApi';
import '../../styles/vetTheme.css';

const NAV_ITEMS = [
  {
    to: '/vet/workbench',
    label: 'Ca khám hôm nay',
    icon: <Calendar size={18} />,
    hasBadge: true,
  },
  {
    to: '/vet/records',
    label: 'Hồ sơ bệnh án',
    icon: <FileText size={18} />,
  },
  {
    to: '/vet/pets',
    label: 'Tra cứu & Bệnh sử Pet',
    icon: <Dog size={18} />,
  },
];

export default function VetLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 30000); // Tự động cập nhật mỗi 30s
    return () => clearInterval(interval);
  }, []);

  const loadSummary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await vetApi.getWorklistSummary({ date: today });
      if (data && data.waitingCount !== undefined) {
        setWaitingCount((data.waitingCount || 0) + (data.inProgressCount || 0));
      }
    } catch (e) {
      // Ignored in background
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="vet-shell">
      {/* Sidebar */}
      <aside className="vet-sidebar">
        <div className="vet-brand">
          <div className="vet-brand-icon">
            <Stethoscope size={22} color="#ffffff" />
          </div>
          <div className="vet-brand-text">
            <h1>Veterian Clinic</h1>
            <p>BÁC SĨ THÚ Y • CLINICAL SUITE</p>
          </div>
        </div>

        <nav className="vet-nav">
          <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Chuyên môn lâm sàng
          </div>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `vet-nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.hasBadge && waitingCount > 0 && (
                <span className="vet-nav-badge">{waitingCount}</span>
              )}
            </NavLink>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Điều hướng hệ thống
            </div>
            <Link to="/" className="vet-nav-item">
              <Home size={18} />
              <span>Về Trang chủ</span>
            </Link>
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="vet-nav-item" style={{ color: '#6320ee' }}>
                <Activity size={18} />
                <span>Trang Quản trị Admin</span>
              </Link>
            )}
          </div>
        </nav>

        {/* Doctor Profile Footer */}
        <div className="vet-user-box">
          <div className="vet-avatar">
            {user?.fullName ? user.fullName.charAt(0) : 'B'}
          </div>
          <div className="vet-user-info" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.fullName || 'Bác sĩ Thú y'}
            </div>
            <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 600 }}>
              {user?.role === 'ADMIN' ? 'Admin / Bác sĩ' : 'Bác sĩ điều trị'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="vet-main">
        {/* Topbar */}
        <header className="vet-topbar">
          <div className="vet-page-title">
            <h2>
              <Activity size={20} color="#0d9488" /> Phân hệ Khám Chữa Bệnh & Bệnh Án
            </h2>
            <p>Hệ thống hỗ trợ chẩn đoán, y lệnh cận lâm sàng & kê đơn thuốc điện tử</p>
          </div>

          <div className="vet-topbar-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: 20 }}>
              <Clock size={15} color="#0d9488" />
              <span>Hôm nay: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></span>
            </div>

            <Link to="/vet/records" className="vet-btn vet-btn-outline vet-btn-sm">
              <FileText size={15} /> Tra cứu nhanh bệnh án
            </Link>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="vet-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
