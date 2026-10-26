export default function ModalDialog({ open, title, children, footer, onClose }) {
  if (!open) return null;

  return (
    <div className="pcms-modal-backdrop" role="dialog" aria-modal="true">
      <div className="pcms-modal-card" style={{ maxWidth: 640, width: '95%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h3 className="pcms-modal-title" style={{ margin: 0 }}>
            {title}
          </h3>
          {onClose ? (
            <button
              type="button"
              className="pcms-btn pcms-btn-outline pcms-btn-sm"
              onClick={onClose}
              aria-label="Đóng"
            >
              ✕
            </button>
          ) : null}
        </div>
        <div style={{ marginBottom: 18 }}>{children}</div>
        {footer ? <div className="pcms-modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}
