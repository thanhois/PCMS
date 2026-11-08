
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../admin/AdminLayout';
function InventoryLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    if (user?.role === 'ADMIN') {
        return <AdminLayout />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinkClass = ({ isActive }) =>
        `inventory-nav-link${isActive ? ' active' : ''}`;

    return (
        <div className="inventory-layout">
            <aside className="inventory-sidebar">
                <div className="inventory-brand">
                    <h4>PCMS</h4>
                    <span>Inventory Management</span>
                </div>

                <nav className="inventory-navigation">
    <NavLink
        to="/inventory/services"
        className={navLinkClass}
    >
        <span>Danh mục dịch vụ</span>
    </NavLink>

    <NavLink
        to="/inventory/medicines"
        className={navLinkClass}
    >
        <span>Danh mục thuốc / vật tư</span>
    </NavLink>

    <NavLink
        to="/inventory/batches"
        className={navLinkClass}
    >
        <span>Quản lý lô thuốc</span>
    </NavLink>
</nav>

                <div className="inventory-sidebar-footer">
                    <button
                        type="button"
                        className="inventory-back-button"
                        onClick={() => navigate('/')}
                    >
                        Về trang chủ
                    </button>
                </div>
            </aside>

            <div className="inventory-main">
                <header className="inventory-topbar">
                    <div>
                        <h5>Inventory Management</h5>
                        <span>Quản lý kho thuốc</span>
                    </div>

                    <div className="inventory-user">
                        <div className="inventory-user-info">
                            <strong>
                                {user?.fullName || user?.username || 'Inventory Manager'}
                            </strong>
                            <small>Inventory Manager</small>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </header>

                <main className="inventory-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default InventoryLayout;
