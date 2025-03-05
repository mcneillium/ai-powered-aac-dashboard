// src/utils/logger.js
import { getAuth } from 'firebase/auth';
import { ref, push } from 'firebase/database';
import { db } from '../firebaseConfig.js';

/**
 * Logs an event to the "userLogs" node in Firebase.
 * @param {string} action - A description of the event.
 * @param {Object} [metadata={}] - Additional data about the event.
 *   Optional property: targetUserId (the user for whom the action is intended)
 */
export function logEvent(action, metadata = {}) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  // If a targetUserId is provided, use that; otherwise, default to the current user's UID
  const targetUserId = metadata.targetUserId || (currentUser ? currentUser.uid : null);
  // The carerId is always the current authenticated user performing the action
  const carerId = currentUser ? currentUser.uid : null;
  
  const logsRef = ref(db, 'userLogs');
  push(logsRef, {
    targetUserId, // the user the action is about
    carerId,      // the caregiver who performed the action
    action,
    timestamp: Date.now(),
    ...metadata
  });
}
