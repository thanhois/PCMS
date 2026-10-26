import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import receptionistApi from '../../api/receptionistApi';
import ModalDialog from '../../components/admin/ui/ModalDialog';
import PageHeader from '../../components/admin/ui/PageHeader';
import StatCard from '../../components/admin/ui/StatCard';
import StatusBadge from '../../components/admin/ui/StatusBadge';
import ToastMessage from '../../components/admin/ui/ToastMessage';

export default function ReceptionistDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ type: 'info', message: '' });

  // Modal từ chối nhanh trên Dashboard
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await receptionistApi.getDashboardSummary();
      setSummary(res);
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Không thể tải dữ liệu bàn tiếp đón hôm nay.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleQuickApprove = async (apt) => {
    setSubmitting(true);
    try {
      await receptionistApi.approveAppointment(apt.appointmentId, {});
      setToast({
        type: 'success',
        message: `Đã phê duyệt lịch hẹn ${apt.appointmentCode} của thú cưng ${apt.petName}.`,
      });
      await loadDashboard();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể phê duyệt lịch hẹn.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setToast({ type: 'error', message: 'Vui lòng nhập lý do từ chối lịch hẹn.' });
      return;
    }
    setSubmitting(true);
    try {
      await receptionistApi.rejectAppointment(rejectTarget.appointmentId, rejectReason.trim());
      setToast({
        type: 'success',
        message: `Đã từ chối lịch hẹn ${rejectTarget.appointmentCode}.`,
      });
      setRejectTarget(null);
      setRejectReason('');
      await loadDashboard();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể từ chối lịch hẹn.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCheckIn = async (apt) => {
    setSubmitting(true);
    try {
      await receptionistApi.checkInAppointment(apt.appointmentId, {});
      setToast({
        type: 'success',
        message: `Đã Check-in thú cưng ${apt.petName} (${apt.appointmentCode}) vào hàng đợi khám.`,
      });
      await loadDashboard();
    } catch (err) {
      setToast({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Không thể thực hiện Check-in.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const kpis = summary?.kpis || {};
  const pendingApprovals = summary?.pendingApprovals || [];
  const todaySchedule = summary?.todaySchedule || [];

  return (
    <div>
      <PageHeader
        title="Bàn tiếp đón hôm nay"
        subtitle="Tổng quan lịch hẹn trong ngày, yêu cầu đặt lịch chờ phê duyệt và hàng đợi Check-in tại phòng khám."
        actions={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={loadDashboard} disabled={loading}>
              Làm mới dữ liệu
            </button>
            <Link to="/receptionist/check-in" className="pcms-btn pcms-btn-primary">
              + Tiếp nhận Walk-in / Check-in
            </Link>
          </div>
        }
      />

      <ToastMessage
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ type: 'info', message: '' })}
      />

      {error ? (
        <div className="pcms-alert pcms-alert-error" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="pcms-stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Lịch hẹn hôm nay"
          value={kpis.todayTotalAppointments ?? 0}
          unit="ca hẹn"
          badge={{
            variant: 'info',
            text: `${kpis.todayWaitingArrivalCount ?? 0} ca chờ khách đến`,
          }}
        />
        <StatCard
          label="Yêu cầu chờ phê duyệt"
          value={kpis.pendingApprovalCount ?? 0}
          unit="yêu cầu"
          badge={{
            variant: (kpis.pendingApprovalCount ?? 0) > 0 ? 'warning' : 'success',
            text: (kpis.pendingApprovalCount ?? 0) > 0 ? 'Cần xử lý phê duyệt' : 'Đã duyệt hết',
          }}
        />
        <StatCard
          label="Đang chờ khám / Đang khám"
          value={kpis.todayCheckedInCount ?? 0}
          unit="thú cưng"
          badge={{
            variant: 'purple',
            text: `Hoàn tất hôm nay: ${kpis.todayCompletedCount ?? 0} ca`,
          }}
        />
        <StatCard
          label="Hồ sơ đang hoạt động"
          value={kpis.activePetsCount ?? 0}
          unit="thú cưng"
          badge={{
            variant: 'success',
            text: `${kpis.activeOwnersCount ?? 0} chủ nuôi hoạt động`,
          }}
        />
      </div>

      {/* Hàng 1: Yêu cầu đặt lịch trực tuyến chờ duyệt */}
      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <div className="pcms-card-header">
          <div>
            <h2 className="pcms-card-title">Yêu cầu đặt lịch chờ phê duyệt</h2>
            <p className="pcms-card-subtitle">
              Danh sách các lịch hẹn do khách hàng đặt trực tuyến đang ở trạng thái <code>PENDING_APPROVAL</code>.
            </p>
          </div>
          <Link to="/receptionist/appointments" className="pcms-btn pcms-btn-outline pcms-btn-sm">
            Xem toàn bộ lịch hẹn →
          </Link>
        </div>

        <div className="pcms-table-wrap">
          <table className="pcms-table">
            <thead>
              <tr>
                <th>Mã hẹn</th>
                <th>Thời gian hẹn</th>
                <th>Thú cưng</th>
                <th>Chủ nuôi & SĐT</th>
                <th>Bác sĩ / Dịch vụ</th>
                <th>Ghi chú</th>
                <th style={{ textAlign: 'right' }}>Thao tác duyệt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="pcms-empty-cell">
                    Đang tải danh sách chờ duyệt...
                  </td>
                </tr>
              ) : pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="pcms-empty-cell">
                    Hiện không có yêu cầu đặt lịch nào đang chờ phê duyệt.
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((item) => (
                  <tr key={item.appointmentId}>
                    <td>
                      <strong>{item.appointmentCode}</strong>
                    </td>
                    <td>{item.appointmentDateTimeDisplay}</td>
                    <td>
                      <strong>{item.petName}</strong>
                      <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
                        {item.species} {item.breed ? `• ${item.breed}` : ''}
                      </div>
                    </td>
                    <td>
                      <div>{item.ownerName}</div>
                      <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{item.ownerPhone}</div>
                    </td>
                    <td>
                      <div>{item.veterinarianName}</div>
                      <div style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>{item.serviceName}</div>
                    </td>
                    <td style={{ maxWidth: 220 }}>{item.notes || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="pcms-btn pcms-btn-primary pcms-btn-sm"
                        style={{ marginRight: 6 }}
                        disabled={submitting}
                        onClick={() => handleQuickApprove(item)}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className="pcms-btn pcms-btn-danger pcms-btn-sm"
                        disabled={submitting}
                        onClick={() => {
                          setRejectTarget(item);
                          setRejectReason('');
                        }}
                      >
                        Từ chối
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hàng 2: Lịch trình tiếp đón trong ngày hôm nay */}
      <div className="pcms-card">
        <div className="pcms-card-header">
          <div>
            <h2 className="pcms-card-title">Lịch tiếp đón trong ngày hôm nay</h2>
            <p className="pcms-card-subtitle">
              Theo dõi trạng thái khách đến phòng khám và thực hiện Check-in ngay khi khách có mặt.
            </p>
          </div>
          <Link to="/receptionist/check-in" className="pcms-btn pcms-btn-outline pcms-btn-sm">
            Mở bàn Check-in chi tiết →
          </Link>
        </div>

        <div className="pcms-table-wrap">
          <table className="pcms-table">
            <thead>
              <tr>
                <th>Buổi hẹn</th>
                <th>Mã hẹn</th>
                <th>Thú cưng</th>
                <th>Chủ nuôi & SĐT</th>
                <th>Bác sĩ phụ trách</th>
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
              ) : todaySchedule.length === 0 ? (
                <tr>
                  <td colSpan={7} className="pcms-empty-cell">
                    Hôm nay chưa có lịch hẹn nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                todaySchedule.map((item) => (
                  <tr key={item.appointmentId}>
                    <td>
                      <span className="pcms-badge pcms-badge-purple" style={{ fontSize: 11 }}>
                        {item.shift === 'AFTERNOON' ? '🌤️ Chiều' : '☀️ Sáng'}
                      </span>
                    </td>
                    <td>
                      {item.appointmentCode}
                      {item.walkIn ? (
                        <span
                          className="pcms-badge pcms-badge-info"
                          style={{ marginLeft: 6, fontSize: 10 }}
                        >
                          Walk-in
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <strong>{item.petName}</strong> ({item.species})
                    </td>
                    <td>
                      {item.ownerName} • <span style={{ color: 'var(--pcms-text-muted)' }}>{item.ownerPhone}</span>
                    </td>
                    <td>
                      <strong>{item.veterinarianName}</strong>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.status === 'CONFIRMED' || item.status === 'APPROVED' ? (
                        <Link
                          to="/receptionist/check-in"
                          className="pcms-btn pcms-btn-primary pcms-btn-sm"
                        >
                          Check-in & Phân công BS →
                        </Link>
                      ) : item.status === 'CHECKED_IN' ? (
                        <span style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>
                          Đã vào hàng đợi ({item.checkInTimeDisplay || 'Hôm nay'})
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal từ chối lịch hẹn */}
      <ModalDialog
        open={Boolean(rejectTarget)}
        title={`Từ chối lịch hẹn ${rejectTarget?.appointmentCode || ''}`}
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setRejectTarget(null)}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="quick-reject-form"
              className="pcms-btn pcms-btn-danger"
              disabled={submitting}
            >
              Xác nhận từ chối
            </button>
          </>
        }
      >
        <form id="quick-reject-form" onSubmit={handleQuickRejectSubmit}>
          <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>
            Bạn đang từ chối lịch hẹn của thú cưng <strong>{rejectTarget?.petName}</strong> (Chủ nuôi:{' '}
            <strong>{rejectTarget?.ownerName}</strong>) vào lúc{' '}
            <strong>{rejectTarget?.appointmentDateTimeDisplay}</strong>.
          </p>
          <div className="pcms-form-group">
            <label className="pcms-label">
              Lý do từ chối <span className="pcms-required">*</span>
            </label>
            <textarea
              className="pcms-textarea"
              rows={3}
              required
              placeholder="Nhập lý do từ chối (ví dụ: Bác sĩ bận ca phẫu thuật khẩn cấp, khung giờ đã kín...)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
