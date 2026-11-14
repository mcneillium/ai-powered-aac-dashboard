import { logEvent } from './logger';
import { push } from 'firebase/database';

jest.mock('../firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: { uid: 'carer1' } }) }));
jest.mock('firebase/database', () => ({ ref: (_db, path) => ({ path }), push: jest.fn(() => Promise.resolve()) }));

describe('logEvent', () => {
  beforeEach(() => { push.mockClear(); localStorage.clear(); });

  it("writes under the signed-in person's own userLogs/{uid}", async () => {
    await logEvent('Viewed user', { targetUserId: 'u1' });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0].path).toBe('userLogs/carer1');
  });

  it('sends only fields the database rules accept', async () => {
    await logEvent('Exported logs', { targetUserId: 'u1', count: 3, format: 'csv', note: 'x' });
    const sent = push.mock.calls[0][1];
    const allowed = ['targetUserId', 'carerId', 'action', 'timestamp', 'level', 'source', 'sessionId', 'count', 'error'];
    expect(Object.keys(sent).every(k => allowed.includes(k))).toBe(true);
    expect(sent.count).toBe(3);
    expect(sent.format).toBeUndefined();
  });

  it('keeps the extra details in the local backup', async () => {
    await logEvent('Exported logs', { targetUserId: 'u1', format: 'csv' });
    const local = JSON.parse(localStorage.getItem('dashboardLogs'));
    expect(local[0].format).toBe('csv');
  });
});
