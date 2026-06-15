import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';

// ── Utility ─────────────────────────────────────────────────────────────────

export function isLeaf(id: number, tasks: Task[]) {
  return !tasks.some((t) => t.parentId === id);
}

export function getDescendants(tasks: Task[], ancestorId: number): Task[] {
  return tasks.filter((t) => {
    let cur: Task | undefined = t;
    while (cur) {
      if (cur.id === ancestorId) return true;
      cur = tasks.find((x) => x.id === cur!.parentId);
    }
    return false;
  });
}

export function computeProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => isLeaf(t.id, tasks));
  if (!leaves.length) return 0;
  const wSum = leaves.reduce((s, t) => s + t.duree * t.progress, 0);
  const wTotal = leaves.reduce((s, t) => s + t.duree, 0);
  return wTotal > 0 ? Math.round(wSum / wTotal) : 0;
}

export function computeTheoreticalProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => isLeaf(t.id, tasks));
  const today = new Date();
  const totalW = leaves.reduce((s, t) => s + t.duree, 0);
  const planW = leaves.reduce((s, t) => {
    const start = parseISO(t.debut);
    const end = parseISO(t.fin);
    if (today <= start) return s;
    if (today >= end) return s + t.duree;
    return s + t.duree * ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
  }, 0);
  return totalW > 0 ? Math.round((planW / totalW) * 100) : 0;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface OuvrageMetrics {
  id: number;
  nom: string;
  shortName: string;
  color: string;
  progress: number;
  theoretical: number;
  gap: number;
  tasks: Task[];
  leaves: Task[];
}

export function useOuvrageProgress(tasks: Task[]): OuvrageMetrics[] {
  return useMemo(() =>
    OUVRAGES.map((o) => {
      const oTasks = getDescendants(tasks, o.id);
      const progress = computeProgress(oTasks);
      const theoretical = computeTheoreticalProgress(oTasks);
      return {
        id: o.id,
        nom: o.nom,
        shortName: o.nom.split(' - ')[0],
        color: o.color,
        progress,
        theoretical,
        gap: progress - theoretical,
        tasks: oTasks,
        leaves: oTasks.filter((t) => isLeaf(t.id, oTasks)),
      };
    }),
    [tasks]
  );
}

export function useGlobalProgress(tasks: Task[]) {
  return useMemo(() => {
    const progress = computeProgress(tasks);
    const theoretical = computeTheoreticalProgress(tasks);
    return { progress, theoretical, gap: progress - theoretical };
  }, [tasks]);
}
