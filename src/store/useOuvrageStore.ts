import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export type KanbanStatus = 'planifie' | 'en_cours' | 'en_attente' | 'termine';
export type Priority = 'faible' | 'moyen' | 'eleve' | 'critique';
export type ContrainteStatus = 'identifiee' | 'en_cours_levee' | 'levee';
export type TypeReseau = string;

export interface KanbanCard {
  id: string;
  ouvrageId: number;
  titre: string;
  description?: string;
  status: KanbanStatus;
  priority: Priority;
  dueDate?: string;
  assignedTo?: string;
  createdAt: string;
}

export interface Contrainte {
  id: string;
  ouvrageId: number;
  typeReseau: TypeReseau;
  nature?: string;
  description: string;
  pkLocalisation?: string;
  status: ContrainteStatus;
  dateIdentification?: string;
  dateLevee?: string;
  responsable?: string;
  notes?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  ouvrageId: number;
  contenu: string;
  auteur: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  ouvrageId: number;
  titre: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  assignedTo?: string;
  done: boolean;
  createdAt: string;
}

export interface ContrainteOption {
  value: string;
  label: string;
}

const DEFAULT_CONCESSIONNAIRES: ContrainteOption[] = [
  { value: 'OCP', label: 'OCP — Phosphate' },
  { value: 'ONEE_ELEC', label: 'ONEE — Électricité' },
  { value: 'ONEE_EAU', label: 'ONEE — Eau potable' },
  { value: 'IAM', label: 'Maroc Telecom / IAM' },
  { value: 'ONCF', label: 'ONCF — Ferroviaire existant' },
  { value: 'ADM', label: 'ADM — Autoroutes du Maroc' },
  { value: 'AUTRE', label: 'Autre' },
];

const DEFAULT_NATURES: ContrainteOption[] = [
  { value: 'DEPLACEMENT', label: 'Déplacement de réseau' },
  { value: 'PROTECTION', label: 'Protection de réseau' },
  { value: 'COUPURE', label: 'Coupure temporaire' },
  { value: 'TRAVERSEE', label: 'Traversée' },
  { value: 'DEVIATION', label: 'Déviation provisoire' },
  { value: 'AUTRE', label: 'Autre' },
];

interface OuvrageStore {
  cards: KanbanCard[];
  contraintes: Contrainte[];
  notes: Note[];
  todos: Todo[];
  concessionnaires: ContrainteOption[];
  naturesContrainte: ContrainteOption[];

  // Kanban
  addCard: (card: Omit<KanbanCard, 'id' | 'createdAt'>) => void;
  updateCard: (id: string, updates: Partial<KanbanCard>) => void;
  deleteCard: (id: string) => void;
  moveCard: (id: string, status: KanbanStatus) => void;

  // Contraintes
  addContrainte: (c: Omit<Contrainte, 'id' | 'createdAt'>) => void;
  updateContrainte: (id: string, updates: Partial<Contrainte>) => void;
  deleteContrainte: (id: string) => void;

  // Notes
  addNote: (n: Omit<Note, 'id' | 'createdAt'>) => void;
  deleteNote: (id: string) => void;

  // Todos
  addTodo: (t: Omit<Todo, 'id' | 'createdAt'>) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;

  // Custom lists
  setConcessionnaires: (list: ContrainteOption[]) => void;
  setNaturesContrainte: (list: ContrainteOption[]) => void;
}

function uid() {
  return crypto.randomUUID();
}

export const useOuvrageStore = create<OuvrageStore>()(
  persist(
    (set) => ({
      cards: [],
      contraintes: [],
      notes: [],
      todos: [],
      concessionnaires: DEFAULT_CONCESSIONNAIRES,
      naturesContrainte: DEFAULT_NATURES,

      addCard: (card) => {
        const newCard: KanbanCard = { ...card, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ cards: [...s.cards, newCard] }));
        if (supabase) supabase.from('kanban_cards').insert({ id: newCard.id, ouvrage_id: newCard.ouvrageId, titre: newCard.titre, description: newCard.description, status: newCard.status, priority: newCard.priority, due_date: newCard.dueDate, assigned_to: newCard.assignedTo });
      },
      updateCard: (id, updates) => {
        set((s) => ({ cards: s.cards.map((c) => c.id === id ? { ...c, ...updates } : c) }));
        if (supabase) supabase.from('kanban_cards').update(updates).eq('id', id);
      },
      deleteCard: (id) => {
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
        if (supabase) supabase.from('kanban_cards').delete().eq('id', id);
      },
      moveCard: (id, status) => {
        set((s) => ({ cards: s.cards.map((c) => c.id === id ? { ...c, status } : c) }));
        if (supabase) supabase.from('kanban_cards').update({ status }).eq('id', id);
      },

      addContrainte: (c) => {
        const nc: Contrainte = { ...c, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ contraintes: [...s.contraintes, nc] }));
        if (supabase) supabase.from('contraintes').insert({ id: nc.id, ouvrage_id: nc.ouvrageId, type_reseau: nc.typeReseau, description: nc.description, pk_localisation: nc.pkLocalisation, status: nc.status, date_identification: nc.dateIdentification, responsable: nc.responsable, notes: nc.notes });
      },
      updateContrainte: (id, updates) => {
        set((s) => ({ contraintes: s.contraintes.map((c) => c.id === id ? { ...c, ...updates } : c) }));
        if (supabase) supabase.from('contraintes').update(updates).eq('id', id);
      },
      deleteContrainte: (id) => {
        set((s) => ({ contraintes: s.contraintes.filter((c) => c.id !== id) }));
        if (supabase) supabase.from('contraintes').delete().eq('id', id);
      },

      addNote: (n) => {
        const nn: Note = { ...n, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ notes: [...s.notes, nn] }));
        if (supabase) supabase.from('notes').insert({ id: nn.id, ouvrage_id: nn.ouvrageId, contenu: nn.contenu, auteur: nn.auteur });
      },
      deleteNote: (id) => {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
        if (supabase) supabase.from('notes').delete().eq('id', id);
      },

      addTodo: (t) => {
        const nt: Todo = { ...t, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ todos: [...s.todos, nt] }));
        if (supabase) supabase.from('todos').insert({ id: nt.id, ouvrage_id: nt.ouvrageId, titre: nt.titre, description: nt.description, priority: nt.priority, due_date: nt.dueDate, assigned_to: nt.assignedTo, done: nt.done });
      },
      updateTodo: (id, updates) => {
        set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, ...updates } : t) }));
        if (supabase) supabase.from('todos').update(updates).eq('id', id);
      },
      toggleTodo: (id) => {
        set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, done: !t.done } : t) }));
        if (supabase) {
          const todo = useOuvrageStore.getState().todos.find((t) => t.id === id);
          if (todo) supabase.from('todos').update({ done: todo.done }).eq('id', id);
        }
      },
      deleteTodo: (id) => {
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
        if (supabase) supabase.from('todos').delete().eq('id', id);
      },
      setConcessionnaires: (list) => set({ concessionnaires: list }),
      setNaturesContrainte: (list) => set({ naturesContrainte: list }),
    }),
    { name: 'oa-nge-ouvrage-store' }
  )
);
