
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileText, Home, LogOut, Receipt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/billingTheme.css';

const NAV_ITEMS = [
    {
        to: '/billing/queue',
        label: 'Hàng chờ thanh toán',
        icon: <Receipt size={18} />,
    },
];

export default function BillingLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="billing-shell">
            <aside className="billing-sidebar">
                <div className="billing-brand">
                    <div className="billing-brand-icon">
                        <Receipt size={22} color="#ffffff" />
                    </div>

                    <div className="billing-brand-text">
                        <h1>PCMS Clinic</h1>
                        <p>BILLING MANAGEMENT</p>
                    </div>
                </div>

                <nav className="billing-nav">
                    <div className="billing-nav-heading">
                        QUẢN LÝ THANH TOÁN
                    </div>

                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `billing-nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="billing-nav-footer">
                        <div className="billing-nav-heading">
                            ĐIỀU HƯỚNG HỆ THỐNG
                        </div>

                        <Link to="/" className="billing-nav-item">
                            <Home size={18} />
                            <span>Về trang chủ</span>
                        </Link>

                        {user?.role === 'ADMIN' && (
                            <Link to="/admin" className="billing-nav-item">
                                <FileText size={18} />
                                <span>Trang quản trị Admin</span>
                            </Link>
                        )}
                    </div>
                </nav>

                <div className="billing-user-box">
                    <div className="billing-avatar">
                        {user?.fullName?.charAt(0) || 'U'}
                    </div>

                    <div className="billing-user-info">
                        <strong>{user?.fullName || 'Người dùng'}</strong>
                        <small>{user?.role || 'BILLING'}</small>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        title="Đăng xuất"
                        className="billing-logout-button"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            <div className="billing-main">
                <header className="billing-topbar">
                    <div className="billing-page-title">
                        <h2>
                            <Receipt size={20} />
                            Phân hệ Thanh toán
                        </h2>

                        <p>
                            Quản lý hóa đơn, công nợ và giao dịch thanh toán
                        </p>
                    </div>

                    <div className="billing-topbar-date">
                        Ngày: <strong>{new Date().toLocaleDateString('vi-VN')}</strong>
                    </div>
                </header>

                <main className="billing-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
