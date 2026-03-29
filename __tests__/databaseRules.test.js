/**
 * Structural tests for database.rules.json
 * Verifies the rules file enforces server-side access control.
 */

const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const rulesText = fs.readFileSync(rulesPath, 'utf-8');
const rules = JSON.parse(rulesText);

describe('database.rules.json structure', () => {
  test('rules file exists and parses as JSON', () => {
    expect(rules).toBeDefined();
    expect(rules.rules).toBeDefined();
  });

  test('has a default-deny catch-all rule', () => {
    expect(rules.rules.$other).toBeDefined();
    expect(rules.rules.$other['.read']).toBe(false);
    expect(rules.rules.$other['.write']).toBe(false);
  });

  test('caregiverAssignments path exists', () => {
    expect(rules.rules.caregiverAssignments).toBeDefined();
    expect(rules.rules.caregiverAssignments.$caregiverUid).toBeDefined();
  });

  test('caregiverAssignments is admin-write only', () => {
    const rule = rules.rules.caregiverAssignments.$caregiverUid['.write'];
    expect(rule).toContain("auth.token.role === 'admin'");
  });

  test('caregiverAssignments values validated as boolean', () => {
    const validate = rules.rules.caregiverAssignments.$caregiverUid.$userUid['.validate'];
    expect(validate).toContain('isBoolean');
  });
});

describe('no broad collection-level reads', () => {
  test('/users has NO collection-level .read', () => {
    expect(rules.rules.users['.read']).toBeUndefined();
  });

  test('/users/$uid requires self OR assignment OR admin', () => {
    const rule = rules.rules.users.$uid['.read'];
    expect(rule).toContain('auth.uid === $uid');
    expect(rule).toContain('caregiverAssignments');
    expect(rule).toContain("auth.token.role === 'admin'");
  });

  test('/caregivers requires admin for collection read', () => {
    const rule = rules.rules.caregivers['.read'];
    expect(rule).toContain("auth.token.role === 'admin'");
  });

  test('/userLogs has NO collection-level .read', () => {
    expect(rules.rules.userLogs['.read']).toBeUndefined();
  });

  test('/fineTuneMetrics requires admin', () => {
    const rule = rules.rules.fineTuneMetrics['.read'];
    expect(rule).toContain("auth.token.role === 'admin'");
  });
});

describe('per-user data uses assignment-based access', () => {
  const perUserPaths = ['customVocab', 'vocabRequests', 'userSync', 'userLogs'];

  for (const nodeName of perUserPaths) {
    test(`${nodeName} read requires self OR assignment OR admin`, () => {
      const node = rules.rules[nodeName];
      const childKey = Object.keys(node).find((k) => k.startsWith('$'));
      const readRule = node[childKey]['.read'];
      expect(readRule).toContain('auth.uid');
      expect(readRule).toContain('caregiverAssignments');
      expect(readRule).toContain("auth.token.role === 'admin'");
    });
  }
});

describe('write rules use custom claims only', () => {
  test('user write rules reference auth.token.role, not root.child', () => {
    const rule = rules.rules.users.$uid['.write'];
    expect(rule).toContain('auth.token.role');
    expect(rule).not.toMatch(/root\.child\(.*role/);
  });

  test('caregiver write rules reference auth.token.role', () => {
    const rule = rules.rules.caregivers.$caregiverId['.write'];
    expect(rule).toContain('auth.token.role');
  });

  test('fineTuneMetrics write rules use custom claims', () => {
    expect(rules.rules.fineTuneMetrics['.write']).toContain("auth.token.role === 'admin'");
  });

  test('userSync write allows self-write OR admin', () => {
    const rule = rules.rules.userSync.$userId['.write'];
    expect(rule).toContain('auth.uid === $userId');
    expect(rule).toContain("auth.token.role === 'admin'");
  });
});

describe('role field protection', () => {
  test('role validation only allows admin or caregiver', () => {
    const validate = rules.rules.users.$uid.role['.validate'];
    expect(validate).toContain("'admin'");
    expect(validate).toContain("'caregiver'");
  });

  test('role field inherits parent write rule (admin-only)', () => {
    expect(rules.rules.users.$uid['.write']).toContain("auth.token.role === 'admin'");
  });

  test('caregiverId allows self-assign via auth.uid === newData.val()', () => {
    const rule = rules.rules.users.$uid.caregiverId['.write'];
    expect(rule).toContain('auth.uid === newData.val()');
  });

  test('caregiverId also allows admin assignment', () => {
    const rule = rules.rules.users.$uid.caregiverId['.write'];
    expect(rule).toContain("auth.token.role === 'admin'");
  });
});

describe('validation rules', () => {
  test('userLogs entries require action and timestamp', () => {
    const validate = rules.rules.userLogs.$uid.$logId['.validate'];
    expect(validate).toContain('action');
    expect(validate).toContain('timestamp');
  });

  test('log action has max length', () => {
    const validate = rules.rules.userLogs.$uid.$logId.action['.validate'];
    expect(validate).toContain('500');
  });

  test('fineTuneMetrics entries require epoch', () => {
    expect(rules.rules.fineTuneMetrics.$metricId['.validate']).toContain('epoch');
  });

  test('user name has length bounds', () => {
    const validate = rules.rules.users.$uid.name['.validate'];
    expect(validate).toContain('200');
  });

  test('user email validates format', () => {
    const validate = rules.rules.users.$uid.email['.validate'];
    expect(validate).toContain('matches');
  });
});
