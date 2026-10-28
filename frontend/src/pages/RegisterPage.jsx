import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VeterianCloudPaw } from '../components/VeterianLogo';
import { useAuth } from '../context/AuthContext';
import { getPasswordChecklist, validateRegisterForm } from '../utils/validators';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const checklist = getPasswordChecklist(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    setServerError('');

    const validation = validateRegisterForm(updated);
    setErrors((prev) => {
      const next = { ...prev, [name]: validation[name] || '' };
      if (name === 'password' && updated.confirmPassword) {
        next.confirmPassword = validation.confirmPassword || '';
      }
      return next;
    });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const validation = validateRegisterForm(formData);
    setErrors((prev) => ({
      ...prev,
      [name]: validation[name] || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateRegisterForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      navigate('/login', {
        state: {
          successMessage: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập để bắt đầu sử dụng.',
          prefillEmail: formData.email.trim(),
        },
      });
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setServerError(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vtn-auth-screen">
      <div className="vtn-auth-logo-top">
        <Link to="/" aria-label="Trang chủ PCMS">
          <VeterianCloudPaw size={64} />
        </Link>
      </div>

      <div className="vtn-auth-split-card vtn-auth-split-card-wide">
        <div className="vtn-auth-left">
          <h1>Đăng ký Tài khoản Chủ nuôi</h1>
          <p className="vtn-auth-sub">
            Tạo tài khoản Chủ thú cưng miễn phí tại PCMS để đặt lịch khám và theo dõi hồ sơ sức khỏe cho bé.
          </p>

          {serverError ? (
            <div className="vtn-dark-alert vtn-dark-alert-error" role="alert">
              {serverError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="vtn-dark-form">
            <div className="vtn-dark-field">
              <label htmlFor="fullName">Họ và tên *</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Nguyễn Minh Anh"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`vtn-dark-input ${errors.fullName ? 'has-error' : ''}`}
              />
              {errors.fullName ? <span className="vtn-error-text">{errors.fullName}</span> : null}
            </div>

            <div className="vtn-dark-row-2">
              <div className="vtn-dark-field">
                <label htmlFor="email">Địa chỉ Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@clinic.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`vtn-dark-input ${errors.email ? 'has-error' : ''}`}
                />
                {errors.email ? <span className="vtn-error-text">{errors.email}</span> : null}
              </div>

              <div className="vtn-dark-field">
                <label htmlFor="phoneNumber">Số điện thoại *</label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="0912345678"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`vtn-dark-input ${errors.phoneNumber ? 'has-error' : ''}`}
                />
                {errors.phoneNumber ? (
                  <span className="vtn-error-text">{errors.phoneNumber}</span>
                ) : null}
              </div>
            </div>

            <div className="vtn-dark-field">
              <label htmlFor="address">Địa chỉ liên hệ (Tùy chọn)</label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="123 Nguyễn Văn Linh, Quận 7, TP. HCM"
                value={formData.address}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`vtn-dark-input ${errors.address ? 'has-error' : ''}`}
              />
              {errors.address ? <span className="vtn-error-text">{errors.address}</span> : null}
            </div>

            <div className="vtn-dark-row-2">
              <div className="vtn-dark-field">
                <label htmlFor="password">Mật khẩu *</label>
                <div className="vtn-dark-pass-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
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
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.password ? (
                  <span className="vtn-error-text">{errors.password}</span>
                ) : null}
              </div>

              <div className="vtn-dark-field">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
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
            </div>

            <div className="vtn-dark-rules">
              <span className={checklist.minLength ? 'ok' : ''}>✓ Tối thiểu 8 ký tự</span>
              <span className={checklist.hasUppercase ? 'ok' : ''}>✓ Chữ in hoa</span>
              <span className={checklist.hasLowercase ? 'ok' : ''}>✓ Chữ thường</span>
              <span className={checklist.hasDigit ? 'ok' : ''}>✓ Chữ số</span>
            </div>

            <button type="submit" className="vtn-btn-signin" disabled={submitting}>
              {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>

          <div className="vtn-or-divider">
            <span>HOẶC</span>
          </div>

          <div className="vtn-auth-links-bottom">
            <p>
              Bạn đã có tài khoản?{' '}
              <Link to="/login" className="vtn-try-link">
                Đăng nhập
              </Link>
            </p>
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
