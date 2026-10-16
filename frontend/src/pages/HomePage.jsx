import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const HERO_TABS = [
  {
    id: 'appointments',
    label: 'Lịch hẹn khám',
    patient: 'Milo • Golden Retriever (3 tuổi)',
    owner: 'Nguyễn Minh Anh • 0912 345 678',
    service: 'Khám tổng quát & Tiêm nhắc lại hàng năm',
    status: 'Đã tiếp nhận • Phòng khám 02',
    vet: 'BS. Trần Hoàng Nam',
    notes: [
      'Thân nhiệt: 38.4°C (Bình thường) • Cân nặng: 28.5 kg',
      'Tiêm mũi nhắc lại Vaccine Dại + DHPPi-L 7 bệnh hôm nay',
      'Tự động đặt lịch nhắc tái khám sau 14 ngày',
    ],
  },
  {
    id: 'records',
    label: 'Bệnh án điện tử',
    patient: 'Luna • Mèo Anh lông ngắn (2 tuổi)',
    owner: 'Lê Thu Hà • 0987 654 321',
    service: 'Khám Chuyên khoa Da liễu & Siêu âm',
    status: 'Đang thăm khám',
    vet: 'BS. Phạm Minh Châu',
    notes: [
      'Triệu chứng: Ngứa nhẹ vùng tai, lông khô trong 3 ngày gần đây',
      'Chẩn đoán: Viêm tai ngoài mức độ nhẹ – Đã nội soi tai',
      'Phác đồ: Vệ sinh tai + nhỏ thuốc chuyên dụng 2 lần/ngày trong 7 ngày',
    ],
  },
  {
    id: 'grooming',
    label: 'Tiêm phòng & Spa',
    patient: 'Bơ • Poodle Tiny (1.5 tuổi)',
    owner: 'Trần Gia Huy • 0909 888 777',
    service: 'Gói Spa Thảo dược 9 bước & Cắt tỉa tạo kiểu',
    status: 'Hoàn tất • Sẵn sàng đón về',
    vet: 'Chuyên viên Grooming Linh',
    notes: [
      'Tắm thảo dược yến mạch + ủ dưỡng lông hơi sương nano ấm',
      'Cắt mài móng, vệ sinh tai, cạo bàn chân & cắt tỉa kiểu Teddy',
      'Kiểm tra da: Khỏe mạnh, không phát hiện ve rận hay nấm da',
    ],
  },
  {
    id: 'billing',
    label: 'Đơn thuốc & Hóa đơn',
    patient: 'Rocky • French Bulldog (4 tuổi)',
    owner: 'Võ Thanh Tùng • 0933 222 111',
    service: 'Lấy cao răng siêu âm & Đơn thuốc #INV-2026',
    status: 'Đã thanh toán • Đã gửi HĐ điện tử',
    vet: 'BS. Nguyễn Quốc Bảo',
    notes: [
      'Lấy cao răng sóng siêu âm + đánh bóng với gây mê khí dung an toàn',
      'Xuất thuốc từ lô #MED-2026-09 (Còn tồn kho)',
      'Tổng cộng: 650.000đ • Đã thanh toán qua chuyển khoản QR',
    ],
  },
];

const FEATURE_PILLS = [
  'Đặt lịch khám trực tuyến nhanh chóng',
  'Hồ sơ bệnh án điện tử (Medical Record)',
  'Quản lý đa chi nhánh phòng khám (Branch)',
  'Tự động nhắc lịch tiêm phòng & tái khám',
  'Đặt lịch Spa, Tắm sấy & Grooming thẩm mỹ',
  'Kê đơn thuốc & Hướng dẫn liều dùng chi tiết',
  'Quản lý lô thuốc & Cảnh báo cận hạn sử dụng',
  'Lưu trữ hồ sơ Chủ nuôi & Thú cưng trọn đời',
  'Xuất hóa đơn & Thanh toán minh bạch',
  'Phân quyền chặt chẽ (Admin / Bác sĩ / Lễ tân / Chủ nuôi)',
  'Nhật ký hệ thống & Tự động khóa khi đăng nhập sai',
  'Bảo mật phiên đăng nhập bằng In-Memory JWT',
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(HERO_TABS[0]);
  const [toastMessage, setToastMessage] = useState('');

  const handleBookService = (serviceName) => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          infoMessage: `Vui lòng đăng nhập để đặt lịch dịch vụ "${serviceName || 'Khám thú y'}".`,
        },
      });
      return;
    }
    setToastMessage(
      `Xin chào ${user.fullName}! Yêu cầu đặt lịch "${serviceName || 'Khám tổng quát'}" đã được ghi nhận cho tài khoản ${user.email}.`
    );
  };

  return (
    <div className="vtn-page">
      {/* ===== 1. DEEP PURPLE HERO + NAVBAR + DASHBOARD MOCKUP ===== */}
      <section className="vtn-hero-section">
        <Navbar />

        <div className="vtn-container vtn-hero-center">
          <div className="vtn-hero-eyebrow">
            <span>✦</span> HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y • VETERIAN PCMS
          </div>

          <h1 className="vtn-hero-heading">
            Trọn tình yêu thương
            <br />
            dành cho thú cưng,
            <br />
            vận hành y khoa chuẩn mực
          </h1>

          <p className="vtn-hero-sub">
            Hệ thống quản lý phòng khám &amp; chăm sóc thú cưng toàn diện: Đặt lịch khám trực tuyến,
            Tiêm phòng Vaccine, Spa – Grooming thẩm mỹ và Hồ sơ bệnh án điện tử đồng bộ.
          </p>

          {toastMessage ? (
            <div className="vtn-hero-toast" role="status">
              <span>{toastMessage}</span>
              <button type="button" onClick={() => setToastMessage('')}>
                ×
              </button>
            </div>
          ) : null}

          <div className="vtn-hero-actions">
            {isAuthenticated ? (
              <button
                type="button"
                className="vtn-btn-purple"
                onClick={() => handleBookService('Khám bệnh & Tư vấn chuyên khoa')}
              >
                Đặt lịch khám ngay
              </button>
            ) : (
              <Link to="/register" className="vtn-btn-purple">
                Đăng ký miễn phí
              </Link>
            )}
            <a href="#services" className="vtn-btn-glass">
              <span>▶</span> Xem các dịch vụ
            </a>
          </div>

          <div className="vtn-hero-tabs">
            {HERO_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`vtn-hero-tab ${activeTab.id === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dashboard Mockup Window overlapping white section below */}
          <div className="vtn-dashboard-frame">
            <div className="vtn-dashboard-topbar">
              <div className="vtn-window-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="vtn-window-search">
                🔍 Tìm kiếm thú cưng, SĐT chủ nuôi, mã bệnh án hoặc hóa đơn...
              </div>
              <div className="vtn-window-actions">
                <span className="vtn-tag-purple">+ Tạo lịch hẹn</span>
                <span className="vtn-tag-green">● Trực tuyến</span>
              </div>
            </div>

            <div className="vtn-dashboard-body">
              <aside className="vtn-dash-sidebar">
                <div className="vtn-dash-nav-item active">📅 Lịch hẹn khám</div>
                <div className="vtn-dash-nav-item">🐾 Hồ sơ thú cưng</div>
                <div className="vtn-dash-nav-item">🩺 Bệnh án điện tử</div>
                <div className="vtn-dash-nav-item">💉 Lịch tiêm chủng</div>
                <div className="vtn-dash-nav-item">✨ Spa &amp; Grooming</div>
                <div className="vtn-dash-nav-item">💊 Kho thuốc &amp; Lô nhập</div>
                <div className="vtn-dash-nav-item">🧾 Hóa đơn &amp; Thu ngân</div>
              </aside>

              <div className="vtn-dash-main">
                <div className="vtn-dash-header">
                  <div>
                    <h4>{activeTab.patient}</h4>
                    <p>Chủ nuôi: {activeTab.owner}</p>
                  </div>
                  <span className="vtn-dash-status">{activeTab.status}</span>
                </div>

                <div className="vtn-dash-card">
                  <div className="vtn-dash-card-row">
                    <strong>Dịch vụ:</strong>
                    <span>{activeTab.service}</span>
                  </div>
                  <div className="vtn-dash-card-row">
                    <strong>Phụ trách chuyên môn:</strong>
                    <span>{activeTab.vet}</span>
                  </div>
                  <div className="vtn-dash-notes">
                    {activeTab.notes.map((n) => (
                      <div key={n} className="vtn-dash-note-item">
                        <span>✓</span> {n}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="vtn-dash-right">
                <div className="vtn-dash-widget">
                  <span className="vtn-widget-label">Chỉ số sinh hiệu</span>
                  <strong>38.4°C • 28.5 kg</strong>
                  <small>Nhịp tim: 88 lần/phút • Ổn định</small>
                </div>
                <div className="vtn-dash-widget">
                  <span className="vtn-widget-label">Lịch hẹn tiếp theo</span>
                  <strong>Tiêm nhắc mũi 2</strong>
                  <small>Tự động nhắc qua Email &amp; SMS</small>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. RATINGS & DARK PURPLE WALKTHROUGH CARD ===== */}
      <section className="vtn-white-spacer">
        <div className="vtn-container">
          <div className="vtn-ratings-strip">
            <span className="vtn-ratings-label">
              Được tin tưởng bởi hơn 15.000+ Chủ nuôi thú cưng &amp; Hệ thống phòng khám thú y
            </span>
            <div className="vtn-ratings-logos">
              <div className="vtn-rating-badge">★ 4.9 Đánh giá Google</div>
              <div className="vtn-rating-badge">★ 4.9 Tiêu chuẩn Y khoa</div>
              <div className="vtn-rating-badge">★ 4.8 Hài lòng Dịch vụ</div>
            </div>
          </div>

          <div className="vtn-walkthrough-banner">
            <div className="vtn-walkthrough-text">
              <h2>Bạn muốn đặt lịch khám hoặc tư vấn trực tiếp cùng Bác sĩ Thú y?</h2>
              <p>
                Đặt lịch khám trực tuyến cho bé cưng hoặc trải nghiệm toàn bộ quy trình tiếp đón – khám bệnh – kê đơn – tiêm phòng và Spa chỉ trong một nền tảng duy nhất.
              </p>
              <button
                type="button"
                className="vtn-btn-purple"
                onClick={() => handleBookService('Tư vấn & Đặt lịch khám trực tuyến')}
              >
                Đặt lịch khám ngay
              </button>
            </div>

            <div className="vtn-walkthrough-preview">
              <div className="vtn-mini-screen">
                <div className="vtn-mini-screen-bar">
                  <span />
                  <span />
                  <span />
                  <strong>Danh sách tiếp nhận • Chi nhánh Quận 7</strong>
                </div>
                <div className="vtn-mini-rows">
                  <div className="vtn-mini-row">
                    <span>09:00 • Milo (Golden Retriever)</span>
                    <b className="tag-teal">Tiêm phòng</b>
                  </div>
                  <div className="vtn-mini-row">
                    <span>09:30 • Luna (Mèo Anh lông ngắn)</span>
                    <b className="tag-purple">Siêu âm</b>
                  </div>
                  <div className="vtn-mini-row">
                    <span>10:15 • Bơ (Poodle Tiny)</span>
                    <b className="tag-amber">Spa &amp; Grooming</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== FEATURED CLINIC SERVICES STRIP ===== */}
          <div id="services" className="vtn-services-icons-section">
            <p className="vtn-services-eyebrow">DỊCH VỤ CHĂM SÓC THÚ CƯNG NỔI BẬT</p>
            <h3>Giải pháp Chăm sóc Toàn diện cho Bé cưng</h3>
            <div className="vtn-services-icon-grid">
              <div className="vtn-service-icon-item" onClick={() => handleBookService('Khám & Điều trị nội ngoại khoa')}>
                <div className="vtn-service-icon-box">🩺</div>
                <strong>Khám bệnh chuyên khoa</strong>
                <span>Chẩn đoán nội – ngoại khoa &amp; xét nghiệm máu</span>
              </div>
              <div className="vtn-service-icon-item" onClick={() => handleBookService('Tiêm phòng Vaccine định kỳ')}>
                <div className="vtn-service-icon-box">💉</div>
                <strong>Tiêm phòng Vaccine</strong>
                <span>Vaccine 5, 7 bệnh, Dại &amp; tẩy ký sinh trùng</span>
              </div>
              <div className="vtn-service-icon-item" onClick={() => handleBookService('Spa & Grooming thẩm mỹ')}>
                <div className="vtn-service-icon-box">✨</div>
                <strong>Spa &amp; Grooming</strong>
                <span>Tắm thảo dược, massage &amp; cắt tỉa tạo kiểu</span>
              </div>
              <div className="vtn-service-icon-item" onClick={() => handleBookService('Siêu âm & Chẩn đoán hình ảnh')}>
                <div className="vtn-service-icon-box">🔬</div>
                <strong>Siêu âm &amp; X-Quang</strong>
                <span>Tầm soát sớm tim mạch, gan thận &amp; thai kỳ</span>
              </div>
              <div className="vtn-service-icon-item" onClick={() => handleBookService('Nha khoa & Phẫu thuật vô trùng')}>
                <div className="vtn-service-icon-box">🦷</div>
                <strong>Nha khoa &amp; Phẫu thuật</strong>
                <span>Lấy cao răng siêu âm &amp; ngoại khoa vô trùng</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. ZIG-ZAG FEATURE SECTIONS ON SOFT LAVENDER ===== */}
      <section id="features" className="vtn-lavender-section">
        <div className="vtn-container">
          {/* Row 1 */}
          <div className="vtn-zigzag-row">
            <div className="vtn-zigzag-text">
              <h2>Tiết kiệm thời gian chờ đợi trong mỗi lần thăm khám</h2>
              <p>
                Hồ sơ bệnh án điện tử (Medical Record) lưu trữ đầy đủ triệu chứng, chẩn đoán, phác đồ điều trị và đơn thuốc của từng bé thú cưng. Bác sĩ tra cứu lịch sử bệnh lý chỉ trong 1 cú nhấp chuột.
              </p>
              <div className="vtn-stat-cards-2">
                <div className="vtn-stat-box">
                  <strong>+42%</strong>
                  <span>Nhanh hơn khi tiếp đón &amp; tra cứu bệnh án</span>
                </div>
                <div className="vtn-stat-box">
                  <strong>100%</strong>
                  <span>Đồng bộ lịch sử khám giữa các chi nhánh</span>
                </div>
              </div>
            </div>

            <div className="vtn-zigzag-media">
              <img
                src="https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=900&q=80"
                alt="Bác sĩ thú y đang khám cho chú chó Golden Retriever"
              />
              <div className="vtn-floating-card vtn-float-right">
                <span className="vtn-float-badge">✓ Đã lưu Bệnh án điện tử</span>
                <strong>Milo • Golden Retriever</strong>
                <small>Thân nhiệt: 38.4°C • Đã tiêm đủ mũi</small>
              </div>
            </div>
          </div>

          {/* Row 2 (Reversed) */}
          <div id="workflow" className="vtn-zigzag-row reverse">
            <div className="vtn-zigzag-text">
              <h2>Kết nối Chủ nuôi dễ dàng &amp; đặt lịch mọi lúc mọi nơi</h2>
              <p>
                Chủ thú cưng dễ dàng đăng ký tài khoản trực tuyến, đặt lịch khám, chọn dịch vụ Spa/Grooming và nhận thông báo nhắc lịch tái khám – tiêm chủng định kỳ hoàn toàn tự động.
              </p>
              <div className="vtn-stat-cards-2">
                <div className="vtn-stat-box">
                  <strong>24/7</strong>
                  <span>Đặt lịch khám &amp; Spa trực tuyến mọi lúc</span>
                </div>
                <div className="vtn-stat-box">
                  <strong>-65%</strong>
                  <span>Giảm tỷ lệ quên lịch tiêm nhắc lại</span>
                </div>
              </div>
            </div>

            <div className="vtn-zigzag-media">
              <img
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80"
                alt="Thú cưng khỏe mạnh vui đùa"
              />
              <div className="vtn-floating-card vtn-float-left">
                <span className="vtn-float-badge">📅 Đã xác nhận lịch hẹn</span>
                <strong>Spa &amp; Grooming + Tiêm phòng Dại</strong>
                <small>Thứ Bảy, 10:00 SA • Chi nhánh chính PCMS</small>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="vtn-zigzag-row">
            <div className="vtn-zigzag-text">
              <h2>Kiểm soát chặt chẽ nguồn Vaccine &amp; Kho dược phẩm</h2>
              <p>
                Quản lý tồn kho thuốc và vaccine theo từng lô nhập (Inventory Batch), tự động cảnh báo các lô sắp hết hạn hoặc dưới định mức tối thiểu tại từng chi nhánh phòng khám.
              </p>
              <div className="vtn-stat-cards-2">
                <div className="vtn-stat-box">
                  <strong>Tức thì</strong>
                  <span>Kiểm soát số lượng tồn kho &amp; hạn sử dụng</span>
                </div>
                <div className="vtn-stat-box">
                  <strong>Tự động</strong>
                  <span>Cảnh báo sớm lô thuốc sắp hết hạn</span>
                </div>
              </div>
            </div>

            <div className="vtn-zigzag-media">
              <img
                src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=900&q=80"
                alt="Chăm sóc cún con tại phòng khám"
              />
              <div className="vtn-floating-card vtn-float-right">
                <span className="vtn-float-badge">💊 Lô thuốc #B2026</span>
                <strong>Vaccine Nobivac DHPPi</strong>
                <small>Còn 120 liều • Bảo quản lạnh đạt chuẩn</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 4. BENTO GRID SECTION ===== */}
      <section className="vtn-bento-section">
        <div className="vtn-container">
          <div className="vtn-bento-header">
            <h2>
              Mang lại trải nghiệm phòng khám thú y
              <br />
              hiện đại và tận tâm nhất
            </h2>
            <div className="vtn-bento-pills">
              <span className="active">Nhắc lịch thông minh</span>
              <span>Đơn thuốc điện tử</span>
              <span>Hóa đơn minh bạch</span>
              <span>Đa chi nhánh</span>
            </div>
          </div>

          <div className="vtn-bento-grid">
            <div className="vtn-bento-green">
              <div>
                <h3>Tự động nhắc lịch tái khám &amp; tiêm phòng</h3>
                <p>
                  Tự động nhắc lịch tái khám, lịch tiêm phòng mũi nhắc lại và lịch tắm Spa định kỳ qua Email &amp; tin nhắn cho Chủ thú cưng.
                </p>
              </div>
              <div className="vtn-whatsapp-circle">💬</div>
            </div>

            <div className="vtn-bento-purple">
              <h3>Cổng thông tin Chủ thú cưng</h3>
              <p>
                Đăng ký một lần, theo dõi toàn bộ hồ sơ thú cưng, lịch hẹn và hóa đơn trực tuyến.
              </p>
              <div className="vtn-phone-mockup">
                <span>🐾 Sổ sức khỏe Veterian</span>
                <strong>Milo • Đang hoạt động</strong>
                <small>Lịch tiêm kế tiếp: 28/10/2026</small>
              </div>
            </div>

            <div className="vtn-bento-light">
              <h4>Hóa đơn &amp; Thanh toán minh bạch</h4>
              <p>
                Hóa đơn chi tiết từng dịch vụ khám, xét nghiệm, thuốc điều trị và giảm giá; hỗ trợ thanh toán tiền mặt, thẻ hoặc chuyển khoản QR.
              </p>
            </div>

            <div className="vtn-bento-light">
              <h4>Bảo mật tài khoản chuẩn Y khoa</h4>
              <p>
                Mật khẩu mã hóa BCrypt, tự động khóa khi đăng nhập sai 5 lần và lưu trữ JWT trực tiếp trong bộ nhớ RAM (In-Memory) chống tấn công XSS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. PURPLE BANNER ("Veterian First") ===== */}
      <section className="vtn-mid-purple-banner">
        <div className="vtn-container vtn-mid-banner-inner">
          <h2>Đồng hành cùng Veterian PCMS</h2>
          <p>
            Sẵn sàng nâng tầm trải nghiệm chăm sóc thú cưng? Khởi tạo tài khoản Chủ thú cưng miễn phí hoặc đăng nhập ngay hôm nay.
          </p>
          <div className="vtn-mid-banner-btns">
            <Link to="/register" className="vtn-btn-white">
              Đăng ký tài khoản Chủ nuôi
            </Link>
            <Link to="/login" className="vtn-btn-outline-light">
              Đăng nhập hệ thống
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 6. EXPLORE ALL FEATURES GRID ===== */}
      <section id="all-features" className="vtn-all-features-section">
        <div className="vtn-container">
          <div className="vtn-all-features-header">
            <h2>Khám phá Toàn bộ Tính năng</h2>
            <p>Mọi tiện ích cần thiết cho phòng khám thú y và chủ nuôi thú cưng trên một hệ thống hợp nhất</p>
          </div>

          <div className="vtn-features-pill-grid">
            {FEATURE_PILLS.map((item) => (
              <div key={item} className="vtn-feature-pill-row">
                <span>{item}</span>
                <b>→</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 7. BOTTOM CTA CARD ===== */}
      <section className="vtn-bottom-cta-wrap">
        <div className="vtn-container">
          <div className="vtn-quote-card">
            <h3>veterian</h3>
            <p>
              “Veterian PCMS giúp phòng khám rút ngắn 40% thời gian chờ khám và mang lại sự an tâm tuyệt đối cho mọi Chủ nuôi thú cưng.”
            </p>
          </div>

          <div className="vtn-final-cta-card">
            <h2>Trải nghiệm Veterian PCMS ngay hôm nay</h2>
            <p>Đăng ký tài khoản Chủ thú cưng chỉ trong 30 giây và đặt lịch hẹn khám trực tuyến đầu tiên.</p>
            <Link to="/register" className="vtn-btn-purple">
              Đăng ký miễn phí
            </Link>
            <small>Kích hoạt tức thì • Đặt lịch trực tuyến miễn phí • Hỗ trợ cấp cứu 24/7</small>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
