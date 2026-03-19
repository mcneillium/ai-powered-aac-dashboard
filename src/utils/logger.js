// src/utils/logger.js
import { getAuth } from 'firebase/auth';
import { ref, push } from 'firebase/database';
import { db } from '../firebaseConfig';
import { DB_PATHS } from '../shared/schema';

/**
 * Logs an event to Firebase directly (web dashboard version).
 * Also stores locally in localStorage as a backup.
 *
 * @param {string} action - Description of the event
 * @param {Object} [metadata={}] - Additional data
 */
export async function logEvent(action, metadata = {}) {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const targetUserId = metadata.targetUserId || (currentUser ? currentUser.uid : null);
  const carerId = currentUser ? currentUser.uid : null;

  const logEntry = {
    targetUserId,
    carerId,
    action,
    timestamp: Date.now(),
    level: metadata.level || 'INFO',
    source: 'dashboard',
    ...metadata
  };

  try {
    await push(ref(db, DB_PATHS.USER_LOGS), logEntry);
  } catch (error) {
    console.error('Error pushing log to Firebase:', error);
  }

  try {
    const stored = localStorage.getItem('dashboardLogs');
    const logsArray = stored ? JSON.parse(stored) : [];
    logsArray.push(logEntry);
    if (logsArray.length > 200) logsArray.splice(0, logsArray.length - 200);
    localStorage.setItem('dashboardLogs', JSON.stringify(logsArray));
  } catch (error) {
    console.error('Error logging event:', error);
  }
}
