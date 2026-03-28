/**
 * Extract error message from backend response
 * Backend returns: { success: false, error: { message, code, details } }
 * But some places expect: { error: "string" }
 */
export const extractError = (data, status, fallback) => {
  if (!data) {
    return fallback || `Request failed (${status})`;
  }

  // If error is already a string
  if (typeof data.error === 'string') {
    return data.error;
  }

  // If error is an object with message property
  if (data.error && typeof data.error.message === 'string') {
    return data.error.message;
  }

  // Fallback to top-level message
  if (typeof data.message === 'string') {
    return data.message;
  }

  return fallback || `Request failed (${status})`;
};



