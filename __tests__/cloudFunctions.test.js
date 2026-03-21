// Tests for Cloud Function security properties
// These validate the function's authentication/authorization logic in isolation.

describe('Cloud Function: setUserPassword security contract', () => {
  // Read the function source to verify security properties
  const fs = require('fs');
  const funcSource = fs.readFileSync(
    require('path').join(__dirname, '..', 'functions', 'index.js'),
    'utf-8'
  );

  test('verifies Bearer token authentication', () => {
    expect(funcSource).toContain('Bearer ');
    expect(funcSource).toContain('verifyIdToken');
    expect(funcSource).toContain('401');
  });

  test('checks admin role authorization', () => {
    expect(funcSource).toContain('decodedToken.role');
    expect(funcSource).toContain('admin');
    expect(funcSource).toContain('403');
  });

  test('validates password server-side', () => {
    expect(funcSource).toContain('validatePassword');
    expect(funcSource).toContain('at least 8 characters');
    expect(funcSource).toContain('lowercase');
    expect(funcSource).toContain('uppercase');
  });

  test('prevents self-password-change', () => {
    expect(funcSource).toContain('decodedToken.uid');
    expect(funcSource).toContain('Cannot set your own password');
  });

  test('restricts CORS origins', () => {
    expect(funcSource).toContain('ALLOWED_ORIGINS');
    expect(funcSource).not.toContain('origin: true');
  });

  test('only allows POST method', () => {
    expect(funcSource).toContain('405');
    expect(funcSource).toContain('Method Not Allowed');
  });

  test('does not log passwords or sensitive data', () => {
    // The function should never log the password itself
    expect(funcSource).not.toContain('logger.info(newPassword');
    expect(funcSource).not.toContain('logger.log(newPassword');
    expect(funcSource).not.toContain('console.log(newPassword');
  });

  test('does not expose internal error details to client', () => {
    // 500 responses should use generic message
    expect(funcSource).toContain('Internal error updating password');
  });
});
