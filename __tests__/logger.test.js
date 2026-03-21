// Mock Firebase before imports
jest.mock('../src/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: { uid: 'carer-1', email: 'carer@test.com' } },
}));

const mockPush = jest.fn(() => Promise.resolve());
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  push: mockPush,
}));

import { logEvent, flushPendingLogs } from '../src/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('logs event to Firebase with correct structure', async () => {
    await logEvent('test_action', { targetUserId: 'user-1' });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const logEntry = mockPush.mock.calls[0][1];
    expect(logEntry.action).toBe('test_action');
    expect(logEntry.targetUserId).toBe('user-1');
    expect(logEntry.carerId).toBe('carer-1');
    expect(logEntry.timestamp).toBeDefined();
  });

  test('saves to localStorage when Firebase push fails', async () => {
    mockPush.mockRejectedValueOnce(new Error('network error'));

    await logEvent('offline_action');

    const stored = JSON.parse(localStorage.getItem('commai_pending_logs'));
    expect(stored).toHaveLength(1);
    expect(stored[0].action).toBe('offline_action');
  });

  test('flushPendingLogs pushes stored logs and clears storage', async () => {
    localStorage.setItem('commai_pending_logs', JSON.stringify([
      { action: 'pending_1', timestamp: 1000 },
      { action: 'pending_2', timestamp: 2000 },
    ]));

    await flushPendingLogs();

    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('commai_pending_logs')).toBeNull();
  });

  test('flushPendingLogs does nothing when no pending logs', async () => {
    await flushPendingLogs();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
