import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_URL, api, getCsrfToken } from '../services/api';

const AuthContext = createContext();

const resolveAuthApiUrl = () => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const apiIsLocal = API_URL.startsWith('http://127.0.0.1') || API_URL.startsWith('http://localhost');
    if (isLocalHost && apiIsLocal) {
      return '/api';
    }
  }
  return API_URL;
};

const AUTH_API_URL = resolveAuthApiUrl();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Simple hash function for fingerprinting
const hashString = (str) => {
  let hash = 0;
  if (str.length === 0) return '0';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash * 33 + char) % 1000000007;
  }
  return String(Math.abs(hash));
};

// Normalize error shape from backend
const extractError = (data, status, fallback) => {
  if (!data) return fallback || `Request failed (${status})`;
  if (typeof data.error === 'string') return data.error;
  if (data.error?.message) return data.error.message;
  if (typeof data.message === 'string') return data.message;
  return fallback || `Request failed (${status})`;
};

const normalizeUser = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const avatar = raw.avatar || raw.avatar_url || raw.avatarUrl || null;
  const coverImage = raw.coverImage || raw.cover_url || raw.coverUrl || null;
  return {
    ...raw,
    avatar,
    avatar_url: raw.avatar_url || raw.avatarUrl || avatar || null,
    coverImage,
    cover_url: raw.cover_url || raw.coverUrl || coverImage || null,
  };
};

// Device fingerprinting helpers
const generateCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 30);
    ctx.fillStyle = '#069';
    ctx.fillText('Xora fingerprint', 2, 15);
    ctx.strokeStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.strokeRect(5, 5, 90, 20);
    return hashString(canvas.toDataURL());
  } catch {
    return null;
  }
};

const getWebGLInfo = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      vendor: String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR) || ''),
      renderer: String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || ''),
    };
  } catch {
    return null;
  }
};

const getBrowserDeviceInfo = () => {
  try {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || 'web';
    const languages = navigator.languages?.slice(0, 5) || (navigator.language ? [navigator.language] : []);
    const screenInfo = window.screen ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}` : null;
    const timezone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
    const canvasFingerprint = generateCanvasFingerprint();
    const webglInfo = getWebGLInfo();
    const fingerprint = hashString([ua, platform, languages.join(','), screenInfo, timezone, canvasFingerprint, webglInfo?.vendor, webglInfo?.renderer].filter(Boolean).join('|'));
    return { platform: 'web', userAgent: ua, platformString: platform, appPlatform: 'web', languages, screen: screenInfo, timezone, webglVendor: webglInfo?.vendor, webglRenderer: webglInfo?.renderer, canvasFingerprint, fingerprint };
  } catch {
    return { platform: 'web', appPlatform: 'web' };
  }
};

export const AuthProvider = ({ children }) => {
  // Store access token in memory for WebSocket authentication (not in localStorage for security)
  const accessTokenRef = useRef(null);
  const [accessToken, setAccessToken] = useState(null);
  const seededAccessTokenRef = useRef(false);
  
  const refreshInFlightRef = useRef(null);
  const fetchInterceptorRef = useRef(null);
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionVerified, setSessionVerified] = useState(false);

  // Get current user ID from stored user object
  const getCurrentUserId = useCallback(() => {
    return user?.id || null;
  }, [user]);

  // Initialize: check for stored user and verify session with backend
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Load cached user data for immediate UI (token is in httpOnly cookies, managed by backend)
        const storedUser = localStorage.getItem('xora_user');
        const storedCsrf = localStorage.getItem('xora_csrf_token');

        if (storedUser) {
          setUser(normalizeUser(JSON.parse(storedUser)));
        }
        if (storedCsrf) {
          setCsrfToken(storedCsrf);
        }

        // Verify session with backend (cookies are sent automatically)
        if (storedUser) {
          try {
            const response = await fetch(`${AUTH_API_URL}/auth/me`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Send httpOnly cookies automatically
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                const normalized = normalizeUser(data.data);
                setUser(normalized);
                localStorage.setItem('xora_user', JSON.stringify(normalized));
                setSessionVerified(true);
              } else {
                setSessionVerified(true);
              }
            } else if (response.status === 401) {
              // Session expired, try to refresh token
              try {
                const refreshRes = await fetch(`${AUTH_API_URL}/auth/refresh`, {
                  method: 'POST',
                  credentials: 'include', // Send and receive httpOnly cookies
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });
                if (refreshRes.ok) {
                  const refreshData = await refreshRes.json();
                  const newCsrf = refreshData?.data?.csrfToken || refreshData?.csrfToken;
                  if (newCsrf) {
                    setCsrfToken(newCsrf);
                    localStorage.setItem('xora_csrf_token', newCsrf);
                  }
                  // Get and set the new access token
                  const newAccessToken = refreshData?.data?.accessToken || refreshData?.data?.tokens?.accessToken || refreshData?.accessToken;
                  if (newAccessToken) {
                    setAccessToken(newAccessToken);
                    accessTokenRef.current = newAccessToken;
                  }
                  setSessionVerified(true);
                  // Token is now in httpOnly cookie and memory, don't clear user
                  setLoading(false);
                  return;
                }
              } catch {
                // Refresh failed, continue to clear state
              }
              // Refresh failed or no new token, clear local state
              setUser(null);
              setCsrfToken(null);
              setAccessToken(null);
              accessTokenRef.current = null;
              localStorage.removeItem('xora_user');
              localStorage.removeItem('xora_csrf_token');
              setSessionVerified(true);
            } else {
              // Other error (500, etc.) - keep cached user for resilience
              console.warn('Session verification failed with status:', response.status);
              setSessionVerified(true);
            }
          } catch {
            // Network error, keep cached user for offline support
            setSessionVerified(true);
          }
        } else {
          // No stored user, session is verified (not authenticated)
          setSessionVerified(true);
        }
      } catch {
        localStorage.removeItem('xora_user');
        localStorage.removeItem('xora_csrf_token');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Listen for logout events from API calls (token refresh is automatic via httpOnly cookies)
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setCsrfToken(null);
    };

    window.addEventListener('auth-logout', handleLogout);
    return () => {
      window.removeEventListener('auth-logout', handleLogout);
    };
  }, []);

  // Login with credentials
  const login = async (emailOrUsername, password) => {
    const response = await fetch(`${AUTH_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: sends and receives httpOnly cookies
      body: JSON.stringify({
        identifier: emailOrUsername,
        password,
        deviceInfo: getBrowserDeviceInfo(),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      throw new Error(extractError(data, response.status, `Login failed with status ${response.status}`));
    }

    const payload = data.data || data || {};

    // Handle device verification
    if (payload.requiresDeviceVerification) {
      return {
        requiresVerification: true,
        tempToken: payload.tempToken,
        message: payload.message || 'Please verify this device.',
      };
    }

    // Handle 2FA
    if (payload.requires2FA) {
      return {
        requires2FA: true,
        tempToken: payload.tempToken,
        message: payload.message || 'Enter your 2FA code.',
      };
    }

    // Success - tokens are now in httpOnly cookies (set by backend)
    const userFromApi = normalizeUser(payload.user);
    const csrf = payload.csrfToken;
    const refreshToken = payload.tokens?.refreshToken || payload.refreshToken;
    const accessTokenFromResponse = payload.tokens?.accessToken || payload.accessToken;

    setUser(userFromApi);
    if (csrf) setCsrfToken(csrf);
    
    // Store access token in memory for WebSocket authentication
    if (accessTokenFromResponse) {
      setAccessToken(accessTokenFromResponse);
      accessTokenRef.current = accessTokenFromResponse;
    }

    // Cache user and CSRF token locally (token stays in httpOnly cookie)
    if (userFromApi) localStorage.setItem('xora_user', JSON.stringify(userFromApi));
    if (csrf) localStorage.setItem('xora_csrf_token', csrf);
    
    // Store refresh token as fallback in localStorage ONLY in development (for proxy issues)
    // Production uses httpOnly cookies exclusively for security
    if (refreshToken && import.meta.env.DEV) {
      localStorage.setItem('xora_refresh_token_fallback', refreshToken);
      console.log('[Auth] Stored refresh token in localStorage as fallback');
    }

    return { requiresVerification: false };
  };

  // Signup
  const signup = async (name, email, username, password) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, username, password }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      throw new Error(extractError(data, response.status, `Signup failed with status ${response.status}`));
    }

    const payload = data.data || data || {};

    // Check if email verification is required (backend returns this in data.data)
    if (payload.requiresEmailVerification) {
      return {
        requiresEmailVerification: true,
        tempToken: payload.tempToken,
        email: payload.email,
        message: payload.message
      };
    }

    const userFromApi = normalizeUser(payload.user);
    const csrf = payload.csrfToken;
    const refreshToken = payload.tokens?.refreshToken || payload.refreshToken;
    const accessTokenFromResponse = payload.tokens?.accessToken || payload.accessToken;

    setUser(userFromApi);
    setCsrfToken(csrf);
    
    // Store access token in memory for WebSocket authentication
    if (accessTokenFromResponse) {
      setAccessToken(accessTokenFromResponse);
      accessTokenRef.current = accessTokenFromResponse;
    }

    // Cache user and CSRF token locally (token stays in httpOnly cookie)
    if (userFromApi) localStorage.setItem('xora_user', JSON.stringify(userFromApi));
    if (csrf) localStorage.setItem('xora_csrf_token', csrf);
    
    // Store refresh token as fallback in localStorage ONLY in development (for proxy issues)
    // Production uses httpOnly cookies exclusively for security
    if (refreshToken && import.meta.env.DEV) {
      localStorage.setItem('xora_refresh_token_fallback', refreshToken);
      console.log('[Auth] Stored refresh token in localStorage as fallback');
    }

    return { user: userFromApi };
  };

  // Complete signup after email verification
  const completeSignup = async (tempToken, verificationCode) => {
    const response = await fetch(`${API_URL}/auth/complete-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tempToken, code: verificationCode }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      throw new Error(extractError(data, response.status, `Complete signup failed with status ${response.status}`));
    }

    const userFromApi = normalizeUser(data.data?.user);
    const csrf = data.data?.csrfToken;
    const refreshToken = data.data?.tokens?.refreshToken || data.data?.refreshToken;
    const accessTokenFromResponse = data.data?.tokens?.accessToken || data.data?.accessToken;

    setUser(userFromApi);
    setCsrfToken(csrf);
    
    // Store access token in memory for WebSocket authentication
    if (accessTokenFromResponse) {
      setAccessToken(accessTokenFromResponse);
      accessTokenRef.current = accessTokenFromResponse;
    }

    // Cache user and CSRF token locally (token stays in httpOnly cookie)
    if (userFromApi) localStorage.setItem('xora_user', JSON.stringify(userFromApi));
    if (csrf) localStorage.setItem('xora_csrf_token', csrf);
    
    // Store refresh token as fallback in localStorage ONLY in development (for proxy issues)
    // Production uses httpOnly cookies exclusively for security
    if (refreshToken && import.meta.env.DEV) {
      localStorage.setItem('xora_refresh_token_fallback', refreshToken);
      console.log('[Auth] Stored refresh token in localStorage as fallback');
    }

    return { user: userFromApi };
  };

  // Logout - clears cookies on backend
  const logout = useCallback(async () => {
    console.log('[Auth] Logging out...');
    try {
      // Send logout request with CSRF token
      const headers = { 'Content-Type': 'application/json' };
      const csrfTokenHeader = getCsrfToken();
      if (csrfTokenHeader) {
        headers['X-CSRF-Token'] = csrfTokenHeader;
      }

      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include', // Backend will clear httpOnly cookies
        body: JSON.stringify({}),
      });
    } catch {
      // Ignore network errors during logout
    }

    // Clear all local state including access token
    setUser(null);
    setCsrfToken(null);
    setAccessToken(null);
    accessTokenRef.current = null;
    
    // Clear localStorage
    try {
      localStorage.removeItem('xora_user');
      localStorage.removeItem('xora_csrf_token');
      localStorage.removeItem('xora_refresh_token_fallback');
      // Also clear settings to prevent stale data
      localStorage.removeItem('xora-accessibility-preferences');
    } catch {
      // Ignore storage errors
    }
    
    console.log('[Auth] Logout complete');
  }, []);

  // Logout all devices
  const logoutAllDevices = async () => {
    if (!user) throw new Error('Not authenticated');

    const headers = { 'Content-Type': 'application/json' };
    const csrfTokenHeader = getCsrfToken();
    if (csrfTokenHeader) {
      headers['X-CSRF-Token'] = csrfTokenHeader;
    }

    const response = await fetch(`${API_URL}/auth/logout-all-devices`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to logout all devices');
    }

    // After logout-all, we get new tokens in cookies automatically
    const data = await response.json();
    if (data.success) {
      // Session continues with new tokens
    }
  };

  // Verify device
  const verifyDevice = async (verificationCode, tempToken) => {
    if (!tempToken) {
      return { success: false, error: 'Verification session is missing or expired' };
    }

    try {
      const response = await fetch(`${API_URL}/auth/verify-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ verificationCode, tempToken }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        const userFromApi = normalizeUser(data.data.user);
        const csrf = data.data.csrfToken;
        const refreshToken = data.data.tokens?.refreshToken || data.data.refreshToken;
        const accessTokenFromResponse = data.data.tokens?.accessToken || data.data.accessToken;

        setUser(userFromApi);
        setCsrfToken(csrf);
        
        // Store access token in memory for WebSocket authentication
        if (accessTokenFromResponse) {
          setAccessToken(accessTokenFromResponse);
          accessTokenRef.current = accessTokenFromResponse;
        }

        // Cache user and CSRF token locally (tokens stay in httpOnly cookies)
        if (userFromApi) localStorage.setItem('xora_user', JSON.stringify(userFromApi));
        if (csrf) localStorage.setItem('xora_csrf_token', csrf);
        
        // Store refresh token as fallback in localStorage ONLY in development (for proxy issues)
        // Production uses httpOnly cookies exclusively for security
        if (refreshToken && import.meta.env.DEV) {
          localStorage.setItem('xora_refresh_token_fallback', refreshToken);
          console.log('[Auth] Stored refresh token in localStorage as fallback');
        }

        return { success: true };
      }

      return { success: false, error: data.error?.message || 'Verification failed' };
    } catch (error) {
      return { success: false, error: error.message || 'Verification failed' };
    }
  };

  // Update profile locally
  const updateProfile = (updates) => {
    if (!user) return;
    const normalizedUpdates = normalizeUser({ ...user, ...updates });
    const updatedUser = normalizedUpdates;
    setUser(updatedUser);
    localStorage.setItem('xora_user', JSON.stringify(updatedUser));
  };

  // Refresh access token - now backend manages tokens via httpOnly cookies
  const refreshAccessToken = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      try {
        console.log('[Auth] Attempting token refresh...');
        
        // Check for fallback refresh token in localStorage ONLY in development (for proxy issues)
        // Production uses httpOnly cookies exclusively for security
        const body = {};
        if (import.meta.env.DEV) {
          const fallbackRefreshToken = localStorage.getItem('xora_refresh_token_fallback');
          if (fallbackRefreshToken) {
            body.refreshToken = fallbackRefreshToken;
            console.log('[Auth] Using fallback refresh token from localStorage');
          }
        }
        
        const response = await fetch(`${AUTH_API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Send and receive httpOnly cookies
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          let data = null;
          try {
            data = await response.json();
          } catch {
            data = null;
          }

          // Backend has set new httpOnly cookies
          const newCsrfToken = data?.csrfToken || data?.data?.csrfToken || null;
          if (newCsrfToken) {
            setCsrfToken(newCsrfToken);
            try {
              localStorage.setItem('xora_csrf_token', newCsrfToken);
            } catch {
              // localStorage may not be available
            }
          }

          const newAccessToken =
            data?.data?.tokens?.accessToken ||
            data?.data?.accessToken ||
            data?.tokens?.accessToken ||
            data?.accessToken ||
            null;

          if (newAccessToken) {
            setAccessToken(newAccessToken);
            accessTokenRef.current = newAccessToken;
          }
          
          // Update fallback refresh token ONLY in development
          if (import.meta.env.DEV) {
            const newRefreshToken = data?.refreshToken || data?.data?.refreshToken;
            if (newRefreshToken) {
              localStorage.setItem('xora_refresh_token_fallback', newRefreshToken);
              console.log('[Auth] Updated fallback refresh token in localStorage');
            }
          }

          console.log('[Auth] Token refreshed successfully - httpOnly cookies updated by browser');
          // Return the new access token so WebSocket can reconnect immediately
          return newAccessToken;
        }

        // Only logout on explicit 401 (session truly expired)
        if (response.status === 401) {
          console.warn('[Auth] Session expired (401), logging out...');
          logout();
          return null;
        }

        // Transient error - don't logout, just return null
        console.warn('[Auth] Token refresh failed with status:', response.status);
        return null;
      } catch (error) {
        // Network error - don't logout, user might be temporarily offline
        console.warn('[Auth] Token refresh network error:', error.message);
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [logout]);

  useEffect(() => {
    if (!user || accessToken || seededAccessTokenRef.current) return;
    seededAccessTokenRef.current = true;

    (async () => {
      try {
        await refreshAccessToken();
      } catch {
        // Ignore refresh errors - user may be offline
      }
    })();
  }, [user, accessToken, refreshAccessToken]);

  useEffect(() => {
    if (fetchInterceptorRef.current) return;

    const originalFetch = window.fetch;
    fetchInterceptorRef.current = originalFetch;

    const isApiRequest = (url) => {
      if (!url) return false;
      return url.startsWith(AUTH_API_URL) || url.startsWith(API_URL) || url.startsWith('/api');
    };

    // Interceptor now only handles automatic token refresh on 401, all auth via cookies + credentials
    window.fetch = async (input, init = {}) => {
      const response = await originalFetch(input, init);
      if (response.status !== 401) return response;

      const url = typeof input === 'string' ? input : input?.url;
      if (!isApiRequest(url)) return response;
      if (url && url.includes('/auth/refresh')) return response;
      if (url && url.includes('/auth/login')) return response;

      // Token might have expired, try refresh
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        console.log('[Auth] Token refresh failed, returning original 401 response');
        return response;
      }

      console.log('[Auth] Token refreshed, retrying request with credentials');
      // Retry request - browser will include fresh httpOnly cookie automatically
      return originalFetch(input, { ...init, credentials: 'include' });
    };

    return () => {
      if (fetchInterceptorRef.current) {
        window.fetch = fetchInterceptorRef.current;
        fetchInterceptorRef.current = null;
      }
    };
  }, [refreshAccessToken]);

  useEffect(() => {
    api.setOnUnauthorized(() => logout());
  }, [logout]);

  // Complete 2FA login
  const completeTwoFactorLogin = async (tempToken, code, { isBackupCode = false } = {}) => {
    if (!tempToken || !code) {
      throw new Error('Missing 2FA session or code');
    }

    const response = await fetch(`${API_URL}/auth/verify-2fa-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tempToken, code, isBackupCode }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      throw new Error(extractError(data, response.status, 'Invalid 2FA code'));
    }

    const payload = data.data || data || {};
    const userFromApi = normalizeUser(payload.user);
    const csrf = payload.csrfToken;
    const refreshToken = payload.tokens?.refreshToken || payload.refreshToken;
    const accessTokenFromResponse = payload.tokens?.accessToken || payload.accessToken;

    setUser(userFromApi);
    setCsrfToken(csrf);
    
    // Store access token in memory for WebSocket authentication
    if (accessTokenFromResponse) {
      setAccessToken(accessTokenFromResponse);
      accessTokenRef.current = accessTokenFromResponse;
    }

    // Cache user and CSRF token locally (token stays in httpOnly cookie)
    if (userFromApi) localStorage.setItem('xora_user', JSON.stringify(userFromApi));
    if (csrf) localStorage.setItem('xora_csrf_token', csrf);
    
    // Store refresh token as fallback in localStorage ONLY in development (for proxy issues)
    // Production uses httpOnly cookies exclusively for security
    if (refreshToken && import.meta.env.DEV) {
      localStorage.setItem('xora_refresh_token_fallback', refreshToken);
      console.log('[Auth] Stored refresh token in localStorage as fallback');
    }

    return { success: true };
  };

  // Token refresh is now automatic via httpOnly cookies + fetch interceptor
  // No need for proactive refresh - backend handles everything

  // Get current token synchronously from ref (for immediate use without waiting for state updates)
  const getCurrentAccessToken = useCallback(() => accessTokenRef.current, []);

  const value = {
    user,
    csrfToken,
    accessToken, // In-memory access token for WebSocket authentication
    loading,
    login,
    signup,
    completeSignup,
    logout,
    logoutAllDevices,
    verifyDevice,
    updateProfile,
    refreshAccessToken,
    getCurrentAccessToken, // Get current token synchronously from ref
    completeTwoFactorLogin,
    getCurrentUserId,
    isAuthenticated: Boolean(user) && sessionVerified,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};