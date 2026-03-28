/* eslint-disable max-lines, max-lines-per-function, max-statements, complexity, no-shadow, react-hooks/exhaustive-deps, no-param-reassign, react/no-array-index-key, no-negated-condition, prefer-template, react/jsx-no-leaked-render, no-implicit-coercion */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IoArrowBack, IoSendSharp, IoAddCircleOutline, IoSearchOutline, IoTrashOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './Messages.css';
import api, { extractError, getCsrfToken, API_URL, getCloudflareImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useWebSocket } from '../contexts/WebSocketContext';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]); // { file, previewUrl, name }
  const fileInputRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const [convoSearch, setConvoSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { _chatId } = useParams();
  const { t } = useTranslation();
  const { user: _user, isAuthenticated, loading: authLoading, getCurrentUserId } = useAuth();
  const activeIdentity = { type: 'user', id: getCurrentUserId() };
  const toast = useToast();
  const currentUserId = getCurrentUserId() ? String(getCurrentUserId()) : null;

  const resolveIsSentByMe = useCallback((msg) => {
    if (typeof msg.isSenderSelf === 'boolean') {
      return msg.isSenderSelf;
    }

    const senderId = msg.senderId ?? msg.fromUserId;
    const senderType = msg.senderType || 'user';

    const isUserMe = Boolean(currentUserId)
      && (senderType === 'user' || !senderType)
      && String(senderId) === currentUserId;
    const isIdMatch = Boolean(currentUserId) && String(senderId) === currentUserId;
    const isPageMe =
      activeIdentity?.type === 'page' &&
      senderType === 'page' &&
      String(senderId) === String(activeIdentity.id);

    if (senderId != null) {
      return isUserMe || isPageMe || (isIdMatch && senderType !== 'page');
    }

    return msg.from === 'me';
  }, [currentUserId]);

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to load messages: ${response.status}`);
        throw new Error(message);
      }
      const msgs = (data.data?.messages || []).map((m) => {
        let timestamp = '';
        let createdAtMs = 0;
        if (m.created_at && !isNaN(m.created_at)) {
          createdAtMs = m.created_at * 1000;
          const date = new Date(createdAtMs);
          timestamp = !isNaN(date.getTime()) ? date.toLocaleString() : '';
        } else if (m.created_at) {
          createdAtMs = new Date(m.created_at).getTime();
          const date = new Date(createdAtMs);
          timestamp = !isNaN(date.getTime()) ? date.toLocaleString() : '';
        }
        const baseMessage = {
          id: m.id,
          senderId: m.sender_id || m.from_user_id || m.senderId || m.fromUserId,
          senderType: m.sender_type || m.senderType || 'user',
          text: m.content || '',
          media: Array.isArray(m.media_urls) ? m.media_urls : [],
          timestamp,
          createdAtMs,
          isSenderSelf: typeof m.is_sender_self === 'boolean' ? m.is_sender_self : null,
        };

        const isSentByMe = resolveIsSentByMe(baseMessage);
        return {
          ...baseMessage,
          isSentByMe,
          from: isSentByMe ? 'me' : 'them',
        };
      }).sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      setMessages((prev) => {
        const prevMap = new Map(prev.map((p) => [String(p.id), p]));

        return msgs.map((m) => {
          const prevMsg = prevMap.get(String(m.id));
          if (typeof m.isSentByMe === 'boolean') {
            return m;
          }

          const resolvedIsSentByMe = resolveIsSentByMe({ ...m, from: prevMsg?.from });
          return {
            ...m,
            isSentByMe: resolvedIsSentByMe,
            from: resolvedIsSentByMe ? 'me' : 'them',
          };
        });
      });
      setChatSearch('');
    } catch (err) {
      setMessages([]);
    }
  }, [extractError, setMessages, setChatSearch, resolveIsSentByMe]);

  const ensureConversationForTarget = useCallback(async (targetUser, existingConvos) => {
    if (!isAuthenticated || !targetUser?.id) return;

    try {
      // If a conversation with this user already exists, select it.
      const existing = existingConvos.find(
        (c) => String(c.userId) === String(targetUser.id)
      );
      if (existing) {
        setSelectedChat(existing);
        loadMessages(existing.id);
        return;
      }

      // Otherwise, create a new conversation
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          participantIds: [targetUser.id],
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to create conversation: ${response.status}`);
        throw new Error(message);
      }

      const newConvo = {
        id: data.data.conversation.id,
        userId: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.display_name || targetUser.username,
        avatar: targetUser.avatar,
        lastMessage: '',
        timestamp: '',
        unread: false,
      };

      setConversations((prev) => [newConvo, ...prev]);
      setSelectedChat(newConvo);
      loadMessages(newConvo.id);
    } catch (err) {
      // Ignore errors
    }
  }, [getCsrfToken, extractError, setConversations, setSelectedChat, loadMessages]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to load conversations: ${response.status}`);
        throw new Error(message);
      }

      const rawConversations = data.data?.conversations || [];
      const convos = rawConversations.map((c) => {
        // Backend returns participants[] with other users; pick the first as the display user.
        const participant = (c.participants && c.participants[0]) || {};
        const lastMessage = c.last_message || '';
        const lastTimeSeconds = c.last_message_at;
        let timestamp = '';
        if (lastTimeSeconds && !isNaN(lastTimeSeconds)) {
          const date = new Date(lastTimeSeconds * 1000);
          timestamp = !isNaN(date.getTime()) ? date.toLocaleString() : '';
        }
        const unread = (c.unread_count ?? 0) > 0;

        return {
          id: c.id,
          userId: participant.id,
          username: participant.username,
          name: participant.name || participant.username,
          avatar: participant.avatar,
          lastMessage,
          timestamp,
          unread,
        };
      });

      setConversations(convos);

      const targetUser = location.state?.targetUser;
      if (targetUser && !selectedChat) {
        await ensureConversationForTarget(targetUser, convos);
      }
    } catch (err) {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [location.state, selectedChat, ensureConversationForTarget]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);



  // Reload conversations when token is refreshed (fixes stale participant data after 15min)


  useEffect(() => {
    const handleTokenRefresh = () => {
      console.log('[Messages] Token refreshed, reloading conversations...');
      loadConversations();
    };
    window.addEventListener('token-refreshed-ws', handleTokenRefresh);
    return () => window.removeEventListener('token-refreshed-ws', handleTokenRefresh);
  }, [loadConversations]);

  // Clear all chat state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      // Revoke all attachment URLs before clearing
      attachments.forEach(att => {
        if (att?.previewUrl) {
          URL.revokeObjectURL(att.previewUrl);
        }
      });
      setConversations([]);
      setMessages([]);
      setSelectedChat(null);
      setConvoSearch('');
      setChatSearch('');
      setExpandedMessages(new Set());
      setAttachments([]);
      setMessage('');
      setLoading(false);
    }
  }, [isAuthenticated, attachments]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setChatSearch('');
      return;
    }

    loadMessages(selectedChat.id);
  }, [selectedChat, loadMessages]);

  // Handle real-time messages from WebSocket
  const { latestMessageAction } = useWebSocket();
  
  useEffect(() => {
    if (!latestMessageAction) return;
    
    const { action, message, conversationId } = latestMessageAction;
    
    if (action !== 'sent' || !message) return;
    
    if (process.env.NODE_ENV === 'development') console.log('[Messages] Received real-time message:', { conversationId, message });
    
    // Update conversation list with last message
    setConversations((prev) => prev.map((conv) => {
      if (String(conv.id) !== String(conversationId)) return conv;
      return {
        ...conv,
        lastMessage: message.text || message.content || 'New message',
        timestamp: message.time ? new Date(message.time).toLocaleString() : new Date().toLocaleString(),
      };
    }));
    
    // If this message is for the currently selected chat, add it to the messages list
    if (!selectedChat || String(selectedChat.id) !== String(conversationId)) {
      return;
    }
    
    setMessages((prev) => {
      const exists = prev.some((m) => String(m.id) === String(message.id));
      if (exists) return prev;
      
      const senderId = message.senderId || message.sender_id || message.fromUserId || message.from_user_id;
      const senderType = message.senderType || message.sender_type || 'user';
      const isSenderSelf = typeof message.isSenderSelf === 'boolean'
        ? message.isSenderSelf
        : (typeof message.is_sender_self === 'boolean' ? message.is_sender_self : null);
      const isSentByMe = resolveIsSentByMe({
        senderId,
        senderType,
        isSenderSelf,
      });
      
      if (process.env.NODE_ENV === 'development') console.log('[Messages] Adding message to chat:', { senderId, text: message.text, isSentByMe });
      
      return [
        ...prev,
        {
          id: message.id || `${conversationId}-${Date.now()}`,
          conversationId,
          senderId,
          senderType,
          text: message.text || message.content || '',
          content: message.content || message.text || '',
          time: message.time || new Date().toISOString(),
          isSentByMe,
          attachments: message.attachments || [],
          media: message.media || [],
        }
      ];
    });
  }, [latestMessageAction, selectedChat, resolveIsSentByMe]);

  useEffect(() => {
    const handleMessageAction = (event) => {
      const detail = event?.detail || {};
      const message = detail.message || {};
      const conversationId = detail.conversationId || message.conversationId;
      if (!conversationId) return;

      setConversations((prev) => prev.map((conv) => {
        if (String(conv.id) !== String(conversationId)) return conv;
        return {
          ...conv,
          lastMessage: message.text || message.content || conv.lastMessage || 'New message',
          timestamp: message.time ? new Date(message.time).toLocaleString() : conv.timestamp,
        };
      }));

      if (!selectedChat || String(selectedChat.id) !== String(conversationId)) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some((m) => String(m.id) === String(message.id));
        if (exists) return prev;

        const senderId = message.senderId || message.sender_id || message.fromUserId || message.from_user_id;
        const senderType = message.senderType || message.sender_type || 'user';
        const isSenderSelf = typeof message.isSenderSelf === 'boolean'
          ? message.isSenderSelf
          : (typeof message.is_sender_self === 'boolean' ? message.is_sender_self : null);
        const isSentByMe = resolveIsSentByMe({
          senderId,
          senderType,
          isSenderSelf,
        });

        const createdAtMs = message.time ? new Date(message.time).getTime() : Date.now();
        const timestamp = message.time
          ? new Date(message.time).toLocaleString()
          : new Date().toLocaleString();

        return [
          ...prev,
          {
            id: message.id || `${conversationId}-${Date.now()}`,
            senderId,
            senderType,
            text: message.text || message.content || '',
            media: Array.isArray(message.mediaUrls) ? message.mediaUrls : [],
            timestamp,
            createdAtMs,
            isSenderSelf: typeof isSenderSelf === 'boolean' ? isSenderSelf : null,
            isSentByMe,
            from: isSentByMe ? 'me' : 'them',
          },
        ].sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      });
    };

    window.addEventListener('message-action', handleMessageAction);
    return () => window.removeEventListener('message-action', handleMessageAction);
  }, [selectedChat, currentUserId, resolveIsSentByMe]);

  const scrollChatToBottom = useCallback(() => {
    const el = chatMessagesRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 0);
    });
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    if (chatSearch.trim()) return;
    scrollChatToBottom();
  }, [messages.length, selectedChat, chatSearch, scrollChatToBottom]);

  // Cleanup: Revoke attachment object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      attachments.forEach(att => {
        if (att?.previewUrl) {
          URL.revokeObjectURL(att.previewUrl);
        }
      });
    };
  }, [attachments]);

  // Don't render anything while auth is loading
  if (authLoading) {
    return null;
  }

  const MAX_MESSAGE_WORDS = 300;

  const getTruncatedMessage = (text, id) => {
    if (!text) return '';
    const words = text.split(/\s+/);
    if (words.length <= MAX_MESSAGE_WORDS || expandedMessages.has(id)) {
      return text;
    }
    return words.slice(0, MAX_MESSAGE_WORDS).join(' ') + '...';
  };

  const toggleExpandedMessage = (id) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text && attachments.length === 0) return;
    if (!selectedChat) return;

    setMessage('');

    try {
      const actorType = 'user';
      const actorId = getCurrentUserId();

      // Upload image attachments (images only for now)
      const uploadedMedia = [];

      // Process uploads in parallel instead of sequentially
      const uploadPromises = attachments.map(async (item) => {
        try {
          // Use the correct /media/* endpoint via api method
          const uploadUrlData = await api.getImageUploadURL();
          if (!uploadUrlData || !uploadUrlData.uploadURL) {
            return null;
          }

          const { uploadURL, id, deliveryUrl } = uploadUrlData;
          const formData = new FormData();
          formData.append('file', item.file);

          const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            return null;
          }

          let uploadResult = null;
          try {
            uploadResult = await uploadResponse.json();
          } catch {
            uploadResult = null;
          }
          const finalUrl =
            uploadResult?.result?.url ||
            uploadResult?.result?.variants?.[0] ||
            deliveryUrl ||
            getCloudflareImageUrl(id);

          return {
            type: 'image',
            url: finalUrl,
            name: item.name,
            cloudflareId: id,
          };
        } catch (uploadError) {
          return null;
        }
      });

      const uploadResults = await Promise.all(uploadPromises);
      uploadedMedia.push(...uploadResults.filter(result => result !== null));

      // Extract Cloudflare IDs for cleanup on deletion
      const cloudflareImageIds = uploadedMedia
        .filter(media => media.type === 'image' && media.cloudflareId)
        .map(media => media.cloudflareId);
      
      const cloudflareVideoIds = uploadedMedia
        .filter(media => media.type === 'video' && media.cloudflareId)
        .map(media => media.cloudflareId);

      // Clean up mediaUrls to only include url and type
      const cleanedMediaUrls = uploadedMedia.map(media => ({
        url: media.url,
        type: media.type,
      }));

      const payload = {
        content: text,
        actorType,
        actorId,
        mediaUrls: cleanedMediaUrls.length > 0 ? cleanedMediaUrls : null,
        ...(cloudflareImageIds.length > 0 ? { cloudflareImageIds } : {}),
        ...(cloudflareVideoIds.length > 0 ? { cloudflareVideoIds } : {}),
      };

      const csrfTokenForMsg = getCsrfToken();
      const response = await fetch(`${API_URL}/conversations/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfTokenForMsg ? { 'X-CSRF-Token': csrfTokenForMsg } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to send message: ${response.status}`);
        throw new Error(message);
      }
      const m = data.data?.message;
      if (m) {
        const isSenderSelf = typeof m.is_sender_self === 'boolean' ? m.is_sender_self : null;
        const createdAtMs = m.created_at && !isNaN(m.created_at)
          ? m.created_at * 1000
          : Date.now();
        const senderId = m.sender_id || m.from_user_id || m.senderId || m.fromUserId;
        const senderType = m.sender_type || m.senderType || 'user';
        const isSentByMe = resolveIsSentByMe({
          senderId,
          senderType,
          isSenderSelf,
        });
        setMessages(prev => [
          ...prev,
          {
            id: m.id,
            senderId,
            senderType,
            text: m.content || '',
            media: Array.isArray(m.media_urls) ? m.media_urls : uploadedMedia,
            timestamp: m.created_at && !isNaN(m.created_at)
              ? new Date(m.created_at * 1000).toLocaleString()
              : new Date().toLocaleString(),
            createdAtMs,
            isSenderSelf,
            isSentByMe,
            from: isSentByMe ? 'me' : 'them',
          },
        ].sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)));
      }
      // Clear attachments after successful send (revoke URLs first)
      setAttachments(prev => {
        prev.forEach(att => {
          if (att?.previewUrl) {
            URL.revokeObjectURL(att.previewUrl);
          }
        });
        return [];
      });
    } catch (err) {
      // Ignore message sending errors
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedChat) return;

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/conversations/${selectedChat.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to delete conversation: ${response.status}`);
        throw new Error(message);
      }

      setConversations(prev => prev.filter(c => c.id !== selectedChat.id));
      setSelectedChat(null);
      setMessages([]);
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete conversation');
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!id) return;

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/messages/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to delete message: ${response.status}`);
        throw new Error(message);
      }

      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete message');
    }
  };

  const pinnedConversations = conversations.filter(c => c.pinned);
  const regularConversations = conversations.filter(c => !c.pinned);

  const matchConvo = (convo) => {
    if (!convoSearch.trim()) return true;
    const q = convoSearch.toLowerCase();
    return (
      convo.name.toLowerCase().includes(q) ||
      (convo.lastMessage || '').toLowerCase().includes(q)
    );
  };

  const filteredPinned = pinnedConversations.filter(matchConvo);
  const filteredRegular = regularConversations.filter(matchConvo);

  if (loading) {
    return (
      <div className="messages-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Message View (Individual Chat)
  if (selectedChat) {
    const filteredMessages = chatSearch.trim()
      ? messages.filter(m => m.text?.toLowerCase().includes(chatSearch.toLowerCase()))
      : messages;

    return (
      <div className="messages-container">
        <div className="chat-header">
          <button className="back-btn" onClick={() => setSelectedChat(null)}>
            <IoArrowBack />
          </button>
          {selectedChat?.avatar ? (
            <img src={selectedChat.avatar} alt={selectedChat?.name || ''} className="chat-avatar" />
          ) : (
            <img src={AvatarPlaceholder} alt="Default avatar" className="chat-avatar" />
          )}
          <h3>{selectedChat?.name || 'Unknown'}</h3>
          <button className="menu-btn" onClick={handleDeleteConversation}>
            <IoTrashOutline />
          </button>
        </div>

        <div className="chat-messages" ref={chatMessagesRef}>
            {filteredMessages.map((msg) => {
            const isSystem = msg.senderType === 'system';
            const isSentByMe = typeof msg.isSentByMe === 'boolean'
              ? msg.isSentByMe
              : resolveIsSentByMe(msg);

            if (isSystem) {
              return (
                <div key={msg.id} className="message system">
                  <div className="message-bubble">
                    <p>{getTruncatedMessage(msg.text, msg.id)}</p>
                    <span className="message-time">{msg.timestamp}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`message ${isSentByMe ? 'sent' : 'received'}`}
              >
                {!isSentByMe && (
                  selectedChat?.avatar ? (
                    <img
                      src={selectedChat.avatar}
                      alt=""
                      className="message-avatar"
                    />
                  ) : (
                    <img
                      src={AvatarPlaceholder}
                      alt="Default avatar"
                      className="message-avatar"
                    />
                  )
                )}
                <div className="message-bubble">
                  {Boolean(msg.text) && (
                    <p>
                      {getTruncatedMessage(msg.text, msg.id)}
                      {msg.text.split(/\s+/).length > MAX_MESSAGE_WORDS && (
                        <button
                          className="read-more-inline"
                          onClick={() => toggleExpandedMessage(msg.id)}
                        >
                          {expandedMessages.has(msg.id)
                            ? 'Show less'
                            : 'Read more'}
                        </button>
                      )}
                    </p>
                  )}

                  {Array.isArray(msg.media) && msg.media.length > 0 && (
                    <div className="message-media">
                      {msg.media
                        .filter((mItem) => mItem && mItem.type === 'image')
                        .map((mItem, index) => (
                          <img
                            key={index}
                            src={mItem.url}
                            alt={mItem.name || 'Attachment'}
                            className="message-image"
                          />
                        ))}
                    </div>
                  )}

                  <span className="message-time">{msg.timestamp}</span>
                </div>
                {isSentByMe && (
                  <>
                    <button
                      className="message-delete"
                      onClick={() => handleDeleteMessage(msg.id)}
                      aria-label="Delete message"
                    >
                      <IoTrashOutline />
                    </button>
                    <img
                      src={AvatarPlaceholder}
                      alt="You"
                      className="message-avatar self-avatar"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending image attachments preview */}
        {attachments.length > 0 && (
          <div className="chat-attachments">
            {attachments.map((att, index) => (
              <div key={index} className="chat-attachment">
                <img
                  src={att.previewUrl}
                  alt={att.name || 'Attachment'}
                  className="chat-attachment-image"
                />
                <button
                  type="button"
                  className="chat-attachment-remove"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== index))
                  }
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="chat-input">
          <input
            id="chat-message"
            name="message"
            type="text"
            placeholder="Type your Message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            className="add-btn"
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <IoAddCircleOutline />
          </button>
          <button className="send-btn" onClick={handleSendMessage}>
            <IoSendSharp />
          </button>
        </div>

        {/* Hidden file input for message image attachments */}
        <input
          id="message-attachment"
          name="messageAttachment"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const next = files.map((file, index) => ({
              file,
              previewUrl: URL.createObjectURL(file),
              name: file.name || `Image ${attachments.length + index + 1}`,
            }));
            setAttachments((prev) => [...prev, ...next]);
            if (e.target) e.target.value = '';
          }}
        />
      </div>
    );
  }

  // Messages List
  if (conversations.length === 0) {
    return (
      <div className="messages-container">
        <div className="messages-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <h2>{t('messages.title').toUpperCase()}</h2>
          <div style={{ width: 40 }} />
        </div>
        <div className="empty-state">
<h3>{t('empty.nothingToShow')}</h3>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="messages-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div className="messages-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>{t('messages.title').toUpperCase()}</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="messages-search">
        <input
          id="messages-search"
          name="convoSearch"
          type="text"
          placeholder="Who do you want to chat with?"
          value={convoSearch}
          onChange={(e) => setConvoSearch(e.target.value)}
        />
        <IoSearchOutline className="search-icon" />
      </div>

      {filteredPinned.length > 0 && (
        <div className="pinned-section">
          <h4>PINNED</h4>
          <div className="pinned-users">
            {filteredPinned.map((convo) => (
              <div key={convo.id} className="pinned-user" onClick={() => setSelectedChat(convo)}>
                {convo.avatar ? (
                  <img src={convo.avatar} alt={convo.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {(convo.name || 'C')[0].toUpperCase()}
                  </div>
                )}
                <span>{convo.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="conversations-list">
        {filteredRegular.map((convo) => (
          <div 
            key={convo.id} 
            className="conversation-item"
            onClick={() => setSelectedChat(convo)}
          >
            {convo.avatar ? (
              <img
                src={convo.avatar}
                alt={convo.name}
                className="conversation-avatar"
              />
            ) : (
              <div className="conversation-avatar initials-avatar">
                {(convo.name || 'C')[0].toUpperCase()}
              </div>
            )}
            <div className="conversation-info">
              <div className="conversation-header">
                <span className="conversation-name">{convo.name}</span>
                <span className="conversation-time">{convo.timestamp}</span>
              </div>
              <p className="conversation-preview">{convo.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Messages;





