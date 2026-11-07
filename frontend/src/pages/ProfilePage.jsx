import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/admin/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import '../styles/adminTheme.css';
import { getPasswordChecklist } from '../utils/validators';

function getWorkspacePath(role) {
  switch (role) {
    case 'ADMIN':
      return '/admin/overview';
    case 'RECEPTIONIST':
      return '/receptionist/dashboard';
    case 'VETERINARIAN':
      return '/vet/workbench';
    case 'INVENTORY_MANAGER':
      return '/inventory/batches';
    case 'PET_OWNER':
      return '/owner/medical-history';
    default:
      return '/';
  }
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoggingOut, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    address: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [pwdForm, setPwdForm] = useState({
    oldPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  useEffect(() => {
    if (user) {
      void Promise.resolve().then(() => {
        setProfileForm({
          fullName: user.fullName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          gender: user.gender || '',
          address: user.address || '',
        });
      });
    }
  }, [user]);

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={isLoggingOut ? null : { from: location.pathname }}
      />
    );
  }

  const checklist = getPasswordChecklist(pwdForm.password);
  const workspacePath = getWorkspacePath(user.role);
  const mustChange = Boolean(user.mustChangePassword || location.state?.forcePasswordChange);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');

    if (!profileForm.fullName.trim()) {
      setProfileErr('Họ và tên không được để trống.');
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
        gender: profileForm.gender.trim(),
        address: profileForm.address.trim(),
      });
      setProfileMsg('Đã cập nhật thông tin hồ sơ cá nhân thành công.');
    } catch (err) {
      setProfileErr(err?.message || 'Không thể cập nhật thông tin hồ sơ.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdErr('');
    setPwdMsg('');

    if (!pwdForm.oldPassword) {
      setPwdErr('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!checklist.minLength || !checklist.hasUppercase || !checklist.hasLowercase || !checklist.hasDigit) {
      setPwdErr('Mật khẩu mới phải từ 8 ký tự, gồm chữ hoa, chữ thường và chữ số.');
      return;
    }
    if (pwdForm.password !== pwdForm.confirmPassword) {
      setPwdErr('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPwdSaving(true);
    try {
      await changePassword({
        oldPassword: pwdForm.oldPassword,
        password: pwdForm.password,
        confirmPassword: pwdForm.confirmPassword,
      });
      setPwdForm({ oldPassword: '', password: '', confirmPassword: '' });
      setPwdMsg('Đổi mật khẩu thành công.');
    } catch (err) {
      setPwdErr(err?.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pcms-admin-shell">
      <header className="pcms-topbar">
        <div className="pcms-topbar-left">
          <Link to={workspacePath} className="pcms-brand-link">
            <div>
              <span className="pcms-brand-title">PCMS</span>
              <span className="pcms-brand-subtitle">Hồ sơ Cá nhân & Bảo mật Tài khoản</span>
            </div>
          </Link>
        </div>

        <div className="pcms-topbar-right">
          {!user.mustChangePassword ? (
            <Link to={workspacePath} className="pcms-btn pcms-btn-secondary">
              Quay lại Cổng làm việc
            </Link>
          ) : null}
          <button type="button" className="pcms-btn pcms-btn-danger" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="pcms-main-content" style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="Hồ sơ Cá nhân & Đổi Mật khẩu"
          subtitle={`Tài khoản: ${user.username} • Vai trò: ${user.role}`}
        />

        {mustChange && user.mustChangePassword ? (
          <div className="pcms-alert pcms-alert-warning" style={{ marginBottom: 20 }}>
            <strong>Yêu cầu bảo mật bắt buộc:</strong> Tài khoản của bạn đang dùng mật khẩu tạm thời do Quản trị viên cấp. Vui lòng đổi sang mật khẩu mới bên dưới để tiếp tục làm việc.
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* UC05: Update Personal Profile */}
          <section className="pcms-card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>
              Thông tin Hồ sơ Cá nhân
            </h2>
            <p style={{ marginTop: 0, marginBottom: 18, color: 'var(--pcms-text-muted)', fontSize: 13.5 }}>
              Cập nhật họ tên, email, số điện thoại, giới tính và địa chỉ liên hệ.
            </p>

            {profileMsg ? <div className="pcms-alert pcms-alert-success" style={{ marginBottom: 14 }}>{profileMsg}</div> : null}
            {profileErr ? <div className="pcms-alert pcms-alert-error" style={{ marginBottom: 14 }}>{profileErr}</div> : null}

            <form onSubmit={handleProfileSubmit} className="pcms-form-grid">
              <div className="pcms-field">
                <label className="pcms-label">Tên đăng nhập (Không đổi)</label>
                <input className="pcms-input" value={user.username || ''} disabled readOnly />
              </div>

              <div className="pcms-field">
                <label className="pcms-label">Họ và tên *</label>
                <input
                  className="pcms-input"
                  value={profileForm.fullName}
                  maxLength={150}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="pcms-field">
                <label className="pcms-label">Email *</label>
                <input
                  type="email"
                  className="pcms-input"
                  value={profileForm.email}
                  maxLength={150}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="pcms-field">
                <label className="pcms-label">Số điện thoại *</label>
                <input
                  type="tel"
                  className="pcms-input"
                  value={profileForm.phoneNumber}
                  maxLength={20}
                  onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                  required
                />
              </div>

              <div className="pcms-field">
                <label className="pcms-label">Giới tính</label>
                <select
                  className="pcms-select"
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                >
                  <option value="">-- Chọn giới tính --</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div className="pcms-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pcms-label">Địa chỉ liên hệ</label>
                <input
                  className="pcms-input"
                  value={profileForm.address}
                  maxLength={255}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="submit" className="pcms-btn pcms-btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Đang lưu...' : 'Lưu thông tin cá nhân'}
                </button>
              </div>
            </form>
          </section>

          {/* UC04: Change Password */}
          <section className="pcms-card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>
              Đổi Mật khẩu Bảo mật
            </h2>
            <p style={{ marginTop: 0, marginBottom: 18, color: 'var(--pcms-text-muted)', fontSize: 13.5 }}>
              Mật khẩu mới tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và khác mật khẩu hiện tại.
            </p>

            {pwdMsg ? <div className="pcms-alert pcms-alert-success" style={{ marginBottom: 14 }}>{pwdMsg}</div> : null}
            {pwdErr ? <div className="pcms-alert pcms-alert-error" style={{ marginBottom: 14 }}>{pwdErr}</div> : null}

            <form onSubmit={handlePasswordSubmit} className="pcms-form-grid">
              <div className="pcms-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pcms-label">Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  className="pcms-input"
                  value={pwdForm.oldPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                  required
                />
              </div>

              <div className="pcms-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pcms-label">Mật khẩu mới *</label>
                <input
                  type="password"
                  className="pcms-input"
                  value={pwdForm.password}
                  onChange={(e) => setPwdForm({ ...pwdForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="pcms-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pcms-label">Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  className="pcms-input"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="submit" className="pcms-btn pcms-btn-primary" disabled={pwdSaving}>
                  {pwdSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
