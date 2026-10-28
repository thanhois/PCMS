import { useCallback, useEffect, useState } from 'react';
import receptionistApi from '../../api/receptionistApi';
import ModalDialog from '../../components/admin/ui/ModalDialog';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import ToastMessage from '../../components/admin/ui/ToastMessage';

export default function ReceptionistAppointmentsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Bộ lọc (UC07)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vetFilter, setVetFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateError, setDateError] = useState('');

  // Dữ liệu
  const [appointments, setAppointments] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [services, setServices] = useState([]);
  const [activePets, setActivePets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: 'info', message: '' });

  // Modal tạo lịch hẹn mới tại quầy (UC06) - Theo Buổi (Sáng/Chiều)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    petId: '',
    veterinarianId: '',
    serviceId: '',
    appointmentDate: todayStr,
    shift: 'MORNING', // 'MORNING' (Sáng) | 'AFTERNOON' (Chiều)
    notes: '',
  });

  // Modal phê duyệt lịch hẹn (UC10)
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveForm, setApproveForm] = useState({
    veterinarianId: '',
    serviceId: '',
    notes: '',
  });

  // Modal đổi lịch hẹn (UC08)
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    appointmentDate: todayStr,
    shift: 'MORNING',
    veterinarianId: '',
    serviceId: '',
    notes: '',
  });

  // Modal từ chối (UC10) hoặc hủy lịch hẹn (UC09)
  const [reasonModal, setReasonModal] = useState({
    open: false,
    mode: 'REJECT', // 'REJECT' | 'CANCEL'
    appointment: null,
    reason: '',
  });

  const loadLookups = useCallback(async () => {
    try {
      const [catalogRes, petsRes] = await Promise.all([
        receptionistApi.getCatalogLookup(),
        receptionistApi.getPets({ status: 'ACTIVE' }),
      ]);
      setVeterinarians(catalogRes?.veterinarians || []);
      setServices(catalogRes?.services || []);
      setActivePets(Array.isArray(petsRes) ? petsRes : []);
    } catch {
      // ignore lookup silent fail
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
      return;
    }
    setDateError('');
    setLoading(true);
    try {
      const res = await receptionistApi.getAppointments({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: statusFilter,
        veterinarianId: vetFilter ? Number(vetFilter) : undefined,
        search: search.trim() || undefined,
      });
      let list = Array.isArray(res) ? res : [];
      if (shiftFilter !== 'ALL') {
        list = list.filter((a) => (a.shift || 'MORNING').toUpperCase() === shiftFilter);
      }
      setAppointments(list);
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể tải danh sách lịch hẹn.',
      });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter, vetFilter, shiftFilter, search]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleFromDateChange = (val) => {
    setFromDate(val);
    if (toDate && val && val > toDate) {
      setToDate(val);
    }
  };

  const handleToDateChange = (val) => {
    if (fromDate && val && val < fromDate) {
      setDateError('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
      return;
    }
    setDateError('');
    setToDate(val);
  };

  // UC06: Đặt lịch hẹn mới tại quầy theo Buổi (Sáng / Chiều)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.petId) {
      setToast({ type: 'error', message: 'Vui lòng chọn thú cưng cần đặt lịch.' });
      return;
    }
    if (!createForm.appointmentDate || createForm.appointmentDate < todayStr) {
      setToast({ type: 'error', message: 'Ngày hẹn không được chọn ngày trong quá khứ.' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await receptionistApi.createAppointment({
        petId: Number(createForm.petId),
        appointmentDate: createForm.appointmentDate,
        shift: createForm.shift,
        veterinarianId: createForm.veterinarianId ? Number(createForm.veterinarianId) : null,
        serviceId: createForm.serviceId ? Number(createForm.serviceId) : null,
        notes: createForm.notes.trim(),
      });
      setToast({
        type: 'success',
        message: `Đã tạo lịch hẹn ${created.appointmentCode} (${createForm.shift === 'AFTERNOON' ? 'Buổi chiều' : 'Buổi sáng'}) cho thú cưng ${created.petName}.`,
      });
      setCreateOpen(false);
      await loadAppointments();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể tạo lịch hẹn.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // UC10: Phê duyệt lịch hẹn
  const openApproveModal = (apt) => {
    setApproveTarget(apt);
    setApproveForm({
      veterinarianId: apt.veterinarianId ? String(apt.veterinarianId) : '',
      serviceId: apt.serviceId ? String(apt.serviceId) : '',
      notes: apt.notes || '',
    });
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!approveTarget) return;
    setSubmitting(true);
    try {
      await receptionistApi.approveAppointment(approveTarget.appointmentId, {
        veterinarianId: approveForm.veterinarianId ? Number(approveForm.veterinarianId) : null,
        serviceId: approveForm.serviceId ? Number(approveForm.serviceId) : null,
        notes: approveForm.notes.trim(),
      });
      setToast({
        type: 'success',
        message: `Đã phê duyệt lịch hẹn ${approveTarget.appointmentCode}.`,
      });
      setApproveTarget(null);
      await loadAppointments();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể phê duyệt lịch hẹn.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // UC08: Đổi lịch hẹn
  const openRescheduleModal = (apt) => {
    setRescheduleTarget(apt);
    setRescheduleForm({
      appointmentDate: apt.appointmentDate && apt.appointmentDate >= todayStr ? apt.appointmentDate : todayStr,
      shift: apt.shift || 'MORNING',
      veterinarianId: apt.veterinarianId ? String(apt.veterinarianId) : '',
      serviceId: apt.serviceId ? String(apt.serviceId) : '',
      notes: apt.notes || '',
    });
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    if (!rescheduleForm.appointmentDate || rescheduleForm.appointmentDate < todayStr) {
      setToast({ type: 'error', message: 'Ngày hẹn mới không được chọn trong quá khứ.' });
      return;
    }
    setSubmitting(true);
    try {
      await receptionistApi.rescheduleAppointment(rescheduleTarget.appointmentId, {
        appointmentDate: rescheduleForm.appointmentDate,
        shift: rescheduleForm.shift,
        veterinarianId: rescheduleForm.veterinarianId ? Number(rescheduleForm.veterinarianId) : null,
        serviceId: rescheduleForm.serviceId ? Number(rescheduleForm.serviceId) : null,
        notes: rescheduleForm.notes.trim(),
      });
      setToast({
        type: 'success',
        message: `Đã đổi lịch hẹn ${rescheduleTarget.appointmentCode} thành công.`,
      });
      setRescheduleTarget(null);
      await loadAppointments();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể đổi lịch hẹn.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // UC09 & UC10: Hủy hoặc Từ chối lịch hẹn
  const handleReasonSubmit = async (e) => {
    e.preventDefault();
    const { mode, appointment, reason } = reasonModal;
    if (!appointment) return;
    if (!reason.trim()) {
      setToast({
        type: 'error',
        message: mode === 'REJECT' ? 'Vui lòng nhập lý do từ chối lịch hẹn.' : 'Vui lòng nhập lý do hủy lịch hẹn.',
      });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'REJECT') {
        await receptionistApi.rejectAppointment(appointment.appointmentId, reason.trim());
        setToast({
          type: 'success',
          message: `Đã từ chối lịch hẹn ${appointment.appointmentCode}.`,
        });
      } else {
        await receptionistApi.cancelAppointment(appointment.appointmentId, reason.trim());
        setToast({
          type: 'success',
          message: `Đã hủy lịch hẹn ${appointment.appointmentCode}.`,
        });
      }
      setReasonModal({ open: false, mode: 'REJECT', appointment: null, reason: '' });
      await loadAppointments();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Thao tác không thành công.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Quản lý Lịch hẹn Khám"
        subtitle="Khách đặt hẹn theo Buổi (Sáng/Chiều). Bác sĩ phụ trách sẽ được Lễ tân chỉ định trực tiếp tại bàn tiếp đón khi thú cưng đến Check-in."
        actions={
          <button
            type="button"
            className="pcms-btn pcms-btn-primary"
            onClick={() => {
              setCreateForm({
                petId: activePets[0]?.petId ? String(activePets[0].petId) : '',
                veterinarianId: '',
                serviceId: '',
                appointmentDate: todayStr,
                shift: 'MORNING',
                notes: '',
              });
              setCreateOpen(true);
            }}
          >
            + Đặt lịch theo buổi tại quầy
          </button>
        }
      />

      <ToastMessage
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ type: 'info', message: '' })}
      />

      {/* Bộ lọc lịch hẹn */}
      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label className="pcms-label">Tìm kiếm</label>
            <input
              type="search"
              className="pcms-input"
              placeholder="Tên thú cưng, chủ, SĐT, mã APT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="pcms-label">Buổi hẹn</label>
            <select
              className="pcms-select"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
            >
              <option value="ALL">Tất cả các buổi</option>
              <option value="MORNING">☀️ Buổi sáng</option>
              <option value="AFTERNOON">🌤️ Buổi chiều</option>
            </select>
          </div>

          <div>
            <label className="pcms-label">Từ ngày</label>
            <input
              type="date"
              className="pcms-input"
              max={toDate || undefined}
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
            />
          </div>

          <div>
            <label className="pcms-label">Đến ngày</label>
            <input
              type="date"
              className="pcms-input"
              min={fromDate || undefined}
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
            />
          </div>

          <div>
            <label className="pcms-label">Trạng thái</label>
            <select
              className="pcms-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_APPROVAL">Chờ duyệt (PENDING_APPROVAL)</option>
              <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
              <option value="CHECKED_IN">Đã Check-in (CHECKED_IN)</option>
              <option value="IN_PROGRESS">Đang khám (IN_PROGRESS)</option>
              <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              <option value="REJECTED">Từ chối (REJECTED)</option>
            </select>
          </div>

          <div>
            <label className="pcms-label">Bác sĩ phụ trách</label>
            <select
              className="pcms-select"
              value={vetFilter}
              onChange={(e) => setVetFilter(e.target.value)}
            >
              <option value="">Tất cả bác sĩ</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  {v.fullName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="pcms-btn pcms-btn-outline"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setShiftFilter('ALL');
                setStatusFilter('ALL');
                setVetFilter('');
                setSearch('');
                setDateError('');
              }}
            >
              Xóa lọc
            </button>
          </div>
        </div>

        {dateError ? (
          <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{dateError}</div>
        ) : null}
      </div>

      {/* Bảng danh sách lịch hẹn */}
      <div className="pcms-card">
        <div className="pcms-card-header">
          <div>
            <h2 className="pcms-card-title">Danh sách Lịch hẹn ({appointments.length})</h2>
            <p className="pcms-card-subtitle">
              Lịch khám được đặt theo Buổi. Bác sĩ được Lễ tân phân công chính thức lúc Check-in.
            </p>
          </div>
        </div>

        <div className="pcms-table-wrap">
          <table className="pcms-table">
            <thead>
              <tr>
                <th>Mã hẹn</th>
                <th>Ngày & Buổi hẹn</th>
                <th>Thú cưng</th>
                <th>Chủ nuôi & SĐT</th>
                <th>Bác sĩ & Dịch vụ</th>
                <th>Trạng thái</th>
                <th>Ghi chú / Lý do</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="pcms-empty-cell">
                    Đang tải danh sách lịch hẹn...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="pcms-empty-cell">
                    Không có lịch hẹn nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => {
                  const isPending = apt.status === 'PENDING_APPROVAL';
                  const isConfirmed = apt.status === 'CONFIRMED' || apt.status === 'APPROVED';
                  const canModify = isPending || isConfirmed;

                  return (
                    <tr key={apt.appointmentId}>
                      <td>
                        <strong>{apt.appointmentCode}</strong>
                        {apt.walkIn ? (
                          <div>
                            <span className="pcms-badge pcms-badge-info" style={{ fontSize: 10 }}>
                              Walk-in
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <strong>{apt.appointmentDate}</strong>
                        <div>
                          <span
                            className="pcms-badge pcms-badge-purple"
                            style={{ fontSize: 11, marginTop: 3 }}
                          >
                            {apt.shift === 'AFTERNOON' ? '🌤️ Chiều (13:30 - 17:30)' : '☀️ Sáng (08:00 - 12:00)'}
                          </span>
                        </div>
                        {apt.checkInTimeDisplay ? (
                          <div style={{ fontSize: 11, color: 'var(--pcms-text-muted)', marginTop: 2 }}>
                            Check-in: {apt.checkInTimeDisplay}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <strong>{apt.petName}</strong>
                        <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
                          {apt.species} {apt.breed ? `• ${apt.breed}` : ''}
                        </div>
                      </td>
                      <td>
                        <div>{apt.ownerName}</div>
                        <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{apt.ownerPhone}</div>
                      </td>
                      <td>
                        <div>
                          <strong>{apt.veterinarianName}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{apt.serviceName}</div>
                      </td>
                      <td>
                        <StatusBadge status={apt.status} />
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        {apt.notes ? <div>{apt.notes}</div> : null}
                        {apt.rejectionReason ? (
                          <div style={{ fontSize: 12, color: '#dc2626' }}>
                            Lý do: {apt.rejectionReason}
                          </div>
                        ) : null}
                        {!apt.notes && !apt.rejectionReason ? '—' : null}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              className="pcms-btn pcms-btn-primary pcms-btn-sm"
                              style={{ marginRight: 6 }}
                              onClick={() => openApproveModal(apt)}
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              className="pcms-btn pcms-btn-danger pcms-btn-sm"
                              style={{ marginRight: 6 }}
                              onClick={() =>
                                setReasonModal({
                                  open: true,
                                  mode: 'REJECT',
                                  appointment: apt,
                                  reason: '',
                                })
                              }
                            >
                              Từ chối
                            </button>
                          </>
                        ) : null}

                        {canModify ? (
                          <>
                            <button
                              type="button"
                              className="pcms-btn pcms-btn-outline pcms-btn-sm"
                              style={{ marginRight: 6 }}
                              onClick={() => openRescheduleModal(apt)}
                            >
                              Đổi lịch
                            </button>
                            <button
                              type="button"
                              className="pcms-btn pcms-btn-outline pcms-btn-sm"
                              onClick={() =>
                                setReasonModal({
                                  open: true,
                                  mode: 'CANCEL',
                                  appointment: apt,
                                  reason: '',
                                })
                              }
                            >
                              Hủy
                            </button>
                          </>
                        ) : null}

                        {!canModify ? (
                          <span style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>Đã khóa thao tác</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Đặt lịch hẹn mới tại quầy theo Buổi */}
      <ModalDialog
        open={createOpen}
        title="Đặt lịch hẹn theo Buổi tại quầy Lễ tân"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="create-apt-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Tạo lịch hẹn (CONFIRMED)'}
            </button>
          </>
        }
      >
        <form id="create-apt-form" onSubmit={handleCreateSubmit} className="pcms-form-grid">
          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">
              Chọn Thú cưng & Chủ nuôi <span className="pcms-required">*</span>
            </label>
            <select
              className="pcms-select"
              required
              value={createForm.petId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, petId: e.target.value }))}
            >
              <option value="">-- Chọn thú cưng đang hoạt động --</option>
              {activePets.map((p) => (
                <option key={p.petId} value={p.petId}>
                  {p.petName} ({p.species}) — Chủ: {p.ownerName} ({p.ownerPhone})
                </option>
              ))}
            </select>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">
              Ngày hẹn <span className="pcms-required">*</span>
            </label>
            <input
              type="date"
              className="pcms-input"
              required
              min={todayStr}
              value={createForm.appointmentDate}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, appointmentDate: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">
              Chọn Buổi khám <span className="pcms-required">*</span>
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="createShift"
                  value="MORNING"
                  checked={createForm.shift === 'MORNING'}
                  onChange={() => setCreateForm((prev) => ({ ...prev, shift: 'MORNING' }))}
                />
                ☀️ Buổi sáng (08:00 - 12:00)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="createShift"
                  value="AFTERNOON"
                  checked={createForm.shift === 'AFTERNOON'}
                  onChange={() => setCreateForm((prev) => ({ ...prev, shift: 'AFTERNOON' }))}
                />
                🌤️ Buổi chiều (13:30 - 17:30)
              </label>
            </div>
          </div>

          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Bác sĩ phụ trách (Tùy chọn)</label>
            <select
              className="pcms-select"
              value={createForm.veterinarianId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, veterinarianId: e.target.value }))}
            >
              <option value="">-- Chưa chỉ định (Lễ tân sẽ điều phối tại bàn tiếp đón khi Check-in) --</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  {v.fullName} — {v.availabilityLabel}
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--pcms-text-muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
              💡 Khách hàng chỉ cần đặt theo Buổi. Bác sĩ phụ trách sẽ do Lễ tân chỉ định dựa trên trạng thái rảnh/bận thực tế khi thú cưng đến Check-in.
            </small>
          </div>

          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Dịch vụ đăng ký</label>
            <select
              className="pcms-select"
              value={createForm.serviceId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, serviceId: e.target.value }))}
            >
              <option value="">-- Khám tổng quát --</option>
              {services.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>
                  {s.serviceName} ({Number(s.basePrice || 0).toLocaleString('vi-VN')} ₫)
                </option>
              ))}
            </select>
          </div>

          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Ghi chú / Triệu chứng ban đầu</label>
            <textarea
              className="pcms-textarea"
              rows={3}
              placeholder="Ghi chú yêu cầu của khách hàng hoặc triệu chứng thú cưng..."
              value={createForm.notes}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Modal Phê duyệt lịch hẹn */}
      <ModalDialog
        open={Boolean(approveTarget)}
        title={`Phê duyệt lịch hẹn ${approveTarget?.appointmentCode || ''}`}
        onClose={() => setApproveTarget(null)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setApproveTarget(null)}>
              Đóng
            </button>
            <button type="submit" form="approve-apt-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận phê duyệt (CONFIRMED)'}
            </button>
          </>
        }
      >
        <form id="approve-apt-form" onSubmit={handleApproveSubmit} className="pcms-form-grid">
          <div style={{ gridColumn: '1 / -1', fontSize: 14 }}>
            Thú cưng: <strong>{approveTarget?.petName}</strong> • Chủ nuôi: <strong>{approveTarget?.ownerName}</strong> (
            {approveTarget?.ownerPhone}) • Buổi hẹn: <strong>{approveTarget?.shiftDisplay}</strong>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Chỉ định Bác sĩ phụ trách (Tùy chọn)</label>
            <select
              className="pcms-select"
              value={approveForm.veterinarianId}
              onChange={(e) => setApproveForm((prev) => ({ ...prev, veterinarianId: e.target.value }))}
            >
              <option value="">-- Để trống (Điều phối khi Check-in) --</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  {v.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Dịch vụ</label>
            <select
              className="pcms-select"
              value={approveForm.serviceId}
              onChange={(e) => setApproveForm((prev) => ({ ...prev, serviceId: e.target.value }))}
            >
              <option value="">-- Khám tổng quát --</option>
              {services.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>
                  {s.serviceName}
                </option>
              ))}
            </select>
          </div>

          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Ghi chú tiếp nhận</label>
            <textarea
              className="pcms-textarea"
              rows={2}
              value={approveForm.notes}
              onChange={(e) => setApproveForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Modal Đổi lịch hẹn */}
      <ModalDialog
        open={Boolean(rescheduleTarget)}
        title={`Đổi lịch hẹn ${rescheduleTarget?.appointmentCode || ''}`}
        onClose={() => setRescheduleTarget(null)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setRescheduleTarget(null)}>
              Hủy
            </button>
            <button
              type="submit"
              form="reschedule-apt-form"
              className="pcms-btn pcms-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : 'Lưu lịch hẹn mới'}
            </button>
          </>
        }
      >
        <form id="reschedule-apt-form" onSubmit={handleRescheduleSubmit} className="pcms-form-grid">
          <div className="pcms-form-group">
            <label className="pcms-label">
              Ngày hẹn mới <span className="pcms-required">*</span>
            </label>
            <input
              type="date"
              className="pcms-input"
              required
              min={todayStr}
              value={rescheduleForm.appointmentDate}
              onChange={(e) => setRescheduleForm((prev) => ({ ...prev, appointmentDate: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">
              Buổi hẹn mới <span className="pcms-required">*</span>
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="rescheduleShift"
                  value="MORNING"
                  checked={rescheduleForm.shift === 'MORNING'}
                  onChange={() => setRescheduleForm((prev) => ({ ...prev, shift: 'MORNING' }))}
                />
                ☀️ Sáng (08:00 - 12:00)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="rescheduleShift"
                  value="AFTERNOON"
                  checked={rescheduleForm.shift === 'AFTERNOON'}
                  onChange={() => setRescheduleForm((prev) => ({ ...prev, shift: 'AFTERNOON' }))}
                />
                🌤️ Chiều (13:30 - 17:30)
              </label>
            </div>
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

      {/* Modal Từ chối hoặc Hủy lịch hẹn */}
      <ModalDialog
        open={reasonModal.open}
        title={
          reasonModal.mode === 'REJECT'
            ? `Từ chối yêu cầu đặt lịch ${reasonModal.appointment?.appointmentCode || ''}`
            : `Hủy lịch hẹn ${reasonModal.appointment?.appointmentCode || ''}`
        }
        onClose={() => setReasonModal({ open: false, mode: 'REJECT', appointment: null, reason: '' })}
        footer={
          <>
            <button
              type="button"
              className="pcms-btn pcms-btn-outline"
              onClick={() => setReasonModal({ open: false, mode: 'REJECT', appointment: null, reason: '' })}
            >
              Đóng
            </button>
            <button type="submit" form="reason-apt-form" className="pcms-btn pcms-btn-danger" disabled={submitting}>
              {reasonModal.mode === 'REJECT' ? 'Xác nhận Từ chối' : 'Xác nhận Hủy lịch'}
            </button>
          </>
        }
      >
        <form id="reason-apt-form" onSubmit={handleReasonSubmit}>
          <div className="pcms-form-group">
            <label className="pcms-label">
              {reasonModal.mode === 'REJECT' ? 'Lý do từ chối' : 'Lý do hủy lịch'}{' '}
              <span className="pcms-required">*</span>
            </label>
            <textarea
              className="pcms-textarea"
              rows={3}
              required
              placeholder="Nhập lý do cụ thể để lưu vào hồ sơ lịch hẹn và thông báo cho khách hàng..."
              value={reasonModal.reason}
              onChange={(e) => setReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
