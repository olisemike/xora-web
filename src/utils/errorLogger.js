/**
 * Sentry Error Logging Utility (Web)
 * 
 * Centralizes error logging to Sentry with helpful context
 * Usage:
 *   import { logError, logMessage, setUserContext } from './utils/errorLogger';
 */

import * as Sentry from '@sentry/react';

/**
 * Log an error to Sentry with context
 * @param {Error} error - The error object
 * @param {Object} context - Additional context
 * @param {string} context.feature - Feature name (e.g., 'auth', 'posts')
 * @param {string} context.action - Action being performed
 * @param {Object} context.extra - Any extra data
 */
export const logError = (error, context = {}) => {
  if (import.meta.env.DEV) {return;
  }

  const { feature, action, extra = {} } = context;

  Sentry.captureException(error, {
    tags: {
      feature: feature || 'unknown',
      action: action || 'unknown',
    },
    extra: {
      ...extra,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Log a message to Sentry (non-error)
 * @param {string} message - The message to log
 * @param {string} level - Severity level: 'info', 'warning', 'error'
 * @param {Object} extra - Additional data
 */
export const logMessage = (message, level = 'info', extra = {}) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[${level.toUpperCase()}]`, message);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: {
      ...extra,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Set user context for error tracking
 * @param {Object} user - User information
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.username - Username
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return undefined;
  const [name, domain] = email.split('@');
  if (!name || !domain) return undefined;
  const safeName = name.length <= 2 ? `${name[0]}*` : `${name[0]}***${name[name.length - 1]}`;
  return `${safeName}@${domain}`;
};

export const setUserContext = (user) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: maskEmail(user.email),
    username: user.username,
  });
};

/**
 * Clear user context (on logout)
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 * @param {string} message - Breadcrumb message
 * @param {string} category - Category (e.g., 'navigation', 'api', 'user-action')
 * @param {Object} data - Additional data
 */
export const addBreadcrumb = (message, category = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Example usage:
 * 
 * // In AuthContext after login:
 * setUserContext({
 *   id: user.id,
 *   email: user.email,
 *   username: user.username
 * });
 * 
 * // When catching an error:
 * try {
 *   await api.createPost(data);
 * } catch (error) {
 *   logError(error, {
 *     feature: 'posts',
 *     action: 'create_post',
 *     extra: { postId: data.id, hasMedia: !!data.media }
 *   });
 *   throw error;
 * }
 * 
 * // On logout:
 * clearUserContext();
 */



