// src/services/firebase.js
// Consistent helper functions for Firebase Realtime Database operations.
// All collection paths and field names are centralized here to avoid mismatches
// with the companion AAC app.

import { ref, get, push, set, update, remove, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';

// ── Collection paths (must match the AAC app's paths) ──
export const PATHS = {
  USERS: 'users',
  CAREGIVERS: 'caregivers',
  USER_LOGS: 'userLogs',
  USER_SYNC: 'userSync',
  FINE_TUNE_METRICS: 'fineTuneMetrics',
};

// ── User fields expected by the AAC app ──
// { name, email, caregiverId?, createdAt, role? }
//
// ── UserLog fields expected by the AAC app ──
// { userId, action, timestamp, targetUserId?, carerId? }
//
// ── UserSync fields expected by the AAC app ──
// { lastActivity }
//
// ── FineTuneMetrics fields ──
// { epoch, loss, accuracy }

/**
 * Fetches all entries from a given RTDB path and returns them as an array
 * with each entry's key set as `id`.
 * @param {string} path - The RTDB path to read from.
 * @returns {Promise<Array>} Array of objects with `id` field.
 */
export async function fetchCollection(path) {
  const snap = await get(ref(db, path));
  const data = snap.val();
  if (!data) return [];
  return Object.entries(data).map(([id, val]) => ({ id, ...val }));
}

/**
 * Subscribes to a collection with onValue and returns the unsubscribe function.
 * Calls `callback` with the parsed array on each update.
 * @param {string} path - The RTDB path.
 * @param {Function} callback - Called with Array of { id, ...fields }.
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToCollection(path, callback) {
  const dbRef = ref(db, path);
  return onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    callback(list);
  });
}

/**
 * Fetches recent logs, sorted by timestamp descending.
 * @param {number} limit - Max number of logs to fetch.
 * @returns {Promise<Array>}
 */
export async function fetchRecentLogs(limit = 100) {
  const logsQuery = query(
    ref(db, PATHS.USER_LOGS),
    orderByChild('timestamp'),
    limitToLast(limit)
  );
  const snap = await get(logsQuery);
  const data = snap.val();
  if (!data) return [];
  return Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Creates a new entry in a collection (push + set).
 * @param {string} path - The RTDB path.
 * @param {Object} data - The data to write.
 * @returns {Promise<string>} The new entry's key.
 */
export async function createEntry(path, data) {
  const newRef = push(ref(db, path));
  await set(newRef, data);
  return newRef.key;
}

/**
 * Updates fields on an existing entry.
 * @param {string} path - The full RTDB path (e.g., 'users/abc123').
 * @param {Object} fields - The fields to update.
 */
export async function updateEntry(path, fields) {
  await update(ref(db, path), fields);
}

/**
 * Removes an entry.
 * @param {string} path - The full RTDB path (e.g., 'caregivers/abc123').
 */
export async function removeEntry(path) {
  await remove(ref(db, path));
}

// ── Firebase Realtime Database Security Rules (suggested) ──
//
// These rules should be deployed to Firebase to match the dashboard's access patterns.
// The dashboard assumes:
//   - Admins can read/write all paths
//   - Caregivers can read 'users' (to find their assigned users), read 'userLogs',
//     read 'userSync', and write 'users/{uid}/caregiverId' for assignment
//   - Authenticated users can read their own data and write to 'userLogs'
//
// Suggested rules:
// {
//   "rules": {
//     "users": {
//       ".read": "auth != null",
//       "$uid": {
//         ".write": "auth != null && (root.child('users/' + auth.uid + '/role').val() === 'admin' || auth.uid === $uid)"
//       }
//     },
//     "caregivers": {
//       ".read": "auth != null",
//       ".write": "auth != null && auth.token.role === 'admin'"
//     },
//     "userLogs": {
//       ".read": "auth != null",
//       ".write": "auth != null"
//     },
//     "userSync": {
//       ".read": "auth != null",
//       "$uid": {
//         ".write": "auth != null && auth.uid === $uid"
//       }
//     },
//     "fineTuneMetrics": {
//       ".read": "auth != null",
//       ".write": "auth != null && auth.token.role === 'admin'"
//     }
//   }
// }
