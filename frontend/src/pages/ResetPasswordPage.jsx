import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import authApi from '../api/authApi';
import { VeterianCloudPaw } from '../components/VeterianLogo';
import { getPasswordChecklist, validateResetPasswordForm } from '../utils/validators';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    token: searchParams.get('token') || '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checklist = getPasswordChecklist(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    setServerError('');

    const validation = validateResetPasswordForm(updated);
    setErrors((prev) => ({
      ...prev,
      [name]: validation[name] || '',
    }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const validation = validateResetPasswordForm(formData);
    setErrors((prev) => ({
      ...prev,
      [name]: validation[name] || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateResetPasswordForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword({
        token: formData.token.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      navigate('/login', {
        state: {
          successMessage: 'Đặt lại mật khẩu mới thành công! Vui lòng đăng nhập lại.',
        },
      });
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setServerError(err.message || 'Mã token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vtn-auth-screen">
      <div className="vtn-auth-logo-top">
        <Link to="/" aria-label="Trang chủ PCMS">
          <VeterianCloudPaw size={68} />
        </Link>
      </div>

      <div className="vtn-auth-split-card">
        <div className="vtn-auth-left">
          <h1>Đặt lại mật khẩu mới</h1>
          <p className="vtn-auth-sub">
            Nhập mã token khôi phục một lần từ liên kết email và mật khẩu mới của bạn.
          </p>

          {serverError ? (
            <div className="vtn-dark-alert vtn-dark-alert-error" role="alert">
              {serverError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="vtn-dark-form">
            <div className="vtn-dark-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label htmlFor="token" style={{ margin: 0 }}>Mã xác nhận khôi phục (6 chữ số)</label>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Sao chép từ email</span>
              </div>
              <input
                id="token"
                name="token"
                type="text"
                maxLength={32}
                placeholder="Ví dụ: 849201"
                value={formData.token}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ letterSpacing: '2px', fontWeight: 600, fontSize: '1.05rem', fontFamily: 'monospace' }}
                className={`vtn-dark-input ${errors.token ? 'has-error' : ''}`}
              />
              {errors.token ? <span className="vtn-error-text">{errors.token}</span> : null}
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Quý khách có thể copy mã 6 chữ số từ email và dán vào đây, hoặc click trực tiếp vào link trong email.
              </p>
            </div>

            <div className="vtn-dark-field">
              <label htmlFor="password">Mật khẩu mới</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`vtn-dark-input ${errors.password ? 'has-error' : ''}`}
              />
              {errors.password ? <span className="vtn-error-text">{errors.password}</span> : null}
            </div>

            <div className="vtn-dark-field">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`vtn-dark-input ${errors.confirmPassword ? 'has-error' : ''}`}
              />
              {errors.confirmPassword ? (
                <span className="vtn-error-text">{errors.confirmPassword}</span>
              ) : null}
            </div>

            <div className="vtn-dark-rules">
              <span className={checklist.minLength ? 'ok' : ''}>• Tối thiểu 8 ký tự</span>
              <span className={checklist.hasUppercase ? 'ok' : ''}>• Chữ in hoa</span>
              <span className={checklist.hasLowercase ? 'ok' : ''}>• Chữ thường</span>
              <span className={checklist.hasDigit ? 'ok' : ''}>• Chữ số</span>
            </div>

            <button type="submit" className="vtn-btn-signin" disabled={submitting}>
              {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}
            </button>
          </form>

          <div className="vtn-auth-links-bottom" style={{ marginTop: '1.25rem' }}>
            <Link to="/login" className="vtn-forgot-link">
              ← Quay lại trang Đăng nhập
            </Link>
          </div>
        </div>

        <div className="vtn-auth-right">
          <img
            src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=900&q=85"
            alt="Chú chó French Bulldog mặc áo vàng trên nền xanh"
          />
        </div>
      </div>

      <Link to="/" className="vtn-goto-home">
        Go to Home
      </Link>
    </div>
  );
}
