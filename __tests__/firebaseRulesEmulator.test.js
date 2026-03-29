/**
 * Firebase Rules — Structural Pass/Fail Matrix
 *
 * Validates the rules JSON structure matches the expected access model:
 * - No broad collection reads for non-admins
 * - Per-user data gated by self / caregiverAssignments / admin
 * - Admin has full access
 * - Default deny on unknown paths
 */

const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const rulesText = fs.readFileSync(rulesPath, 'utf-8');
const rules = JSON.parse(rulesText);

describe('Firebase Rules — Access Model', () => {
  describe('Default deny', () => {
    test('/unknown READ → DENIED', () => {
      expect(rules.rules.$other['.read']).toBe(false);
    });
    test('/unknown WRITE → DENIED', () => {
      expect(rules.rules.$other['.write']).toBe(false);
    });
  });

  describe('No collection-level reads for non-admins', () => {
    test('/users has no collection .read', () => {
      expect(rules.rules.users['.read']).toBeUndefined();
    });
    test('/userLogs has no collection .read', () => {
      expect(rules.rules.userLogs['.read']).toBeUndefined();
    });
    test('/caregivers .read requires admin', () => {
      expect(rules.rules.caregivers['.read']).toContain("auth.token.role === 'admin'");
    });
    test('/fineTuneMetrics .read requires admin', () => {
      expect(rules.rules.fineTuneMetrics['.read']).toContain("auth.token.role === 'admin'");
    });
  });

  describe('/users/$uid — per-user access', () => {
    const userRead = () => rules.rules.users.$uid['.read'];
    const userWrite = () => rules.rules.users.$uid['.write'];

    test('READ requires self OR assignment OR admin', () => {
      expect(userRead()).toContain('auth.uid === $uid');
      expect(userRead()).toContain('caregiverAssignments');
      expect(userRead()).toContain("auth.token.role === 'admin'");
    });
    test('WRITE requires admin', () => {
      expect(userWrite()).toContain("auth.token.role === 'admin'");
    });
    test('caregiverId self-assign allowed', () => {
      const rule = rules.rules.users.$uid.caregiverId['.write'];
      expect(rule).toContain('auth.uid === newData.val()');
      expect(rule).toContain("auth.token.role === 'admin'");
    });
    test('role validated to admin|caregiver only', () => {
      const rule = rules.rules.users.$uid.role['.validate'];
      expect(rule).toContain("'admin'");
      expect(rule).toContain("'caregiver'");
    });
  });

  describe('/caregiverAssignments — assignment registry', () => {
    const ca = () => rules.rules.caregiverAssignments.$caregiverUid;

    test('READ requires self OR admin', () => {
      expect(ca()['.read']).toContain('auth.uid === $caregiverUid');
      expect(ca()['.read']).toContain("auth.token.role === 'admin'");
    });
    test('WRITE requires admin only', () => {
      expect(ca()['.write']).toContain("auth.token.role === 'admin'");
      expect(ca()['.write']).not.toContain('auth.uid === $caregiverUid');
    });
    test('values must be boolean', () => {
      expect(ca().$userUid['.validate']).toContain('isBoolean');
    });
  });

  describe('/userLogs/$uid — per-user logs', () => {
    const logNode = () => rules.rules.userLogs.$uid;

    test('READ requires self OR assignment OR admin', () => {
      expect(logNode()['.read']).toContain('auth.uid === $uid');
      expect(logNode()['.read']).toContain('caregiverAssignments');
      expect(logNode()['.read']).toContain("auth.token.role === 'admin'");
    });
    test('WRITE requires self OR assignment OR admin', () => {
      expect(logNode()['.write']).toContain('auth.uid === $uid');
      expect(logNode()['.write']).toContain('caregiverAssignments');
    });
    test('log entries require action + timestamp', () => {
      expect(logNode().$logId['.validate']).toContain('action');
      expect(logNode().$logId['.validate']).toContain('timestamp');
    });
    test('action max length 500', () => {
      expect(logNode().$logId.action['.validate']).toContain('500');
    });
  });

  describe('/userSync/$userId', () => {
    const sync = () => rules.rules.userSync.$userId;

    test('READ requires self OR assignment OR admin', () => {
      expect(sync()['.read']).toContain('auth.uid === $userId');
      expect(sync()['.read']).toContain('caregiverAssignments');
    });
    test('WRITE is self OR admin only (no caregiver write)', () => {
      expect(sync()['.write']).toContain('auth.uid === $userId');
      expect(sync()['.write']).toContain("auth.token.role === 'admin'");
      expect(sync()['.write']).not.toContain('caregiverAssignments');
    });
  });

  describe('/customVocab/$uid', () => {
    const cv = () => rules.rules.customVocab.$uid;

    test('READ requires self OR assignment OR admin', () => {
      expect(cv()['.read']).toContain('auth.uid === $uid');
      expect(cv()['.read']).toContain('caregiverAssignments');
    });
    test('WRITE is self OR admin only', () => {
      expect(cv()['.write']).toContain('auth.uid === $uid');
      expect(cv()['.write']).not.toContain('caregiverAssignments');
    });
  });

  describe('/vocabRequests/$uid', () => {
    const vr = () => rules.rules.vocabRequests.$uid;

    test('READ requires self OR assignment OR admin', () => {
      expect(vr()['.read']).toContain('auth.uid === $uid');
      expect(vr()['.read']).toContain('caregiverAssignments');
    });
    test('WRITE is self OR admin only', () => {
      expect(vr()['.write']).toContain('auth.uid === $uid');
      expect(vr()['.write']).not.toContain('caregiverAssignments');
    });
  });

  describe('/userSettings/$uid', () => {
    test('READ is self OR admin only (no caregiver access)', () => {
      const rule = rules.rules.userSettings.$uid['.read'];
      expect(rule).toContain('auth.uid === $uid');
      expect(rule).toContain("auth.token.role === 'admin'");
      expect(rule).not.toContain('caregiverAssignments');
    });
  });

  describe('Security invariants', () => {
    test('No write rule for any per-user data uses root.child for role checks', () => {
      const writeRules = [
        rules.rules.users.$uid['.write'],
        rules.rules.caregiverAssignments.$caregiverUid['.write'],
        rules.rules.caregivers.$caregiverId['.write'],
        rules.rules.fineTuneMetrics['.write'],
      ];
      for (const rule of writeRules) {
        // root.child is used for caregiverAssignments lookups (which is data, not role)
        // but must NOT be used for role checks
        if (rule.includes('root.child')) {
          expect(rule).not.toMatch(/root\.child\(.*role/);
        }
      }
    });

    test('caregiverAssignments is the only cross-reference used in read rules', () => {
      // Verify that per-user read rules only reference caregiverAssignments, not other paths
      const readRules = [
        rules.rules.users.$uid['.read'],
        rules.rules.userLogs.$uid['.read'],
        rules.rules.userSync.$userId['.read'],
        rules.rules.customVocab.$uid['.read'],
        rules.rules.vocabRequests.$uid['.read'],
      ];
      for (const rule of readRules) {
        if (rule.includes('root.child')) {
          expect(rule).toContain('caregiverAssignments');
        }
      }
    });
  });
});
