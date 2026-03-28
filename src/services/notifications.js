// Notification API helpers for web
import { getCsrfToken } from './api';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

export async function getNotifications() {
  const res = await fetch(`${API_URL}/notifications`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.success === false) {
    const msg = data?.error?.message || `Failed to load notifications (${res.status})`;
    throw new Error(msg);
  }

  const rows = data?.data?.notifications || data?.notifications || data?.data || [];
  return rows.map((n) => ({
    id: String(n.id),
    type: n.type || 'system',
    message: n.content || n.message || n.title || '',
    createdAt: n.createdAt || n.created_at || n.timestamp,
    postId: n.targetType === 'post' ? n.targetId : (n.post_id || null),
    userId: n.userId || n.user_id || null,
    targetType: n.targetType || n.target_type || null,
    targetId: n.targetId || n.target_id || null,
    actorId: n.actorId || n.actor_id || n.actors?.[0]?.id || null,
    actorName: n.actors?.[0]?.name || null,
    actorUsername: n.actors?.[0]?.username || null,
    actorAvatar: n.actors?.[0]?.avatar || null,
    read: Boolean(n.read ?? n.is_read ?? n.read_at ?? false),
  }));
}

export async function getUnreadNotificationCount() {
  const res = await fetch(`${API_URL}/notifications/count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data?.success === false) {
    return 0; // Fail silently for count
  }
  return data?.data?.unreadCount || 0;
}

export async function markNotificationRead(id) {
  const csrfToken = getCsrfToken();
  const res = await fetch(`${API_URL}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    credentials: 'include',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data?.success === false) {
    const msg = data?.error?.message || `Failed to mark notification read (${res.status})`;
    throw new Error(msg);
  }
  return true;
}

export async function markAllNotificationsRead() {
  const csrfToken = getCsrfToken();
  const res = await fetch(`${API_URL}/notifications/mark-all-read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    credentials: 'include',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data?.success === false) {
    const msg = data?.error?.message || `Failed to mark all notifications read (${res.status})`;
    throw new Error(msg);
  }
  return true;
}
