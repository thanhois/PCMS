import { useCallback, useEffect, useState } from 'react';
import receptionistApi from '../../api/receptionistApi';
import ConfirmDialog from '../admin/ui/ConfirmDialog';
import ModalDialog from '../admin/ui/ModalDialog';
import StatusBadge from '../admin/ui/StatusBadge';

export default function DoctorSlotsManager({ veterinarians = [], onToast }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState('');
  const [vetFilter, setVetFilter] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [form, setForm] = useState({
    veterinarianId: '',
    slotDate: todayStr,
    startTime: '08:00',
    endTime: '08:30',
    status: 'AVAILABLE',
    notes: '',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receptionistApi.getDoctorSlots({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        veterinarianId: vetFilter ? Number(vetFilter) : undefined,
      });
      setSlots(Array.isArray(res) ? res : []);
    } catch (err) {
      onToast?.({ type: 'error', message: err?.message || 'Không thể tải danh sách lịch bác sĩ.' });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, vetFilter, onToast]);

  useEffect(() => {
    void Promise.resolve().then(loadSlots);
  }, [loadSlots]);

  const openCreate = () => {
    setEditingSlot(null);
    setForm({
      veterinarianId: veterinarians[0]?.userId ? String(veterinarians[0].userId) : '',
      slotDate: fromDate || todayStr,
      startTime: '08:00',
      endTime: '08:30',
      status: 'AVAILABLE',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (slot) => {
    setEditingSlot(slot);
    setForm({
      veterinarianId: String(slot.veterinarianId || ''),
      slotDate: slot.slotDate || todayStr,
      startTime: slot.startTime || '08:00',
      endTime: slot.endTime || '08:30',
      status: slot.status || 'AVAILABLE',
      notes: slot.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.veterinarianId) {
      onToast?.({ type: 'error', message: 'Vui lòng chọn bác sĩ.' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        veterinarianId: Number(form.veterinarianId),
        slotDate: form.slotDate,
        startTime: form.startTime,
        endTime: form.endTime,
        status: form.status,
        notes: form.notes.trim(),
      };
      if (editingSlot) {
        await receptionistApi.updateDoctorSlot(editingSlot.slotId, payload);
        onToast?.({ type: 'success', message: 'Đã cập nhật khung giờ làm việc bác sĩ.' });
      } else {
        await receptionistApi.createDoctorSlot(payload);
        onToast?.({ type: 'success', message: 'Đã tạo khung giờ làm việc mới cho bác sĩ.' });
      }
      setModalOpen(false);
      await loadSlots();
    } catch (err) {
      onToast?.({ type: 'error', message: err?.message || 'Không thể lưu khung giờ bác sĩ.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await receptionistApi.deleteDoctorSlot(deleteTarget.slotId);
      onToast?.({ type: 'success', message: 'Đã xóa khung giờ làm việc.' });
      setDeleteTarget(null);
      await loadSlots();
    } catch (err) {
      onToast?.({ type: 'error', message: err?.message || 'Không thể xóa khung giờ.' });
      setDeleteTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pcms-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div className="pcms-form-group" style={{ marginBottom: 0 }}>
            <label className="pcms-label">Từ ngày</label>
            <input
              type="date"
              className="pcms-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="pcms-form-group" style={{ marginBottom: 0 }}>
            <label className="pcms-label">Đến ngày</label>
            <input
              type="date"
              className="pcms-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="pcms-form-group" style={{ marginBottom: 0 }}>
            <label className="pcms-label">Bác sĩ</label>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="pcms-btn pcms-btn-primary" onClick={openCreate}>
              + Thêm Slot Bác sĩ
            </button>
          </div>
        </div>
      </div>

      <div className="pcms-card">
        {loading ? (
          <p style={{ padding: 20, textAlign: 'center' }}>Đang tải lịch bác sĩ...</p>
        ) : slots.length === 0 ? (
          <p style={{ padding: 20, textAlign: 'center', color: 'var(--pcms-text-muted)' }}>
            Chưa có slot tùy chỉnh nào trong khoảng ngày đã chọn (hệ thống mặc định mở slot 30 phút 08:00–17:00).
          </p>
        ) : (
          <div className="pcms-table-wrap">
            <table className="pcms-table">
              <thead>
                <tr>
                  <th>Ngày trực</th>
                  <th>Khung giờ</th>
                  <th>Bác sĩ</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.slotId}>
                    <td>{s.slotDate}</td>
                    <td>
                      <strong>{s.startTime} — {s.endTime}</strong>
                    </td>
                    <td>{s.veterinarianName}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>{s.notes || '—'}</td>
                    <td>
                      {s.status === 'BOOKED' ? (
                        <span style={{ fontSize: 12, color: 'var(--pcms-text-muted)' }}>Đã có khách đặt</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="pcms-btn pcms-btn-outline pcms-btn-sm"
                            onClick={() => openEdit(s)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="pcms-btn pcms-btn-danger pcms-btn-sm"
                            onClick={() => setDeleteTarget(s)}
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalDialog
        open={modalOpen}
        title={editingSlot ? 'Cập nhật Khung giờ Bác sĩ' : 'Tạo Khung giờ Làm việc Bác sĩ'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="pcms-btn pcms-btn-outline" onClick={() => setModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="doctor-slot-form" className="pcms-btn pcms-btn-primary" disabled={submitting}>
              Lưu khung giờ
            </button>
          </>
        }
      >
        <form id="doctor-slot-form" onSubmit={handleSubmit} className="pcms-form-grid">
          <div className="pcms-form-group">
            <label className="pcms-label">Bác sĩ *</label>
            <select
              className="pcms-select"
              required
              value={form.veterinarianId}
              onChange={(e) => setForm((prev) => ({ ...prev, veterinarianId: e.target.value }))}
            >
              <option value="">-- Chọn bác sĩ --</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  {v.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Ngày làm việc *</label>
            <input
              type="date"
              className="pcms-input"
              min={todayStr}
              required
              value={form.slotDate}
              onChange={(e) => setForm((prev) => ({ ...prev, slotDate: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Giờ bắt đầu *</label>
            <input
              type="time"
              className="pcms-input"
              required
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Giờ kết thúc *</label>
            <input
              type="time"
              className="pcms-input"
              required
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </div>
          <div className="pcms-form-group">
            <label className="pcms-label">Trạng thái ca</label>
            <select
              className="pcms-select"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="AVAILABLE">Mở nhận hẹn (AVAILABLE)</option>
              <option value="BLOCKED">Khóa lịch / Bận chuyên môn (BLOCKED)</option>
            </select>
          </div>
          <div className="pcms-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="pcms-label">Ghi chú</label>
            <input
              className="pcms-input"
              placeholder="Ca sáng, Ca phẫu thuật, Nghỉ phép..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa Khung giờ Bác sĩ"
        message={`Xác nhận xóa khung giờ ${deleteTarget?.startTime}–${deleteTarget?.endTime} ngày ${deleteTarget?.slotDate} của ${deleteTarget?.veterinarianName}?`}
        confirmLabel="Xóa khung giờ"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
