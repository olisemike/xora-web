import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoHeartOutline, IoChatbubbleOutline, IoShareOutline, IoBookmarkOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import './Notifications.css';
import { useNotificationContext } from '../hooks/useNotifications';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const _API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const Notifications = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { persisted, isLoading, markAllRead, markRead } = useNotificationContext();

  const handleMarkAll = async () => {
    try {
      await markAllRead();
    } catch (e) {
      // ignore
    }
  };

  const handleOpen = async (notif) => {
    if (!notif.read) {
      try {
        await markRead(notif.id);
      } catch {
        // If marking as read fails, we leave the UI state as-is and log is handled upstream if needed
      }
    }
    const postId = notif.postId || (notif.targetType === 'post' ? notif.targetId : null);
    if (postId) {
      navigate(`/post/${postId}`);
      return;
    }

    if (notif.type === 'follow') {
      const username = notif.actorUsername || notif.actorId || notif.userId;
      if (username) {
        navigate(`/profile/${username}`);
        return;
      }
    }

    if (notif.type === 'message') {
      navigate('/messages');
    }
  };

  if (isLoading) {
    return (
      <div className="notifications-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (persisted.length === 0) {
    return (
      <div className="notifications-container">
        <div className="notifications-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <h2>{t('notifications.title')}</h2>
        </div>
        <div className="empty-state">
<h3>{t('empty.nothingToShow')}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>{t('notifications.title')}</h2>
        <button className="mark-all-btn" onClick={handleMarkAll}>
          {t('notifications.markAll', 'Mark all read')}
        </button>
      </div>

      <div className="notifications-list">
        {persisted.map((notif) => {
          let Icon = IoHeartOutline;
          if (notif.type === 'comment') Icon = IoChatbubbleOutline;
          else if (notif.type === 'share') Icon = IoShareOutline;
          else if (notif.type === 'bookmark') Icon = IoBookmarkOutline;

          const timestamp = notif.createdAt
            ? new Date((typeof notif.createdAt === 'number' ? notif.createdAt * 1000 : Date.parse(notif.createdAt))).toLocaleString()
            : '';

          return (
            <div 
              key={notif.id} 
              className="notification-item" 
              onClick={() => handleOpen(notif)} 
              style={{ opacity: notif.read ? 0.6 : 1, cursor: 'pointer' }}
            >
              <div className="notification-icon">
                <Icon />
              </div>
              <div className="notification-content">
                <p>{notif.message || 'New notification'}</p>
                {timestamp ? <small className="notification-timestamp">{timestamp}</small> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;





