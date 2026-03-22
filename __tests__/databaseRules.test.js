// Tests for Firebase Realtime Database security rules structure.
// These verify the rules JSON is well-formed and enforces the expected policies.

const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', 'database.rules.json');
let rulesText;
let rules;

beforeAll(() => {
  rulesText = fs.readFileSync(rulesPath, 'utf-8');
  // Remove JSON comments (Firebase allows them, JSON.parse doesn't)
  const cleaned = rulesText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  rules = JSON.parse(cleaned);
});

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

  test('all top-level read rules require authentication', () => {
    const nodes = ['users', 'caregivers', 'userLogs', 'fineTuneMetrics'];
    for (const node of nodes) {
      const rule = rules.rules[node];
      expect(rule).toBeDefined();
      expect(rule['.read']).toContain('auth != null');
    }
  });

  test('userSync child read rules require authentication', () => {
    expect(rules.rules.userSync.$userId['.read']).toContain('auth != null');
  });
});

describe('authorization policies use custom claims only', () => {
  test('user write rules do NOT reference database role field', () => {
    const userWriteRule = rules.rules.users.$uid['.write'];
    expect(userWriteRule).not.toContain('root.child');
    expect(userWriteRule).toContain('auth.token.role');
  });

  test('caregiver write rules do NOT reference database role field', () => {
    const cgWriteRule = rules.rules.caregivers.$caregiverId['.write'];
    expect(cgWriteRule).not.toContain('root.child');
    expect(cgWriteRule).toContain('auth.token.role');
  });

  test('fineTuneMetrics write rules use custom claims', () => {
    const ftWriteRule = rules.rules.fineTuneMetrics['.write'];
    expect(ftWriteRule).toContain("auth.token.role === 'admin'");
  });

  test('userSync write allows self-write OR admin', () => {
    const syncWrite = rules.rules.userSync.$userId['.write'];
    expect(syncWrite).toContain('auth.uid === $userId');
    expect(syncWrite).toContain("auth.token.role === 'admin'");
  });
});

describe('role field protection', () => {
  test('role validation only allows admin or caregiver', () => {
    const roleValidate = rules.rules.users.$uid.role['.validate'];
    expect(roleValidate).toContain("'admin'");
    expect(roleValidate).toContain("'caregiver'");
    expect(roleValidate).toContain('isString()');
  });

  test('role field inherits parent write rule (admin-only)', () => {
    // The role field doesn't have its own .write rule — it inherits from $uid
    // which requires auth.token.role === 'admin'
    const parentWrite = rules.rules.users.$uid['.write'];
    expect(parentWrite).toContain("auth.token.role === 'admin'");
  });
});

describe('caregiverId self-assignment', () => {
  test('caregiverId allows self-assign via auth.uid === newData.val()', () => {
    const cgIdWrite = rules.rules.users.$uid.caregiverId['.write'];
    expect(cgIdWrite).toContain('auth.uid === newData.val()');
  });

  test('caregiverId also allows admin assignment', () => {
    const cgIdWrite = rules.rules.users.$uid.caregiverId['.write'];
    expect(cgIdWrite).toContain("auth.token.role === 'admin'");
  });
});

describe('data validation', () => {
  test('user log entries require action and timestamp', () => {
    const logValidate = rules.rules.userLogs.$logId['.validate'];
    expect(logValidate).toContain('action');
    expect(logValidate).toContain('timestamp');
  });

  test('log action has max length', () => {
    const actionValidate = rules.rules.userLogs.$logId.action['.validate'];
    expect(actionValidate).toContain('500');
  });

  test('fineTuneMetrics entries require epoch', () => {
    const metricValidate = rules.rules.fineTuneMetrics.$metricId['.validate'];
    expect(metricValidate).toContain('epoch');
  });

  test('user name has length bounds', () => {
    const nameValidate = rules.rules.users.$uid.name['.validate'];
    expect(nameValidate).toContain('length > 0');
    expect(nameValidate).toContain('200');
  });

  test('user email validates format', () => {
    const emailValidate = rules.rules.users.$uid.email['.validate'];
    expect(emailValidate).toContain('@');
  });
});
