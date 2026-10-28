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
        background: isError ? '#fef2f2' : '#ecfdf5',
        border: `1px solid ${isError ? '#fecaca' : '#a7f3d0'}`,
        color: isError ? '#b91c1c' : '#047857',
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
            color: 'inherit',
            fontWeight: 700,
            marginLeft: 12,
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
