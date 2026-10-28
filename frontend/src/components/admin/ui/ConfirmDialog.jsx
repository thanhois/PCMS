/**
 * ConfirmDialog: Hộp thoại xác nhận trước khi thực hiện hành động nguy hiểm
 * (vô hiệu hóa tài khoản, đặt lại mật khẩu, ngưng dịch vụ/thuốc...).
 */
export default function ConfirmDialog({
  open,
  title = 'Xác nhận thao tác',
  description,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger', // 'danger' | 'primary'
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="pcms-modal-backdrop" role="dialog" aria-modal="true">
      <div className="pcms-modal-card">
        <h3 className="pcms-modal-title">{title}</h3>
        <p className="pcms-modal-desc">{message || description || 'Bạn có chắc chắn muốn thực hiện thao tác này không?'}</p>
        <div className="pcms-modal-actions">
          <button
            type="button"
            className="pcms-btn pcms-btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`pcms-btn ${variant === 'danger' ? 'pcms-btn-danger' : 'pcms-btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
