import {
  DB_PATHS, ROLES, ALERT_TYPES, BOARD_COLORS,
  getUserDisplayName, isCaregiver, getLogUserId, getLogCarerId,
} from './schema';

describe('DB_PATHS', () => {
  const expectedPaths = [
    'USERS', 'USER_SETTINGS', 'USER_LOGS', 'SESSIONS',
    'FEEDBACK', 'FINE_TUNE_METRICS', 'USER_SYNC', 'ALERTS',
    'FAVORITES', 'CUSTOM_BOARDS', 'ARCHIVED_FEEDBACK', 'SYSTEM_CONFIG',
  ];

  it.each(expectedPaths)('has %s defined', (key) => {
    expect(DB_PATHS[key]).toBeDefined();
    expect(typeof DB_PATHS[key]).toBe('string');
    expect(DB_PATHS[key].length).toBeGreaterThan(0);
  });

  it('has no duplicate path values', () => {
    const values = Object.values(DB_PATHS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('ROLES', () => {
  it('has user, caregiver, and admin', () => {
    expect(ROLES.USER).toBe('user');
    expect(ROLES.CAREGIVER).toBe('caregiver');
    expect(ROLES.ADMIN).toBe('admin');
  });
});

describe('ALERT_TYPES', () => {
  it('has distress, inactivity, and vocabGap', () => {
    expect(ALERT_TYPES.DISTRESS).toBe('distress');
    expect(ALERT_TYPES.INACTIVITY).toBe('inactivity');
    expect(ALERT_TYPES.VOCAB_GAP).toBe('vocabGap');
  });
});

describe('BOARD_COLORS', () => {
  it('has 8 preset colors', () => {
    expect(BOARD_COLORS).toHaveLength(8);
    BOARD_COLORS.forEach(c => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });
});

describe('getUserDisplayName', () => {
  it('returns name when available', () => {
    expect(getUserDisplayName({ name: 'Alice', email: 'a@b.com' })).toBe('Alice');
  });

  it('falls back to email', () => {
    expect(getUserDisplayName({ email: 'a@b.com' })).toBe('a@b.com');
  });

  it('falls back to Unknown User', () => {
    expect(getUserDisplayName({})).toBe('Unknown User');
    expect(getUserDisplayName(null)).toBe('Unknown User');
    expect(getUserDisplayName(undefined)).toBe('Unknown User');
  });
});

describe('isCaregiver', () => {
  it('returns true for caregiver role', () => {
    expect(isCaregiver({ role: 'caregiver' })).toBe(true);
  });

  it('returns true for admin role', () => {
    expect(isCaregiver({ role: 'admin' })).toBe(true);
  });

  it('returns false for user role', () => {
    expect(isCaregiver({ role: 'user' })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isCaregiver(null)).toBe(false);
    expect(isCaregiver(undefined)).toBe(false);
  });
});

describe('getLogUserId', () => {
  it('returns targetUserId when present', () => {
    expect(getLogUserId({ targetUserId: 'abc', userId: 'def' })).toBe('abc');
  });

  it('falls back to userId', () => {
    expect(getLogUserId({ userId: 'def' })).toBe('def');
  });

  it('returns null when neither present', () => {
    expect(getLogUserId({})).toBe(null);
    expect(getLogUserId(null)).toBe(null);
  });
});

describe('getLogCarerId', () => {
  it('returns carerId when present', () => {
    expect(getLogCarerId({ carerId: 'abc' })).toBe('abc');
  });

  it('returns null when not present', () => {
    expect(getLogCarerId({})).toBe(null);
    expect(getLogCarerId(null)).toBe(null);
  });
});
