import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    FileText,
    Home,
    LayoutDashboard,
    LogOut,
    Receipt,
    Search,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import '../../styles/billingTheme.css';

const NAV_ITEMS = [
    {
        to: '/billing',
        label: 'Dashboard',
        icon: <LayoutDashboard size={18} />,
        end: true,
    },
    {
    to: '/billing/create',
    label: 'Tạo hóa đơn',
    icon: <FileText size={18} />,
},
    {
        to: '/billing/queue',
        label: 'Hàng chờ thanh toán',
        icon: <Receipt size={18} />,
    },
    {
        to: '/billing/invoices',
        label: 'Quản lý hóa đơn',
        icon: <Search size={18} />,
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
                <div>
                    <div className="billing-brand">
                        <div className="billing-brand-icon">
                            <Receipt size={22} color="#ffffff" />
                        </div>

                        <div className="billing-brand-text">
                            <h1>PCMS</h1>
                            <p>RECEPTION & BILLING</p>
                        </div>
                    </div>

                    <div className="billing-sidebar-status">
                        <span className="billing-sidebar-status-dot" />
                        <span>Phân hệ tiếp nhận và thanh toán</span>
                    </div>

                    <nav className="billing-nav">
                        <div className="billing-nav-heading">
                            RECEPTION & BILLING
                        </div>

                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `billing-nav-item ${isActive ? 'active' : ''}`
                                }
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div>
                    <div className="billing-nav-footer">
                        <div className="billing-nav-heading">
                            ĐIỀU HƯỚNG HỆ THỐNG
                        </div>

                        <Link to="/" className="billing-nav-item">
                            <Home size={18} />
                            <span>Về trang chủ khách hàng</span>
                        </Link>

                        {user?.role === 'ADMIN' && (
                            <Link to="/admin" className="billing-nav-item">
                                <FileText size={18} />
                                <span>Trang quản trị Admin</span>
                            </Link>
                        )}
                    </div>

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
                </div>
            </aside>

            <div className="billing-main">
                <header className="billing-topbar">
                    <div className="billing-page-title">
                        <h2>
                            <Receipt size={20} />
                            Reception & Billing
                        </h2>

                        <p>
                            Quản lý tiếp nhận thanh toán và thông tin hóa đơn
                        </p>
                    </div>

                    <div className="billing-topbar-date">
                        Ngày:{' '}
                        <strong>
                            {new Date().toLocaleDateString('vi-VN')}
                        </strong>
                    </div>
                </header>

                <main className="billing-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}