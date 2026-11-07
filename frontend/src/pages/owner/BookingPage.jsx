import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ownerApi from '../../api/ownerApi';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import ModalDialog from '../../components/admin/ui/ModalDialog';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import ToastMessage from '../../components/admin/ui/ToastMessage';
import '../../styles/adminTheme.css';

const INITIAL_PET_FORM = {
  petId: null,
  petName: '',
  species: 'Chó',
  breed: '',
  color: '',
  gender: 'Đực',
  dateOfBirth: '',
  weight: '',
};

export default function BookingPage() {
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [slots, setSlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: 'info', message: '' });
  const [bookedSuccess, setBookedSuccess] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    petId: '',
    veterinarianId: '',
    appointmentDate: todayStr,
    appointmentTime: '09:00',
    serviceId: '',
    notes: '',
  });

  // Modal tạo / cập nhật thú cưng (UC13, UC14)
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petForm, setPetForm] = useState(INITIAL_PET_FORM);
  const [deletePetTarget, setDeletePetTarget] = useState(null);

  // Modal đổi lịch (UC08) & hủy lịch (UC09)
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    appointmentDate: todayStr,
    appointmentTime: '09:00',
    veterinarianId: '',
    serviceId: '',
    notes: '',
  });
  const [rescheduleSlots, setRescheduleSlots] = useState([]);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [petsData, servicesData, vetsData, appsData] = await Promise.all([
        ownerApi.getMyPets(),
        ownerApi.getServices(),
        ownerApi.getVeterinarians(),
        ownerApi.getMyAppointments(),
      ]);
      const pList = petsData || [];
      const sList = servicesData || [];
      setPets(pList);
      setServices(sList);
      setVeterinarians(vetsData || []);
      setMyAppointments(appsData || []);

      setFormData((prev) => ({
        ...prev,
        petId: prev.petId || (pList[0] ? String(pList[0].petId) : ''),
        serviceId: prev.serviceId || (sList[0] ? String(sList[0].serviceId) : ''),
      }));
    } catch (err) {
      setToast({ type: 'error', message: err?.message || 'Không thể tải dữ liệu đặt lịch.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadInitialData);
  }, [loadInitialData]);

  const loadSlots = useCallback(async (date, vetId, setter, timeUpdater) => {
    if (!date) return;
    try {
      const res = await ownerApi.getAvailableSlots({
        date,
        veterinarianId: vetId ? Number(vetId) : undefined,
      });
      const list = Array.isArray(res) ? res : [];
      setter(list);
      const firstAvail = list.find((s) => s.available);
      if (firstAvail && timeUpdater) {
        timeUpdater(firstAvail.time);
      }
    } catch {
      setter([]);
    }
  }, []);

  useEffect(() => {
    loadSlots(formData.appointmentDate, formData.veterinarianId, setSlots, (nextTime) => {
      setFormData((prev) => {
        const currentValid = slots.some((s) => s.time === prev.appointmentTime && s.available);
        return currentValid ? prev : { ...prev, appointmentTime: nextTime };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.appointmentDate, formData.veterinarianId]);

  useEffect(() => {
    if (rescheduleTarget) {
      loadSlots(
        rescheduleForm.appointmentDate,
        rescheduleForm.veterinarianId,
        setRescheduleSlots,
        null
      );
    }
  }, [rescheduleTarget, rescheduleForm.appointmentDate, rescheduleForm.veterinarianId, loadSlots]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!formData.petId) {
      setToast({ type: 'error', message: 'Vui lòng chọn thú cưng cần đặt lịch.' });
      return;
    }
    if (!formData.appointmentDate || !formData.appointmentTime) {
      setToast({ type: 'error', message: 'Vui lòng chọn ngày và khung giờ khám.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await ownerApi.bookAppointment({
        petId: Number(formData.petId),
        veterinarianId: formData.veterinarianId ? Number(formData.veterinarianId) : null,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        serviceId: formData.serviceId ? Number(formData.serviceId) : null,
        notes: formData.notes.trim() || undefined,
      });
      setBookedSuccess(res);
      const updatedApps = await ownerApi.getMyAppointments();
      setMyAppointments(updatedApps || []);
      await loadSlots(formData.appointmentDate, formData.veterinarianId, setSlots, null);
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || 'Đặt lịch hẹn không thành công. Vui lòng kiểm tra lại khung giờ.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== PET CRUD (UC13, UC14) ====================
  const openAddPet = () => {
    setPetForm(INITIAL_PET_FORM);
    setPetModalOpen(true);
  };

  const openEditPet = (p, e) => {
    e.stopPropagation();
    setPetForm({
      petId: p.petId,
      petName: p.petName || '',
      species: p.species || 'Chó',
      breed: p.breed || '',
      color: p.color || '',
      gender: p.gender || 'Đực',
      dateOfBirth: p.dateOfBirth || '',
      weight: p.weight != null ? String(p.weight) : '',
    });
    setPetModalOpen(true);
  };

  const handleSavePet = async (e) => {
    e.preventDefault();
    if (!petForm.petName.trim()) {
      setToast({ type: 'error', message: 'Tên thú cưng không được để trống.' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        petName: petForm.petName.trim(),
        species: petForm.species,
        breed: petForm.breed.trim(),
        color: petForm.color.trim(),
        gender: petForm.gender,
        dateOfBirth: petForm.dateOfBirth || null,
        weight: petForm.weight !== '' ? Number(petForm.weight) : null,
      };
      if (petForm.petId) {
        await ownerApi.updatePet(petForm.petId, payload);
        setToast({ type: 'success', message: `Đã cập nhật hồ sơ thú cưng ${payload.petName}.` });
      } else {
        const created = await ownerApi.createPet(payload);
        setFormData((prev) => ({ ...prev, petId: String(created.petId) }));
        setToast({ type: 'success', message: `Đã thêm thú cưng ${payload.petName}.` });
      }
      setPetModalOpen(false);
      const updatedPets = await ownerApi.getMyPets();
      setPets(updatedPets || []);
    } catch (err) {
      setToast({ type: 'error', message: err?.message || 'Không thể lưu hồ sơ thú cưng.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeletePet = async () => {
    if (!deletePetTarget) return;
    setSubmitting(true);
    try {
      await ownerApi.updatePetStatus(deletePetTarget.petId, 'INACTIVE');
      setToast({ type: 'success', message: `Đã xóa mềm hồ sơ thú cưng ${deletePetTarget.petName}.` });
      setDeletePetTarget(null);
      const updatedPets = await ownerApi.getMyPets();
      setPets(updatedPets || []);
      if (String(formData.petId) === String(deletePetTarget.petId)) {
        setFormData((prev) => ({ ...prev, petId: updatedPets?.[0] ? String(updatedPets[0].petId) : '' }));
      }
    } catch (err) {
      setToast({ type: 'error', message: err?.message || 'Không thể xóa hồ sơ thú cưng.' });
      setDeletePetTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== RESCHEDULE & CANCEL (UC08, UC09, BR-10) ====================
  const openRescheduleModal = (app) => {
    setRescheduleTarget(app);
    setRescheduleForm({
      appointmentDate: app.appointmentDate || todayStr,
      appointmentTime: app.appointmentTime || '09:00',
      veterinarianId: app.veterinarianId ? String(app.veterinarianId) : '',
      serviceId: app.serviceId ? String(app.serviceId) : '',
      notes: app.notes || '',
    });
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    setSubmitting(true);
    try {
      await ownerApi.rescheduleAppointment(rescheduleTarget.appointmentId, {
        appointmentDate: rescheduleForm.appointmentDate,
        appointmentTime: rescheduleForm.appointmentTime,
        veterinarianId: rescheduleForm.veterinarianId ? Number(rescheduleForm.veterinarianId) : null,
        serviceId: rescheduleForm.serviceId ? Number(rescheduleForm.serviceId) : null,
        notes: rescheduleForm.notes.trim(),
      });
      setToast({ type: 'success', message: `Đã đổi lịch hẹn ${rescheduleTarget.appointmentCode} thành công.` });
      setRescheduleTarget(null);
      const updatedApps = await ownerApi.getMyAppointments();
      setMyAppointments(updatedApps || []);
    } catch (err) {
      setToast({ type: 'error', message: err?.message || 'Không thể đổi lịch hẹn.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await ownerApi.cancelAppointment(cancelTarget.appointmentId, cancelReason.trim());
      setToast({ type: 'success', message: `Đã hủy lịch hẹn ${cancelTarget.appointmentCode}.` });
      setCancelTarget(null);
      setCancelReason('');
      const updatedApps = await ownerApi.getMyAppointments();
      setMyAppointments(updatedApps || []);
    } catch (err) {
      setToast({ type: 'error', message: err?.message || 'Không thể hủy lịch hẹn.' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPet = pets.find((p) => String(p.petId) === String(formData.petId));
  const selectedService = services.find((s) => String(s.serviceId) === String(formData.serviceId));
  const selectedVet = veterinarians.find((v) => String(v.userId) === String(formData.veterinarianId));

  return (
    <div>
      <PageHeader
        title="Đặt lịch khám & Quản lý Thú cưng"
        subtitle="Đặt lịch khám trước tối thiểu 2 giờ. Đổi hoặc hủy lịch trực tuyến trước tối thiểu 24 giờ."
        actions={
          <Link to="/owner/medical-history" className="pcms-btn pcms-btn-outline">
            Sổ khám bệnh điện tử
          </Link>
        }
      />

      <ToastMessage
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ type: 'info', message: '' })}
      />

      {loading ? (
        <div className="pcms-card" style={{ padding: 32, textAlign: 'center' }}>
          Đang tải dữ liệu cổng chủ nuôi...
        </div>
      ) : bookedSuccess ? (
        <div className="pcms-card" style={{ padding: 32, maxWidth: 620, margin: '12px auto' }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Đặt lịch khám thành công</h2>
          <p style={{ color: 'var(--pcms-text-muted)', marginBottom: 20 }}>
            Yêu cầu hẹn khám của bạn đã được ghi nhận và gửi thông báo xác nhận.
          </p>
          <div style={{ background: 'var(--pcms-bg-subtle, #f8fafc)', border: '1px solid var(--pcms-border, #e2e8f0)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <p style={{ margin: '4px 0' }}><strong>Mã lịch hẹn:</strong> {bookedSuccess.appointmentCode}</p>
            <p style={{ margin: '4px 0' }}><strong>Thú cưng:</strong> {bookedSuccess.petName} ({bookedSuccess.species})</p>
            <p style={{ margin: '4px 0' }}><strong>Thời gian hẹn:</strong> {bookedSuccess.appointmentDateTimeDisplay || `${bookedSuccess.appointmentDate} ${bookedSuccess.appointmentTime}`}</p>
            <p style={{ margin: '4px 0' }}><strong>Bác sĩ:</strong> {bookedSuccess.veterinarianName}</p>
            <p style={{ margin: '4px 0' }}><strong>Dịch vụ:</strong> {bookedSuccess.serviceName}</p>
            <p style={{ margin: '4px 0' }}><strong>Trạng thái:</strong> {bookedSuccess.statusDisplay}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setBookedSuccess(null)}>
              Đặt thêm lịch khác
            </button>
            <Link to="/owner/medical-history" className="pcms-btn pcms-btn-primary">
              Xem Sổ bệnh án điện tử
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          {/* Cột trái: Form Đặt lịch & Hồ sơ thú cưng */}
          <div className="pcms-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>1. Hồ sơ Thú cưng của bạn</h2>
              <button type="button" className="pcms-btn pcms-btn-outline pcms-btn-sm" onClick={openAddPet}>
                + Thêm thú cưng
              </button>
            </div>

            {pets.length === 0 ? (
              <div style={{ padding: 18, border: '1px dashed var(--pcms-border, #cbd5e1)', borderRadius: 8, textAlign: 'center', marginBottom: 20 }}>
                <p style={{ marginTop: 0 }}>Bạn chưa có hồ sơ thú cưng đang hoạt động.</p>
                <button type="button" className="pcms-btn pcms-btn-primary pcms-btn-sm" onClick={openAddPet}>
                  Tạo hồ sơ thú cưng ngay
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, marginBottom: 20 }}>
                {pets.map((p) => {
                  const isSelected = String(p.petId) === String(formData.petId);
                  return (
                    <div
                      key={p.petId}
                      onClick={() => setFormData((prev) => ({ ...prev, petId: String(p.petId) }))}
                      style={{
                        border: isSelected ? '2px solid var(--pcms-primary, #4f46e5)' : '1px solid var(--pcms-border, #e2e8f0)',
                        borderRadius: 8,
                        padding: 12,
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(79, 70, 229, 0.05)' : '#fff',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.petName}</div>
                      <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
                        {p.species} {p.breed ? `• ${p.breed}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)', marginTop: 2 }}>
                        {p.color ? `Màu: ${p.color} • ` : ''}
                        {p.weight ? `${p.weight} kg` : 'Chưa cân'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button
                          type="button"
                          className="pcms-btn pcms-btn-outline pcms-btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11.5 }}
                          onClick={(e) => openEditPet(p, e)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="pcms-btn pcms-btn-danger pcms-btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePetTarget(p);
                          }}
                        >
                          Ẩn
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleBookingSubmit}>
              <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: 17 }}>2. Chọn Lịch khám & Bác sĩ</h2>

              <div className="pcms-form-grid" style={{ marginBottom: 16 }}>
                <div className="pcms-form-group">
                  <label className="pcms-label">Ngày khám mong muốn *</label>
                  <input
                    type="date"
                    className="pcms-input"
                    min={todayStr}
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">Bác sĩ phụ trách (Tùy chọn)</label>
                  <select
                    className="pcms-select"
                    value={formData.veterinarianId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, veterinarianId: e.target.value }))}
                  >
                    <option value="">-- Để phòng khám điều phối --</option>
                    {veterinarians.map((v) => (
                      <option key={v.userId} value={v.userId}>
                        BS. {v.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pcms-form-group" style={{ marginBottom: 16 }}>
                <label className="pcms-label">Khung giờ khám (Cách thời điểm hiện tại ít nhất 2 giờ) *</label>
                {slots.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--pcms-text-muted)' }}>Không có khung giờ khả dụng trong ngày này.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }}>
                    {slots.map((s) => {
                      const active = formData.appointmentTime === s.time;
                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={!s.available}
                          title={s.reasonUnavailable || 'Khả dụng'}
                          onClick={() => setFormData((prev) => ({ ...prev, appointmentTime: s.time }))}
                          className={active ? 'pcms-btn pcms-btn-primary pcms-btn-sm' : 'pcms-btn pcms-btn-outline pcms-btn-sm'}
                          style={{
                            justifyContent: 'center',
                            opacity: s.available ? 1 : 0.42,
                          }}
                        >
                          {s.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pcms-form-group" style={{ marginBottom: 16 }}>
                <label className="pcms-label">Dịch vụ đăng ký</label>
                <select
                  className="pcms-select"
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

              <div className="pcms-form-group" style={{ marginBottom: 18 }}>
                <label className="pcms-label">Triệu chứng / Ghi chú</label>
                <textarea
                  className="pcms-textarea"
                  rows={3}
                  placeholder="Mô tả triệu chứng hoặc yêu cầu đặc biệt..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="pcms-btn pcms-btn-primary"
                disabled={submitting || pets.length === 0}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {submitting ? 'Đang gửi yêu cầu...' : 'Xác nhận Đặt lịch Khám'}
              </button>
            </form>
          </div>

          {/* Cột phải: Tóm tắt & Danh sách lịch hẹn của chủ nuôi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="pcms-card" style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>Tóm tắt yêu cầu đặt hẹn</h3>
              <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
                <div><strong>Thú cưng:</strong> {selectedPet ? `${selectedPet.petName} (${selectedPet.species})` : 'Chưa chọn'}</div>
                <div><strong>Ngày & Giờ:</strong> {formData.appointmentDate} lúc {formData.appointmentTime}</div>
                <div><strong>Bác sĩ:</strong> {selectedVet ? `BS. ${selectedVet.fullName}` : 'Phòng khám điều phối'}</div>
                <div><strong>Dịch vụ:</strong> {selectedService ? selectedService.serviceName : 'Khám tổng quát'}</div>
                {selectedService?.price ? (
                  <div><strong>Chi phí dự kiến:</strong> {Number(selectedService.price).toLocaleString('vi-VN')} đ</div>
                ) : null}
              </div>
            </div>

            <div className="pcms-card" style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>
                Lịch hẹn của bạn ({myAppointments.length})
              </h3>
              {myAppointments.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--pcms-text-muted)' }}>Bạn chưa có lịch hẹn nào.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto' }}>
                  {myAppointments.map((app) => {
                    const modifiableStatus = ['PENDING_APPROVAL', 'CONFIRMED', 'APPROVED'].includes(
                      (app.status || '').toUpperCase()
                    );
                    return (
                      <div
                        key={app.appointmentId}
                        style={{
                          border: '1px solid var(--pcms-border, #e2e8f0)',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong>{app.appointmentCode} — {app.petName}</strong>
                          <StatusBadge status={app.status} />
                        </div>
                        <div>Thời gian: <strong>{app.appointmentDateTimeDisplay || `${app.appointmentDate} ${app.appointmentTime}`}</strong></div>
                        <div>Bác sĩ: {app.veterinarianName}</div>
                        <div>Dịch vụ: {app.serviceName}</div>
                        {app.rejectionReason ? (
                          <div style={{ color: '#b91c1c', marginTop: 4 }}>Lý do hủy/từ chối: {app.rejectionReason}</div>
                        ) : null}

                        {modifiableStatus ? (
                          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {app.canModifyOnline ? (
                              <>
                                <button
                                  type="button"
                                  className="pcms-btn pcms-btn-outline pcms-btn-sm"
                                  onClick={() => openRescheduleModal(app)}
                                >
                                  Đổi lịch
                                </button>
                                <button
                                  type="button"
                                  className="pcms-btn pcms-btn-danger pcms-btn-sm"
                                  onClick={() => {
                                    setCancelTarget(app);
                                    setCancelReason('');
                                  }}
                                >
                                  Hủy lịch
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: 11.5, color: 'var(--pcms-text-muted)' }}>
                                Dưới 24 giờ trước lịch hẹn: Vui lòng liên hệ hotline Lễ tân để đổi hoặc hủy lịch.
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Thú cưng */}
      <ModalDialog
        open={petModalOpen}
        title={petForm.petId ? 'Cập nhật Hồ sơ Thú cưng' : 'Thêm Hồ sơ Thú cưng mới'}
        onClose={() => setPetModalOpen(false)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setPetModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="owner-pet-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              Lưu hồ sơ
            </button>
          </>
        }
      >
        <form id="owner-pet-form" onSubmit={handleSavePet} className="pcms-form-grid">
          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Tên thú cưng *</label>
            <input
              className="pcms-input"
              required
              value={petForm.petName}
              onChange={(e) => setPetForm((prev) => ({ ...prev, petName: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Loài *</label>
            <select
              className="pcms-select"
              value={petForm.species}
              onChange={(e) => setPetForm((prev) => ({ ...prev, species: e.target.value }))}
            >
              <option value="Chó">Chó</option>
              <option value="Mèo">Mèo</option>
              <option value="Thỏ">Thỏ</option>
              <option value="Hamster">Hamster</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Giống (Breed)</label>
            <input
              className="pcms-input"
              value={petForm.breed}
              onChange={(e) => setPetForm((prev) => ({ ...prev, breed: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Màu lông (Color)</label>
            <input
              className="pcms-input"
              placeholder="Trắng, Vàng, Tam thể..."
              value={petForm.color}
              onChange={(e) => setPetForm((prev) => ({ ...prev, color: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Giới tính</label>
            <select
              className="pcms-select"
              value={petForm.gender}
              onChange={(e) => setPetForm((prev) => ({ ...prev, gender: e.target.value }))}
            >
              <option value="Đực">Đực</option>
              <option value="Cái">Cái</option>
              <option value="UNKNOWN">Chưa rõ</option>
            </select>
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Ngày sinh</label>
            <input
              type="date"
              className="pcms-input"
              max={todayStr}
              value={petForm.dateOfBirth}
              onChange={(e) => setPetForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Cân nặng (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="250"
              className="pcms-input"
              value={petForm.weight}
              onChange={(e) => setPetForm((prev) => ({ ...prev, weight: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Modal Đổi lịch hẹn (UC08) */}
      <ModalDialog
        open={Boolean(rescheduleTarget)}
        title={`Đổi lịch hẹn ${rescheduleTarget?.appointmentCode || ''}`}
        onClose={() => setRescheduleTarget(null)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setRescheduleTarget(null)}>
              Hủy
            </button>
            <button type="submit" form="owner-reschedule-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              Lưu lịch hẹn mới
            </button>
          </>
        }
      >
        <form id="owner-reschedule-form" onSubmit={handleRescheduleSubmit} className="pcms-form-grid">
          <div className="pcms-form-group">
            <label className="pcms-label">Ngày hẹn mới *</label>
            <input
              type="date"
              className="pcms-input"
              min={todayStr}
              required
              value={rescheduleForm.appointmentDate}
              onChange={(e) => setRescheduleForm((prev) => ({ ...prev, appointmentDate: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Bác sĩ phụ trách</label>
            <select
              className="pcms-select"
              value={rescheduleForm.veterinarianId}
              onChange={(e) => setRescheduleForm((prev) => ({ ...prev, veterinarianId: e.target.value }))}
            >
              <option value="">-- Để phòng khám điều phối --</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  BS. {v.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Khung giờ mới *</label>
            <select
              className="pcms-select"
              value={rescheduleForm.appointmentTime}
              onChange={(e) => setRescheduleForm((prev) => ({ ...prev, appointmentTime: e.target.value }))}
            >
              {rescheduleSlots.map((s) => (
                <option key={s.time} value={s.time} disabled={!s.available}>
                  {s.time} {!s.available ? `(${s.reasonUnavailable})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Ghi chú cập nhật</label>
            <textarea
              className="pcms-textarea"
              rows={2}
              value={rescheduleForm.notes}
              onChange={(e) => setRescheduleForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Modal Hủy lịch hẹn (UC09) */}
      <ModalDialog
        open={Boolean(cancelTarget)}
        title={`Hủy lịch hẹn ${cancelTarget?.appointmentCode || ''}`}
        onClose={() => setCancelTarget(null)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setCancelTarget(null)}>
              Đóng
            </button>
            <button type="submit" form="owner-cancel-form" className="pcms-btn pcms-btn-danger" disabled={submitting}>
              Xác nhận Hủy lịch
            </button>
          </>
        }
      >
        <form id="owner-cancel-form" onSubmit={handleCancelSubmit}>
          <div className="pcms-form-group">
            <label className="pcms-label">Lý do hủy lịch</label>
            <textarea
              className="pcms-textarea"
              rows={3}
              placeholder="Nhập lý do hủy lịch (tùy chọn)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Confirm xóa mềm thú cưng */}
      <ConfirmDialog
        open={Boolean(deletePetTarget)}
        title="Ẩn / Xóa mềm Hồ sơ Thú cưng"
        message={`Bạn có chắc chắn muốn ẩn hồ sơ thú cưng "${deletePetTarget?.petName}"? Lịch sử bệnh án cũ vẫn được lưu trữ an toàn.`}
        confirmLabel="Xác nhận ẩn"
        variant="danger"
        onCancel={() => setDeletePetTarget(null)}
        onConfirm={handleConfirmDeletePet}
      />
    </div>
  );
}
