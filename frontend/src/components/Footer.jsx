import { Link } from 'react-router-dom';
import { VeterianCloudPaw } from './VeterianLogo';

export default function Footer() {
  return (
    <footer className="vtn-footer">
      <div className="vtn-container">
        <div className="vtn-footer-grid">
          <div className="vtn-footer-brand">
            <Link to="/" className="vtn-logo-link">
              <VeterianCloudPaw size={38} />
              <span className="vtn-logo-text">PCMS</span>
            </Link>
            <Link to="/register" className="vtn-btn-purple vtn-btn-sm" style={{ marginTop: '1rem' }}>
              Đăng ký miễn phí
            </Link>
            <p className="vtn-footer-copy">
              Hệ thống Quản lý Phòng khám Thú y (PCMS) hiện đại dành cho phòng khám và chủ nuôi thú cưng.
            </p>
            <div className="vtn-footer-socials">
              <span>in</span>
              <span>f</span>
              <span>ig</span>
              <span>yt</span>
            </div>
          </div>

          <div className="vtn-footer-col">
            <h5>Dịch vụ Phòng khám</h5>
            <ul>
              <li><a href="#services">Khám &amp; Điều trị tổng quát</a></li>
              <li><a href="#services">Tiêm phòng &amp; Tẩy ký sinh trùng</a></li>
              <li><a href="#services">Spa &amp; Grooming thú cưng</a></li>
              <li><a href="#services">Siêu âm &amp; Chẩn đoán hình ảnh</a></li>
              <li><a href="#services">Nha khoa &amp; Phẫu thuật</a></li>
            </ul>
          </div>

          <div className="vtn-footer-col">
            <h5>Tính năng Hệ thống</h5>
            <ul>
              <li><a href="#features">Đặt lịch khám trực tuyến</a></li>
              <li><a href="#features">Hồ sơ bệnh án điện tử</a></li>
              <li><a href="#features">Quản lý kho thuốc &amp; Vaccine</a></li>
              <li><a href="#features">Hóa đơn &amp; Thanh toán</a></li>
              <li><a href="#features">Nhắc lịch tái khám tự động</a></li>
            </ul>
          </div>

          <div className="vtn-footer-col">
            <h5>Tài khoản</h5>
            <ul>
              <li><Link to="/login">Đăng nhập hệ thống</Link></li>
              <li><Link to="/register">Đăng ký Chủ thú cưng</Link></li>
              <li><Link to="/forgot-password">Quên mật khẩu</Link></li>
              <li><Link to="/reset-password">Đặt lại mật khẩu</Link></li>
            </ul>
          </div>

          <div className="vtn-footer-col">
            <h5>Liên hệ Chi nhánh</h5>
            <ul>
              <li>123 Nguyễn Văn Linh, Quận 7, TP. HCM</li>
              <li>Cấp cứu 24/7: 1900 6868</li>
              <li>care@pcms.vn</li>
              <li>07:30 – 21:00 (Thứ 2 – Chủ Nhật)</li>
            </ul>
          </div>
        </div>

        <div className="vtn-footer-bottom">
          <span>© {new Date().getFullYear()} PCMS. Bản quyền thuộc về Hệ thống Phòng khám Thú y.</span>
          <span>Bảo mật bằng Spring Security &amp; In-Memory JWT</span>
        </div>
      </div>
    </footer>
  );
}
