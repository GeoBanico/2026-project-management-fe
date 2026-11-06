import { TaskDto, TaskStatus } from './models';

export function routeId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}
export function localInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (n: number, size = 2) => String(n).padStart(size, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}
export function utcInput(local: string): string {
  return new Date(local).toISOString();
}
export function displayDate(iso: string | null | undefined): string {
  if (!iso) return 'No schedule';
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : 'Date unavailable';
}
export function prerequisites(tasks: TaskDto[], selectedId: number): TaskDto[] {
  return tasks.filter((task) =>
    task.dependentTasks.some((dependent) => dependent.id === selectedId),
  );
}
export const statuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
export function transitionReason(
  current: TaskStatus,
  next: TaskStatus,
  incoming: TaskDto[],
): string {
  if (current === next) return 'Current status';
  if (current === 'PENDING' && next === 'COMPLETED') return 'Start the task before completing it.';
  if (next !== 'PENDING' && incoming.some((task) => task.status !== 'COMPLETED'))
    return 'Complete all prerequisites first.';
  return '';
}
export function sorted<T extends { name: string; id: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}
