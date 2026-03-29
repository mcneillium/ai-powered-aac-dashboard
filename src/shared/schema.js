/**
 * Shared data contracts between dashboard and mobile app.
 *
 * This file is the single source of truth for the Realtime Database schema.
 * Both the dashboard and mobile workstreams should import from here (or from
 * the equivalent documentation) when building read/write logic.
 *
 * These constants describe structure only — they are NOT runtime validators.
 * Runtime enforcement is handled by database.rules.json (server-side).
 */

// ── Database paths ──────────────────────────────────────────────────────────

export const DB_PATHS = {
  USERS: 'users',
  CAREGIVER_ASSIGNMENTS: 'caregiverAssignments',
  CAREGIVERS: 'caregivers',
  USER_LOGS: 'userLogs',
  USER_SYNC: 'userSync',
  CUSTOM_VOCAB: 'customVocab',
  VOCAB_REQUESTS: 'vocabRequests',
  USER_SETTINGS: 'userSettings',
  FINE_TUNE_METRICS: 'fineTuneMetrics',
};

// ── Role constants ──────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  CAREGIVER: 'caregiver',
};

export const VALID_ROLES = [ROLES.ADMIN, ROLES.CAREGIVER];

// ── User profile schema ─────────────────────────────────────────────────────
// Path: /users/{uid}

export const USER_FIELDS = {
  name: { type: 'string', required: true, maxLength: 200 },
  email: { type: 'string', required: true, format: 'email' },
  role: { type: 'string', required: false, enum: VALID_ROLES, note: 'Set via custom claims only' },
  caregiverId: { type: 'string|null', required: false, note: 'UID of assigned caregiver' },
  createdAt: { type: 'number', required: false, note: 'Epoch ms' },
};

// ── Caregiver profile schema ────────────────────────────────────────────────
// Path: /caregivers/{id}

export const CAREGIVER_FIELDS = {
  name: { type: 'string', required: true, maxLength: 200 },
  email: { type: 'string', required: true, format: 'email' },
};

// ── Activity log schema ─────────────────────────────────────────────────────
// Path: /userLogs/{logId}

export const LOG_FIELDS = {
  action: { type: 'string', required: true, maxLength: 500 },
  timestamp: { type: 'number', required: true, note: 'Epoch ms' },
  targetUserId: { type: 'string', required: false, note: 'The AAC user the action relates to' },
  carerId: { type: 'string', required: false, note: 'The caregiver who performed the action' },
  userId: { type: 'string', required: false, note: 'Legacy field — prefer targetUserId' },
};

// ── User sync status schema ─────────────────────────────────────────────────
// Path: /userSync/{userId}

export const SYNC_FIELDS = {
  lastActivity: { type: 'number', required: false, note: 'Epoch ms, updated by mobile app per session' },
};

// ── Fine-tune metrics schema ────────────────────────────────────────────────
// Path: /fineTuneMetrics/{metricId}

export const METRIC_FIELDS = {
  epoch: { type: 'number', required: true },
  loss: { type: 'number', required: false },
  accuracy: { type: 'number', required: false },
};

// ── Access control summary ──────────────────────────────────────────────────

export const ACCESS_CONTROL = {
  users: {
    read: 'self OR assigned caregiver OR admin (no collection-level read)',
    write: 'admin only (via auth.token.role)',
    caregiverId: 'admin OR caregiver self-assign (auth.uid === newData.val())',
    role: 'admin only; validated to enum [admin, caregiver]',
  },
  caregiverAssignments: {
    read: 'own assignments (auth.uid === $caregiverUid) OR admin',
    write: 'admin only',
    note: 'Source of truth for who a caregiver can access. Written atomically with users/{uid}/caregiverId.',
  },
  caregivers: {
    read: 'admin only',
    write: 'admin only',
  },
  userLogs: {
    read: 'self OR assigned caregiver OR admin (per-user: /userLogs/{uid})',
    write: 'self OR assigned caregiver OR admin',
    validation: 'must include action (string ≤500) and timestamp (number)',
  },
  userSync: {
    read: 'self OR assigned caregiver OR admin',
    write: 'self OR admin',
  },
  customVocab: {
    read: 'self OR assigned caregiver OR admin',
    write: 'self OR admin',
  },
  vocabRequests: {
    read: 'self OR assigned caregiver OR admin',
    write: 'self OR admin',
  },
  userSettings: {
    read: 'self OR admin',
    write: 'self OR admin',
  },
  fineTuneMetrics: {
    read: 'admin only',
    write: 'admin only',
    validation: 'must include epoch (number)',
  },
};

// ── Cloud Function contracts ────────────────────────────────────────────────

export const CLOUD_FUNCTIONS = {
  setUserPassword: {
    method: 'POST',
    region: 'europe-west1',
    auth: 'Bearer token with admin custom claim',
    body: { uid: 'string', newPassword: 'string (8+ chars, upper+lower+digit)' },
    responses: {
      200: '{ message: "Password updated successfully!" }',
      400: 'Validation error',
      401: 'Missing/invalid auth token',
      403: 'Non-admin user',
      404: 'User not found',
      405: 'Wrong HTTP method',
      500: 'Internal error (generic)',
    },
  },
};
