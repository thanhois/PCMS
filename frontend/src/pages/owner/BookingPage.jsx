import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  Home,
  Plus,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ownerApi from '../../api/ownerApi';
import '../../styles/vetTheme.css';

export default function BookingPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [bookedSuccess, setBookedSuccess] = useState(null);

  // Form Đặt lịch
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    petId: '',
    appointmentDate: todayStr,
    shift: 'MORNING',
    serviceId: '',
    reason: '',
    notes: '',
  });

  // Modal thêm nhanh thú cưng
  const [newPetOpen, setNewPetOpen] = useState(false);
  const [newPetData, setNewPetData] = useState({
    petName: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực',
    weight: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: '/booking', infoMessage: 'Vui lòng đăng nhập để đặt lịch khám cho thú cưng.' },
      });
      return;
    }
    loadInitialData();
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [petsData, servicesData, appsData] = await Promise.all([
        ownerApi.getMyPets(),
        ownerApi.getServices(),
        ownerApi.getMyAppointments(),
      ]);
      setPets(petsData || []);
      setServices(servicesData || []);
      setMyAppointments(appsData || []);

      if (petsData && petsData.length > 0) {
        setFormData((prev) => ({ ...prev, petId: String(petsData[0].petId) }));
      }
      if (servicesData && servicesData.length > 0) {
        setFormData((prev) => ({ ...prev, serviceId: String(servicesData[0].serviceId) }));
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu đặt lịch:', err);
      setServerError(err.message || 'Không thể tải dữ liệu dịch vụ.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!formData.petId) {
      setServerError('Vui lòng chọn thú cưng cần đặt lịch (hoặc bấm + Thêm bé mới).');
      return;
    }
    if (!formData.appointmentDate) {
      setServerError('Vui lòng chọn ngày hẹn khám.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ownerApi.bookAppointment({
        petId: Number(formData.petId),
        appointmentDate: formData.appointmentDate,
        shift: formData.shift,
        serviceId: formData.serviceId ? Number(formData.serviceId) : null,
        reason: formData.reason.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      setBookedSuccess(res);
      // Tải lại danh sách lịch hẹn
      const updatedApps = await ownerApi.getMyAppointments();
      setMyAppointments(updatedApps || []);
    } catch (err) {
      setServerError(err.message || 'Đặt lịch hẹn không thành công. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePet = async (e) => {
    e.preventDefault();
    if (!newPetData.petName.trim()) {
      alert('Vui lòng nhập tên bé thú cưng');
      return;
    }

    try {
      const created = await ownerApi.createPet(newPetData);
      setPets((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, petId: String(created.petId) }));
      setNewPetOpen(false);
      setNewPetData({ petName: '', species: 'Chó', breed: '', gender: 'Đực', weight: '' });
    } catch (err) {
      alert(err.message || 'Không thể tạo hồ sơ bé.');
    }
  };

  const selectedPet = pets.find((p) => String(p.petId) === String(formData.petId));
  const selectedService = services.find((s) => String(s.serviceId) === String(formData.serviceId));

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
      {/* Top Navigation */}
      <header
        style={{
          background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={20} color="#fbbf24" fill="#fbbf24" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>
              PCMS • Đặt Lịch Khám Trực Tuyến
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: '#c7d2fe' }}>
              ĐẶT HẸN THEO BUỔI (SÁNG / CHIỀU) • TIẾP ĐÓN NHANH CHÓNG TẠI QUẦY
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/owner/medical-history"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            🐾 Sổ khám Thú cưng
          </Link>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Home size={15} /> Trang chủ
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1080, margin: '28px auto', padding: '0 20px' }}>
        {bookedSuccess ? (
          /* MÀN HÌNH XÁC NHẬN ĐẶT LỊCH THÀNH CÔNG */
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '36px 32px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              textAlign: 'center',
              maxWidth: 620,
              margin: '20px auto',
            }}
          >
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Đặt lịch khám thành công!
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
              Yêu cầu hẹn khám của bạn đã được gửi tới hệ thống tiếp nhận quầy Lễ tân PCMS.
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px',
                textAlign: 'left',
                marginBottom: 24,
                fontSize: 13.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px dashed #e2e8f0', marginBottom: 10 }}>
                <span style={{ color: '#64748b' }}>Mã lịch hẹn:</span>
                <strong style={{ color: '#4f46e5', fontSize: 15 }}>{bookedSuccess.appointmentCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Thú cưng:</span>
                <strong>{bookedSuccess.petName} ({bookedSuccess.species})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Ngày khám:</span>
                <strong>{bookedSuccess.appointmentDate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Buổi hẹn:</span>
                <span style={{ fontWeight: 700, color: '#0d9488' }}>{bookedSuccess.shiftDisplay}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Dịch vụ:</span>
                <strong>{bookedSuccess.serviceName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Trạng thái tiếp nhận:</span>
                <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                  {bookedSuccess.statusDisplay || 'Chờ duyệt'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', marginBottom: 24 }}>
              💡 Khi đưa bé đến phòng khám, bạn chỉ cần báo mã lịch hẹn <strong>{bookedSuccess.appointmentCode}</strong> hoặc số điện thoại tại quầy Lễ tân để được cân ký và phân công Bác sĩ ngay.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setBookedSuccess(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#334155',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13.5,
                }}
              >
                + Đặt thêm lịch hẹn khác
              </button>
              <Link
                to="/owner/medical-history"
                style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  padding: '10px 22px',
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 13.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Xem Sổ bệnh án điện tử →
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 24 }}>
            {/* CỘT TRÁI: FORM ĐẶT LỊCH */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '28px',
                boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' }}>
                Thông tin Lịch hẹn Khám
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Quý khách vui lòng chọn bé thú cưng, ngày và buổi khám mong muốn.
              </p>

              {serverError ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 18 }}>
                  {serverError}
                </div>
              ) : null}

              <form onSubmit={handleBookingSubmit}>
                {/* 1. Chọn bé Thú cưng */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                      1. Chọn Thú cưng của bạn <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewPetOpen(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#4f46e5',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Plus size={14} /> Thêm bé mới
                    </button>
                  </div>

                  {pets.length === 0 ? (
                    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#64748b' }}>
                        Bạn chưa có hồ sơ thú cưng nào trong hệ thống.
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewPetOpen(true)}
                        style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          padding: '7px 14px',
                          borderRadius: 6,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + Tạo hồ sơ Thú cưng ngay
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                      {pets.map((p) => {
                        const isSelected = String(p.petId) === String(formData.petId);
                        return (
                          <div
                            key={p.petId}
                            onClick={() => setFormData((prev) => ({ ...prev, petId: String(p.petId) }))}
                            style={{
                              border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                              background: isSelected ? '#f5f3ff' : '#ffffff',
                              borderRadius: 10,
                              padding: '10px 12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? '#4f46e5' : '#0f172a' }}>
                              {p.petName}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {p.species} • {p.breed || 'Chưa rõ giống'}
                            </div>
                            {p.weight ? (
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {p.weight} kg
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Chọn Ngày & Buổi khám */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      2. Ngày khám mong muốn <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={formData.appointmentDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      3. Buổi khám <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8, height: 44 }}>
                      <label
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          borderRadius: 8,
                          border: formData.shift === 'MORNING' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                          background: formData.shift === 'MORNING' ? '#f0fdfa' : '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                          color: formData.shift === 'MORNING' ? '#0d9488' : '#475569',
                        }}
                      >
                        <input
                          type="radio"
                          name="shift"
                          value="MORNING"
                          checked={formData.shift === 'MORNING'}
                          onChange={() => setFormData((prev) => ({ ...prev, shift: 'MORNING' }))}
                          style={{ display: 'none' }}
                        />
                        ☀️ Sáng (8h - 12h)
                      </label>

                      <label
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          borderRadius: 8,
                          border: formData.shift === 'AFTERNOON' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                          background: formData.shift === 'AFTERNOON' ? '#f0fdfa' : '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                          color: formData.shift === 'AFTERNOON' ? '#0d9488' : '#475569',
                        }}
                      >
                        <input
                          type="radio"
                          name="shift"
                          value="AFTERNOON"
                          checked={formData.shift === 'AFTERNOON'}
                          onChange={() => setFormData((prev) => ({ ...prev, shift: 'AFTERNOON' }))}
                          style={{ display: 'none' }}
                        />
                        🌤️ Chiều (13h30 - 17h30)
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Chọn Dịch vụ */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    4. Dịch vụ khám mong muốn
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serviceId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  >
                    <option value="">-- Khám lâm sàng tổng quát --</option>
                    {services.map((s) => (
                      <option key={s.serviceId} value={s.serviceId}>
                        {s.serviceName} {s.price ? `— ${Number(s.price).toLocaleString('vi-VN')} đ` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Triệu chứng & Ghi chú */}
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    5. Triệu chứng của bé / Ghi chú cho Bác sĩ
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả triệu chứng của bé (Ví dụ: Bé mệt, bỏ ăn 2 ngày nay, nôn mửa, ngứa gãi nhiều...)"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value, reason: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || pets.length === 0}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #4f46e5 0%, #4338ca 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '13px 20px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: submitting || pets.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    opacity: submitting || pets.length === 0 ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Đang gửi yêu cầu đặt lịch...' : 'Xác nhận Đặt lịch khám ngay'}
                </button>
              </form>
            </div>

            {/* CỘT PHẢI: TỔNG QUAN & LỊCH HẸN GẦN ĐÂY */}
            <div>
              {/* Card tóm tắt phiếu đặt */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: '22px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                  marginBottom: 20,
                  border: '1px solid #e2e8f0',
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>
                  📋 Tóm tắt lịch hẹn
                </h3>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Bệnh nhân:</span>
                    <strong>{selectedPet ? `${selectedPet.petName} (${selectedPet.species})` : 'Chưa chọn'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Ngày khám:</span>
                    <strong>{formData.appointmentDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Buổi khám:</span>
                    <strong style={{ color: '#0d9488' }}>
                      {formData.shift === 'MORNING' ? '☀️ Buổi sáng (8h - 12h)' : '🌤️ Buổi chiều (13h30 - 17h30)'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Dịch vụ:</span>
                    <strong>{selectedService ? selectedService.serviceName : 'Khám lâm sàng tổng quát'}</strong>
                  </div>
                  {selectedService?.price ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Phí tham khảo:</span>
                      <strong style={{ color: '#4f46e5' }}>{Number(selectedService.price).toLocaleString('vi-VN')} đ</strong>
                    </div>
                  ) : null}
                </div>

                <div style={{ marginTop: 14, padding: '10px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
                  ℹ️ Bác sĩ trực sẵn sàng sẽ được điều phối ngay khi bạn đưa bé tới quầy tiếp đón Lễ tân.
                </div>
              </div>

              {/* Danh sách Lịch hẹn đã đặt gần đây */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: '22px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>
                  🕒 Lịch hẹn của bạn ({myAppointments.length})
                </h3>

                {myAppointments.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, textAlign: 'center', padding: '16px 0' }}>
                    Bạn chưa có lịch hẹn nào.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                    {myAppointments.slice(0, 5).map((app) => (
                      <div
                        key={app.appointmentId}
                        style={{
                          background: '#f8fafc',
                          borderRadius: 8,
                          padding: '10px 12px',
                          border: '1px solid #f1f5f9',
                          fontSize: 12.5,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <strong style={{ color: '#4f46e5' }}>{app.appointmentCode}</strong>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background:
                                app.status === 'CONFIRMED' || app.status === 'APPROVED'
                                  ? '#dcfce7'
                                  : app.status === 'CHECKED_IN'
                                  ? '#e0e7ff'
                                  : '#fef3c7',
                              color:
                                app.status === 'CONFIRMED' || app.status === 'APPROVED'
                                  ? '#166534'
                                  : app.status === 'CHECKED_IN'
                                  ? '#3730a3'
                                  : '#92400e',
                            }}
                          >
                            {app.statusDisplay}
                          </span>
                        </div>
                        <div>
                          <strong>{app.petName}</strong> • {app.appointmentDate} • {app.shiftDisplay}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Thêm nhanh Thú cưng */}
      {newPetOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '24px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Tạo hồ sơ Thú cưng mới</h3>
              <button
                type="button"
                onClick={() => setNewPetOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePet}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Tên bé thú cưng <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Milo, Lu, Bơ..."
                  value={newPetData.petName}
                  onChange={(e) => setNewPetData((prev) => ({ ...prev, petName: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Loài</label>
                  <select
                    value={newPetData.species}
                    onChange={(e) => setNewPetData((prev) => ({ ...prev, species: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                  >
                    <option value="Chó">Chó</option>
                    <option value="Mèo">Mèo</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Giống</label>
                  <input
                    type="text"
                    placeholder="Poodle, Golden, Mèo Anh..."
                    value={newPetData.breed}
                    onChange={(e) => setNewPetData((prev) => ({ ...prev, breed: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Giới tính</label>
                  <select
                    value={newPetData.gender}
                    onChange={(e) => setNewPetData((prev) => ({ ...prev, gender: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                  >
                    <option value="Đực">Đực</option>
                    <option value="Cái">Cái</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Cân nặng (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ví dụ: 4.5"
                    value={newPetData.weight}
                    onChange={(e) => setNewPetData((prev) => ({ ...prev, weight: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setNewPetOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', padding: '9px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                >
                  Lưu hồ sơ bé
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
