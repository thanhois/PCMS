import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Dog,
  Eye,
  FileText,
  Filter,
  Play,
  RefreshCw,
  Search,
  Stethoscope,
  User,
  XCircle,
} from 'lucide-react';
import vetApi from '../../api/vetApi';
import PetHistoryModal from '../../components/vet/PetHistoryModal';
import '../../styles/vetTheme.css';

export default function VetWorkbenchPage() {
  const navigate = useNavigate();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
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

  // Modal xem bệnh sử
  const [historyPet, setHistoryPet] = useState(null);

  // Modal hủy ca
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [date, status]);

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
      alert(err?.response?.data?.message || 'Không thể bắt đầu ca khám');
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
      alert(err?.response?.data?.message || 'Lỗi khi hủy ca khám');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* KPI Stats Overview */}
      <div className="vet-stat-grid">
        <div className="vet-stat-card">
          <div className="vet-stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="vet-stat-val">{summary.totalToday}</div>
            <div className="vet-stat-lbl">Tổng ca trong ngày</div>
          </div>
        </div>

        <div className="vet-stat-card">
          <div className="vet-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="vet-stat-val">{summary.waitingCount}</div>
            <div className="vet-stat-lbl">Chờ tiếp nhận / Khám</div>
          </div>
        </div>

        <div className="vet-stat-card">
          <div className="vet-stat-icon" style={{ background: '#ccfbf1', color: '#0d9488' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="vet-stat-val">{summary.inProgressCount}</div>
            <div className="vet-stat-lbl">Đang trong phòng khám</div>
          </div>
        </div>

        <div className="vet-stat-card">
          <div className="vet-stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="vet-stat-val">{summary.completedCount}</div>
            <div className="vet-stat-lbl">Đã hoàn tất khám</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="vet-card" style={{ marginBottom: 20 }}>
        <div className="vet-card-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Date selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} color="#0d9488" /> Ngày khám:
              </label>
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
                onClick={() => setDate(new Date().toISOString().split('T')[0])}
              >
                Hôm nay
              </button>
            </div>

            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'IN_PROGRESS', label: 'Đang khám' },
                { key: 'CHECKED_IN', label: 'Đã Check-in' },
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

            {/* Search input */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, minWidth: 260 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="vet-input"
                  style={{ paddingLeft: 34 }}
                  placeholder="Tìm tên Pet, Chủ nuôi, SĐT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="vet-btn vet-btn-outline vet-btn-sm" title="Tìm kiếm">
                <RefreshCw size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="vet-card">
        <div className="vet-card-header">
          <h3 className="vet-card-title">
            <Stethoscope size={18} color="#0d9488" />
            Danh Sách Ca Bệnh Được Phân Công ({appointments.length} ca)
          </h3>
          <button type="button" className="vet-btn vet-btn-outline vet-btn-sm" onClick={loadData}>
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#0d9488' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🩺</div>
            <p style={{ fontWeight: 600 }}>Đang tải danh sách ca bệnh...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🐾</div>
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
              Không có ca khám nào phù hợp
            </h4>
            <p style={{ fontSize: 13, margin: 0 }}>
              Không tìm thấy lịch hẹn nào theo điều kiện lọc ngày {date}.
            </p>
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
                  <th style={{ width: 220, textAlign: 'center' }}>Thao tác chuyên môn</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const pet = appt.pet || {};
                  const owner = appt.petOwner || {};
                  const isInProgress = appt.status === 'IN_PROGRESS';
                  const isCompleted = appt.status === 'COMPLETED';
                  const isCancelled = appt.status === 'CANCELLED';

                  return (
                    <tr key={appt.appointmentId} style={{ backgroundColor: isInProgress ? '#f0fdfa' : 'inherit' }}>
                      <td>
                        <strong style={{ color: '#0d9488' }}>#{appt.appointmentId}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600 }}>
                          <Clock size={14} color="#0d9488" />
                          <span>{appt.appointmentDate ? appt.appointmentDate.split(' ')[1] : 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="vet-pet-badge">
                          <div className="vet-pet-avatar">
                            {pet.species === 'Mèo' ? '🐱' : '🐶'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                              {pet.petName}
                            </div>
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
                        <div style={{ fontSize: 13, color: '#334155', maxWidth: 280, lineHeight: 1.4 }}>
                          {appt.reason || 'Khám lâm sàng theo lịch'}
                        </div>
                        {appt.notes && (
                          <div style={{ fontSize: 11.5, color: '#0f766e', marginTop: 3 }}>
                            💬 Lễ tân: {appt.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        {isInProgress && (
                          <span className="vet-badge vet-badge-in-progress">
                            <span className="vet-pulse-dot"></span> Đang khám
                          </span>
                        )}
                        {(appt.status === 'WAITING' || appt.status === 'CHECKED_IN') && (
                          <span className="vet-badge vet-badge-waiting">
                            {appt.status === 'CHECKED_IN' ? 'Đã check-in' : 'Chờ khám'}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="vet-badge vet-badge-completed">
                            <CheckCircle2 size={13} /> Hoàn tất
                          </span>
                        )}
                        {isCancelled && (
                          <span className="vet-badge vet-badge-cancelled">
                            <XCircle size={13} /> Đã hủy
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {/* Nút xem bệnh sử cũ */}
                          <button
                            type="button"
                            className="vet-btn vet-btn-outline vet-btn-sm"
                            title="Xem lịch sử bệnh án cũ của bé"
                            onClick={() => setHistoryPet({ petId: pet.petId, petName: pet.petName })}
                          >
                            <Dog size={14} /> Bệnh sử
                          </button>

                          {/* Action chính */}
                          {isInProgress && (
                            <button
                              type="button"
                              className="vet-btn vet-btn-primary vet-btn-sm"
                              onClick={() => navigate(`/vet/examination/${appt.recordId}`)}
                            >
                              <Play size={13} fill="currentColor" /> Tiếp tục khám
                            </button>
                          )}

                          {(appt.status === 'WAITING' || appt.status === 'CHECKED_IN') && (
                            <button
                              type="button"
                              className="vet-btn vet-btn-primary vet-btn-sm"
                              disabled={actionLoading}
                              onClick={() => handleStartExam(appt)}
                            >
                              <Stethoscope size={14} /> Khám ngay
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              onClick={() => navigate(`/vet/examination/${appt.recordId}`)}
                            >
                              <Eye size={14} /> Bệnh án
                            </button>
                          )}

                          {!isCompleted && !isCancelled && (
                            <button
                              type="button"
                              className="vet-btn vet-btn-outline vet-btn-sm"
                              style={{ color: '#ef4444' }}
                              title="Hủy ca khám"
                              onClick={() => setCancelTarget(appt)}
                            >
                              <XCircle size={14} />
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

      {/* Modal Bệnh Sử Pet */}
      {historyPet && (
        <PetHistoryModal
          petId={historyPet.petId}
          petName={historyPet.petName}
          onClose={() => setHistoryPet(null)}
        />
      )}

      {/* Modal Hủy Ca Khám */}
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
                Bạn có chắc chắn muốn hủy ca khám của bé <strong>{cancelTarget.pet?.petName}</strong> (Chủ nuôi: {cancelTarget.petOwner?.fullName})?
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
