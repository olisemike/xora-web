// API base URL for real backend
// Use VITE_API_URL if set, otherwise fallback to proxy in dev, direct in prod
import { toCount } from '../utils/engagement';

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api');

// Enforce HTTPS in production
if (import.meta.env.PROD && !API_URL.startsWith('https://')) {
  throw new Error('CRITICAL SECURITY ERROR: HTTPS is required in production. Set VITE_API_URL to an https:// URL.');
}

// Cloudflare media delivery configuration
export const CLOUDFLARE_IMAGES_HASH = import.meta.env.VITE_CLOUDFLARE_IMAGES_HASH || '1eL4FEtJQavAd5JjFtJe7Q';
export const CLOUDFLARE_IMAGES_DELIVERY_URL = import.meta.env.VITE_CLOUDFLARE_IMAGES_DELIVERY_URL || '';
export const CLOUDFLARE_STREAM_SUBDOMAIN = import.meta.env.VITE_CLOUDFLARE_STREAM_SUBDOMAIN || 'customer-virwr1ukt49zj3yu.cloudflarestream.com';

// Helper to build Cloudflare image URL
export const getCloudflareImageUrl = (id, variant = 'public') => {
  const base = CLOUDFLARE_IMAGES_DELIVERY_URL
    ? CLOUDFLARE_IMAGES_DELIVERY_URL.replace(/\/$/, '')
    : `https://imagedelivery.net/${CLOUDFLARE_IMAGES_HASH}`;
  return `${base}/${id}/${variant}`;
};

// Helper to build Cloudflare video URL
export const getCloudflareVideoUrl = (id) =>
  `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${id}/manifest/video.m3u8`;

export const getCloudflareVideoThumbnailUrl = (id) =>
  `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${id}/thumbnails/thumbnail.jpg`;

const inferMediaTypeFromUrl = (url) => {
  if (!url) return null;
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.m3u8') || clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov')) {
    return 'video';
  }
  if (clean.endsWith('.gif')) return 'gif';
  if (clean.endsWith('.mp3') || clean.endsWith('.wav') || clean.endsWith('.aac')) return 'audio';
  return 'image';
};

const getCloudflareStreamId = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/cloudflarestream\.com\/([^/]+)\/(manifest|thumbnails)|videodelivery\.net\/([^/]+)\//i);
  return match?.[1] || match?.[3] || null;
};

const resolveMediaUrl = (item) => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return null;

  const direct =
    item.url ||
    item.uri ||
    item.image_url ||
    item.media_url ||
    item.mediaUrl ||
    item.video_url ||
    item.videoUrl ||
    item.playbackUrl ||
    item.playback_url ||
    item.deliveryUrl ||
    item.delivery_url ||
    null;
  if (direct) return direct;

  const imageId = item.cloudflareId || item.imageId || item.cloudflareImageId;
  if (imageId) return getCloudflareImageUrl(imageId);

  const videoId = item.videoId || item.cloudflareVideoId || item.cloudflareStreamId;
  if (videoId) return getCloudflareVideoUrl(videoId);

  return null;
};

const resolveMediaThumbnail = (item, resolvedUrl = null) => {
  if (!item || typeof item !== 'object') return null;

  const direct =
    item.thumbnail ||
    item.poster ||
    item.thumbnailUrl ||
    item.thumbnail_url ||
    item.thumbnailUri ||
    item.posterUrl ||
    item.poster_url ||
    item.previewImage ||
    item.preview_image ||
    null;

  if (direct) return direct;

  const videoId = item.videoId || item.cloudflareVideoId || item.cloudflareStreamId || getCloudflareStreamId(resolvedUrl);
  if (videoId) return getCloudflareVideoThumbnailUrl(videoId);

  return null;
};

const normalizeMediaItem = (item) => {
  const url = resolveMediaUrl(item);
  if (!url) return null;

  const type =
    item?.type ||
    item?.media_type ||
    item?.mediaType ||
    (item?.videoId || item?.cloudflareVideoId || item?.cloudflareStreamId ? 'video' : null) ||
    inferMediaTypeFromUrl(url) ||
    'image';

  const thumbnail = resolveMediaThumbnail(item, url);

  return {
    ...(typeof item === 'object' ? item : { value: item }),
    url,
    type,
    thumbnail,
    poster: thumbnail,
  };
};

const normalizeMediaArray = (mediaArray) =>
  (Array.isArray(mediaArray) ? mediaArray : mediaArray ? [mediaArray] : [])
    .map((item) => normalizeMediaItem(item))
    .filter(Boolean);

const parseMaybeJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};


// Get CSRF token from localStorage (set by AuthContext) or cookies
export const getCsrfToken = () => {
  // First try localStorage
  const stored = localStorage.getItem('xora_csrf_token');
  if (stored) {
    return stored;
  }
  
  // Fallback to cookies (though HttpOnly prevents reading)
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return value;
    }
  }
  return null;
};

// Normalize error shape from backend errorResponse({ message, code, details })
export const extractError = (data, status, fallback) => {
  if (!data) {
    return fallback || `Request failed (${status})`;
  }

  if (typeof data.error === 'string') {
    return data.error;
  }

  if (data.error && typeof data.error.message === 'string') {
    return data.error.message;
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  return fallback || `Request failed (${status})`;
};

// Centralized JSON fetch with 401 refresh+retry
const requestJson = async (method, endpoint, { headers = {}, body, tokenAware = false } = {}) => {
  const url = `${API_URL}${endpoint}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  };

  // Add CSRF token for state-changing requests
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (stateChangingMethods.includes(method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      opts.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(url, opts);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401 && tokenAware && headers?.Authorization) {
    // For web clients, refresh token is in cookies, so don't pass it in body
    // eslint-disable-next-line no-use-before-define
    const newAccess = await api.refreshToken();
    if (newAccess) {
      const retried = await fetch(url, {
        ...opts,
        headers: { ...opts.headers, Authorization: `Bearer ${newAccess}` },
      });
      let retriedData = null;
      try {
        retriedData = await retried.json();
      } catch {
        retriedData = null;
      }
      if (!retried.ok) {
        const message = extractError(retriedData, retried.status, 'Request failed');
        throw new Error(message);
      }
      return { data: retriedData?.data ?? retriedData };
    }

    // Refresh failed - force complete logout
    console.error('[API] Token refresh failed, forcing logout');
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const message = extractError(data, response.status, 'Request failed');
    throw new Error(message);
  }
  return { data: data?.data ?? data };
};

const normalizeEpochMs = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === 'string' && value.trim()) {
    const directParsed = Date.parse(value);
    if (!Number.isNaN(directParsed)) {
      return directParsed;
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue > 1e12 ? numericValue : numericValue * 1000;
    }
  }

  return null;
};

const parseCreatedAtMs = (value, fallbackMs = Date.now()) => {
  const parsed = normalizeEpochMs(value);
  if (parsed !== null) {
    return parsed;
  }

  const fallbackParsed = normalizeEpochMs(fallbackMs);
  return fallbackParsed !== null ? fallbackParsed : Date.now();
};

const safeToIsoString = (value, fallbackMs = Date.now()) => {
  const parsed = normalizeEpochMs(value);
  if (parsed !== null) {
    const parsedDate = new Date(parsed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  const fallbackParsed = normalizeEpochMs(fallbackMs);
  const fallbackDate = new Date(fallbackParsed !== null ? fallbackParsed : Date.now());
  return !Number.isNaN(fallbackDate.getTime())
    ? fallbackDate.toISOString()
    : new Date().toISOString();
};
// Helper to normalize backend posts into the shape expected by the UI
const normalizePost = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;

  if (raw.isAd || raw.is_ad || raw.type === 'AD' || raw.adType || raw.ad_type) {
    const sdkConfigRaw = raw.sdkConfig || raw.sdk_config || null;
    let sdkConfig = sdkConfigRaw;
    if (typeof sdkConfigRaw === 'string') {
      try {
        sdkConfig = JSON.parse(sdkConfigRaw);
      } catch {
        sdkConfig = null;
      }
    }

    return {
      ...raw,
      isAd: true,
      adType: raw.adType || raw.ad_type || raw.type || 'AD',
      sdkProvider: raw.sdkProvider || raw.sdk_provider || null,
      sdkAdUnitId: raw.sdkAdUnitId || raw.sdk_ad_unit_id || null,
      sdkConfig,
      mediaUrl: raw.mediaUrl || raw.media_url || raw.contentUrl || raw.content_url || raw.thumbnailUrl || raw.thumbnail_url || null,
      clickUrl: raw.clickUrl || raw.click_url || raw.ctaUrl || raw.cta_url || raw.url || null,
      ctaText: raw.ctaText || raw.cta_text || null,
    };
  }

  let mediaArray = [];
  if (Array.isArray(raw.media_urls)) {
    mediaArray = raw.media_urls;
  } else if (typeof raw.media_urls === 'string') {
    try {
      mediaArray = JSON.parse(raw.media_urls);
    } catch {
      mediaArray = [];
    }
  } else if (Array.isArray(raw.media)) {
    mediaArray = raw.media;
  }

  if (mediaArray.length === 0) {
    const cloudflareImageIds = parseMaybeJsonArray(raw.cloudflare_image_ids || raw.cloudflareImageIds);
    const cloudflareVideoIds = parseMaybeJsonArray(raw.cloudflare_video_ids || raw.cloudflareVideoIds);
    mediaArray = [
      ...cloudflareImageIds.map((id) => ({ cloudflareId: id, type: 'image' })),
      ...cloudflareVideoIds.map((id) => ({ cloudflareVideoId: id, type: 'video' })),
    ];
  }

  const normalizedMedia = normalizeMediaArray(mediaArray);
  const firstImage = normalizedMedia.find((m) => m && m.type === 'image') || normalizedMedia[0];

  const createdAtMs = parseCreatedAtMs(raw.created_at, raw.createdAt ? raw.createdAt * 1000 : Date.now());

  const user = {
    id: raw.actor_id || raw.user_id || raw.userId,
    name: raw.actor_name || raw.name || raw.username || raw.actor_username || 'User',
    username: raw.actor_username || raw.username || undefined,
    avatar: raw.avatar_url || raw.avatar || null,
  };

  const basePost = {
    ...raw,
    user,
    content: raw.content,
    media: normalizedMedia,
    image: firstImage && firstImage.url ? firstImage.url : raw.image || null,
    likes: toCount(raw.likesCount ?? raw.likes_count ?? raw.likes ?? 0),
    comments: toCount(raw.commentsCount ?? raw.comments_count ?? raw.comments ?? 0),
    shares: toCount(raw.sharesCount ?? raw.shares_count ?? raw.shares ?? 0),
    isLiked: Boolean(raw.isLiked ?? raw.liked_by_me ?? raw.is_liked ?? false),
    isBookmarked: Boolean(raw.isBookmarked ?? raw.bookmarked_by_me ?? raw.is_bookmarked ?? false),
    createdAt: createdAtMs,
    timestamp: safeToIsoString(raw.timestamp, createdAtMs),
  };

  // Handle shared posts from backend (isShare + originalPost â†’ sharedBy + original)
  if (raw.isShare === true && raw.originalPost) {
    basePost.sharedBy = {
      id: raw.actor_id,
      name: raw.actor_name || raw.username || raw.actor_username || 'Unknown',
      username: raw.actor_username || raw.username || 'unknown',
      avatar: raw.avatar_url || null,
    };

    // Normalize the original post
    let origMediaArray = [];
    if (Array.isArray(raw.originalPost.media_urls)) {
      origMediaArray = raw.originalPost.media_urls;
    } else if (typeof raw.originalPost.media_urls === 'string') {
      try {
        origMediaArray = JSON.parse(raw.originalPost.media_urls);
      } catch {
        origMediaArray = [];
      }
    } else if (Array.isArray(raw.originalPost.media)) {
      origMediaArray = raw.originalPost.media;
    }

    if (origMediaArray.length === 0) {
      const cloudflareImageIds = parseMaybeJsonArray(
        raw.originalPost.cloudflare_image_ids || raw.originalPost.cloudflareImageIds
      );
      const cloudflareVideoIds = parseMaybeJsonArray(
        raw.originalPost.cloudflare_video_ids || raw.originalPost.cloudflareVideoIds
      );
      origMediaArray = [
        ...cloudflareImageIds.map((id) => ({ cloudflareId: id, type: 'image' })),
        ...cloudflareVideoIds.map((id) => ({ cloudflareVideoId: id, type: 'video' })),
      ];
    }
    const normalizedOrigMedia = normalizeMediaArray(origMediaArray);
    const origFirstImage = normalizedOrigMedia.find((m) => m && m.type === 'image') || normalizedOrigMedia[0];
    const origCreatedAtMs = parseCreatedAtMs(raw.originalPost.created_at, Date.now());

    basePost.original = {
      id: String(raw.originalPost.id),
      content: raw.originalPost.content || '',
      media: normalizedOrigMedia,
      image: origFirstImage && origFirstImage.url ? origFirstImage.url : null,
      likes: raw.originalPost.likesCount ?? raw.originalPost.likes_count ?? raw.originalPost.likes ?? 0,
      comments: raw.originalPost.commentsCount ?? raw.originalPost.comments_count ?? raw.originalPost.comments ?? 0,
      shares: raw.originalPost.sharesCount ?? raw.originalPost.shares_count ?? raw.originalPost.shares ?? 0,
      isLiked: Boolean(raw.originalPost.isLiked ?? raw.originalPost.liked_by_me ?? raw.originalPost.is_liked ?? false),
      isBookmarked: Boolean(raw.originalPost.isBookmarked ?? raw.originalPost.bookmarked_by_me ?? raw.originalPost.is_bookmarked ?? false),
      user: {
        id: raw.originalPost.actor_id,
        name: raw.originalPost.actor_name || raw.originalPost.username || raw.originalPost.actor_username || 'Unknown',
        username: raw.originalPost.actor_username || raw.originalPost.username || 'unknown',
        avatar: raw.originalPost.avatar_url || null,
      },
      createdAt: origCreatedAtMs,
      timestamp: safeToIsoString(raw.originalPost.timestamp, origCreatedAtMs),
    };
  }

  return basePost;
};

export const api = {
  // Token is now stored in httpOnly cookies by the backend
  // No need to manually manage it here
  onUnauthorized: null,
  isRefreshing: false,
  refreshPromise: null,

  setToken(_token) {
    // Token management is now handled by backend via httpOnly cookies
    // No need to store in memory or localStorage
    // This is kept for API compatibility but does nothing
    console.log('[API] setToken called - token is now managed via httpOnly cookies');
  },

  setOnUnauthorized(handler) {
    this.onUnauthorized = handler;
  },

  // Token refresh - simply calls the refresh endpoint with credentials
  refreshToken() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const nextRefreshPromise = (async () => {
      if (this.isRefreshing) {
        return null; // Refresh is in progress, return null
      }

      try {
        this.isRefreshing = true;
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Send httpOnly cookies
          body: JSON.stringify({}),
        });

        let data = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (response.ok) {
          // Extract access token from response for retry
          const accessToken = data?.data?.tokens?.accessToken || data?.data?.accessToken || data?.tokens?.accessToken || data?.accessToken;
          
          // New tokens are now in httpOnly cookies
          window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { refreshed: true } }));
          
          // Return the access token so API retry can use it
          return accessToken || null;
        }

        if (response.status === 401) {
          console.warn('[API] Refresh token expired, forcing logout...');
          try {
            localStorage.removeItem('xora_user');
            localStorage.removeItem('xora_csrf_token');
            window.dispatchEvent(new Event('auth-logout'));
          } catch {
            // Ignore storage errors
          }
          if (this.onUnauthorized) this.onUnauthorized();
          return null;
        }

        console.warn('[API] Token refresh failed with status:', response.status);
        return null;
      } catch (error) {
        console.warn('[API] Token refresh exception:', error?.message || error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    this.refreshPromise = nextRefreshPromise;
    return nextRefreshPromise;
  },
  // Currently unused by the app; kept here for future wiring
  getUsers: async () => {
    return [];
  },

  // ===== AD MANAGEMENT APIS =====
  
  // Get eligible ads for a position
  getEligibleAds: async (position, userLocation = null) => {
    const params = new URLSearchParams({ placement: position }); // Backend expects 'placement' parameter
    if (userLocation) params.append('location', userLocation);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(`${API_URL}/ads/eligible?${params}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    
    if (!response.ok) {
      const message = extractError(data, response.status, 'Failed to load ads');
      throw new Error(message);
    }
    
    return data;
  },

  // Track ad impression
  trackAdImpression: async (adId, position, duration = null) => {
    const csrfToken = getCsrfToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
    };
    
    const response = await fetch(`${API_URL}/ads/${encodeURIComponent(adId)}/impression`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        position,
        duration,
        timestamp: new Date().toISOString(),
        userAgent: navigator?.userAgent,
        url: window?.location?.href
      })
    });
    
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    
    if (!response.ok) {
      const message = extractError(data, response.status, 'Failed to track impression');
      throw new Error(message);
    }
    
    return data;
  },

  // Track ad click
  trackAdClick: async (adId, position) => {
    const csrfToken = getCsrfToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
    };
    
    const response = await fetch(`${API_URL}/ads/${encodeURIComponent(adId)}/click`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        position,
        timestamp: new Date().toISOString(),
        userAgent: navigator?.userAgent,
        referrer: document?.referrer,
        url: window?.location?.href
      })
    });
    
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    
    if (!response.ok) {
      const message = extractError(data, response.status, 'Failed to track click');
      throw new Error(message);
    }
    
    return data;
  },

  // Generic GET method for backward compatibility
  get: async (endpoint, options = {}) => {
    const { headers = {}, tokenAware = Boolean(headers.Authorization) } = options;
    return requestJson('GET', endpoint, { headers, tokenAware });
  },

  // Generic POST method for backward compatibility
  post: async (endpoint, body = {}, options = {}) => {
    const { headers = {}, tokenAware = Boolean(headers.Authorization) } = options;
    return requestJson('POST', endpoint, { headers, body, tokenAware });
  },

  // User settings (with automatic token refresh on 401)
  getSettings: async () => {
    const result = await requestJson('GET', '/settings', {
      tokenAware: true,
    });

    return result.data || {};
  },

  updateSettings: async (updates) => {
    if (!updates || typeof updates !== 'object') return;

    const result = await requestJson('PATCH', '/settings', {
      body: updates,
      tokenAware: true,
    });

    return result.data || {};
  },

  // Full-text search across users, posts, pages, and hashtags with pagination
  searchAll: async (query, options = {}) => {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return { users: [], posts: [], hashtags: [], pages: [], pagination: { hasMore: false, nextCursor: null } };
    }

    const params = new URLSearchParams({
      q: trimmed,
      type: options.type || 'all',
      limit: String(options.limit || 20),
    });

    if (options.cursor) {
      params.set('cursor', options.cursor);
    }

    if (options.sort) {
      params.set('sort', options.sort);
    }

    const response = await fetch(`${API_URL}/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message =
        data?.error?.message || `Failed to search (${response.status})`;
      throw new Error(message);
    }

    const root = data?.data || data || {};

    const users = (root.users || []).map((u) => ({
      id: String(u.id),
      name: u.name || u.display_name || u.username,
      username: u.username,
      avatar: u.avatar_url || null,
      verified: Boolean(u.verified),
    }));

    const posts = (root.posts || [])
      .map((p) => normalizePost(p))
      .filter(Boolean);

    const hashtags = (root.hashtags || []).map((h) => ({
      tag: h.tag || h.hashtag || h.name,
      posts: (h.post_count ?? h.postCount ?? 0).toLocaleString(),
    }));

    const pages = (root.pages || []).map((p) => ({
      id: String(p.id),
      name: p.name,
      // backend currently does not expose page usernames; keep for future
      username: p.username,
      avatar: p.avatar_url || null,
      verified: Boolean(p.verified),
    }));

    return {
      users,
      posts,
      hashtags,
      pages,
      pagination: root.pagination || { hasMore: false, nextCursor: null }
    };
  },

  // Search specific types with pagination
  searchUsers: async (query, options = {}) => {
    const result = await api.searchAll(query, { ...options, type: 'users' });
    return { users: result.users, pagination: result.pagination };
  },

  searchPosts: async (query, options = {}) => {
    const result = await api.searchAll(query, { ...options, type: 'posts' });
    return { posts: result.posts, pagination: result.pagination };
  },

  searchHashtags: async (query, options = {}) => {
    const result = await api.searchAll(query, { ...options, type: 'hashtags' });
    return { hashtags: result.hashtags, pagination: result.pagination };
  },

  searchPages: async (query, options = {}) => {
    const result = await api.searchAll(query, { ...options, type: 'pages' });
    return { pages: result.pages, pagination: result.pagination };
  },

  // Currently unused by the app; kept here for future wiring
  getUser: async () => {
    throw new Error('getUser is not implemented yet');
  },

  // Fetch a single post by id and normalize it for UI consumers
  getPost: async (postId, actorType = null, actorId = null) => {
    if (!postId) {
      throw new Error('postId is required');
    }
    const params = new URLSearchParams();
    if (actorType && actorId) {
      params.set('actorType', actorType);
      params.set('actorId', actorId);
    }
    const url = params.toString()
      ? `${API_URL}/posts/${encodeURIComponent(postId)}?${params.toString()}`
      : `${API_URL}/posts/${encodeURIComponent(postId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to load post (${response.status})`;
      throw new Error(message);
    }

    const raw = data?.data?.post || data?.data || data?.post || data;
    return normalizePost(raw);
  },

  // Fetch comments for a post in a raw backend shape
  getPostComments: async (postId) => {
    if (!postId) {
      throw new Error('postId is required');
    }

    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to load comments (${response.status})`;
      throw new Error(message);
    }

    const rows = data?.data?.comments || data?.comments || data?.data || [];
    // Parse media_urls JSON string for each comment
    return rows.map((c) => {
      let mediaUrls = c.media_urls;
      if (typeof mediaUrls === 'string') {
        try {
          mediaUrls = JSON.parse(mediaUrls);
        } catch {
          mediaUrls = null;
        }
      }
      return { ...c, media_urls: Array.isArray(mediaUrls) ? mediaUrls : null };
    });
  },

  // Delete a single comment by id
  deleteComment: async (commentId) => {
    if (!commentId) {
      throw new Error('commentId is required');
    }
    const csrfToken = getCsrfToken();

    const response = await fetch(`${API_URL}/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to delete comment');
      throw new Error(message);
    }

    return data?.data || null;
  },

  // Delete a single message by id
  deleteMessage: async (messageId) => {
    if (!messageId) {
      throw new Error('messageId is required');
    }
    const csrfToken = getCsrfToken();

    const response = await fetch(`${API_URL}/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to delete message');
      throw new Error(message);
    }

    return true;
  },

  getPosts: async (actorType = null, actorId = null, feedType = 'home') => {
    const params = new URLSearchParams();
    if (actorType && actorId) {
      params.set('actorType', actorType);
      params.set('actorId', actorId);
    }
    if (feedType && feedType !== 'home') {
      params.set('type', feedType);
    }
    const url = params.toString() ? `${API_URL}/feed?${params.toString()}` : `${API_URL}/feed`;

    const makeRequest = async () => {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      return { response, data };
    };

    const { response, data } = await makeRequest();



    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, `Failed to fetch posts`);
      throw new Error(message);
    }

    const rows = data?.data?.posts || data?.posts || [];
    const posts = Array.isArray(rows)
      ? rows
          .map(normalizePost)
          .filter((post) => post && post.type !== 'STORY')
      : [];
    const pagination = data?.data?.pagination || data?.pagination || null;

    return { posts, pagination };
  },

  getTrendingTopics: async () => {
    const response = await fetch(`${API_URL}/analytics/trending?limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, `Failed to fetch trending topics`);
      throw new Error(message);
    }

    const topics = data.data?.topics || [];

    return topics.map((topic) => {
      const rawTag = topic.tag || topic.hashtag || '';
      const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;
      const count = topic.recent_count ?? topic.post_count ?? 0;
      return {
        tag,
        posts: `${count.toLocaleString()} posts`,
      };
    });
  },

  getSuggestedUsers: async () => {
    try {
      const response = await fetch(`${API_URL}/users/suggested?limit=5`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        return [];
      }
      return (data.data?.users || data.users || []).map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        avatar: u.avatar_url || null,
        verified: Boolean(u.verified),
        // If backend ever returns follow relationship flags, wire them here.
        isFollowing: Boolean(u.is_following || u.following || u.followed_by_me),
      }));
    } catch (error) {
      return [];
    }
  },

  getUserFollowing: async (username) => {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/following`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to load following');
      throw new Error(message);
    }
    const rows = data?.data?.following || data?.following || data?.data || [];
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      username: r.username,
      type: r.type || 'user',
      avatarUrl: r.avatar_url || null,
    }));
  },

  // Persisted shares created by the current user, normalized into share wrappers
  getMyShares: async () => {
    const response = await fetch(`${API_URL}/shares/mine`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to load shares (${response.status})`;
      throw new Error(message);
    }

    const rows = data?.data?.shares || data?.shares || [];

    return rows.map((s) => {
      const originalRaw = s.originalPost || s.original_post || s;
      const original = normalizePost(originalRaw);
      const sharedBy = {
        name: s.actor_name || s.username || 'You',
        username: s.username || 'you',
        avatar: s.avatar_url || null,
      };
      const createdMs = s.created_at ? s.created_at * 1000 : Date.now();
      return {
        id: String(s.id),
        sharedBy,
        timestamp: new Date(createdMs).toISOString(),
        original,
      };
    });
  },

  deleteAccount: async (password) => {
    if (!password) {
      throw new Error('Password is required to delete account');
    }
    const csrfToken = getCsrfToken();

    const response = await fetch(`${API_URL}/users/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to delete account (${response.status})`;
      throw new Error(message);
    }

    return true;
  },

  // Reels feed for web Reels page
  getReelsFeed: async (forceNonSensitive = false) => {
    const params = new URLSearchParams({ limit: '20' });
    if (forceNonSensitive) {
      params.append('force_non_sensitive', '1');
    }

    const response = await fetch(`${API_URL}/reels/feed?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, `Failed to get reels`);
      throw new Error(message);
    }

    const root = data.data || data || {};
    const rows = root.reels || [];
    const flattenedReels = [];

    rows.forEach((post) => {
      if (post?.isAd || post?.is_ad || post?.type === 'AD' || post?.adType || post?.ad_type) {
        flattenedReels.push({
          id: String(post.id || `ad-${Math.random().toString(36).slice(2)}`),
          isAd: true,
          adType: post.adType || post.ad_type,
          mediaUrl: post.mediaUrl || post.media_url || post.contentUrl || post.content_url || post.thumbnailUrl || post.thumbnail_url || null,
          thumbnail: post.thumbnailUrl || post.thumbnail_url || null,
          description: post.description || post.text || '',
          ctaText: post.ctaText || post.cta_text || 'Learn More',
          url: post.url || post.click_url || post.ctaUrl || post.cta_url || post.landingUrl || null,
          duration: post.duration || 15,
        });
        return;
      }

      const actorType = post.actorType || post.actor_type;
      const actorId = post.actorId || post.actor_id;
      const actorName = post.actorName || post.actor_name;
      const likesCount = post.likesCount ?? post.likes_count ?? 0;
      const commentsCount = post.commentsCount ?? post.comments_count ?? 0;
      const viewsCount = post.viewsCount ?? post.views_count ?? post.view_count ?? 0;
      const likedByMe = post.likedByMe ?? post.liked_by_me ?? 0;
      const isSensitive = post.isSensitive ?? post.is_sensitive;
      const username = post.username || post.actor_username || 'user';
      const avatar = post.avatar_url || post.avatarUrl || null;

      const explicitVideos = Array.isArray(post.videos) ? post.videos : [];
      const normalizedVideos = normalizeMediaArray(explicitVideos).filter((item) => item.type === 'video' || item.type === 'gif');

      if (normalizedVideos.length > 0) {
        normalizedVideos.forEach((video, videoIndex) => {
          flattenedReels.push({
            id: `${post.id}_${videoIndex}`,
            postId: post.postId || post.post_id || post.id,
            user: {
              name: actorName || username || 'User',
              username,
              avatar,
              id: actorId,
            },
            url: video.url,
            video: video.url,
            thumbnail: video.thumbnail || null,
            caption: post.caption || post.content || '',
            likes: likesCount,
            comments: commentsCount,
            views: viewsCount,
            likedByMe: Boolean(likedByMe),
            liked_by_me: likedByMe,
            is_sensitive: isSensitive,
            actorType,
            actorId,
            videoIndex,
            totalVideos: normalizedVideos.length,
          });
        });
        return;
      }

      const fallbackVideo = normalizeMediaItem({
        type: 'video',
        url: post.video_url || post.videoUrl || post.mediaUrl || post.media_url || post.playbackUrl || post.playback_url,
        thumbnail: post.thumbnailUrl || post.thumbnail_url || null,
        videoId: post.videoId || post.cloudflareVideoId || post.cloudflare_stream_id || null,
      });

      if (fallbackVideo?.url) {
        flattenedReels.push({
          id: String(post.id),
          postId: post.postId || post.post_id || post.id,
          user: {
            name: actorName || username || 'User',
            username,
            avatar,
            id: actorId,
          },
          url: fallbackVideo.url,
          video: fallbackVideo.url,
          thumbnail: fallbackVideo.thumbnail || null,
          caption: post.caption || post.content || '',
          likes: likesCount,
          comments: commentsCount,
          views: viewsCount,
          likedByMe: Boolean(likedByMe),
          liked_by_me: likedByMe,
          is_sensitive: isSensitive,
          actorType,
          actorId,
          videoIndex: 0,
          totalVideos: 1,
        });
      }
    });

    return flattenedReels;
  },

  // Stories feed for web home header
  getStoriesFeed: async () => {
    const response = await fetch(`${API_URL}/stories/feed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, `Failed to load stories`);
      throw new Error(message);
    }

    // Backend returns storyGroups (grouped by actor), flatten to individual stories
    const storyGroups = data.data?.storyGroups || [];

    // Flatten story groups into individual stories with user info attached
    const stories = [];
    for (const group of storyGroups) {
      if (!group.stories || group.stories.length === 0) continue;

      for (const story of group.stories) {
        const createdAt = story.createdAt ? story.createdAt * 1000 : Date.now();
        stories.push({
          id: story.id,
          image: story.mediaUrl || story.media_url || null,
          mediaType: story.mediaType || story.media_type || 'image',
          duration: story.duration || 5,
          expiresAt: story.expiresAt || story.expires_at || null,
          user: {
            id: group.actorId || group.actor_id,
            name: group.actorName || group.actor_name || group.username || 'User',
            username: group.username || 'user',
            avatar: group.avatarUrl || group.avatar_url || null,
            verified: group.verified || false,
            type: group.actorType || group.actor_type || null,
          },
          isAd: group.isAd || false,
          ctaText: story.ctaText,
          ctaUrl: story.ctaUrl,
          viewedByMe: story.viewedByMe || false,
          createdAt,
        });
      }
    }

    return stories.filter((story) => story.image);
  },

  // Create a new story
  createStory: async (payload) => {
    const { actorType, actorId, mediaType, mediaUrl, duration, isSensitive, content } = payload;

    const response = await fetch(`${API_URL}/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(() => {
          const csrf = getCsrfToken();
          return csrf ? { 'X-CSRF-Token': csrf } : {};
        })(),
      },
      credentials: 'include',
      body: JSON.stringify({
        actorType,
        actorId,
        mediaType,
        mediaUrl,
        duration: duration || (mediaType === 'video' ? 15 : 5),
        isSensitive: Boolean(isSensitive),
        content: content || '',
      }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to create story');
      throw new Error(message);
    }

    return data?.data || data;
  },

  // Mark a story as viewed
  viewStory: async (storyId) => {
    const response = await fetch(`${API_URL}/stories/${encodeURIComponent(storyId)}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(() => {
          const csrf = getCsrfToken();
          return csrf ? { 'X-CSRF-Token': csrf } : {};
        })(),
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to mark story as viewed');
      throw new Error(message);
    }

    return true;
  },

  // Delete a story
  deleteStory: async (storyId) => {
    const response = await fetch(`${API_URL}/stories/${encodeURIComponent(storyId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(() => {
          const csrf = getCsrfToken();
          return csrf ? { 'X-CSRF-Token': csrf } : {};
        })(),
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to delete story');
      throw new Error(message);
    }

    return true;
  },

  // Get stories for a specific user
  getUserStories: async (username) => {
    const response = await fetch(`${API_URL}/stories/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to get user stories');
      throw new Error(message);
    }

    return data?.data || { user: null, stories: [] };
  },

  // Start TOTP 2FA setup for the current user
  enable2FA: async () => {
    const response = await fetch(`${API_URL}/auth/enable-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to start 2FA setup (${response.status})`;
      throw new Error(message);
    }

    const payload = data?.data || data || {};

    return {
      otpauthUrl:
        payload.otpauthUrl ||
        payload.otpauth_url ||
        payload.qrUri ||
        payload.qr_uri ||
        null,
      secret:
        payload.secret ||
        payload.secret_base32 ||
        payload.base32 ||
        null,
    };
  },

  // Verify TOTP 2FA setup with a code from the authenticator app
  verify2FASetup: async (code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
      throw new Error('Verification code is required');
    }

    const response = await fetch(`${API_URL}/auth/verify-2fa-setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ code: trimmed }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to verify 2FA setup (${response.status})`;
      throw new Error(message);
    }

    return data?.data || data || {};
  },

  // Disable TOTP 2FA for the current user
  disable2FA: async (password, code) => {
    const response = await fetch(`${API_URL}/auth/disable-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ password, code }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to disable 2FA (${response.status})`;
      throw new Error(message);
    }

    return data?.data || data || {};
  },

  // Get count of remaining 2FA backup codes
  getBackupCodesCount: async () => {
    const response = await fetch(`${API_URL}/auth/2fa/backup-codes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to load backup codes (${response.status})`;
      throw new Error(message);
    }

    const payload = data?.data || data || {};
    const total =
      payload.total ?? payload.total_codes ?? payload.totalCodes ?? payload.total_available ?? 0;
    const remaining =
      payload.remaining ?? payload.remaining_codes ?? payload.remainingCodes ?? payload.unused ?? 0;

    return { total, remaining };
  },

  // Regenerate 2FA backup codes and return updated count
  regenerateBackupCodes: async (password, code) => {
    const response = await fetch(`${API_URL}/auth/2fa/regenerate-backup-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ password, code }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to regenerate backup codes (${response.status})`;
      throw new Error(message);
    }

    const payload = data?.data || data || {};
    const backupCodes =
      payload.backupCodes ||
      payload.codes ||
      payload.backup_codes ||
      [];
    const total =
      payload.total ?? payload.total_codes ?? payload.totalCodes ?? payload.total_available ?? backupCodes.length;
    const remaining =
      payload.remaining ?? payload.remaining_codes ?? payload.remainingCodes ?? payload.unused ?? backupCodes.length;

    return { total, remaining, backupCodes };
  },

  // Session management: logout all devices & device history
  logoutAllDevices: async () => {
    const response = await fetch(`${API_URL}/auth/logout-all-devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message =
        data?.error?.message || `Failed to logout all devices (${response.status})`;
      throw new Error(message);
    }

    const payload = data?.data || data || {};
    const access =
      payload.tokens?.accessToken || payload.accessToken || null;
    const refresh =
      payload.tokens?.refreshToken || payload.refreshToken || null;

    return { accessToken: access, refreshToken: refresh };
  },

  // Device verification uses a temporary token issued by /auth/login
  verifyDevice: async (tempToken, verificationCode) => {
    const trimmed = String(verificationCode || '').trim();
    if (!trimmed) {
      throw new Error('Verification code is required');
    }

    if (!tempToken) {
      throw new Error('Verification session is missing or expired');
    }

    const response = await fetch(`${API_URL}/auth/verify-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ verificationCode: trimmed, tempToken }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      // Response may not be JSON
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, `Failed to verify device (${response.status})`);
      return { success: false, error: message };
    }

    return { success: true, data: data?.data || data };
  },

  // Request password reset - sends verification code to email
  forgotPassword: async (email) => {
    const trimmed = String(email || '').trim();
    if (!trimmed) {
      throw new Error('Email is required');
    }

    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email: trimmed }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, `Failed to request password reset (${response.status})`);
      throw new Error(message);
    }

    return true;
  },

  // Reset password with verification code
  resetPassword: async (email, code, newPassword) => {
    const trimmedEmail = String(email || '').trim();
    const trimmedCode = String(code || '').trim();
    const trimmedPassword = String(newPassword || '').trim();

    if (!trimmedEmail) {
      throw new Error('Email is required');
    }
    if (!trimmedCode) {
      throw new Error('Verification code is required');
    }
    if (!trimmedPassword) {
      throw new Error('New password is required');
    }
    if (trimmedPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: trimmedEmail,
        code: trimmedCode,
        newPassword: trimmedPassword
      }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, `Failed to reset password (${response.status})`);
      throw new Error(message);
    }

    return true;
  },

  getLoginHistory: async () => {
    const response = await fetch(`${API_URL}/auth/login-history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message =
        data?.error?.message || `Failed to load login history (${response.status})`;
      throw new Error(message);
    }

    const history = data?.data?.history || data?.history || [];
    return history;
  },

  getVerifiedDevices: async () => {
    const response = await fetch(`${API_URL}/auth/verified-devices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      const message =
        data?.error?.message || `Failed to load verified devices (${response.status})`;
      throw new Error(message);
    }

    const devices = data?.data?.devices || data?.devices || [];
    return devices;
  },

  // Toggle like status for a post
  togglePostLike: async (postId, shouldLike, actorType, actorId) => {
    if (!actorType || !actorId) {
      throw new Error('Missing actor identity');
    }

    const method = shouldLike ? 'POST' : 'DELETE';
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/likes`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ actorType, actorId }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to ${shouldLike ? 'like' : 'unlike'} post (${response.status})`;
      throw new Error(message);
    }

    return data?.data || null;
  },

  // Toggle bookmark status for a post
  togglePostBookmark: async (postId, shouldBookmark) => {
    const method = shouldBookmark ? 'POST' : 'DELETE';
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/bookmarks`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      // Some endpoints may not return JSON bodies; that's fine.
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || `Failed to ${shouldBookmark ? 'add bookmark' : 'remove bookmark'} (${response.status})`;
      const alreadyBookmarked = message.includes('Already bookmarked');
      const notBookmarked = message.includes('Not bookmarked');
      if ((shouldBookmark && alreadyBookmarked) || (!shouldBookmark && notBookmarked)) {
        return data?.data || null;
      }
      throw new Error(message);
    }

    return data?.data || null;
  },

  // Add a comment to a post and return the created comment (raw backend shape)
  addComment: async (postId, content, actorType, actorId, mediaUrls = null) => {
    if (!actorType || !actorId) {
      throw new Error('Missing actor identity');
    }

    // Extract Cloudflare IDs from mediaUrls if present
    const cloudflareImageIds = mediaUrls
      ?.filter(media => media.type === 'image' && media.cloudflareId)
      ?.map(media => media.cloudflareId)
      .filter(id => id && typeof id === 'string') || [];

    // Clean mediaUrls to only include url and type
    const cleanedMediaUrls = mediaUrls
      ?.map(media => ({
        url: media.url,
        type: media.type,
      })) || [];

    const headers = {
      'Content-Type': 'application/json',
    };
    // Add CSRF token for POST
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ 
        content, 
        actorType, 
        actorId, 
        mediaUrls: cleanedMediaUrls.length > 0 ? cleanedMediaUrls : undefined,
        cloudflareImageIds: cloudflareImageIds.length > 0 ? cloudflareImageIds : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      const message = data?.error?.message || `Failed to add comment (${response.status})`;
      throw new Error(message);
    }

    // Try common response shapes
    return (
      data.data?.comment ||
      data.data?.comments?.[0] ||
      data.data?.comment ||
      data.data ||
      null
    );
  },

  // Post interactions
  likePost: async (postId, actorType = 'user', actorId = null) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ actorType, actorId }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to like post');
      throw new Error(message);
    }
    return data;
  },

  unlikePost: async (postId, actorType = 'user', actorId = null) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/likes`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ actorType, actorId }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to unlike post');
      throw new Error(message);
    }
    return data;
  },

  bookmarkPost: async (postId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to bookmark post');
      throw new Error(message);
    }
    return data;
  },

  unbookmarkPost: async (postId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/bookmarks`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to unbookmark post');
      throw new Error(message);
    }
    return data;
  },

  deletePost: async (postId) => {
    const headerObj = {
      'Content-Type': 'application/json',
    };
    // Add CSRF token for DELETE request
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headerObj['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: headerObj,
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to delete post');
      throw new Error(message);
    }
    return data;
  },

  updatePost: async (postId, updates) => {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to update post');
      throw new Error(message);
    }
    return data.data || data;
  },

  sharePost: async (postId, actorType, actorId, comment = null) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        actorType,
        actorId,
        postId,
        comment,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to share post');
      throw new Error(message);
    }
    return data;
  },

  reportContent: async (targetType, targetId, category, description = '') => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        targetType,
        targetId,
        category,
        description,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to report');
      throw new Error(message);
    }
    return data;
  },

  // Create a new post or story
  createPost: async (postData) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    // Add CSRF token for POST
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    // Route to /stories endpoint if creating a story
    const isStory = postData.type === 'STORY';
    const endpoint = isStory ? `${API_URL}/stories` : `${API_URL}/posts`;

    // Transform payload for story endpoint
    let payload = postData;
    if (isStory) {
      // Stories endpoint expects: actorType, actorId, mediaType, mediaUrl, duration, isSensitive
      const firstMedia = postData.mediaUrls?.[0];
      payload = {
        actorType: postData.actorType,
        actorId: postData.actorId,
        mediaType: firstMedia?.type || postData.mediaType || 'image',
        mediaUrl: firstMedia?.url || null,
        duration: firstMedia?.type === 'video' ? 15 : 5,
        isSensitive: postData.sensitive || false,
      };
    } else {
      // For regular posts, clean up the mediaUrls to only include url and type
      payload = {
        ...postData,
        mediaUrls: postData.mediaUrls?.map(media => ({
          url: media.url,
          type: media.type,
        })) || [],
        media_urls: postData.mediaUrls?.map(media => ({
          url: media.url,
          type: media.type,
        })) || [],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, isStory ? 'Failed to create story' : 'Failed to create post');
      throw new Error(message);
    }
    return data;
  },

  blockUser: async (blockedType, blockedId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        blockedType,
        blockedId,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to block user');
      throw new Error(message);
    }
    return data;
  },

  unblockUser: async (blockedType, blockedId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/blocks`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        blockedType,
        blockedId,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to unblock user');
      throw new Error(message);
    }
    return data;
  },

  // Generic block/unblock helpers used by BlockContext
  blockEntity: async (blockedType, blockedId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ blockedType, blockedId }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to block');
      throw new Error(message);
    }
    return data?.data || null;
  },

  unblockEntity: async (blockedType, blockedId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/blocks`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ blockedType, blockedId }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to unblock');
      throw new Error(message);
    }
    return data?.data || null;
  },

  getBlocks: async () => {
    const response = await fetch(`${API_URL}/blocks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to load blocks');
      throw new Error(message);
    }
    const rows = data?.data?.blocks || data?.blocks || data?.data || [];
    return rows.map((b) => ({
      id: b.blocked_id,
      type: b.blocked_type,
      username: b.username || '',
      name: b.name || b.username || 'User',
      avatar: b.avatar_url || null,
      blockedAt: b.created_at
        ? new Date(b.created_at * 1000).toISOString()
        : new Date().toISOString(),
      reason: b.reason || '',
    }));
  },

  getBookmarks: async () => {
    const response = await fetch(`${API_URL}/bookmarks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to load bookmarks');
      throw new Error(message);
    }

    const rows = data?.data?.bookmarks || data?.bookmarks || data?.data || [];
    return {
      bookmarks: rows.map(normalizePost).filter(Boolean),
    };
  },

  followUser: async (followeeType, followeeId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/follows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        followeeType,
        followeeId,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to follow');
      throw new Error(message);
    }
    return data;
  },

  unfollowUser: async (followeeType, followeeId) => {
    const csrfToken = getCsrfToken();
    const response = await fetch(`${API_URL}/follows`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        followeeType,
        followeeId,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to unfollow');
      throw new Error(message);
    }
    return data;
  },

  // ===== MEDIA UPLOAD APIS =====

  // Get direct upload URL for images
  getImageUploadURL: async () => {
    const headers = {
      'Content-Type': 'application/json',
    };
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_URL}/media/images/upload-url`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to get upload URL');
      throw new Error(message);
    }
    // Return in format expected by callers: { uploadURL, id }
    return {
      uploadURL: data.data?.uploadURL,
      id: data.data?.id,
      deliveryUrl: data.data?.deliveryUrl || null,
    };
  },

  // Get direct upload URL for videos
  getVideoUploadURL: async (maxDurationSeconds = 3600) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_URL}/media/videos/upload-url`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ maxDurationSeconds }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = extractError(data, response.status, 'Failed to get upload URL');
      throw new Error(message);
    }
    // Return in format expected by callers: { uploadURL, id }
    // Note: video service returns 'uid' or 'id' depending on endpoint
    return {
      uploadURL: data.data?.uploadURL,
      id: data.data?.id || data.data?.uid,
      playbackUrl: data.data?.playbackUrl || null,
    };
  },

  getConversations: async () => {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      const message = extractError(data, response.status, 'Failed to load conversations');
      throw new Error(message);
    }

    const rows = data?.data?.conversations || data?.conversations || data?.data || [];
    return rows.map((c) => {
      // Backend attaches participants[] with the other users in the conversation.
      const participant = (c.participants && c.participants[0]) || {};
      const lastMessage = c.last_message || '';
      const lastTimeSeconds = c.last_message_at;
      const timestamp = lastTimeSeconds
        ? new Date(lastTimeSeconds * 1000).toLocaleString()
        : '';
      const unread = (c.unread_count ?? 0) > 0;

      return {
        id: String(c.id),
        user: {
          id: participant.id,
          name: participant.name,
          username: participant.username || 'user',
        },
        lastMessage,
        timestamp,
        unread,
        messages: [], // messages are loaded on ChatScreen
      };
    });
  },

  // Upload image directly to Cloudflare
  uploadImage: async (uploadURL, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header - let browser set it with boundary
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return response;
  },

  // Upload video directly to Cloudflare
  uploadVideo: async (uploadURL, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header - let browser set it with boundary
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return response;
  },
};

export default api;







