import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Info,
  X,
} from 'lucide-react';

const DialogContext = createContext(null);

/**
 * DialogProvider: Thay thế toàn bộ alert() và window.confirm() nguyên bản của trình duyệt
 * sang Modal Dialog (mockup popup) đẹp mắt, chuẩn UX, đồng bộ nhận diện thương hiệu PCMS.
 */
export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState(null);
  const resolveRef = useRef(null);

  const handleClose = useCallback((value) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setDialogState(null);
  }, []);

  const confirm = useCallback((optionsOrMessage) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (typeof optionsOrMessage === 'string') {
        setDialogState({
          mode: 'confirm',
          title: 'Xác nhận thao tác',
          message: optionsOrMessage,
          confirmLabel: 'Xác nhận',
          cancelLabel: 'Hủy bỏ',
          variant: 'danger',
        });
      } else {
        const opts = optionsOrMessage || {};
        setDialogState({
          mode: 'confirm',
          title: opts.title || 'Xác nhận thao tác',
          message: opts.message || opts.description || '',
          confirmLabel: opts.confirmLabel || 'Xác nhận',
          cancelLabel: opts.cancelLabel || 'Hủy bỏ',
          variant: opts.variant || 'danger', // 'danger' | 'primary' | 'warning'
        });
      }
    });
  }, []);

  const alert = useCallback((optionsOrMessage) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (typeof optionsOrMessage === 'string') {
        setDialogState({
          mode: 'alert',
          title: 'Thông báo',
          message: optionsOrMessage,
          buttonLabel: 'Đã hiểu',
          type: 'info',
        });
      } else {
        const opts = optionsOrMessage || {};
        setDialogState({
          mode: 'alert',
          title: opts.title || 'Thông báo',
          message: opts.message || opts.description || '',
          buttonLabel: opts.buttonLabel || 'Đã hiểu',
          type: opts.type || 'info', // 'info' | 'warning' | 'error' | 'success'
        });
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      confirm,
      alert,
    }),
    [confirm, alert]
  );

  const renderIcon = () => {
    if (!dialogState) return null;
    const { mode, variant, type } = dialogState;

    if (mode === 'confirm') {
      if (variant === 'danger') {
        return (
          <div style={iconWrapStyle('#fee2e2', '#dc2626')}>
            <AlertTriangle size={24} />
          </div>
        );
      }
      if (variant === 'warning') {
        return (
          <div style={iconWrapStyle('#fef3c7', '#d97706')}>
            <AlertCircle size={24} />
          </div>
        );
      }
      return (
        <div style={iconWrapStyle('#ede9fe', '#6320ee')}>
          <HelpCircle size={24} />
        </div>
      );
    }

    // Alert mode
    switch (type) {
      case 'error':
        return (
          <div style={iconWrapStyle('#fee2e2', '#dc2626')}>
            <AlertTriangle size={24} />
          </div>
        );
      case 'warning':
        return (
          <div style={iconWrapStyle('#fef3c7', '#d97706')}>
            <AlertCircle size={24} />
          </div>
        );
      case 'success':
        return (
          <div style={iconWrapStyle('#dcfce7', '#16a34a')}>
            <CheckCircle2 size={24} />
          </div>
        );
      default:
        return (
          <div style={iconWrapStyle('#ede9fe', '#6320ee')}>
            <Info size={24} />
          </div>
        );
    }
  };

  const getConfirmBtnColor = () => {
    if (dialogState?.variant === 'danger') return '#dc2626';
    if (dialogState?.variant === 'warning') return '#d97706';
    return '#6320ee';
  };

  return (
    <DialogContext.Provider value={value}>
      {children}

      {/* Mockup Modal Dialog */}
      {dialogState && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose(dialogState.mode === 'confirm' ? false : true);
            }
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '460px',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              animation: 'scaleUp 0.15s ease-out',
            }}
          >
            {/* Nút đóng góc phải */}
            <button
              type="button"
              onClick={() => handleClose(dialogState.mode === 'confirm' ? false : true)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '4px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#334155';
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>

            {/* Nội dung thông báo */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              {renderIcon()}

              <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.3,
                  }}
                >
                  {dialogState.title}
                </h3>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-word',
                  }}
                >
                  {dialogState.message}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              {dialogState.mode === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    {dialogState.cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    style={{
                      height: '38px',
                      padding: '0 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: getConfirmBtnColor(),
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {dialogState.confirmLabel}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  style={{
                    height: '38px',
                    padding: '0 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#6320ee',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(99, 32, 238, 0.25)',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {dialogState.buttonLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

function iconWrapStyle(bg, color) {
  return {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}
