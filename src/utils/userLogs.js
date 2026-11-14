// Reading activity logs (backlog item B-2).
//
// The app writes each person's logs under userLogs/{uid}/{pushId} (app commit
// ed2d27f, 2026-03-29). The dashboard used to read userLogs as one flat map,
// so every row came back undefined and "active today" was always 0. These
// helpers read one person at a time, newest first, and merge the results.
//
// Each per-person query is ordered by timestamp, which needs the index
// "userLogs": {"$uid": {".indexOn": ["timestamp"]}} in the database rules
// (backlog item B-3, in the app repository). Without it Firebase still
// answers, but downloads the whole of that person's logs and sorts locally.

import { ref, get, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { DB_PATHS } from '../shared/schema';

/** The location the app writes one person's logs to. */
export function userLogsPath(uid) {
  return `${DB_PATHS.USER_LOGS}/${uid}`;
}

/**
 * Turn the value stored at userLogs/{uid} into log rows.
 * Rows without a targetUserId take the uid they are stored under.
 */
export function logsFromSnapshot(uid, value) {
  return Object.entries(value || {})
    .filter(([, log]) => log !== null && typeof log === 'object')
    .map(([id, log]) => ({ id, ...log, targetUserId: log.targetUserId || uid }));
}

/** Newest first, at most `limit` rows. */
export function newestFirst(logs, limit = Infinity) {
  return [...logs]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit);
}

function uniqueIds(uids) {
  return [...new Set((uids || []).filter(Boolean))];
}

function recentQuery(uid, perUser) {
  return query(ref(db, userLogsPath(uid)), orderByChild('timestamp'), limitToLast(perUser));
}

/**
 * Fetch the most recent logs for each uid once.
 * Resolves to { logs, failed }: `failed` counts the people whose logs could
 * not be read (for example, denied by the rules), so a caller can tell
 * "nothing happened" apart from "could not look".
 */
export async function fetchRecentLogs(uids, { perUser = 200, total = 200 } = {}) {
  const ids = uniqueIds(uids);
  const results = await Promise.allSettled(
    ids.map(uid => get(recentQuery(uid, perUser)).then(snap => logsFromSnapshot(uid, snap.val())))
  );
  const logs = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  const failed = results.filter(r => r.status === 'rejected').length;
  return { logs: newestFirst(logs, total), failed };
}

/**
 * Keep the most recent logs for each uid up to date.
 * Calls onChange with the merged rows whenever any person's logs change.
 * Returns a function that stops every listener.
 */
export function subscribeRecentLogs(uids, onChange, { perUser = 50, total = 50, onError } = {}) {
  const ids = uniqueIds(uids);
  if (ids.length === 0) {
    onChange([]);
    return () => {};
  }
  const byUser = {};
  const stops = ids.map(uid =>
    onValue(
      recentQuery(uid, perUser),
      snap => {
        byUser[uid] = logsFromSnapshot(uid, snap.val());
        onChange(newestFirst(Object.values(byUser).flat(), total));
      },
      err => { if (onError) onError(err, uid); }
    )
  );
  return () => stops.forEach(stop => stop());
}
