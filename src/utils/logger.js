import { getAuth } from 'firebase/auth';
import { ref, push } from 'firebase/database';
import { db } from '../firebaseConfig';
import { DB_PATHS } from '../shared/schema';

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

  // Written under the signed-in person's own userLogs/{uid}, the layout the
  // app uses and the only one the database rules allow them to write.
  try {
    if (carerId) await push(ref(db, `${DB_PATHS.USER_LOGS}/${carerId}`), logEntry);
  } catch {
    // Firebase write failed — fall through to localStorage backup
  }

  try {
    const stored = localStorage.getItem('dashboardLogs');
    const logsArray = stored ? JSON.parse(stored) : [];
    logsArray.push(logEntry);
    if (logsArray.length > 200) logsArray.splice(0, logsArray.length - 200);
    localStorage.setItem('dashboardLogs', JSON.stringify(logsArray));
  } catch {
    // localStorage unavailable
  }
}
