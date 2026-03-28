import { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notifications';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children, userId }) {
  const [notifications, setNotifications] = useState([]); // transient toasts (websocket)
  const [persisted, setPersisted] = useState([]); // persisted notifications from API
  const [isLoading, setIsLoading] = useState(true); // loading state for persisted notifications
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { unreadNotificationCount, isConnected: wsConnected, connectionError: wsError, resetUnreadNotificationCount } = useWebSocket();
  const { refreshAccessToken, isAuthenticated } = useAuth();
  const activeIdentity = { type: 'user', id: userId };
  const isSelfActor = useCallback((notification) => {
    if (!notification || !userId) return false;
    const actorIds = [
      notification.actorId,
      notification.actor_id,
      notification.actor?.id,
      notification.actors?.[0]?.id,
      notification.data?.actorId,
      notification.data?.actor_id,
      notification.data?.likerId,
      notification.data?.commenterId,
      notification.data?.replierId,
      notification.data?.mentionerId,
      notification.data?.followerId,
      notification.data?.senderId,
    ].filter(Boolean).map((id) => String(id));

    const pageActorId = null;
    if (actorIds.includes(String(userId))) return true;
    if (pageActorId && actorIds.includes(pageActorId)) return true;

    return false;
  }, [userId]);
  const addToast = useCallback((notification) => {
    if (!notification) return;
    if (isSelfActor(notification)) return;
    const notifId = notification.id || notification.notificationId || null;
    const localId = notifId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const withLocalId = { ...notification, _localId: localId };

    if (process.env.NODE_ENV === 'development') console.log('[addToast] Adding notification toast:', withLocalId);

    setNotifications((prev) => {
      if (notifId && prev.some((n) => (n.id || n.notificationId) === notifId)) {
        if (process.env.NODE_ENV === 'development') console.log('[addToast] Skipping duplicate notification:', notifId);
        return prev;
      }
      if (!notifId && prev.some((n) => n._localId === localId)) {
        if (process.env.NODE_ENV === 'development') console.log('[addToast] Skipping duplicate local notification:', localId);
        return prev;
      }
      const updated = [withLocalId, ...prev].slice(0, 50);
      if (process.env.NODE_ENV === 'development') console.log('[addToast] Updated notifications array, count:', updated.length);
      return updated;
    });

    setTimeout(() => {
      if (process.env.NODE_ENV === 'development') console.log('[addToast] Removing toast:', localId);
      setNotifications((prev) => prev.filter((n) => (n._localId || n.id || n.notificationId) !== localId));
    }, 5000);
  }, [isSelfActor]);
  // Real-time updates for all actions (posts, likes, comments, bookmarks, shares, etc.)
  const { latestNotification } = useWebSocket();

  // Handle real-time notifications
  useEffect(() => {
    if (latestNotification) {
      if (process.env.NODE_ENV === 'development') console.log('[useNotifications] Processing latestNotification:', latestNotification);
      addToast(latestNotification);
    }
  }, [latestNotification, addToast]);

  useEffect(() => {
    setIsConnected(wsConnected);
    setConnectionError(wsError);
  }, [wsConnected, wsError]);

  // Poll backend for persisted notifications and compute hasUnread
  useEffect(() => {
    if (!isAuthenticated) {
      setPersisted([]);
      setIsLoading(false);
      return;
    }
    let intervalId;
    let hasLoaded = false;
    const load = async () => {
      if (!isAuthenticated) {
        setPersisted([]);
        setIsLoading(false);
        return;
      }

      if (!hasLoaded) {
        setIsLoading(true);
      }
      try {
        const rows = await getNotifications();
        const filteredRows = rows.filter((n) => !isSelfActor(n));
        const sorted = [...filteredRows].sort((a, b) => {
          const readA = a.read ? 1 : 0;
          const readB = b.read ? 1 : 0;
          if (readA !== readB) return readA - readB;
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setPersisted(sorted);
      } catch (e) {
        const errorMessage = e?.message || String(e);
        // If we get a 401 error, try to refresh the token
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          try {
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
              // Token refresh failed, stop polling
              setPersisted([]);
              setIsLoading(false);
              if (intervalId) {
                clearInterval(intervalId);
              }
              return;
            }
            // If refresh succeeded, try loading again with new token
            // The next poll will use the updated accessToken from props
          } catch (refreshError) {
            console.error('Token refresh failed in notifications:', refreshError);
            setPersisted([]);
            setIsLoading(false);
            if (intervalId) {
              clearInterval(intervalId);
            }
            return;
          }
        }
        // For other errors, just ignore and continue polling
      } finally {
        setIsLoading(false);
        hasLoaded = true;
      }
    };
    load();
    intervalId = setInterval(load, 30000); // Increased from 5s to 30s to reduce server load
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, refreshAccessToken, isSelfActor]);

  // Memoize hasUnread to ensure React detects changes - now uses persisted notifications
  const hasUnread = useMemo(() => {
    return persisted.some((n) => !n.read);
  }, [persisted]);

  // Also provide the count for components that need it
  const unreadCount = useMemo(() => {
    return persisted.filter((n) => !n.read).length;
  }, [persisted]);

  const markRead = useCallback(async (id) => {
    // Store previous state for rollback
    let previousState = null;
    setPersisted((prev) => {
      previousState = prev;
      return prev.map((n) => (n.id === String(id) ? { ...n, read: true } : n));
    });

    try {
      await markNotificationRead(id);
    } catch (error) {
      // Rollback on failure
      if (previousState) {
        setPersisted(previousState);
      }
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    // Store previous state for rollback
    let previousState = null;
    setPersisted((prev) => {
      previousState = prev;
      return prev.map((n) => ({ ...n, read: true }));
    });
    resetUnreadNotificationCount(); // Reset WebSocket unread count

    try {
      await markAllNotificationsRead();
    } catch (error) {
      // Rollback on failure
      if (previousState) {
        setPersisted(previousState);
      }
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [resetUnreadNotificationCount]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    notifications,
    persisted,
    isLoading,
    hasUnread,
    unreadCount,
    markRead,
    markAllRead,
    isConnected,
    connectionError
  }), [notifications, persisted, isLoading, hasUnread, unreadCount, markRead, markAllRead, isConnected, connectionError]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return default values instead of throwing to prevent app crashes
    // This can happen during initial render or when provider isn't mounted yet
    return {
      notifications: [],
      persisted: [],
      isLoading: false,
      hasUnread: false,
      unreadCount: 0,
      markRead: async () => {},
      markAllRead: async () => {},
      isConnected: false,
      connectionError: null
    };
  }
  return context;
}









