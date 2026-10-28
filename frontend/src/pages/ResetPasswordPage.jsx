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
    let nextValue = value;
    if (name === 'token') {
      const match = value.match(/[?&]token=([^&#\s]+)/i);
      nextValue = (match ? decodeURIComponent(match[1]) : value.trim()).toUpperCase();
    }
    const updated = { ...formData, [name]: nextValue };
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
              <label htmlFor="token">Mã Token khôi phục</label>
              <input
                id="token"
                name="token"
                type="text"
                placeholder="Nhập mã 8 ký tự từ email (VD: K7M9P2X4)"
                value={formData.token}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`vtn-dark-input ${errors.token ? 'has-error' : ''}`}
              />
              {errors.token ? <span className="vtn-error-text">{errors.token}</span> : null}
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
              <span className={checklist.minLength ? 'ok' : ''}>✓ Tối thiểu 8 ký tự</span>
              <span className={checklist.hasUppercase ? 'ok' : ''}>✓ Chữ in hoa</span>
              <span className={checklist.hasLowercase ? 'ok' : ''}>✓ Chữ thường</span>
              <span className={checklist.hasDigit ? 'ok' : ''}>✓ Chữ số</span>
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
        Go to Home ↗
      </Link>
    </div>
  );
}
