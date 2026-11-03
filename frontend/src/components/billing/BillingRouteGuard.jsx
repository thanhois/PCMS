
import {
    Link,
    Navigate,
    Outlet,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

export default function BillingRouteGuard() {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location.pathname,
                    infoMessage: 'Vui lòng đăng nhập để truy cập phân hệ thanh toán.',
                }}
            />
        );
    }

    const allowedRoles = ['ADMIN', 'RECEPTIONIST'];

    if (!allowedRoles.includes(user.role)) {
        const handleLogout = () => {
            logout();
            navigate('/login', { replace: true });
        };

        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <h2>403 — Không có quyền truy cập</h2>

                <p>
                    Tài khoản của bạn không được phép truy cập phân hệ Billing.
                </p>

                <p>
                    Vai trò hiện tại: <strong>{user.role}</strong>
                </p>

                <Link to="/">Về trang chủ</Link>

                <button
                    type="button"
                    onClick={handleLogout}
                    style={{ marginLeft: 12 }}
                >
                    Đăng nhập tài khoản khác
                </button>
            </div>
        );
    }

    return <Outlet />;
}
