/**
 * Shared schema constants for the CommAI AAC platform.
 *
 * These constants define the Firebase data contract between
 * the AAC app (React Native) and the dashboard (React web).
 *
 * IMPORTANT: Any changes here must be reflected in both codebases.
 */

// ── Firebase Realtime Database Paths ──

export const DB_PATHS = {
  USERS: 'users',                    // users/{uid}
  USER_SETTINGS: 'userSettings',     // userSettings/{uid}
  USER_LOGS: 'userLogs',            // userLogs/{pushId}
  USER_SYNC: 'userSync',            // userSync/{uid}
  FEEDBACK: 'feedback',             // feedback/{uid}/{pushId}
  FINE_TUNE_METRICS: 'fineTuneMetrics', // fineTuneMetrics/{pushId}
};

// ── User Roles ──
// Roles are stored in users/{uid}/role
// Admin role is set via Firebase custom claims AND in the DB

export const ROLES = {
  USER: 'user',
  CAREGIVER: 'caregiver',
  ADMIN: 'admin',
};

// ── User Profile Schema ──
// Path: users/{uid}
// Key: Firebase Auth UID (NOT a push ID)

export const USER_FIELDS = {
  EMAIL: 'email',           // string - from Firebase Auth
  NAME: 'name',             // string - display name (optional from app, required from dashboard)
  ROLE: 'role',             // 'user' | 'caregiver' | 'admin'
  CAREGIVER_ID: 'caregiverId', // string | null - UID of assigned caregiver (from users collection)
  CREATED_AT: 'createdAt',  // number - Date.now() at creation
};

// ── User Settings Schema ──
// Path: userSettings/{uid}

export const SETTINGS_DEFAULTS = {
  theme: 'light',           // 'light' | 'dark' | 'highContrast'
  gridSize: 3,              // 2 | 3 | 4
  contrast: false,          // boolean
  speechRate: 1.0,          // 0.5 - 1.5
  speechPitch: 1.0,         // 0.5 - 1.5
  speechVoice: null,        // string | null
};

// ── Log Entry Schema ──
// Path: userLogs/{pushId}
// The app writes logs with these fields:

export const LOG_FIELDS = {
  TARGET_USER_ID: 'targetUserId',  // string - the AAC user this log is about
  CARER_ID: 'carerId',            // string | null - the caregiver performing the action
  ACTION: 'action',                // string - action type
  TIMESTAMP: 'timestamp',         // number - Date.now()
  LEVEL: 'level',                 // 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  SESSION_ID: 'sessionId',        // string - session identifier
  DEVICE_INFO: 'deviceInfo',      // { platform, appVersion }
};

// ── Log Action Types ──
// These are the action strings the app writes

export const LOG_ACTIONS = {
  EMOTION_SELECTED: 'Emotion selected',
  EMOTION_SPOKEN: 'Emotion spoken',
  EMOTION_SAVED: 'Emotion saved',
  USER_LOGGED_IN: 'User logged in',
  LOGIN_ERROR: 'Login error',
  PREDICTION_REQUEST: 'prediction_request',
  PREDICTION_LEARNING: 'prediction_learning',
  MODEL_FINE_TUNING: 'model_fine_tuning',
  LOGS_SYNCED: 'logs_synced',
  ADD_WORD: 'addWord',
  WORD_SPOKEN: 'word_spoken',
  SENTENCE_SPOKEN: 'sentence_spoken',
  BOARD_TAP: 'board_tap',
};

// ── Log Levels ──

export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// ── Feedback Schema ──
// Path: feedback/{uid}/{pushId}

export const FEEDBACK_FIELDS = {
  NAME: 'name',
  EMAIL: 'email',
  ROLE: 'role',
  FEEDBACK: 'feedback',
  TIMESTAMP: 'timestamp',
};

// ── Fine-Tune Metrics Schema ──
// Path: fineTuneMetrics/{pushId}

export const FINE_TUNE_FIELDS = {
  EPOCH: 'epoch',
  LOSS: 'loss',
  ACCURACY: 'accuracy',
  TIMESTAMP: 'timestamp',
};

// ── Theme Values ──

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  HIGH_CONTRAST: 'highContrast',
};

// ── Emotions (from app) ──

export const EMOTIONS = [
  'Happy', 'Sad', 'Angry', 'Excited',
  'Scared', 'Calm', 'Tired', 'Surprised',
];

/**
 * Helper: get user display name with fallback
 */
export function getUserDisplayName(user) {
  return user?.name || user?.email || 'Unknown User';
}

/**
 * Helper: check if a user record is a caregiver
 */
export function isCaregiver(user) {
  return user?.role === ROLES.CAREGIVER || user?.role === ROLES.ADMIN;
}

/**
 * Helper: get the correct user ID field from a log entry.
 * The app writes targetUserId; legacy/test writes userId.
 */
export function getLogUserId(log) {
  return log?.targetUserId || log?.userId || null;
}

/**
 * Helper: get the caregiver ID from a log entry.
 */
export function getLogCarerId(log) {
  return log?.carerId || null;
}
