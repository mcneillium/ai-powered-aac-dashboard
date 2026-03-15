// src/utils/logger.js
import { getAuth } from 'firebase/auth';
import { ref, push } from 'firebase/database';
import { db } from '../firebaseConfig';

/**
 * Logs an event to Firebase directly (web dashboard version).
 * Also stores locally in localStorage as a backup.
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
    source: 'dashboard',
    ...metadata
  };

  try {
    const logsRef = ref(db, 'userLogs');
    await push(logsRef, logEntry);
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
    console.error('Error saving log locally:', error);
  }
}
