// src/utils/sanitize.js

/**
 * Sanitizes a string for safe storage in Firebase.
 * Trims whitespace and removes characters that could cause issues
 * in Firebase paths or be used for injection.
 * @param {string} value - The string to sanitize.
 * @returns {string} The sanitized string.
 */
export function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    // Remove characters not allowed in Firebase RTDB paths
    .replace(/[.#$[\]]/g, '')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ');
}

/**
 * Validates an email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}
