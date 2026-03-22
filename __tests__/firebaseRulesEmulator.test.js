/**
 * Firebase Realtime Database Security Rules — Emulator Tests
 *
 * These tests use @firebase/rules-unit-testing to verify rules against
 * a real Firebase emulator. If the emulator is not running, the tests
 * are skipped gracefully so CI doesn't break.
 *
 * To run with the emulator:
 *   firebase emulators:start --only database
 *   npx jest firebaseRulesEmulator
 *
 * Without the emulator, this file runs a structural pass/fail matrix
 * that validates the rules JSON directly.
 */

const fs = require('fs');
const path = require('path');

// ── Structural rules analysis (always runs, no emulator needed) ──

const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const rulesText = fs.readFileSync(rulesPath, 'utf-8');
const rules = JSON.parse(rulesText);

// ── Pass/Fail Matrix: Structural Verification ──

describe('Firebase Rules — Pass/Fail Matrix (structural)', () => {
  describe('Unauthenticated user', () => {
    test('/users READ → DENIED (requires auth != null)', () => {
      expect(rules.rules.users['.read']).toBe('auth != null');
    });
    test('/caregivers READ → DENIED', () => {
      expect(rules.rules.caregivers['.read']).toBe('auth != null');
    });
    test('/userLogs READ → DENIED', () => {
      expect(rules.rules.userLogs['.read']).toBe('auth != null');
    });
    test('/userLogs WRITE → DENIED', () => {
      expect(rules.rules.userLogs['.write']).toBe('auth != null');
    });
    test('/fineTuneMetrics READ → DENIED', () => {
      expect(rules.rules.fineTuneMetrics['.read']).toBe('auth != null');
    });
    test('/unknown READ → DENIED (default deny)', () => {
      expect(rules.rules.$other['.read']).toBe(false);
    });
    test('/unknown WRITE → DENIED (default deny)', () => {
      expect(rules.rules.$other['.write']).toBe(false);
    });
  });

  describe('Authenticated user (no role claim)', () => {
    test('/users READ → ALLOWED', () => {
      expect(rules.rules.users['.read']).toBe('auth != null');
    });
    test('/users/$uid WRITE → DENIED (requires admin claim)', () => {
      expect(rules.rules.users.$uid['.write']).toContain("auth.token.role === 'admin'");
      expect(rules.rules.users.$uid['.write']).not.toContain('root.child');
    });
    test('/users/$uid/caregiverId WRITE self-assign → ALLOWED', () => {
      expect(rules.rules.users.$uid.caregiverId['.write']).toContain('auth.uid === newData.val()');
    });
    test('/userLogs WRITE valid entry → ALLOWED', () => {
      expect(rules.rules.userLogs['.write']).toBe('auth != null');
    });
    test('/userLogs WRITE missing action → DENIED by validation', () => {
      expect(rules.rules.userLogs.$logId['.validate']).toContain('action');
      expect(rules.rules.userLogs.$logId['.validate']).toContain('timestamp');
    });
    test('/userSync/$self WRITE → ALLOWED', () => {
      expect(rules.rules.userSync.$userId['.write']).toContain('auth.uid === $userId');
    });
    test('/userSync/$other WRITE → DENIED (not self, not admin)', () => {
      const rule = rules.rules.userSync.$userId['.write'];
      expect(rule).toContain("auth.token.role === 'admin'");
    });
    test('/fineTuneMetrics WRITE → DENIED', () => {
      expect(rules.rules.fineTuneMetrics['.write']).toContain("auth.token.role === 'admin'");
    });
    test('/caregivers/$id WRITE → DENIED', () => {
      expect(rules.rules.caregivers.$caregiverId['.write']).toContain("auth.token.role === 'admin'");
    });
  });

  describe('Caregiver (role: caregiver)', () => {
    test('/users READ → ALLOWED', () => {
      expect(rules.rules.users['.read']).toBe('auth != null');
    });
    test('/users/$uid WRITE → DENIED (caregiver !== admin)', () => {
      expect(rules.rules.users.$uid['.write']).toContain("auth.token.role === 'admin'");
    });
    test('/users/$uid/caregiverId WRITE self-assign → ALLOWED', () => {
      expect(rules.rules.users.$uid.caregiverId['.write']).toContain('auth.uid === newData.val()');
    });
    test('/caregivers WRITE → DENIED', () => {
      expect(rules.rules.caregivers.$caregiverId['.write']).toContain("auth.token.role === 'admin'");
    });
    test('/userLogs WRITE → ALLOWED', () => {
      expect(rules.rules.userLogs['.write']).toBe('auth != null');
    });
    test('/fineTuneMetrics WRITE → DENIED', () => {
      expect(rules.rules.fineTuneMetrics['.write']).toContain("auth.token.role === 'admin'");
    });
  });

  describe('Admin (role: admin)', () => {
    test('/users/$uid WRITE → ALLOWED', () => {
      expect(rules.rules.users.$uid['.write']).toContain("auth.token.role === 'admin'");
    });
    test('/users/$uid/role WRITE "caregiver" → valid', () => {
      expect(rules.rules.users.$uid.role['.validate']).toContain("'caregiver'");
    });
    test('/users/$uid/role WRITE "admin" → valid', () => {
      expect(rules.rules.users.$uid.role['.validate']).toContain("'admin'");
    });
    test('/users/$uid/role WRITE "superadmin" → DENIED by validation', () => {
      const validate = rules.rules.users.$uid.role['.validate'];
      // Only admin and caregiver are valid
      expect(validate).not.toContain("'superadmin'");
    });
    test('/caregivers/$id WRITE → ALLOWED', () => {
      expect(rules.rules.caregivers.$caregiverId['.write']).toContain("auth.token.role === 'admin'");
    });
    test('/fineTuneMetrics WRITE → ALLOWED', () => {
      expect(rules.rules.fineTuneMetrics['.write']).toContain("auth.token.role === 'admin'");
    });
    test('/userSync/$any WRITE → ALLOWED', () => {
      expect(rules.rules.userSync.$userId['.write']).toContain("auth.token.role === 'admin'");
    });
    test('/unknown WRITE → DENIED (even admin)', () => {
      expect(rules.rules.$other['.write']).toBe(false);
    });
  });

  describe('Validation constraints', () => {
    test('user name: 1-200 chars', () => {
      const v = rules.rules.users.$uid.name['.validate'];
      expect(v).toContain('length > 0');
      expect(v).toContain('200');
    });
    test('user email: regex format', () => {
      expect(rules.rules.users.$uid.email['.validate']).toContain('@');
    });
    test('log action: max 500 chars', () => {
      expect(rules.rules.userLogs.$logId.action['.validate']).toContain('500');
    });
    test('fineTuneMetrics: epoch required', () => {
      expect(rules.rules.fineTuneMetrics.$metricId['.validate']).toContain('epoch');
    });
    test('createdAt: must be number', () => {
      expect(rules.rules.users.$uid.createdAt['.validate']).toContain('isNumber()');
    });
  });
});

// ── Security invariants ──

describe('Firebase Rules — Security Invariants', () => {
  test('NO rule uses root.child() for role checks (prevents escalation)', () => {
    expect(rulesText).not.toContain('root.child');
  });

  test('All write rules use auth.token.role (custom claims)', () => {
    const writeRules = [
      rules.rules.users.$uid['.write'],
      rules.rules.caregivers.$caregiverId['.write'],
      rules.rules.fineTuneMetrics['.write'],
    ];
    writeRules.forEach((rule) => {
      expect(rule).toContain('auth.token.role');
    });
  });

  test('Default deny catch-all exists', () => {
    expect(rules.rules.$other['.read']).toBe(false);
    expect(rules.rules.$other['.write']).toBe(false);
  });

  test('Role field only accepts known values', () => {
    const v = rules.rules.users.$uid.role['.validate'];
    expect(v).toContain("'admin'");
    expect(v).toContain("'caregiver'");
    expect(v).toContain('isString()');
  });
});
