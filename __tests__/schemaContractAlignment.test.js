/**
 * Verifies that src/shared/schema.js contracts align with database.rules.json.
 * If this test fails, the schema file and rules file have diverged.
 */

const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const schemaPath = path.join(__dirname, '..', 'src', 'shared', 'schema.js');

const rulesText = fs.readFileSync(rulesPath, 'utf-8');
const rules = JSON.parse(rulesText);

// Read schema source as text for structural checks
const schemaText = fs.readFileSync(schemaPath, 'utf-8');

describe('Schema ↔ Rules alignment', () => {
  test('schema.js exists', () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  test('every DB_PATH in schema has a corresponding top-level rules node', () => {
    // Extract only the DB_PATHS block
    const dbPathsBlock = schemaText.match(/DB_PATHS\s*=\s*\{([^}]+)\}/s);
    expect(dbPathsBlock).not.toBeNull();
    const pathValues = dbPathsBlock[1].match(/'([a-zA-Z]+)'/g).map((m) => m.replace(/'/g, ''));

    const rulesNodes = Object.keys(rules.rules).filter((k) => k !== '$other');
    for (const p of pathValues) {
      expect(rulesNodes).toContain(p);
    }
  });

  test('user fields documented in schema match rules validation fields', () => {
    const rulesUserFields = Object.keys(rules.rules.users.$uid).filter(
      (k) => !k.startsWith('.')
    );
    // Schema documents: name, email, role, caregiverId, createdAt
    for (const field of rulesUserFields) {
      expect(schemaText).toContain(field);
    }
  });

  test('caregiver fields match', () => {
    const rulesCgFields = Object.keys(rules.rules.caregivers.$caregiverId).filter(
      (k) => !k.startsWith('.')
    );
    for (const field of rulesCgFields) {
      expect(schemaText).toContain(field);
    }
  });

  test('log fields match', () => {
    // userLogs is now per-user: /userLogs/$uid/$logId
    const rulesLogFields = Object.keys(rules.rules.userLogs.$uid.$logId).filter(
      (k) => !k.startsWith('.')
    );
    for (const field of rulesLogFields) {
      expect(schemaText).toContain(field);
    }
  });

  test('metric fields match', () => {
    const rulesMetricFields = Object.keys(rules.rules.fineTuneMetrics.$metricId).filter(
      (k) => !k.startsWith('.')
    );
    for (const field of rulesMetricFields) {
      expect(schemaText).toContain(field);
    }
  });

  test('sync fields match', () => {
    const rulesSyncFields = Object.keys(rules.rules.userSync.$userId).filter(
      (k) => !k.startsWith('.')
    );
    for (const field of rulesSyncFields) {
      expect(schemaText).toContain(field);
    }
  });

  test('schema documents both valid roles', () => {
    expect(schemaText).toContain("ADMIN: 'admin'");
    expect(schemaText).toContain("CAREGIVER: 'caregiver'");
  });

  test('schema documents name maxLength matching rules (200)', () => {
    expect(schemaText).toContain('maxLength: 200');
    expect(rulesText).toContain('200');
  });

  test('schema documents action maxLength matching rules (500)', () => {
    expect(schemaText).toContain('maxLength: 500');
    expect(rulesText).toContain('500');
  });
});
