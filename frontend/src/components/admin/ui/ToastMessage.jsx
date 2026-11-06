export default function ToastMessage({ type = 'info', message, onClose }) {
  if (!message) return null;

  const isError = type === 'error';
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        marginBottom: 16,
        borderRadius: 10,
        background: isError ? '#fef2f2' : '#f5f3ff',
        border: `1px solid ${isError ? '#fecaca' : '#c4b5fd'}`,
        color: isError ? '#b91c1c' : '#5218cc',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <span>{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            color: 'inherit',
            fontSize: 12.5,
            lineHeight: 1,
            padding: '2px 6px',
          }}
          aria-label="Đóng thông báo"
        >
          Đóng
        </button>
      ) : null}
    </div>
  );
}
