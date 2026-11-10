import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import vetApi from '../../api/vetApi';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import KpiCard from '../../components/admin/ui/KpiCard';
import PageHeader from '../../components/admin/ui/PageHeader';
import PetHistoryModal from '../../components/vet/PetHistoryModal';
import '../../styles/vetTheme.css';

export default function VetWorkbenchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dialog = useDialog();
  const isVet = user?.role === 'VETERINARIAN';

  const getLocalTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getLocalTodayStr();
  const [date, setDate] = useState(() => getLocalTodayStr());
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState({
    totalToday: 0,
    waitingCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    cancelledCount: 0,
  });

  const [historyPet, setHistoryPet] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptsRes, summaryRes] = await Promise.all([
        vetApi.getAppointments({ date, status, search }),
        vetApi.getWorklistSummary({ date }),
      ]);
      setAppointments(apptsRes.appointments || []);
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách ca khám:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [date, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleStartExam = async (appt) => {
    setActionLoading(true);
    try {
      const record = await vetApi.startExamination(appt.appointmentId);
      if (record && record.recordId) {
        navigate(`/vet/examination/${record.recordId}`);
      } else {
        loadData();
      }
    } catch (err) {
      dialog.alert({
        title: 'Lỗi bắt đầu ca khám',
        message: err?.message || err?.response?.data?.message || 'Không thể bắt đầu ca khám',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await vetApi.updateAppointmentStatus(cancelTarget.appointmentId, {
        status: 'CANCELLED',
        notes: cancelReason || 'Bác sĩ hủy ca khám',
      });
      setCancelTarget(null);
      setCancelReason('');
      loadData();
    } catch (err) {
      dialog.alert({
        title: 'Lỗi hủy ca khám',
        message: err?.message || err?.response?.data?.message || 'Lỗi khi hủy ca khám',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="pcms-page">
      <PageHeader
        title="Ca khám hôm nay"
        subtitle="Danh sách lịch hẹn được phân công, tiếp nhận lâm sàng và xử lý bệnh án điện tử"
        actions={
          <button type="button" className="pcms-btn pcms-btn-outline" onClick={loadData}>
            Làm mới dữ liệu
          </button>
        }
      />

      {!isVet && (
        <div className="pcms-alert pcms-alert-info" style={{ marginBottom: 16 }}>
          Chế độ tra cứu chỉ đọc: Chỉ Bác sĩ thú y được phân công mới được tiếp nhận khám và chỉnh sửa bệnh án lâm sàng.
        </div>
      )}

      <div className="pcms-kpi-grid">
        <KpiCard label="Tổng ca trong ngày" value={summary.totalToday} />
        <KpiCard
          label="Chờ tiếp nhận / Khám"
          value={summary.waitingCount}
          trendDirection={summary.waitingCount > 0 ? 'warning' : 'neutral'}
          trendText={summary.waitingCount > 0 ? 'Đang chờ bác sĩ gọi khám' : 'Không có ca chờ'}
        />
        <KpiCard
          label="Đang trong phòng khám"
          value={summary.inProgressCount}
          trendDirection="neutral"
          trendText="Ca đang xử lý lâm sàng"
        />
        <KpiCard
          label="Đã hoàn tất khám"
          value={summary.completedCount}
          trendDirection="up"
          trendText="Đã chốt bệnh án & chuyển thu ngân"
        />
      </div>

      <div className="vet-card">
        <div className="vet-card-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Ngày khám:</label>
              <input
                type="date"
                className="vet-input"
                style={{ width: 160 }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                type="button"
                className="vet-btn vet-btn-outline vet-btn-sm"
                onClick={() => setDate(getLocalTodayStr())}
              >
                Hôm nay
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'IN_PROGRESS', label: 'Đang khám' },
                { key: 'CHECKED_IN', label: 'Đã Check-in' },
                { key: 'CONFIRMED', label: 'Đã xác nhận' },
                { key: 'WAITING', label: 'Chờ khám' },
                { key: 'COMPLETED', label: 'Hoàn tất' },
                { key: 'CANCELLED', label: 'Đã hủy' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  className={`vet-btn vet-btn-sm ${status === tab.key ? 'vet-btn-primary' : 'vet-btn-outline'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, minWidth: 260 }}>
              <input
                type="text"
                className="vet-input"
                placeholder="Tìm tên Pet, Chủ nuôi, SĐT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="vet-btn vet-btn-outline vet-btn-sm">
                Tìm
              </button>
            </form>
          </div>
        </div>
      </div>

      {date !== todayStr && (
        <div className="pcms-alert pcms-alert-info" style={{ marginBottom: 16 }}>
          {date > todayStr
            ? `Bạn đang xem lịch hẹn dự kiến ngày ${date} (tương lai). Bác sĩ chỉ được phép bắt đầu khám đối với các ca trong ngày hôm nay (${todayStr}) sau khi khách đã Check-in tại quầy.`
            : `Bạn đang tra cứu lịch sử ca khám ngày ${date} (quá khứ). Không thể bắt đầu khám mới cho lịch hẹn đã qua.`}
        </div>
      )}

      <div className="vet-card">
        <div className="vet-card-header">
          <h3 className="vet-card-title">Danh Sách Ca Bệnh Được Phân Công ({appointments.length} ca)</h3>
        </div>

        {loading ? (
          <div className="pcms-state-box">
            <h4>Đang tải danh sách ca bệnh...</h4>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="pcms-state-box">
            <h4>Không có ca khám nào phù hợp</h4>
            <p>Không tìm thấy lịch hẹn nào theo điều kiện lọc ngày {date}.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="vet-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã Ca</th>
                  <th style={{ width: 110 }}>Giờ hẹn</th>
                  <th>Thú cưng (Pet)</th>
                  <th>Chủ nuôi</th>
                  <th>Lý do đến khám</th>
                  <th style={{ width: 140 }}>Trạng thái</th>
                  <th style={{ width: 240, textAlign: 'center' }}>Thao tác chuyên môn</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const pet = appt.pet || {};
                  const owner = appt.petOwner || {};
                  const isInProgress = appt.status === 'IN_PROGRESS';
                  const isCompleted = appt.status === 'COMPLETED';
                  const isCancelled = appt.status === 'CANCELLED' || appt.status === 'REJECTED';
                  const isNoShow = appt.status === 'NO_SHOW';
                  const apptDateStr = appt.appointmentDate ? appt.appointmentDate.split(' ')[0] : date;
                  const isTodayAppt = apptDateStr === todayStr;
                  const isCheckedInReady = appt.status === 'CHECKED_IN' || appt.status === 'WAITING';

                  return (
                    <tr key={appt.appointmentId} style={{ backgroundColor: isInProgress ? '#f5f3ff' : 'inherit' }}>
                      <td>
                        <strong style={{ color: '#6320ee' }}>#{appt.appointmentId}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {appt.appointmentDate ? appt.appointmentDate.split(' ')[1] : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="vet-pet-badge">
                          <div className="vet-pet-avatar">
                            {(pet.petName || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{pet.petName}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              {pet.species} • {pet.breed} • {pet.gender} • <strong>{pet.weight} kg</strong>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{owner.fullName || 'Khách vãng lai'}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{owner.phoneNumber || ''}</div>
                      </td>
                      <td>
                        {appt.service && (
                          <div style={{ fontSize: 12, color: '#6320ee', fontWeight: 600, marginBottom: 3 }}>
                            {appt.service.serviceName}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: '#334155', maxWidth: 280, lineHeight: 1.4 }}>
                          {appt.reason || 'Khám lâm sàng theo lịch'}
                        </div>
                        {appt.notes && (
                          <div style={{ fontSize: 11.5, color: '#5218cc', marginTop: 3 }}>
                            Lễ tân: {appt.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        {isInProgress && (
                          <span className="vet-badge vet-badge-in-progress">
                            <span className="vet-pulse-dot" /> Đang khám
                          </span>
                        )}
                        {(appt.status === 'WAITING' ||
                          appt.status === 'CHECKED_IN' ||
                          appt.status === 'CONFIRMED' ||
                          appt.status === 'APPROVED') && (
                          <span className="vet-badge vet-badge-waiting">
                            {appt.status === 'CHECKED_IN'
                              ? 'Đã check-in'
                              : appt.status === 'CONFIRMED' || appt.status === 'APPROVED'
                              ? 'Đã xác nhận'
                              : 'Chờ khám'}
                          </span>
                        )}
                        {isCompleted && <span className="vet-badge vet-badge-completed">Hoàn tất</span>}
                        {isCancelled && <span className="vet-badge vet-badge-cancelled">{appt.status === 'REJECTED' ? 'Đã từ chối' : 'Đã hủy'}</span>}
                        {isNoShow && <span className="vet-badge vet-badge-cancelled">Vắng mặt (No-show)</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="vet-btn vet-btn-outline vet-btn-sm"
                            onClick={() => setHistoryPet({ petId: pet.petId, petName: pet.petName })}
                          >
                            Bệnh sử
                          </button>

                          {isInProgress && appt.recordId && (
                            <button
                              type="button"
                              className={`vet-btn vet-btn-sm ${isVet && isTodayAppt ? 'vet-btn-primary' : 'vet-btn-outline'}`}
                              onClick={() => navigate(`/vet/examination/${appt.recordId}`)}
                            >
                              {isVet && isTodayAppt ? 'Tiếp tục khám' : 'Xem bệnh án'}
                            </button>
                          )}

                          {isVet && isTodayAppt && isCheckedInReady && (
                            <button
                              type="button"
                              className="vet-btn vet-btn-primary vet-btn-sm"
                              disabled={actionLoading}
                              onClick={() => handleStartExam(appt)}
                            >
                              Khám ngay
                            </button>
                          )}

                          {isVet &&
                            isTodayAppt &&
                            (appt.status === 'CONFIRMED' ||
                              appt.status === 'APPROVED' ||
                              appt.status === 'PENDING_APPROVAL') && (
                              <span
                                style={{
                                  fontSize: 11.5,
                                  color: '#475569',
                                  fontWeight: 600,
                                  padding: '4px 8px',
                                  background: '#f1f5f9',
                                  borderRadius: 6,
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                Chờ Check-in tại quầy
                              </span>
                            )}

                          {isVet && !isTodayAppt && !isCompleted && !isCancelled && !isNoShow && (
                            <span
                              style={{
                                fontSize: 11.5,
                                color: '#64748b',
                                fontWeight: 600,
                                padding: '4px 8px',
                                background: '#f8fafc',
                                borderRadius: 6,
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {apptDateStr > todayStr ? 'Chưa đến ngày khám' : 'Đã qua ngày khám'}
                            </span>
                          )}

                          {isCompleted && appt.recordId && (
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              onClick={() => navigate(`/vet/examination/${appt.recordId}`)}
                            >
                              Bệnh án
                            </button>
                          )}

                          {isVet && isTodayAppt && !isCompleted && !isCancelled && !isNoShow && (
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              style={{ color: '#b91c1c' }}
                              onClick={() => setCancelTarget(appt)}
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyPet && (
        <PetHistoryModal
          petId={historyPet.petId}
          petName={historyPet.petName}
          onClose={() => setHistoryPet(null)}
        />
      )}

      {cancelTarget && (
        <div className="vet-modal-backdrop">
          <div className="vet-modal" style={{ maxWidth: 440 }}>
            <div className="vet-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#b91c1c' }}>
                Xác nhận hủy ca khám #{cancelTarget.appointmentId}
              </h3>
            </div>
            <div className="vet-modal-body">
              <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 12 }}>
                Bạn có chắc chắn muốn hủy ca khám của bé <strong>{cancelTarget.pet?.petName}</strong> (Chủ nuôi:{' '}
                {cancelTarget.petOwner?.fullName})?
              </p>
              <div className="vet-form-group">
                <label className="vet-form-label">Lý do hủy ca khám:</label>
                <textarea
                  className="vet-textarea"
                  rows={3}
                  placeholder="Nhập lý do hủy (ví dụ: Khách xin dời lịch, không đến sau 30 phút...)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <div className="vet-modal-footer">
              <button
                type="button"
                className="vet-btn vet-btn-outline"
                onClick={() => setCancelTarget(null)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="vet-btn vet-btn-danger"
                disabled={actionLoading}
                onClick={handleConfirmCancel}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận hủy ca'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
