import { TaskDto } from './models';
import {
  displayDate,
  localInput,
  prerequisites,
  routeId,
  transitionReason,
  utcInput,
} from './rules';
const task = (id: number, downstream: number[] = []): TaskDto => ({
  id,
  name: String(id),
  description: null,
  startDate: '',
  endDate: '',
  status: 'PENDING',
  isActive: true,
  dependentTasks: downstream.map((id) => ({
    id,
    name: String(id),
    description: null,
    startDate: '',
    endDate: '',
    status: 'PENDING',
    isActive: true,
  })),
});
describe('Dates, route IDs and business rules', () => {
  it('round-trips local calendar fields without losing seconds or milliseconds', () => {
    for (const iso of ['2026-12-01T01:23:45.678Z', '2026-06-01T22:03:04.001Z']) {
      const date = new Date(iso);
      const local = localInput(iso);
      expect(Number(local.slice(11, 13))).toBe(date.getHours());
      expect(utcInput(local)).toBe(iso);
    }
  });
  it('renders missing and invalid legacy dates defensively', () => {
    expect(localInput(null)).toBe('');
    expect(localInput('bad')).toBe('');
    expect(displayDate(null)).toBe('No schedule');
    expect(displayDate('bad')).toBe('Date unavailable');
  });
  it.each(['0', '-1', '1.5', 'abc', '2147483648', '1e2', '', null])(
    'rejects invalid route ID %s',
    (value) => expect(routeId(value)).toBeNull(),
  );
  it('accepts positive Java integer limits', () => {
    expect(routeId('1')).toBe(1);
    expect(routeId('2147483647')).toBe(2147483647);
  });
  it('derives incoming prerequisites, not outgoing dependents', () => {
    const tasks = [task(1, [2]), task(2, [3]), task(3)];
    expect(prerequisites(tasks, 2).map((t) => t.id)).toEqual([1]);
    expect(prerequisites(tasks, 1)).toEqual([]);
  });
  it('blocks skipped progression and unmet prerequisites', () => {
    expect(transitionReason('PENDING', 'COMPLETED', [])).toContain('Start');
    expect(transitionReason('PENDING', 'IN_PROGRESS', [task(1)])).toContain('prerequisites');
    expect(transitionReason('COMPLETED', 'PENDING', [task(1)])).toBe('');
    expect(
      transitionReason('IN_PROGRESS', 'COMPLETED', [{ ...task(1), status: 'COMPLETED' }]),
    ).toBe('');
  });
});
