export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function getPasswordChecklist(password = '') {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
  };
}

export function validateLoginForm({ login, password }) {
  const errors = {};

  if (!login || !login.trim()) {
    errors.login = 'Vui lòng nhập Email hoặc Tên đăng nhập';
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu';
  }

  return errors;
}

export function validateRegisterForm({
  fullName,
  email,
  phoneNumber,
  address,
  password,
  confirmPassword,
}) {
  const errors = {};

  if (!fullName || !fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ và tên';
  } else if (fullName.trim().length < 2) {
    errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
  } else if (fullName.trim().length > 150) {
    errors.fullName = 'Họ và tên không được vượt quá 150 ký tự';
  }

  if (!email || !email.trim()) {
    errors.email = 'Vui lòng nhập địa chỉ email';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Định dạng email không hợp lệ (ví dụ: ten@domain.com)';
  }

  const normalizedPhone = (phoneNumber || '').trim().replace(/\s+/g, '');
  if (!normalizedPhone) {
    errors.phoneNumber = 'Vui lòng nhập số điện thoại';
  } else if (!VN_PHONE_REGEX.test(normalizedPhone)) {
    errors.phoneNumber = 'Số điện thoại không hợp lệ (ví dụ: 0912345678 hoặc +84912345678)';
  }

  if (address && address.length > 255) {
    errors.address = 'Địa chỉ không được vượt quá 255 ký tự';
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu';
  } else if (!STRONG_PASSWORD_REGEX.test(password)) {
    errors.password = 'Mật khẩu phải từ 8 ký tự trở lên, bao gồm chữ hoa, chữ thường và chữ số';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu';
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }

  return errors;
}

export function validateForgotPasswordForm({ email }) {
  const errors = {};
  if (!email || !email.trim()) {
    errors.email = 'Vui lòng nhập địa chỉ email đã đăng ký';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Định dạng email không hợp lệ';
  }
  return errors;
}

export function validateResetPasswordForm({ token, password, confirmPassword }) {
  const errors = {};

  if (!token || !token.trim()) {
    errors.token = 'Vui lòng nhập mã token đặt lại mật khẩu';
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu mới';
  } else if (!STRONG_PASSWORD_REGEX.test(password)) {
    errors.password = 'Mật khẩu mới phải từ 8 ký tự trở lên, gồm chữ hoa, chữ thường và chữ số';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }

  return errors;
}
