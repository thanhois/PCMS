import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ownerApi from '../../api/ownerApi';
import PageHeader from '../../components/admin/ui/PageHeader';
import '../../styles/vetTheme.css';

export default function BookingPage() {
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [bookedSuccess, setBookedSuccess] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    petId: '',
    appointmentDate: todayStr,
    shift: 'MORNING',
    serviceId: '',
    reason: '',
    notes: '',
  });

  const [newPetOpen, setNewPetOpen] = useState(false);
  const [newPetData, setNewPetData] = useState({
    petName: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực',
    weight: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

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
      setServerError('Vui lòng chọn thú cưng cần đặt lịch (hoặc bấm Thêm bé mới).');
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
    <div className="pcms-page">
      <PageHeader
        title="Đặt lịch khám trực tuyến"
        subtitle="Chọn thú cưng, ngày và buổi khám (Sáng / Chiều) để được tiếp đón nhanh tại quầy Lễ tân"
        actions={
          <Link to="/owner/medical-history" className="pcms-btn pcms-btn-outline">
            Sổ khám bệnh điện tử
          </Link>
        }
      />

      {loading ? (
        <div className="pcms-card pcms-state-box">
          <h4>Đang tải dữ liệu đặt lịch...</h4>
          <p>Vui lòng chờ trong giây lát.</p>
        </div>
      ) : bookedSuccess ? (
        <div
          className="pcms-card"
          style={{
            padding: '36px 32px',
            textAlign: 'center',
            maxWidth: 620,
            margin: '12px auto',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 9999,
              background: '#dcfce7',
              color: '#15803d',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            Gửi yêu cầu thành công
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            Đặt lịch khám thành công
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
            Yêu cầu hẹn khám của bạn đã được gửi tới hệ thống tiếp nhận quầy Lễ tân PCMS.
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              textAlign: 'left',
              marginBottom: 24,
              fontSize: 13.5,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px dashed #e5e7eb', marginBottom: 10 }}>
              <span style={{ color: '#64748b' }}>Mã lịch hẹn:</span>
              <strong style={{ color: '#6320ee', fontSize: 15 }}>{bookedSuccess.appointmentCode}</strong>
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
              <span style={{ fontWeight: 700, color: '#6320ee' }}>{bookedSuccess.shiftDisplay}</span>
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

          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
            Khi đưa bé đến phòng khám, quý khách chỉ cần báo mã lịch hẹn <strong>{bookedSuccess.appointmentCode}</strong> hoặc số điện thoại tại quầy Lễ tân để được phân công Bác sĩ ngay.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              className="pcms-btn pcms-btn-outline"
              onClick={() => setBookedSuccess(null)}
            >
              Đặt thêm lịch hẹn khác
            </button>
            <Link to="/owner/medical-history" className="pcms-btn pcms-btn-primary">
              Xem Sổ bệnh án điện tử
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 20 }}>
          <div className="pcms-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
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
                      color: '#6320ee',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Thêm bé mới
                  </button>
                </div>

                {pets.length === 0 ? (
                  <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#64748b' }}>
                      Bạn chưa có hồ sơ thú cưng nào trong hệ thống.
                    </p>
                    <button
                      type="button"
                      className="pcms-btn pcms-btn-primary pcms-btn-sm"
                      onClick={() => setNewPetOpen(true)}
                    >
                      Tạo hồ sơ Thú cưng ngay
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 10 }}>
                    {pets.map((p) => {
                      const isSelected = String(p.petId) === String(formData.petId);
                      return (
                        <div
                          key={p.petId}
                          onClick={() => setFormData((prev) => ({ ...prev, petId: String(p.petId) }))}
                          style={{
                            border: isSelected ? '2px solid #6320ee' : '1px solid #e5e7eb',
                            background: isSelected ? '#f5f3ff' : '#ffffff',
                            borderRadius: 10,
                            padding: '10px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? '#6320ee' : '#0f172a' }}>
                            {p.petName}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {p.species} • {p.breed || 'Chưa rõ giống'}
                          </div>
                          {p.weight ? (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.weight} kg</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    2. Ngày khám mong muốn <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="vet-input"
                    min={todayStr}
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    3. Buổi khám <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, height: 39 }}>
                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        border: formData.shift === 'MORNING' ? '2px solid #6320ee' : '1px solid #cbd5e1',
                        background: formData.shift === 'MORNING' ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 12.5,
                        color: formData.shift === 'MORNING' ? '#6320ee' : '#475569',
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
                      Sáng (8h - 12h)
                    </label>

                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        border: formData.shift === 'AFTERNOON' ? '2px solid #6320ee' : '1px solid #cbd5e1',
                        background: formData.shift === 'AFTERNOON' ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 12.5,
                        color: formData.shift === 'AFTERNOON' ? '#6320ee' : '#475569',
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
                      Chiều (13h30 - 17h30)
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  4. Dịch vụ khám mong muốn
                </label>
                <select
                  className="vet-select"
                  value={formData.serviceId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serviceId: e.target.value }))}
                >
                  <option value="">-- Khám lâm sàng tổng quát --</option>
                  {services.map((s) => (
                    <option key={s.serviceId} value={s.serviceId}>
                      {s.serviceName} {s.price ? `— ${Number(s.price).toLocaleString('vi-VN')} đ` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  5. Triệu chứng của bé / Ghi chú cho Bác sĩ
                </label>
                <textarea
                  className="vet-textarea"
                  rows={3}
                  placeholder="Mô tả triệu chứng của bé (Ví dụ: Bé mệt, bỏ ăn 2 ngày nay, nôn mửa, ngứa gãi nhiều...)"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value, reason: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || pets.length === 0}
                className="pcms-btn pcms-btn-primary"
                style={{ width: '100%', height: 42, justifyContent: 'center', fontSize: 14 }}
              >
                {submitting ? 'Đang gửi yêu cầu đặt lịch...' : 'Xác nhận Đặt lịch khám ngay'}
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="pcms-card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px 0', color: '#0f172a' }}>
                Tóm tắt lịch hẹn
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
                  <strong style={{ color: '#6320ee' }}>
                    {formData.shift === 'MORNING' ? 'Buổi sáng (8h - 12h)' : 'Buổi chiều (13h30 - 17h30)'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Dịch vụ:</span>
                  <strong>{selectedService ? selectedService.serviceName : 'Khám lâm sàng tổng quát'}</strong>
                </div>
                {selectedService?.price ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px dashed #e5e7eb' }}>
                    <span style={{ color: '#64748b' }}>Phí tham khảo:</span>
                    <strong style={{ color: '#6320ee' }}>{Number(selectedService.price).toLocaleString('vi-VN')} đ</strong>
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 14, padding: '10px 12px', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 8, fontSize: 12, color: '#5218cc' }}>
                Bác sĩ trực sẵn sàng sẽ được điều phối ngay khi bạn đưa bé tới quầy tiếp đón Lễ tân.
              </div>
            </div>

            <div className="pcms-card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a' }}>
                Lịch hẹn của bạn ({myAppointments.length})
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
                        border: '1px solid #eef2f6',
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <strong style={{ color: '#6320ee' }}>{app.appointmentCode}</strong>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 9999,
                            background:
                              app.status === 'CONFIRMED' || app.status === 'APPROVED'
                                ? '#dcfce7'
                                : app.status === 'CHECKED_IN'
                                ? '#ede9fe'
                                : '#fef3c7',
                            color:
                              app.status === 'CONFIRMED' || app.status === 'APPROVED'
                                ? '#15803d'
                                : app.status === 'CHECKED_IN'
                                ? '#6320ee'
                                : '#b45309',
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

      {newPetOpen ? (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 440 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Tạo hồ sơ Thú cưng mới
              </h3>
              <button
                type="button"
                className="vet-btn vet-btn-outline vet-btn-sm"
                onClick={() => setNewPetOpen(false)}
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreatePet}>
              <div className="vet-modal-body">
                <div className="vet-form-group">
                  <label className="vet-form-label">
                    Tên bé thú cưng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="vet-input"
                    placeholder="Ví dụ: Milo, Lu, Bơ..."
                    value={newPetData.petName}
                    onChange={(e) => setNewPetData((prev) => ({ ...prev, petName: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="vet-form-group">
                    <label className="vet-form-label">Loài</label>
                    <select
                      className="vet-select"
                      value={newPetData.species}
                      onChange={(e) => setNewPetData((prev) => ({ ...prev, species: e.target.value }))}
                    >
                      <option value="Chó">Chó</option>
                      <option value="Mèo">Mèo</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="vet-form-group">
                    <label className="vet-form-label">Giống</label>
                    <input
                      type="text"
                      className="vet-input"
                      placeholder="Poodle, Golden, Mèo Anh..."
                      value={newPetData.breed}
                      onChange={(e) => setNewPetData((prev) => ({ ...prev, breed: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="vet-form-group" style={{ marginBottom: 0 }}>
                    <label className="vet-form-label">Giới tính</label>
                    <select
                      className="vet-select"
                      value={newPetData.gender}
                      onChange={(e) => setNewPetData((prev) => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="Đực">Đực</option>
                      <option value="Cái">Cái</option>
                    </select>
                  </div>
                  <div className="vet-form-group" style={{ marginBottom: 0 }}>
                    <label className="vet-form-label">Cân nặng (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="vet-input"
                      placeholder="Ví dụ: 4.5"
                      value={newPetData.weight}
                      onChange={(e) => setNewPetData((prev) => ({ ...prev, weight: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="vet-modal-footer">
                <button type="button" className="vet-btn vet-btn-outline" onClick={() => setNewPetOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="vet-btn vet-btn-primary">
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
