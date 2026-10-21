/**
 * StatusBadge: Badge trạng thái bo góc nhiều màu đồng bộ với thiết kế.
 *
 * Hỗ trợ tự động map màu theo mã trạng thái (ACTIVE, INACTIVE, LOCKED, SCHEDULED, COMPLETED, CANCELLED...)
 * hoặc truyền trực tiếp `variant` ('success' | 'warning' | 'info' | 'danger' | 'purple' | 'solid-green' | 'neutral').
 */
const STATUS_MAP = {
  ACTIVE: { label: 'Hoạt động', variant: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', variant: 'neutral' },
  LOCKED: { label: 'Đã khóa', variant: 'danger' },
  SCHEDULED: { label: 'Đã đặt lịch', variant: 'info' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', variant: 'warning' },
  APPROVED: { label: 'Đã duyệt', variant: 'purple' },
  CHECKED_IN: { label: 'Đã check-in', variant: 'info' },
  IN_PROGRESS: { label: 'Đang khám', variant: 'purple' },
  COMPLETED: { label: 'Hoàn thành', variant: 'success' },
  CANCELLED: { label: 'Đã hủy', variant: 'danger' },
  REJECTED: { label: 'Từ chối', variant: 'danger' },
  PAID: { label: 'Đã thanh toán', variant: 'success' },
  UNPAID: { label: 'Chưa thanh toán', variant: 'warning' },
  PARTIAL: { label: 'Thanh toán 1 phần', variant: 'info' },
  VOID: { label: 'Đã hủy', variant: 'danger' },
  ADMIN: { label: 'Quản trị viên', variant: 'purple' },
  VETERINARIAN: { label: 'Bác sĩ thú y', variant: 'info' },
  RECEPTIONIST: { label: 'Lễ tân', variant: 'warning' },
  INVENTORY_MANAGER: { label: 'Quản lý kho', variant: 'solid-green' },
  PET_OWNER: { label: 'Chủ thú cưng', variant: 'neutral' },
};

export default function StatusBadge({ status, label, variant }) {
  const mapped = STATUS_MAP[status] || null;
  const resolvedVariant = variant || mapped?.variant || 'neutral';
  const resolvedLabel = label || mapped?.label || status || '—';

  return <span className={`pcms-badge pcms-badge-${resolvedVariant}`}>{resolvedLabel}</span>;
}
