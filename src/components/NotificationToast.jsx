import { useNotificationContext } from '../hooks/useNotifications';

export default function NotificationToast() {
  const { notifications } = useNotificationContext();

  if (process.env.NODE_ENV === 'development') console.log('[NotificationToast] Current notifications:', notifications);

  return (
    <>
      {/* Toast Notifications */}
      <div className="notification-toast-container">
        {notifications.map((notification, index) => {
          const type = notification.data?.type || 'default';
          const icon = {
            like: '👍',
            follow: '👤',
            comment: '💬',
            mention: '🏷️',
            share: '📤',
            reply: '↩️',
            default: '🔔'
          }[type] || '🔔';

          const fallbackTitle = type === 'message' ? 'New message' : 'Notification';
          const fallbackBody = type === 'message'
            ? (notification.message?.text || notification.message?.content || 'You have a new message.')
            : 'You have a new update.';
          const title = notification.title || fallbackTitle;
          const body = notification.body || fallbackBody;

          const key = notification.id || notification.notificationId || notification.timestamp || `toast-${type}-${index}`;

          return (
            <div key={key} className={`toast toast-${type}`}>
              <div className="toast-icon">{icon}</div>
              <div className="toast-content">
                <h4>{title}</h4>
                <p>{body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .notification-toast-container {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 9998;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .toast {
          background: #142033;
          border-left: 4px solid #3b82f6;
          border-radius: 8px;
          padding: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .toast-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .toast-content {
          flex: 1;
          min-width: 0;
        }

        .toast-content h4 {
          margin: 0 0 4px 0;
          font-weight: 600;
          color: #E6EDF6;
          font-size: 14px;
        }

        .toast-content p {
          margin: 0;
          color: #9AA8B6;
          font-size: 13px;
        }

        .toast-like {
          border-left-color: #ec4899;
        }

        .toast-follow {
          border-left-color: #8b5cf6;
        }

        .toast-comment {
          border-left-color: #06b6d4;
        }

        .toast-mention {
          border-left-color: #f59e0b;
        }

        .toast-share {
          border-left-color: #6366f1;
        }

        .toast-reply {
          border-left-color: #14b8a6;
        }

        @keyframes slideIn {
          from {
            transform: translateX(420px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .notification-toast-container {
            max-width: calc(100vw - 32px);
            right: 16px;
            left: 16px;
          }
        }
      `}</style>
    </>
  );
}





