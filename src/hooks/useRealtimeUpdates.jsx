import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Unified WebSocket hook for all real-time updates (Web)
 * Handles: posts, comments, likes, bookmarks, shares, reels, stories, follows, etc.
 */
export const useRealtimeUpdates = (userId, callbacks = {}) => {
  const { getCurrentAccessToken } = useAuth();
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const isConnectingRef = useRef(false);
  const connectTimeoutRef = useRef(null);
  const pendingCloseRef = useRef(false);

  const handleMessage = useCallback((data) => {
    const { type, action } = data;

    switch (type) {
      case 'post_action':
        if (callbacks.onPostAction) {
          callbacks.onPostAction(action, data.post);
        }
        break;

      case 'comment_action':
        if (callbacks.onCommentAction) {
          callbacks.onCommentAction(action, data.comment, data.postOwnerId);
        }
        break;

      case 'like_action':
        if (callbacks.onLikeAction) {
          callbacks.onLikeAction(action, data.like, data.contentOwnerId);
        }
        break;

      case 'bookmark_action':
        if (callbacks.onBookmarkAction) {
          callbacks.onBookmarkAction(action, data.bookmark);
        }
        break;

      case 'share_action':
        if (callbacks.onShareAction) {
          callbacks.onShareAction(action, data.share, data.postOwnerId);
        }
        break;

      case 'reel_action':
        if (callbacks.onReelAction) {
          callbacks.onReelAction(action, data.reel, data.reelOwnerId);
        }
        break;

      case 'story_action':
        if (callbacks.onStoryAction) {
          callbacks.onStoryAction(action, data.story, data.storyOwnerId);
        }
        break;

      case 'follow_action':
        if (callbacks.onFollowAction) {
          callbacks.onFollowAction(action, data.follow);
        }
        break;

      case 'profile_update':
        if (callbacks.onProfileUpdate) {
          callbacks.onProfileUpdate(data.userId, data.updatedFields);
        }
        break;

      case 'message_action':
        if (callbacks.onMessageAction) {
          callbacks.onMessageAction(action, data.message, data.conversationId || data.message?.conversationId);
        }
        window.dispatchEvent(new CustomEvent('message-action', {
          detail: {
            action,
            message: data.message,
            conversationId: data.conversationId || data.message?.conversationId,
          }
        }));
        break;

      case 'feed_refresh':
        if (callbacks.onFeedRefresh) {
          callbacks.onFeedRefresh(data.feedType);
        }
        break;

      case 'notification':
        if (callbacks.onNotification) {
          callbacks.onNotification(data);
        }
        break;

      case 'engagement_update':
        // Real-time engagement count updates for posts in feed
        if (callbacks.onEngagementUpdate) {
          callbacks.onEngagementUpdate(data.postId, data.engagementType, data.counts);
        }
        break;

      default:
        if (callbacks.onUnknown) {
          callbacks.onUnknown(data);
        }
    }
  }, [callbacks]);

  const connect = useCallback(() => {
    if (!userId || isConnectingRef.current) return;

    // Don't connect if already connected or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnectingRef.current = true;

    try {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }

      // Get the access token for authentication
      const token = getCurrentAccessToken();
      if (!token) {
        console.warn('[WebSocket] No access token available for WebSocket connection');
        isConnectingRef.current = false;
        return;
      }

      // Use explicit WebSocket URL for both production and development
      const wsUrl = import.meta.env.PROD
        ? `wss://xora-workers-api-production.xorasocial.workers.dev/notifications/stream?userId=${encodeURIComponent(userId)}`
        : `ws://127.0.0.1:8787/notifications/stream?userId=${encodeURIComponent(userId)}`;

      // Create WebSocket with token via Sec-WebSocket-Protocol header (same as mobile)
      const ws = new WebSocket(wsUrl, ['bearer', token]);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
          if (wsRef.current !== ws) {
            try { ws.close(1000, 'Stale'); } catch { /* ignore */ }
            return;
          }
          if (pendingCloseRef.current) {
            pendingCloseRef.current = false;
            try { ws.close(1000, 'Cancelled'); } catch { /* ignore */ }
            return;
          }
        // Connected
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;

        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
        });

        ws.addEventListener('message', (event) => {
          if (wsRef.current !== ws) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            return; // Ignore pong responses
          }

          // Received data
          handleMessage(data);
        } catch (error) {
      // Ignore errors
    }
        });

        ws.addEventListener('close', () => {
          if (wsRef.current !== ws) return;
        // Disconnected
        setIsConnected(false);
        isConnectingRef.current = false;
        clearInterval(pingIntervalRef.current);
        // Don't call attemptReconnect directly to avoid circular dependency
        setTimeout(() => {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = 5000 * Math.pow(2, reconnectAttemptsRef.current - 1);
            setTimeout(() => connect(), delay);
          } else {
            // Start fallback polling
            if (!pollingIntervalRef.current && callbacks.onFeedRefresh) {
              pollingIntervalRef.current = setInterval(() => {
                try {
                  callbacks.onFeedRefresh('realtime_fallback');
                } catch (e) {
                  // Ignore callback errors
                }
              }, 30000);
            }
          }
        }, 100);
        });

        ws.addEventListener('error', (_error) => {
        if (wsRef.current !== ws) return;
        setIsConnected(false);
        isConnectingRef.current = false;
        });
      }, 0);
    } catch (error) {
      isConnectingRef.current = false;
      setTimeout(() => {
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = 5000 * Math.pow(2, reconnectAttemptsRef.current - 1);
          setTimeout(() => connect(), delay);
        } else {
          // Start fallback polling
          if (!pollingIntervalRef.current && callbacks.onFeedRefresh) {
            pollingIntervalRef.current = setInterval(() => {
              try {
                callbacks.onFeedRefresh('realtime_fallback');
              } catch (e) {
                // Ignore errors in fallback polling
              }
            }, 30000);
          }
        }
      }, 100);
    }
  }, [userId, handleMessage, callbacks]);

  useEffect(() => {
    if (!userId) return;

    connect();

    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.CONNECTING) {
          pendingCloseRef.current = true;
        } else {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
      clearInterval(pingIntervalRef.current);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      isConnectingRef.current = false;
    };
    // Note: 'connect' is intentionally omitted to prevent reconnection loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reconnect when tab becomes visible again
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !isConnected && userId) {
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isConnected, userId, connect]);

  return { isConnected };
};





