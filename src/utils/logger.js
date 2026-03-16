// src/utils/logger.js
import { getAuth } from 'firebase/auth';

/**
 * Logs an event by saving it locally to localStorage.
 * Later, these logs can be pushed manually to Firebase.
 *
 * @param {string} action - A description of the event.
 * @param {Object} [metadata={}] - Additional data about the event.
 *   Optional property: targetUserId (the user for whom the action is intended)
 */
export async function logEvent(action, metadata = {}) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  // If a targetUserId is provided, use that; otherwise, default to the current user's UID
  const targetUserId = metadata.targetUserId || (currentUser ? currentUser.uid : null);
  // The carerId is always the current authenticated user performing the action
  const carerId = currentUser ? currentUser.uid : null;

  // Create the log entry object
  const logEntry = {
    targetUserId, // the user the action is about
    carerId,      // the caregiver who performed the action
    action,
    timestamp: Date.now(),
    ...metadata
  };

  try {
    // Retrieve existing logs from localStorage
    const storedLogs = localStorage.getItem('userInteractionLog');
    let logsArray = storedLogs ? JSON.parse(storedLogs) : [];
    // Append the new log entry
    logsArray.push(logEntry);
    // Save the updated logs back to localStorage
    localStorage.setItem('userInteractionLog', JSON.stringify(logsArray));
    console.log('Log saved locally:', logEntry);
  } catch (error) {
    console.error('Error saving log locally:', error);
  }
}
