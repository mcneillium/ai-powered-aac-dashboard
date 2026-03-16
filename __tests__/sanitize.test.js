import { sanitizeString, isValidEmail } from '../src/utils/sanitize';

describe('sanitizeString', () => {
  test('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  test('removes Firebase-unsafe characters', () => {
    expect(sanitizeString('user.name#1$[test]')).toBe('username1test');
  });

  test('collapses multiple spaces', () => {
    expect(sanitizeString('hello    world')).toBe('hello world');
  });

  test('returns empty string for non-string input', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(123)).toBe('');
  });

  test('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });
});

describe('isValidEmail', () => {
  test('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});
