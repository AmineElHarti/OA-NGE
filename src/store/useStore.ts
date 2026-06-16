import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '../data/tasks';
import { INITIAL_TASKS } from '../data/tasks';
import { supabase } from '../lib/supabase';

export interface ProgressEntry {
  task_id: number;
  progress: number;
  notes: string;
  recorded_at: string;
  recorded_by: string;
}

interface Store {
  tasks: Task[];
  history: ProgressEntry[];
  loading: boolean;
  synced: boolean;
  userName: string;
  nextId: number;
  setUserName: (name: string) => void;
  fetchFromSupabase: () => Promise<void>;
  updateProgress: (id: number, progress: number, notes?: string) => Promise<void>;
  updateTask: (id: number, updates: Partial<Omit<Task, 'id'>>) => void;
  addTask: (task: Omit<Task, 'id' | 'progress' | 'updatedAt'>) => number;
  deleteTask: (id: number) => void;
  resetAll: () => Promise<void>;
}

function initTasks(): Task[] {
  return INITIAL_TASKS.map((t) => ({ ...t, progress: 0 }));
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      tasks: initTasks(),
      history: [],
      loading: false,
      synced: false,
      userName: 'Utilisateur',
      nextId: 10000,

      setUserName: (name) => set({ userName: name }),

      fetchFromSupabase: async () => {
        if (!supabase) return;
        set({ loading: true });
        try {
          const { data: rows } = await supabase.from('tasks').select('*');
          if (rows && rows.length > 0) {
            const merged = get().tasks.map((t) => {
              const remote = rows.find((r: any) => r.id === t.id);
              return remote ? { ...t, progress: remote.progress, notes: remote.notes ?? t.notes, updatedAt: remote.updated_at } : t;
            });
            set({ tasks: merged, synced: true });
          } else {
            const inserts = get().tasks.map((t) => ({
              id: t.id, nom: t.nom, duree: t.duree, debut: t.debut, fin: t.fin,
              level: t.level, parent_id: t.parentId ?? null, is_milestone: t.isMilestone ?? false,
              progress: t.progress, notes: t.notes ?? null,
            }));
            await supabase.from('tasks').insert(inserts);
            set({ synced: true });
          }
          const { data: hist } = await supabase.from('progress_history').select('*').order('recorded_at', { ascending: true });
          if (hist) set({ history: hist as ProgressEntry[] });
        } catch {
          set({ synced: false });
        } finally {
          set({ loading: false });
        }
      },

      updateProgress: async (id, progress, notes) => {
        const userName = get().userName;
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, progress, notes: notes ?? t.notes, updatedAt: new Date().toISOString() } : t
          ),
          history: [
            ...state.history,
            { task_id: id, progress, notes: notes ?? '', recorded_at: new Date().toISOString(), recorded_by: userName },
          ],
        }));
        if (supabase) {
          await supabase.from('tasks').upsert({ id, progress, notes: notes ?? null, updated_at: new Date().toISOString(), updated_by: userName });
          await supabase.from('progress_history').insert({ task_id: id, progress, notes: notes ?? null, recorded_by: userName });
        }
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
        }));
        if (supabase) {
          const dbUpdates: Record<string, any> = {};
          if (updates.nom !== undefined) dbUpdates.nom = updates.nom;
          if (updates.duree !== undefined) dbUpdates.duree = updates.duree;
          if (updates.debut !== undefined) dbUpdates.debut = updates.debut;
          if (updates.fin !== undefined) dbUpdates.fin = updates.fin;
          if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
          dbUpdates.updated_at = new Date().toISOString();
          supabase.from('tasks').update(dbUpdates).eq('id', id).then();
        }
      },

      addTask: (task) => {
        const id = get().nextId;
        const newTask: Task = { ...task, id, progress: 0 };
        set((state) => ({
          tasks: [...state.tasks, newTask],
          nextId: state.nextId + 1,
        }));
        if (supabase) {
          supabase.from('tasks').insert({
            id, nom: newTask.nom, duree: newTask.duree, debut: newTask.debut, fin: newTask.fin,
            level: newTask.level, parent_id: newTask.parentId ?? null, is_milestone: newTask.isMilestone ?? false,
            progress: 0, notes: newTask.notes ?? null,
          }).then();
        }
        return id;
      },

      deleteTask: (id) => {
        const { tasks } = get();
        const toDelete = new Set<number>();
        function collect(targetId: number) {
          toDelete.add(targetId);
          tasks.filter((t) => t.parentId === targetId).forEach((t) => collect(t.id));
        }
        collect(id);
        set((state) => ({
          tasks: state.tasks.filter((t) => !toDelete.has(t.id)),
        }));
        if (supabase) {
          supabase.from('tasks').delete().in('id', [...toDelete]).then();
        }
      },

      resetAll: async () => {
        const fresh = initTasks();
        set({ tasks: fresh, history: [], nextId: 10000 });
        if (supabase) {
          await supabase.from('progress_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('tasks').upsert(fresh.map((t) => ({ id: t.id, progress: 0, notes: null })));
        }
      },
    }),
    { name: 'oa-nge-store', partialize: (s) => ({ tasks: s.tasks, history: s.history, userName: s.userName, nextId: s.nextId }) }
  )
);
