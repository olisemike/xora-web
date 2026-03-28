import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();


export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, accessToken, refreshAccessToken, logout, getCurrentAccessToken } = useAuth();
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 5; // Maximum number of reconnection attempts
  // Real-time update states
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const resetUnreadNotificationCount = useCallback(() => {
    setUnreadNotificationCount(0);
  }, []);
  const [latestEngagementUpdate, setLatestEngagementUpdate] = useState(null);
  const [latestPostAction, setLatestPostAction] = useState(null);
  const [latestBookmarkAction, setLatestBookmarkAction] = useState(null);
  const [latestFollowAction, setLatestFollowAction] = useState(null);
  const [latestMessageAction, setLatestMessageAction] = useState(null);
  const [latestFeedRefresh, setLatestFeedRefresh] = useState(null);
  const [latestNotification, setLatestNotification] = useState(null);

  const connect = useCallback((overrideToken) => {
    // Allow override token parameter for immediate use after refresh
    const tokenToUse = overrideToken || accessToken || getCurrentAccessToken?.();
    if (!user || !user.id || !tokenToUse || isConnectingRef.current) return;

    // Don't connect if already connected or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    // Close any lingering old connection before creating new one
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      wsRef.current = null;
    }

    isConnectingRef.current = true;

    // Construct WebSocket URL from API_URL (same as mobile app)
    const backendUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD
      ? 'https://xora-workers-api-production.xorasocial.workers.dev'
      : 'http://127.0.0.1:8787');

    // Use userId from user object and pass token
    const wsUserId = user.id;

    // Construct WebSocket URL with userId and token
    const baseWsUrl = `${backendUrl.replace('http://', 'ws://').replace('https://', 'wss://')}/notifications/stream`;
    const wsUrl = `${baseWsUrl}?userId=${encodeURIComponent(wsUserId)}&token=${encodeURIComponent(tokenToUse)}`;

    try {
      // Connect to notifications stream for real-time updates
      // Pass token both in URL and as WebSocket protocol header for maximum compatibility
      const ws = new WebSocket(wsUrl, ['bearer', tokenToUse]);

      ws.onopen = () => {
        if (import.meta.env.DEV) {
          console.info('[WebSocket] Connected');
        }
        setConnected(true);
        setSocket(ws);
        wsRef.current = ws;
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;

        // Send ping every 30 seconds to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // Ignore ping errors
            }
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            return; // Ignore pong responses
          }

          if (import.meta.env.DEV) console.info('[WebSocket] Received:', data);

          switch (data.type) {
            case 'post_action':
              setLatestPostAction({
                action: data.action,
                post: data.post,
                receivedAt: Date.now()
              });
              break;

            case 'bookmark_action':
              setLatestBookmarkAction({
                action: data.action,
                bookmark: data.bookmark,
                receivedAt: Date.now()
              });
              break;

            case 'follow_action':
              setLatestFollowAction({
                action: data.action,
                follow: data.follow,
                receivedAt: Date.now()
              });
              break;

            case 'message_action':
              const conversationId = data.conversationId || data?.message?.conversationId || data?.data?.conversationId;
              const message = data.message || data.data?.message || data;
              setLatestMessageAction({
                action: data.action,
                message,
                conversationId,
                receivedAt: Date.now()
              });
              // Also trigger notification toast for new messages
              setLatestNotification({
                ...data,
                receivedAt: Date.now()
              });
              break;

            case 'feed_refresh':
              setLatestFeedRefresh({
                feedType: data.feedType,
                receivedAt: Date.now()
              });
              break;

            case 'notification':
              setUnreadNotificationCount(prev => prev + 1);
              setLatestNotification({
                ...data,
                receivedAt: Date.now()
              });
              break;

            case 'engagement_update':
              // Real-time engagement count updates for posts
              console.log('[WebSocket] Received engagement_update:', data);
              setLatestEngagementUpdate({
                postId: data.postId,
                engagementType: data.engagementType,
                counts: data.counts,
                receivedAt: Date.now()
              });
              break;

            default:
              // Handle unknown message types
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      ws.onclose = (event) => {
        if (import.meta.env.DEV) {
          console.info('[WebSocket] Closed:', { code: event.code, reason: event.reason });
        }
        setConnected(false);
        setSocket(null);
        wsRef.current = null;
        isConnectingRef.current = false;
        clearInterval(pingIntervalRef.current);

        const closeReason = event.reason || '';

        // Check for rate limiting (429) - back off aggressively
        const isRateLimited = closeReason.includes('429') || closeReason.includes('Too Many Requests');
        if (isRateLimited) {
          console.warn('[WebSocket] Rate limited (429), backing off aggressively...');
          reconnectAttemptsRef.current = Math.min(reconnectAttemptsRef.current + 1, maxReconnectAttempts);
          const delay = Math.min(30000 * Math.pow(2, reconnectAttemptsRef.current - 1), 300000); // 30s to 5min
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
          return;
        }

        // Check if this is an authentication failure (close code 4000+ typically indicates auth errors)
        // or if the connection closed immediately (likely auth failure during handshake)
        const isAuthFailure = event.code >= 4000 || event.code === 1008 || closeReason.includes('Authentication') || closeReason.includes('Unauthorized') || closeReason.includes('401');

        if (isAuthFailure) {
          console.warn('[WebSocket] Authentication failure detected, attempting token refresh...');

          // Try to refresh the token
          (async () => {
            try {
              const newToken = await refreshAccessToken();
              if (newToken) {
                console.log('[WebSocket] Token refreshed successfully, reconnecting immediately with new token');
                
                // Dispatch event to trigger conversation reload
                window.dispatchEvent(new CustomEvent('token-refreshed-ws', { detail: { token: newToken } }));
                
                // Reset reconnect attempts
                reconnectAttemptsRef.current = 0;
                
                // Immediately reconnect with the returned token (don't wait for state updates)
                setTimeout(() => {
                  console.log('[WebSocket] Attempting immediate reconnection after token refresh');
                  connect(newToken); // Pass the token directly for immediate use
                }, 100);
              } else {
                console.error('[WebSocket] Token refresh returned null, forcing logout...');
                logout();
              }
            } catch (error) {
              console.error('[WebSocket] Token refresh threw error:', error);
              logout();
            }
          })();
          return;
        }

        // Normal disconnection - use exponential backoff reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current - 1), 60000);
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };

      ws.onerror = (event) => {
        if (import.meta.env.DEV) {
          console.warn('[WebSocket] Error event:', event);
        }
        setConnected(false);
        isConnectingRef.current = false;

        // If we get an error before the connection is established,
        // it might be an authentication failure. We'll let onclose handle it.
        console.warn('[WebSocket] Connection error occurred');
      };
    } catch (err) {
      isConnectingRef.current = false;
      // Retry with exponential backoff on connection error
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current - 1), 60000);
        reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
      }
    }
  }, [user, accessToken, refreshAccessToken, logout, getCurrentAccessToken]);

  useEffect(() => {
    const tokenToUse = accessToken || getCurrentAccessToken?.();
    if (!user || !tokenToUse) {
      // Clear WebSocket if user logged out or token missing
      console.log('[WebSocket] User or token cleared, cleaning up connection');
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Ignore errors during WebSocket cleanup
        }
      }
      setConnected(false);
      setSocket(null);
      wsRef.current = null;
      isConnectingRef.current = false;
      reconnectAttemptsRef.current = 0;
      return;
    }

    console.log('[WebSocket] Connecting with user:', user.id);
    connect(tokenToUse);

    return () => {
      console.log('[WebSocket] Cleanup on unmount or dependency change');
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Ignore errors during WebSocket cleanup
        }
      }
      setConnected(false);
      setSocket(null);
      wsRef.current = null;
      isConnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, getCurrentAccessToken, connect]);

  // Reconnect when tab becomes visible again
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !connected && user) {
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [connected, user, connect]);

  // Dispatch engagement-update events for components that listen for them
  useEffect(() => {
    if (latestEngagementUpdate && latestEngagementUpdate.postId && latestEngagementUpdate.counts) {
      console.log('[WebSocket] Dispatching engagement-update event:', latestEngagementUpdate);
      try {
        window.dispatchEvent(new CustomEvent('engagement-update', {
          detail: {
            postId: latestEngagementUpdate.postId,
            engagementType: latestEngagementUpdate.engagementType,
            counts: latestEngagementUpdate.counts
          }
        }));
      } catch (error) {
        console.error('[WebSocket] Error dispatching engagement update event:', error);
      }
    }
  }, [latestEngagementUpdate]);

  return (
    <WebSocketContext.Provider value={{
      socket,
      connected,
      unreadNotificationCount,
      setUnreadNotificationCount,
      resetUnreadNotificationCount,
      latestEngagementUpdate,
      latestPostAction,
      latestBookmarkAction,
      latestFollowAction,
      latestMessageAction,
      latestFeedRefresh,
      latestNotification
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;





