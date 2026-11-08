import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Calendar,
  Stethoscope,
  ClipboardList,
  Info,
  Clock,
} from 'lucide-react';
import notificationApi from '../../api/notificationApi';

/**
 * Component Quả chuông Thông báo đa năng:
 * - Hiển thị badge số thông báo chưa đọc trong thời gian thực.
 * - Hỗ trợ cả giao diện nền tím (Admin/Vet/Receptionist) và nền sáng (Pet Owner).
 * - Click mở Dropdown xem danh sách thông báo, đánh dấu đã đọc hoặc đọc tất cả.
 * - Điều hướng trực tiếp tới ca khám/lịch hẹn liên quan.
 */
export default function NotificationBell({ variant = 'purple' }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const isLight = variant === 'light';

  // Lấy số lượng chưa đọc
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      const count = res?.data?.unreadCount ?? res?.unreadCount ?? 0;
      setUnreadCount(Number(count));
    } catch {
      // Bỏ qua lỗi ngầm khi mất kết nối mạng tạm thời
    }
  }, []);

  // Lấy danh sách thông báo chi tiết
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getMyNotifications();
      const list = res?.data ?? res ?? [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUnreadCount);

    // Polling định kỳ mỗi 20 giây để cập nhật realtime
    const timer = setInterval(fetchUnreadCount, 20000);

    // Lắng nghe sự kiện phát ra từ các trang (ví dụ khi vừa đặt lịch thành công)
    const handleRefresh = () => {
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    };
    window.addEventListener('notification-refresh', handleRefresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener('notification-refresh', handleRefresh);
    };
  }, [fetchUnreadCount, fetchNotifications, isOpen]);

  // Click ngoài đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (item, e) => {
    if (e) e.stopPropagation();
    if (item.isRead) return;

    try {
      await notificationApi.markAsRead(item.notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === item.notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignored
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignored
    }
  };

  const handleItemClick = (item) => {
    handleMarkAsRead(item);
    setIsOpen(false);

    // Điều hướng thông minh tùy theo loại thông báo
    if (item.type === 'BOOKING_SUCCESS') {
      navigate('/owner/medical-history');
    } else if (item.type === 'APPOINTMENT_ASSIGNED') {
      navigate('/vet/workbench');
    } else if (item.type === 'NEW_BOOKING_RECEPTION') {
      navigate('/receptionist/appointments');
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'BOOKING_SUCCESS':
        return <Calendar size={18} className="text-emerald-500" style={{ color: '#10b981' }} />;
      case 'APPOINTMENT_ASSIGNED':
        return <Stethoscope size={18} className="text-purple-600" style={{ color: '#7c3aed' }} />;
      case 'NEW_BOOKING_RECEPTION':
        return <ClipboardList size={18} className="text-amber-500" style={{ color: '#f59e0b' }} />;
      default:
        return <Info size={18} className="text-blue-500" style={{ color: '#3b82f6' }} />;
    }
  };

  return (
    <div className="pcms-user-menu-wrap" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Nút bấm hình Quả chuông */}
      <button
        type="button"
        onClick={handleToggle}
        title="Thông báo hệ thống"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: isLight ? '38px' : '36px',
          padding: isLight ? '0 12px' : '0 10px',
          borderRadius: isLight ? '8px' : '6px',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.25)',
          background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
          color: isLight ? '#334155' : '#ffffff',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
        }}
      >
        <Bell size={18} />
        <span>Thông báo</span>

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              borderRadius: '999px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isLight ? '2px solid #ffffff' : '2px solid #5218cc',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.35)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Thông báo */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '360px',
            maxWidth: '92vw',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ede9fe',
                    color: '#6d28d9',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6320ee',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck size={14} />
                Đã đọc tất cả
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '6px 0',
            }}
          >
            {loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    color: '#94a3b8',
                  }}
                >
                  <Bell size={22} />
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                  Không có thông báo mới
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Mọi thông tin lịch khám và cập nhật sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notificationId}
                  onClick={() => handleItemClick(n)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    background: n.isRead ? '#ffffff' : '#f5f3ff',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = n.isRead ? '#f8fafc' : '#ede9fe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.isRead ? '#ffffff' : '#f5f3ff';
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {getIconForType(n.type)}
                  </div>

                  {/* Nội dung thông báo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          fontWeight: n.isRead ? 600 : 700,
                          fontSize: '13px',
                          color: '#0f172a',
                          lineHeight: '1.3',
                        }}
                      >
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#7c3aed',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        margin: '4px 0 6px',
                        fontSize: '12.5px',
                        color: '#475569',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                      }}
                    >
                      {n.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: '11px' }}>
                      <Clock size={12} />
                      <span>{n.timeAgo || 'Vừa xong'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
