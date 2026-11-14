import { logsFromSnapshot, newestFirst, fetchRecentLogs, subscribeRecentLogs, userLogsPath } from './userLogs';
import { get, onValue } from 'firebase/database';

jest.mock('../firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/database', () => ({
  ref: (_db, path) => ({ path }),
  query: (r) => r,
  orderByChild: () => null,
  limitToLast: () => null,
  get: jest.fn(),
  onValue: jest.fn(),
}));

const snap = (value) => ({ val: () => value });

describe('logsFromSnapshot', () => {
  it('reads the per-person layout the app writes', () => {
    const rows = logsFromSnapshot('u1', {
      a: { action: 'word_spoken', timestamp: 2, targetUserId: 'u1' },
      b: { action: 'sentence_spoken', timestamp: 1 },
    });
    expect(rows).toEqual([
      { id: 'a', action: 'word_spoken', timestamp: 2, targetUserId: 'u1' },
      { id: 'b', action: 'sentence_spoken', timestamp: 1, targetUserId: 'u1' },
    ]);
  });

  it('keeps an explicit targetUserId', () => {
    const [row] = logsFromSnapshot('carer', { a: { action: 'x', targetUserId: 'u2' } });
    expect(row.targetUserId).toBe('u2');
  });

  it('ignores empty values and non-object children', () => {
    expect(logsFromSnapshot('u1', null)).toEqual([]);
    expect(logsFromSnapshot('u1', { a: 3, b: null })).toEqual([]);
  });
});

describe('newestFirst', () => {
  it('sorts by timestamp descending and limits', () => {
    const rows = [{ timestamp: 1 }, { timestamp: 3 }, {}, { timestamp: 2 }];
    expect(newestFirst(rows, 2)).toEqual([{ timestamp: 3 }, { timestamp: 2 }]);
  });
});

describe('fetchRecentLogs', () => {
  beforeEach(() => get.mockReset());

  it('reads each person once at their own path and merges newest first', async () => {
    get.mockImplementation(({ path }) => Promise.resolve(snap({
      [`${path}-a`]: { action: 'a', timestamp: path === userLogsPath('u1') ? 10 : 20 },
    })));
    const { logs, failed } = await fetchRecentLogs(['u1', 'u2', 'u1', null]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls.map(([q]) => q.path)).toEqual(['userLogs/u1', 'userLogs/u2']);
    expect(logs.map(l => l.targetUserId)).toEqual(['u2', 'u1']);
    expect(failed).toBe(0);
  });

  it('keeps the readable people when one read is denied', async () => {
    get.mockImplementation(({ path }) => (path === 'userLogs/u2'
      ? Promise.reject(new Error('PERMISSION_DENIED'))
      : Promise.resolve(snap({ a: { action: 'a', timestamp: 1 } }))));
    const { logs, failed } = await fetchRecentLogs(['u1', 'u2']);
    expect(logs).toHaveLength(1);
    expect(failed).toBe(1);
  });

  it('makes no reads for an empty list', async () => {
    const { logs } = await fetchRecentLogs([]);
    expect(logs).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('subscribeRecentLogs', () => {
  beforeEach(() => onValue.mockReset());

  it('merges updates from each person and stops every listener', () => {
    const callbacks = {};
    const stops = [];
    onValue.mockImplementation(({ path }, cb) => {
      callbacks[path] = cb;
      const stop = jest.fn();
      stops.push(stop);
      return stop;
    });
    const seen = [];
    const stop = subscribeRecentLogs(['u1', 'u2'], rows => seen.push(rows.map(r => r.id)));
    callbacks['userLogs/u1'](snap({ a: { timestamp: 1 } }));
    callbacks['userLogs/u2'](snap({ b: { timestamp: 2 } }));
    expect(seen[seen.length - 1]).toEqual(['b', 'a']);
    stop();
    stops.forEach(s => expect(s).toHaveBeenCalled());
  });

  it('reports an empty list straight away when there is nobody to watch', () => {
    const onChange = jest.fn();
    subscribeRecentLogs([], onChange);
    expect(onChange).toHaveBeenCalledWith([]);
    expect(onValue).not.toHaveBeenCalled();
  });
});
