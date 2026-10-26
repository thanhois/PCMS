import { useCallback, useEffect, useMemo, useState } from 'react';
import receptionistApi from '../../api/receptionistApi';
import ModalDialog from '../../components/admin/ui/ModalDialog';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import ToastMessage from '../../components/admin/ui/ToastMessage';

export default function ReceptionistCheckInPage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState('CHECKIN'); // 'CHECKIN' | 'WALKIN'
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL'); // 'ALL' | 'MORNING' | 'AFTERNOON'
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [services, setServices] = useState([]);
  const [activePets, setActivePets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: 'info', message: '' });

  // Modal Check-in & Phân công Bác sĩ (UC11)
  const [checkInTarget, setCheckInTarget] = useState(null);
  const [checkInForm, setCheckInForm] = useState({
    weight: '',
    veterinarianId: '',
    serviceId: '',
    notes: '',
  });

  // Modal Đổi Bác sĩ cho ca đã Check-in
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignVetId, setReassignVetId] = useState('');

  // Form Walk-in (UC12, BR-11)
  const [walkInForm, setWalkInForm] = useState({
    customerMode: 'EXISTING', // 'EXISTING' | 'NEW'
    petId: '',
    weight: '',
    ownerFullName: '',
    ownerPhoneNumber: '',
    ownerEmail: '',
    ownerAddress: '',
    petName: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực',
    age: '',
    veterinarianId: '',
    serviceId: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aptRes, catalogRes, petsRes] = await Promise.all([
        receptionistApi.getAppointments({ fromDate: todayStr, toDate: todayStr }),
        receptionistApi.getCatalogLookup(),
        receptionistApi.getPets({ status: 'ACTIVE' }),
      ]);
      setTodayAppointments(Array.isArray(aptRes) ? aptRes : []);
      const vets = catalogRes?.veterinarians || [];
      setVeterinarians(vets);
      setServices(catalogRes?.services || []);
      const petsList = Array.isArray(petsRes) ? petsRes : [];
      setActivePets(petsList);

      // Mặc định chọn bác sĩ có ít ca khám nhất
      const mostAvailableVet = vets.length > 0 ? String(vets[0].userId) : '';
      setWalkInForm((prev) => ({
        ...prev,
        petId: prev.petId || (petsList[0]?.petId ? String(petsList[0].petId) : ''),
        veterinarianId: prev.veterinarianId || mostAvailableVet,
      }));
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể tải dữ liệu bàn Check-in.',
      });
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Danh sách lịch hẹn hôm nay đang chờ khách đến (CONFIRMED / APPROVED / PENDING_APPROVAL)
  const waitingArrivalList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todayAppointments.filter((a) => {
      const st = (a.status || '').toUpperCase();
      if (!['CONFIRMED', 'APPROVED', 'PENDING_APPROVAL'].includes(st)) return false;
      if (shiftFilter !== 'ALL' && (a.shift || 'MORNING').toUpperCase() !== shiftFilter) return false;
      if (!q) return true;
      return (
        (a.petName || '').toLowerCase().includes(q) ||
        (a.ownerName || '').toLowerCase().includes(q) ||
        (a.ownerPhone || '').toLowerCase().includes(q) ||
        (a.appointmentCode || '').toLowerCase().includes(q)
      );
    });
  }, [todayAppointments, search, shiftFilter]);

  // Hàng đợi đã Check-in / Đang khám hôm nay
  const checkedInQueue = useMemo(() => {
    return todayAppointments.filter((a) =>
      ['CHECKED_IN', 'IN_PROGRESS'].includes((a.status || '').toUpperCase())
    );
  }, [todayAppointments]);

  const openCheckInModal = (apt) => {
    setCheckInTarget(apt);
    // Gợi ý Bác sĩ: nếu đã có thì giữ, nếu chưa thì gợi ý bác sĩ đang rảnh nhất (activeQueueCount nhỏ nhất)
    const defaultVetId = apt.veterinarianId
      ? String(apt.veterinarianId)
      : (veterinarians[0]?.userId ? String(veterinarians[0].userId) : '');

    setCheckInForm({
      weight: apt.petWeight != null ? String(apt.petWeight) : '',
      veterinarianId: defaultVetId,
      serviceId: apt.serviceId ? String(apt.serviceId) : '',
      notes: apt.notes || '',
    });
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInTarget) return;

    if (!checkInForm.veterinarianId) {
      setToast({
        type: 'error',
        message: 'Vui lòng chọn Bác sĩ phụ trách đang sẵn sàng trong danh sách để điều phối ca khám.',
      });
      return;
    }

    if (checkInForm.weight && (Number(checkInForm.weight) <= 0 || Number(checkInForm.weight) > 250)) {
      setToast({ type: 'error', message: 'Cân nặng thú cưng phải lớn hơn 0 và nhỏ hơn 250 kg.' });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await receptionistApi.checkInAppointment(checkInTarget.appointmentId, {
        weight: checkInForm.weight ? Number(checkInForm.weight) : null,
        veterinarianId: Number(checkInForm.veterinarianId),
        serviceId: checkInForm.serviceId ? Number(checkInForm.serviceId) : null,
        notes: checkInForm.notes.trim(),
      });
      setToast({
        type: 'success',
        message: `Check-in thành công: Đã điều phối thú cưng ${updated.petName} cho Bác sĩ ${updated.veterinarianName} (${updated.appointmentCode}).`,
      });
      setCheckInTarget(null);
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể thực hiện Check-in.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignTarget || !reassignVetId) {
      setToast({ type: 'error', message: 'Vui lòng chọn Bác sĩ cần chuyển giao ca khám.' });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await receptionistApi.assignVeterinarian(
        reassignTarget.appointmentId,
        Number(reassignVetId)
      );
      setToast({
        type: 'success',
        message: `Đã chuyển điều phối ca khám ${updated.appointmentCode} sang Bác sĩ ${updated.veterinarianName}.`,
      });
      setReassignTarget(null);
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể đổi Bác sĩ phụ trách.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (walkInForm.customerMode === 'EXISTING' && !walkInForm.petId) {
      setToast({ type: 'error', message: 'Vui lòng chọn thú cưng cần tiếp nhận Walk-in.' });
      return;
    }
    if (walkInForm.customerMode === 'NEW') {
      if (!walkInForm.ownerFullName.trim()) {
        setToast({ type: 'error', message: 'Vui lòng nhập họ tên chủ nuôi.' });
        return;
      }
      if (!/^[0-9+()\-\s]{9,15}$/.test(walkInForm.ownerPhoneNumber.trim())) {
        setToast({ type: 'error', message: 'Số điện thoại chủ nuôi không hợp lệ (9-15 chữ số).' });
        return;
      }
      if (!walkInForm.petName.trim()) {
        setToast({ type: 'error', message: 'Vui lòng nhập tên thú cưng.' });
        return;
      }
    }
    if (!walkInForm.veterinarianId) {
      setToast({ type: 'error', message: 'Vui lòng chọn Bác sĩ phụ trách đang sẵn sàng tiếp nhận khám.' });
      return;
    }
    if (walkInForm.weight && (Number(walkInForm.weight) <= 0 || Number(walkInForm.weight) > 250)) {
      setToast({ type: 'error', message: 'Cân nặng thú cưng phải từ 0.1 đến 250 kg.' });
      return;
    }
    if (!walkInForm.notes.trim()) {
      setToast({ type: 'error', message: 'Vui lòng nhập triệu chứng ban đầu hoặc lý do khám.' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await receptionistApi.processWalkIn({
        customerMode: walkInForm.customerMode,
        petId: walkInForm.customerMode === 'EXISTING' ? Number(walkInForm.petId) : null,
        weight: walkInForm.weight ? Number(walkInForm.weight) : null,
        ownerFullName: walkInForm.ownerFullName.trim(),
        ownerPhoneNumber: walkInForm.ownerPhoneNumber.trim(),
        ownerEmail: walkInForm.ownerEmail.trim(),
        ownerAddress: walkInForm.ownerAddress.trim(),
        petName: walkInForm.petName.trim(),
        species: walkInForm.species,
        breed: walkInForm.breed.trim(),
        gender: walkInForm.gender,
        age: walkInForm.age ? Number(walkInForm.age) : null,
        veterinarianId: Number(walkInForm.veterinarianId),
        serviceId: walkInForm.serviceId ? Number(walkInForm.serviceId) : null,
        notes: walkInForm.notes.trim(),
      });

      setToast({
        type: 'success',
        message: `Tiếp nhận Walk-in thành công: Ca khám ${created.appointmentCode} đã được điều phối ngay cho Bác sĩ ${created.veterinarianName}.`,
      });

      setWalkInForm((prev) => ({
        ...prev,
        weight: '',
        ownerFullName: '',
        ownerPhoneNumber: '',
        ownerEmail: '',
        ownerAddress: '',
        petName: '',
        breed: '',
        age: '',
        notes: '',
      }));
      setActiveTab('CHECKIN');
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể tiếp nhận ca khám Walk-in.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tiếp đón Bệnh nhân: Check-in & Điều phối Bác sĩ"
        subtitle="Khách đặt hẹn theo Buổi (Sáng/Chiều) mà không cần chọn Bác sĩ trước. Khi khách đến, Lễ tân thực hiện Check-in và chỉ định Bác sĩ trực sẵn sàng (Available)."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`pcms-btn ${activeTab === 'CHECKIN' ? 'pcms-btn-primary' : 'pcms-btn-outline'}`}
              onClick={() => setActiveTab('CHECKIN')}
            >
              1. Check-in & Điều phối ({waitingArrivalList.length} ca chờ)
            </button>
            <button
              type="button"
              className={`pcms-btn ${activeTab === 'WALKIN' ? 'pcms-btn-primary' : 'pcms-btn-outline'}`}
              onClick={() => setActiveTab('WALKIN')}
            >
              2. Tiếp nhận khách vãng lai (Walk-in)
            </button>
          </div>
        }
      />

      <ToastMessage
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ type: 'info', message: '' })}
      />

      {/* Tình trạng trực ca & Sẵn sàng của Bác sĩ hôm nay */}
      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>🩺 Danh sách Bác sĩ trực ca & Trạng thái tải khám hôm nay:</strong>
          <span style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
            Hệ thống tự động sắp xếp Bác sĩ đang rảnh nhất lên trước
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {veterinarians.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--pcms-text-muted)' }}>
              Chưa có tài khoản Bác sĩ nào đang hoạt động.
            </div>
          ) : (
            veterinarians.map((v) => {
              const isFree = (v.activeQueueCount || 0) === 0;
              return (
                <div
                  key={v.userId}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1px solid ${isFree ? '#bbf7d0' : '#fed7aa'}`,
                    background: isFree ? '#f0fdf4' : '#fffbeb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isFree ? '#16a34a' : '#d97706',
                    }}
                  />
                  <strong>{v.fullName}</strong>
                  <span
                    className={`pcms-badge ${isFree ? 'pcms-badge-success' : 'pcms-badge-warning'}`}
                    style={{ fontSize: 11 }}
                  >
                    {isFree ? 'Sẵn sàng (0 ca)' : `Đang có ${v.activeQueueCount} ca`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {activeTab === 'CHECKIN' ? (
        <>
          {/* Bảng 1: Lịch hẹn đã đặt hôm nay đang chờ khách đến */}
          <div className="pcms-card" style={{ marginBottom: 20 }}>
            <div className="pcms-card-header">
              <div>
                <h2 className="pcms-card-title">Danh sách lịch hẹn chờ khách đến hôm nay</h2>
                <p className="pcms-card-subtitle">
                  Khách đặt theo Buổi khám. Khi khách đến bàn tiếp đón, Lễ tân bấm <strong>Check-in & Điều phối</strong> để phân công cho Bác sĩ sẵn sàng.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  className="pcms-select"
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  <option value="ALL">Tất cả các buổi</option>
                  <option value="MORNING">Buổi sáng (08:00 - 12:00)</option>
                  <option value="AFTERNOON">Buổi chiều (13:30 - 17:30)</option>
                </select>

                <div style={{ minWidth: 260 }}>
                  <input
                    type="search"
                    className="pcms-input"
                    placeholder="Tìm theo SĐT, tên chủ, tên thú cưng..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pcms-table-wrap">
              <table className="pcms-table">
                <thead>
                  <tr>
                    <th>Mã hẹn</th>
                    <th>Buổi khám</th>
                    <th>Thú cưng & Cân nặng</th>
                    <th>Chủ nuôi & SĐT</th>
                    <th>Bác sĩ chỉ định</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="pcms-empty-cell">
                        Đang tải lịch hẹn hôm nay...
                      </td>
                    </tr>
                  ) : waitingArrivalList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="pcms-empty-cell">
                        Không có lịch hẹn nào đang chờ Check-in khớp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    waitingArrivalList.map((apt) => (
                      <tr key={apt.appointmentId}>
                        <td>
                          <strong>{apt.appointmentCode}</strong>
                        </td>
                        <td>
                          <span
                            className="pcms-badge pcms-badge-purple"
                            style={{ fontWeight: 600 }}
                          >
                            {apt.shift === 'AFTERNOON' ? '🌤️ Chiều (13:30 - 17:30)' : '☀️ Sáng (08:00 - 12:00)'}
                          </span>
                        </td>
                        <td>
                          <strong>{apt.petName}</strong> ({apt.species})
                          <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
                            Cân nặng: {apt.petWeight != null ? `${apt.petWeight} kg` : 'Chưa cân'}
                          </div>
                        </td>
                        <td>
                          <div>{apt.ownerName}</div>
                          <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{apt.ownerPhone}</div>
                        </td>
                        <td>
                          {apt.veterinarianId ? (
                            <div>
                              <strong>{apt.veterinarianName}</strong>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--pcms-text-muted)', fontStyle: 'italic' }}>
                              Chờ phân công tại quầy
                            </span>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--pcms-text-muted)' }}>{apt.serviceName}</div>
                        </td>
                        <td>
                          <StatusBadge status={apt.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="pcms-btn pcms-btn-primary pcms-btn-sm"
                            onClick={() => openCheckInModal(apt)}
                          >
                            Check-in & Điều phối Bác sĩ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bảng 2: Hàng đợi thú cưng đã Check-in / Đang chờ Bác sĩ khám hôm nay */}
          <div className="pcms-card">
            <div className="pcms-card-header">
              <div>
                <h2 className="pcms-card-title">Hàng đợi Bác sĩ thăm khám hiện tại ({checkedInQueue.length} ca)</h2>
                <p className="pcms-card-subtitle">
                  Thú cưng đã Check-in và được phân công Bác sĩ. Lễ tân có thể đổi Bác sĩ nếu Bác sĩ hiện tại bận ca phẫu thuật đột xuất.
                </p>
              </div>
            </div>

            <div className="pcms-table-wrap">
              <table className="pcms-table">
                <thead>
                  <tr>
                    <th>Mã ca khám</th>
                    <th>Giờ Check-in</th>
                    <th>Thú cưng & Cân nặng</th>
                    <th>Chủ nuôi & SĐT</th>
                    <th>Bác sĩ được chỉ định</th>
                    <th>Triệu chứng / Ghi chú</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Điều phối lại</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedInQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="pcms-empty-cell">
                        Hiện chưa có thú cưng nào trong hàng đợi khám.
                      </td>
                    </tr>
                  ) : (
                    checkedInQueue.map((item) => (
                      <tr key={item.appointmentId}>
                        <td>
                          <strong>{item.appointmentCode}</strong>
                          {item.walkIn ? (
                            <span className="pcms-badge pcms-badge-info" style={{ marginLeft: 6, fontSize: 10 }}>
                              Walk-in
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <strong>{item.checkInTimeDisplay || item.appointmentTime}</strong>
                        </td>
                        <td>
                          <strong>{item.petName}</strong> ({item.species})
                          {item.petWeight != null ? ` • ${item.petWeight} kg` : ''}
                        </td>
                        <td>
                          {item.ownerName} ({item.ownerPhone})
                        </td>
                        <td>
                          <strong style={{ color: 'var(--pcms-primary)' }}>{item.veterinarianName}</strong>
                        </td>
                        <td style={{ maxWidth: 220 }}>{item.notes || '—'}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="pcms-btn pcms-btn-outline pcms-btn-sm"
                            onClick={() => {
                              setReassignTarget(item);
                              setReassignVetId(item.veterinarianId ? String(item.veterinarianId) : '');
                            }}
                          >
                            Đổi Bác sĩ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: TIẾP NHẬN KHÁCH VÃNG LAI WALK-IN (UC12, BR-11) */
        <div className="pcms-card">
          <div className="pcms-card-header">
            <div>
              <h2 className="pcms-card-title">Tiếp nhận Khám trực tiếp không đặt lịch trước — Walk-in</h2>
              <p className="pcms-card-subtitle">
                Ca tiếp nhận Walk-in sẽ được chỉ định Bác sĩ trực sẵn sàng và chuyển thẳng
                sang trạng thái <strong>CHECKED_IN</strong> trong hàng đợi phòng khám.
              </p>
            </div>
          </div>

          <form onSubmit={handleWalkInSubmit} className="pcms-form-grid">
            <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="pcms-label">Loại khách hàng đến quầy</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="radio"
                    name="customerMode"
                    checked={walkInForm.customerMode === 'EXISTING'}
                    onChange={() => setWalkInForm((prev) => ({ ...prev, customerMode: 'EXISTING' }))}
                  />
                  Khách hàng & Thú cưng đã có hồ sơ
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="radio"
                    name="customerMode"
                    checked={walkInForm.customerMode === 'NEW'}
                    onChange={() => setWalkInForm((prev) => ({ ...prev, customerMode: 'NEW' }))}
                  />
                  Khách vãng lai mới (Tạo nhanh hồ sơ Chủ nuôi + Thú cưng)
                </label>
              </div>
            </div>

            {walkInForm.customerMode === 'EXISTING' ? (
              <>
                <div className="pcms-form-group">
                  <label className="pcms-label">
                    Chọn Thú cưng & Chủ nuôi <span className="pcms-required">*</span>
                  </label>
                  <select
                    className="pcms-select"
                    required
                    value={walkInForm.petId}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, petId: e.target.value }))}
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
                  <label className="pcms-label">Cân nặng đo tại quầy (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="250"
                    className="pcms-input"
                    placeholder="Ví dụ: 4.5"
                    value={walkInForm.weight}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px 14px',
                    background: 'var(--pcms-bg-subtle, #f8fafc)',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  A. Thông tin Chủ nuôi mới
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">
                    Họ và tên Chủ nuôi <span className="pcms-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="pcms-input"
                    required
                    placeholder="Nguyễn Văn A"
                    value={walkInForm.ownerFullName}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, ownerFullName: e.target.value }))}
                  />
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">
                    Số điện thoại <span className="pcms-required">*</span>
                  </label>
                  <input
                    type="tel"
                    className="pcms-input"
                    required
                    placeholder="0901234567"
                    value={walkInForm.ownerPhoneNumber}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, ownerPhoneNumber: e.target.value }))}
                  />
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">Email (tùy chọn)</label>
                  <input
                    type="email"
                    className="pcms-input"
                    placeholder="khachhang@email.com"
                    value={walkInForm.ownerEmail}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                  />
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">Địa chỉ liên hệ</label>
                  <input
                    type="text"
                    className="pcms-input"
                    placeholder="Số nhà, đường, quận/huyện..."
                    value={walkInForm.ownerAddress}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, ownerAddress: e.target.value }))}
                  />
                </div>

                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px 14px',
                    background: 'var(--pcms-bg-subtle, #f8fafc)',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  B. Thông tin Thú cưng mới
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">
                    Tên thú cưng <span className="pcms-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="pcms-input"
                    required
                    placeholder="Ví dụ: Miu, Lu, Bông..."
                    value={walkInForm.petName}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, petName: e.target.value }))}
                  />
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">
                    Loài <span className="pcms-required">*</span>
                  </label>
                  <select
                    className="pcms-select"
                    value={walkInForm.species}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, species: e.target.value }))}
                  >
                    <option value="Chó">Chó</option>
                    <option value="Mèo">Mèo</option>
                    <option value="Thỏ">Thỏ</option>
                    <option value="Hamster">Hamster</option>
                    <option value="Chim">Chim</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">Giống (Breed)</label>
                  <input
                    type="text"
                    className="pcms-input"
                    placeholder="Poodle, Corgi, Anh lông ngắn..."
                    value={walkInForm.breed}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, breed: e.target.value }))}
                  />
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">Giới tính</label>
                  <select
                    className="pcms-select"
                    value={walkInForm.gender}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="Đực">Đực</option>
                    <option value="Cái">Cái</option>
                    <option value="Chưa rõ">Chưa rõ</option>
                  </select>
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">Tuổi (năm)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="pcms-input"
                    placeholder="Ví dụ: 2"
                    value={walkInForm.age}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, age: e.target.value }))}
                  />
                </div>

                <div className="pcms-form-group">
                  <label className="pcms-label">Cân nặng đo tại quầy (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="250"
                    className="pcms-input"
                    placeholder="Ví dụ: 3.8"
                    value={walkInForm.weight}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div
              style={{
                gridColumn: '1 / -1',
                padding: '10px 14px',
                background: 'var(--pcms-bg-subtle, #f8fafc)',
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Chỉ định Bác sĩ trực sẵn sàng & Dịch vụ khám
            </div>

            <div className="pcms-form-group">
              <label className="pcms-label">
                Chỉ định Bác sĩ phụ trách khám <span className="pcms-required">*</span>
              </label>
              <select
                className="pcms-select"
                required
                value={walkInForm.veterinarianId}
                onChange={(e) => setWalkInForm((prev) => ({ ...prev, veterinarianId: e.target.value }))}
              >
                <option value="">-- Chọn bác sĩ đang trực ca --</option>
                {veterinarians.map((v) => (
                  <option key={v.userId} value={v.userId}>
                    {v.fullName} — {v.availabilityLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="pcms-form-group">
              <label className="pcms-label">Dịch vụ yêu cầu</label>
              <select
                className="pcms-select"
                value={walkInForm.serviceId}
                onChange={(e) => setWalkInForm((prev) => ({ ...prev, serviceId: e.target.value }))}
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
              <label className="pcms-label">
                Triệu chứng ban đầu / Lý do khám <span className="pcms-required">*</span>
              </label>
              <textarea
                className="pcms-textarea"
                rows={3}
                required
                placeholder="Mô tả triệu chứng lâm sàng ban đầu tại bàn tiếp đón..."
                value={walkInForm.notes}
                onChange={(e) => setWalkInForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="submit"
                className="pcms-btn pcms-btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Tiếp nhận Walk-in & Điều phối sang Bác sĩ (CHECKED_IN)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal xác nhận Check-in & Điều phối Bác sĩ (UC11) */}
      <ModalDialog
        open={Boolean(checkInTarget)}
        title={`Thủ tục Check-in & Điều phối Bác sĩ — ${checkInTarget?.appointmentCode || ''}`}
        onClose={() => setCheckInTarget(null)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setCheckInTarget(null)}>
              Hủy
            </button>
            <button type="submit" form="checkin-modal-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận Check-in & Chuyển Bác sĩ (CHECKED_IN)'}
            </button>
          </>
        }
      >
        <form id="checkin-modal-form" onSubmit={handleCheckInSubmit} className="pcms-form-grid">
          <div style={{ gridColumn: '1 / -1', fontSize: 14 }}>
            Thú cưng: <strong>{checkInTarget?.petName}</strong> ({checkInTarget?.species}) • Chủ nuôi:{' '}
            <strong>{checkInTarget?.ownerName}</strong> ({checkInTarget?.ownerPhone}) • Buổi hẹn:{' '}
            <strong style={{ color: 'var(--pcms-primary)' }}>{checkInTarget?.shiftDisplay}</strong>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">
              Chỉ định Bác sĩ phụ trách khám <span className="pcms-required">*</span>
            </label>
            <select
              className="pcms-select"
              required
              value={checkInForm.veterinarianId}
              onChange={(e) => setCheckInForm((prev) => ({ ...prev, veterinarianId: e.target.value }))}
            >
              <option value="">-- Chọn bác sĩ đang sẵn sàng --</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  {v.fullName} — {v.availabilityLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="pcms-form-group">
            <label className="pcms-label">Cân nặng đo tại quầy (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="250"
              className="pcms-input"
              placeholder="Nhập cân nặng thực tế..."
              value={checkInForm.weight}
              onChange={(e) => setCheckInForm((prev) => ({ ...prev, weight: e.target.value }))}
            />
          </div>

          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Dịch vụ đăng ký</label>
            <select
              className="pcms-select"
              value={checkInForm.serviceId}
              onChange={(e) => setCheckInForm((prev) => ({ ...prev, serviceId: e.target.value }))}
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
            <label className="pcms-label">Triệu chứng lâm sàng ban đầu / Ghi chú</label>
            <textarea
              className="pcms-textarea"
              rows={3}
              placeholder="Ghi nhận triệu chứng khi tiếp đón để Bác sĩ nắm trước ca khám..."
              value={checkInForm.notes}
              onChange={(e) => setCheckInForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      {/* Modal Đổi Bác sĩ cho ca đã Check-in */}
      <ModalDialog
        open={Boolean(reassignTarget)}
        title={`Chuyển điều phối Bác sĩ — ${reassignTarget?.appointmentCode || ''}`}
        onClose={() => setReassignTarget(null)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setReassignTarget(null)}>
              Hủy
            </button>
            <button type="submit" form="reassign-modal-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu điều phối Bác sĩ mới'}
            </button>
          </>
        }
      >
        <form id="reassign-modal-form" onSubmit={handleReassignSubmit}>
          <div style={{ marginBottom: 12, fontSize: 14 }}>
            Thú cưng: <strong>{reassignTarget?.petName}</strong> • Bác sĩ hiện tại:{' '}
            <strong>{reassignTarget?.veterinarianName}</strong>
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">
              Chọn Bác sĩ mới <span className="pcms-required">*</span>
            </label>
            <select
              className="pcms-select"
              required
              value={reassignVetId}
              onChange={(e) => setReassignVetId(e.target.value)}
            >
              <option value="">-- Chọn bác sĩ trực ca --</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  {v.fullName} — {v.availabilityLabel}
                </option>
              ))}
            </select>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
