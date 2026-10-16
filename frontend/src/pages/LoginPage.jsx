import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { VeterianCloudPaw } from '../components/VeterianLogo';
import { useAuth } from '../context/AuthContext';
import { validateLoginForm } from '../utils/validators';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initialNotice = location.state?.successMessage || location.state?.infoMessage || '';

  const [formData, setFormData] = useState({
    login: location.state?.prefillEmail || '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    setServerError('');

    const fieldValidation = validateLoginForm(updated);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldValidation[name] || '',
    }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const fieldValidation = validateLoginForm(formData);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldValidation[name] || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateLoginForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await login({
        login: formData.login.trim(),
        password: formData.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setServerError(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vtn-auth-screen">
      <div className="vtn-auth-logo-top">
        <Link to="/" aria-label="Trang chủ Veterian">
          <VeterianCloudPaw size={68} />
        </Link>
      </div>

      <div className="vtn-auth-split-card">
        {/* Cột trái: Form đăng nhập nền tối */}
        <div className="vtn-auth-left">
          <h1>Đăng nhập Veterian</h1>
          <p className="vtn-auth-sub">
            Nhập địa chỉ email hoặc tên đăng nhập và mật khẩu để truy cập tài khoản của bạn.
          </p>

          {initialNotice && !serverError ? (
            <div className="vtn-dark-alert vtn-dark-alert-success" role="status">
              {initialNotice}
            </div>
          ) : null}

          {serverError ? (
            <div className="vtn-dark-alert vtn-dark-alert-error" role="alert">
              {serverError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="vtn-dark-form">
            <div className="vtn-dark-field">
              <label htmlFor="login">Email hoặc Tên đăng nhập</label>
              <input
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                placeholder="email@clinic.com"
                value={formData.login}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`vtn-dark-input ${errors.login ? 'has-error' : ''}`}
              />
              {errors.login ? <span className="vtn-error-text">{errors.login}</span> : null}
            </div>

            <div className="vtn-dark-field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="vtn-dark-pass-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`vtn-dark-input ${errors.password ? 'has-error' : ''}`}
                />
                <button
                  type="button"
                  className="vtn-eye-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Hiện/Ẩn mật khẩu"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password ? <span className="vtn-error-text">{errors.password}</span> : null}
            </div>

            <div className="vtn-remember-row">
              <label className="vtn-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <button type="submit" className="vtn-btn-signin" disabled={submitting}>
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="vtn-or-divider">
            <span>HOẶC</span>
          </div>

          <div className="vtn-auth-links-bottom">
            <p>
              Bạn chưa có tài khoản?{' '}
              <Link to="/register" className="vtn-try-link">
                Đăng ký miễn phí
              </Link>
            </p>
            <Link to="/forgot-password" className="vtn-forgot-link">
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        {/* Cột phải: Ảnh chú chó trên nền xanh */}
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
