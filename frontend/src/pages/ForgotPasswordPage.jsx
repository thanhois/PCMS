import { useState } from 'react';
import { Link } from 'react-router-dom';
import authApi from '../api/authApi';
import { VeterianCloudPaw } from '../components/VeterianLogo';
import { validateForgotPasswordForm } from '../utils/validators';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setServerError('');
    setSuccessMessage('');

    const validation = validateForgotPasswordForm({ email: value });
    setErrors({ email: validation.email || '' });
  };

  const handleBlur = () => {
    const validation = validateForgotPasswordForm({ email });
    setErrors({ email: validation.email || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    const validationErrors = validateForgotPasswordForm({ email });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setSuccessMessage(
        'Nếu địa chỉ email tồn tại trong hệ thống, đường dẫn đặt lại mật khẩu đã được gửi (hiệu lực 15 phút).'
      );
    } catch (err) {
      if (err.fieldErrors?.email) {
        setErrors({ email: err.fieldErrors.email });
      }
      setServerError(err.message || 'Không thể xử lý yêu cầu lúc này, vui lòng thử lại.');
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
        <div className="vtn-auth-left">
          <h1>Quên mật khẩu?</h1>
          <p className="vtn-auth-sub">
            Nhập địa chỉ email đã đăng ký tài khoản Veterian PCMS để nhận liên kết đặt lại mật khẩu.
          </p>

          {successMessage ? (
            <div className="vtn-dark-alert vtn-dark-alert-success" role="status">
              <div>{successMessage}</div>
              <div style={{ marginTop: '0.55rem' }}>
                <Link to="/reset-password" className="vtn-try-link">
                  Nhập mã token để đặt mật khẩu mới →
                </Link>
              </div>
            </div>
          ) : null}

          {serverError ? (
            <div className="vtn-dark-alert vtn-dark-alert-error" role="alert">
              {serverError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="vtn-dark-form">
            <div className="vtn-dark-field">
              <label htmlFor="email">Địa chỉ Email đã đăng ký</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="email@clinic.com"
                value={email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`vtn-dark-input ${errors.email ? 'has-error' : ''}`}
              />
              {errors.email ? <span className="vtn-error-text">{errors.email}</span> : null}
            </div>

            <button type="submit" className="vtn-btn-signin" disabled={submitting}>
              {submitting ? 'Đang gửi yêu cầu...' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>
          </form>

          <div className="vtn-or-divider">
            <span>HOẶC</span>
          </div>

          <div className="vtn-auth-links-bottom">
            <p>
              Đã nhớ mật khẩu?{' '}
              <Link to="/login" className="vtn-try-link">
                Đăng nhập
              </Link>
            </p>
            <Link to="/register" className="vtn-forgot-link">
              Tạo tài khoản Chủ thú cưng mới
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
