import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '../data/tasks';
import { INITIAL_TASKS } from '../data/tasks';

const STORAGE_KEY = 'oa-nge-tasks';

interface Store {
  tasks: Task[];
  updateProgress: (id: number, progress: number, notes?: string) => void;
  resetAll: () => void;
}

function initTasks(): Task[] {
  return INITIAL_TASKS.map(t => ({ ...t, progress: 0 }));
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      tasks: initTasks(),
      updateProgress: (id, progress, notes) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, progress, notes: notes ?? t.notes, updatedAt: new Date().toISOString() }
              : t
          ),
        })),
      resetAll: () => set({ tasks: initTasks() }),
    }),
    { name: STORAGE_KEY }
  )
);
