// Input Validation and Sanitization Utilities

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} html - Raw HTML string
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTML = (html) => {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
};

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Get password strength label
 * @param {number} strength
 * @returns {string}
 */
const getStrengthLabel = (strength) => {
  if (strength <= 1) return 'Very Weak';
  if (strength === 2) return 'Weak';
  if (strength === 3) return 'Fair';
  if (strength === 4) return 'Good';
  return 'Strong';
};

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} - {isValid, errors, strength}
 */
export const validatePassword = (password) => {
  const errors = [];
  let strength = 0;

  if (!password) {
    return { isValid: false, errors: ['Password is required'], strength: 0 };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else {
    strength++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    strength++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    strength++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    strength++;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    strength++;
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: Math.min(strength, 5),
    strengthLabel: getStrengthLabel(strength)
  };
};

/**
 * Validate username
 * @param {string} username
 * @returns {object}
 */
export const validateUsername = (username) => {
  const errors = [];

  if (!username) {
    return { isValid: false, errors: ['Username is required'] };
  }

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }

  if (username.length > 30) {
    errors.push('Username must not exceed 30 characters');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  if (/^[0-9]/.test(username)) {
    errors.push('Username cannot start with a number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input
 * @returns {string}
 */
export const sanitizeInput = (input) => {
  if (!input) return '';

  return String(input)
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

/**
 * Validate file upload
 * @param {File} file
 * @param {object} options
 * @returns {object}
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10485760, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  const errors = [];

  if (!file) {
    return { isValid: false, errors: ['No file selected'] };
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${(maxSize / 1048576).toFixed(1)}MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check file extension
  const extension = `.${  file.name.split('.').pop().toLowerCase()}`;
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }

  // Check for double extensions (potential security risk)
  const nameParts = file.name.split('.');
  if (nameParts.length > 2) {
    errors.push('Files with multiple extensions are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate URL
 * @param {string} url
 * @returns {boolean}
 */
export const isValidURL = (url) => {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Sanitize URL to prevent open redirect attacks
 * @param {string} url
 * @param {string} allowedDomain
 * @returns {string|null}
 */
export const sanitizeURL = (url, allowedDomain = null) => {
  if (!isValidURL(url)) return null;

  try {
    const urlObj = new URL(url);

    // Check if domain is allowed
    if (allowedDomain && urlObj.hostname !== allowedDomain) {
      return null;
    }

    // Prevent javascript: and data: protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return null;
    }

    return urlObj.href;
  } catch {
    return null;
  }
};

/**
 * Escape special regex characters
 * @param {string} string
 * @returns {string}
 */
export const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validate phone number (basic)
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate age (must be 13+)
 * @param {Date|string} birthDate
 * @returns {object}
 */
export const validateAge = (birthDate) => {
  if (!birthDate) {
    return { isValid: false, errors: ['Birth date is required'] };
  }

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 13) {
    return {
      isValid: false,
      errors: ['You must be at least 13 years old to use this service']
    };
  }

  if (age > 120) {
    return {
      isValid: false,
      errors: ['Please enter a valid birth date']
    };
  }

  return { isValid: true, errors: [], age };
};

/**
 * Rate limit helper (client-side throttling)
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export const throttle = (fn, delay) => {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
};

/**
 * Debounce helper
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export const debounce = (fn, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};



