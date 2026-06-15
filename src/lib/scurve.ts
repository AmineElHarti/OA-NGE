import type { Task } from '../data/tasks';
import type { ProgressEntry } from '../store/useStore';
import { eachWeekOfInterval, format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface SCurvePoint {
  date: string;
  label: string;
  planned: number;
  actual: number | null;
}

function isLeaf(task: Task, tasks: Task[]) {
  return !tasks.some((t) => t.parentId === task.id);
}

function theoreticalProgress(task: Task, date: Date): number {
  const start = parseISO(task.debut);
  const end = parseISO(task.fin);
  if (isBefore(date, start) || isEqual(date, start) && task.duree === 0) return 0;
  if (isAfter(date, end) || isEqual(date, end)) return 100;
  const total = end.getTime() - start.getTime();
  const elapsed = date.getTime() - start.getTime();
  return Math.min(100, (elapsed / total) * 100);
}

export function generateSCurve(tasks: Task[], history: ProgressEntry[]): SCurvePoint[] {
  const leaves = tasks.filter((t) => isLeaf(t, tasks));
  const totalWeight = leaves.reduce((s, t) => s + t.duree, 0);
  const today = new Date();

  const weeks = eachWeekOfInterval(
    { start: parseISO('2026-05-04'), end: parseISO('2027-05-10') },
    { weekStartsOn: 1 }
  );

  return weeks.map((weekDate) => {
    // Planned: theoretical progress at this date
    const plannedWeight = leaves.reduce((sum, t) => {
      return sum + t.duree * (theoreticalProgress(t, weekDate) / 100);
    }, 0);
    const planned = totalWeight > 0 ? (plannedWeight / totalWeight) * 100 : 0;

    // Actual: reconstruct from history up to weekDate (or current if no history)
    let actual: number | null = null;
    if (!isAfter(weekDate, today)) {
      if (history.length > 0) {
        // Build snapshot of each task progress as of weekDate
        const snapshot: Record<number, number> = {};
        history
          .filter((h) => !isAfter(parseISO(h.recorded_at), weekDate))
          .forEach((h) => { snapshot[h.task_id] = h.progress; });

        const actualWeight = leaves.reduce((sum, t) => {
          const p = snapshot[t.id] ?? t.progress;
          return sum + t.duree * (p / 100);
        }, 0);
        actual = totalWeight > 0 ? (actualWeight / totalWeight) * 100 : 0;
      } else {
        // No history: only show current snapshot at today
        if (!isAfter(weekDate, today)) {
          const actualWeight = leaves.reduce((sum, t) => sum + t.duree * (t.progress / 100), 0);
          actual = totalWeight > 0 ? (actualWeight / totalWeight) * 100 : 0;
        }
      }
    }

    return {
      date: format(weekDate, 'yyyy-MM-dd'),
      label: format(weekDate, 'dd/MM/yy', { locale: fr }),
      planned: Math.round(planned * 10) / 10,
      actual: actual !== null ? Math.round(actual * 10) / 10 : null,
    };
  });
}

export function computeAlerts(tasks: Task[]) {
  const leaves = tasks.filter((t) => isLeaf(t, tasks));
  const today = new Date();

  return leaves
    .map((t) => {
      const expected = theoreticalProgress(t, today);
      const gap = expected - t.progress;
      const start = parseISO(t.debut);
      const started = !isAfter(today, start) ? false : true;
      return { task: t, expected: Math.round(expected), gap: Math.round(gap), started };
    })
    .filter((a) => a.gap > 10 && a.started)
    .sort((a, b) => b.gap - a.gap);
}

export function getOuvrageAlerts(tasks: Task[], ouvrageId: number) {
  function isDescendant(t: Task): boolean {
    let cur: Task | undefined = t;
    while (cur) {
      if (cur.id === ouvrageId) return true;
      cur = tasks.find((x) => x.id === cur!.parentId);
    }
    return false;
  }
  return computeAlerts(tasks.filter(isDescendant));
}
