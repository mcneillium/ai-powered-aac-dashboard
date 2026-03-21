// src/utils/logger.js
import { ref, push } from 'firebase/database';
import { db, auth } from '../firebaseConfig';

const LOG_STORAGE_KEY = 'commai_pending_logs';

/**
 * Logs an event to Firebase Realtime Database with offline fallback.
 *
 * @param {string} action - Description of the event.
 * @param {Object} [metadata={}] - Additional data. May include targetUserId.
 */
export async function logEvent(action, metadata = {}) {
  const currentUser = auth.currentUser;
  const targetUserId = metadata.targetUserId || (currentUser ? currentUser.uid : null);
  const carerId = currentUser ? currentUser.uid : null;

  const logEntry = {
    targetUserId,
    carerId,
    action,
    timestamp: Date.now(),
    ...metadata,
    // Remove targetUserId from spread to avoid duplication
  };
  // Ensure targetUserId is set correctly after spread
  logEntry.targetUserId = targetUserId;

  try {
    await push(ref(db, 'userLogs'), logEntry);
  } catch (error) {
    console.error('Failed to push log to Firebase, saving locally:', error);
    saveLogLocally(logEntry);
  }
}

/**
 * Saves a log entry to localStorage for later syncing.
 */
function saveLogLocally(logEntry) {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    const logs = stored ? JSON.parse(stored) : [];
    logs.push(logEntry);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save log locally:', err);
  }
}

/**
 * Flushes any locally stored logs to Firebase.
 * Call this when connectivity is restored.
 */
export async function flushPendingLogs() {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (!stored) return;

    const logs = JSON.parse(stored);
    if (!logs.length) return;

    const promises = logs.map((entry) => push(ref(db, 'userLogs'), entry));
    await Promise.all(promises);
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to flush pending logs:', err);
  }
}
