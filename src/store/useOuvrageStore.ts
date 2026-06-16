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

export type PhotoCategorie = 'conception' | 'vue_en_plan';

export interface OuvragePhoto {
  id: string;
  ouvrageId: number;
  categorie: PhotoCategorie;
  nom: string;
  dataUrl: string;
  createdAt: string;
}

export type EtudeStatus = 'non_demarre' | 'en_cours' | 'soumis' | 'en_revision' | 'valide';

export interface Etude {
  id: string;
  ouvrageId: number;
  type: string;
  nom: string;
  status: EtudeStatus;
  version: string;
  dateSoumission?: string;
  dateValidation?: string;
  responsable?: string;
  observations?: string;
  createdAt: string;
}

const DEFAULT_TYPES_ETUDE: ContrainteOption[] = [
  { value: 'APS', label: 'APS — Avant-Projet Sommaire' },
  { value: 'APD', label: 'APD — Avant-Projet Détaillé' },
  { value: 'EXE', label: 'EXE — Études d\'exécution' },
  { value: 'PLANS', label: 'Plans d\'exécution' },
  { value: 'NDC', label: 'Note de calcul' },
  { value: 'METHODE', label: 'Méthode d\'exécution' },
  { value: 'GEOTECHNIQUE', label: 'Étude géotechnique' },
  { value: 'HYDRAULIQUE', label: 'Étude hydraulique' },
  { value: 'PAQ', label: 'PAQ — Plan Assurance Qualité' },
  { value: 'AUTRE', label: 'Autre' },
];

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
  etudes: Etude[];
  photos: OuvragePhoto[];
  concessionnaires: ContrainteOption[];
  naturesContrainte: ContrainteOption[];
  typesEtude: ContrainteOption[];
  synced: boolean;

  fetchFromSupabase: () => Promise<void>;

  addCard: (card: Omit<KanbanCard, 'id' | 'createdAt'>) => void;
  updateCard: (id: string, updates: Partial<KanbanCard>) => void;
  deleteCard: (id: string) => void;
  moveCard: (id: string, status: KanbanStatus) => void;

  addContrainte: (c: Omit<Contrainte, 'id' | 'createdAt'>) => void;
  updateContrainte: (id: string, updates: Partial<Contrainte>) => void;
  deleteContrainte: (id: string) => void;

  addNote: (n: Omit<Note, 'id' | 'createdAt'>) => void;
  deleteNote: (id: string) => void;

  addTodo: (t: Omit<Todo, 'id' | 'createdAt'>) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;

  addEtude: (e: Omit<Etude, 'id' | 'createdAt'>) => void;
  updateEtude: (id: string, updates: Partial<Etude>) => void;
  deleteEtude: (id: string) => void;

  addPhoto: (p: Omit<OuvragePhoto, 'id' | 'createdAt'>) => void;
  deletePhoto: (id: string) => void;

  setConcessionnaires: (list: ContrainteOption[]) => void;
  setNaturesContrainte: (list: ContrainteOption[]) => void;
  setTypesEtude: (list: ContrainteOption[]) => void;
}

function uid() {
  return crypto.randomUUID();
}

function toKanbanCard(r: any): KanbanCard {
  return {
    id: r.id, ouvrageId: r.ouvrage_id, titre: r.titre, description: r.description,
    status: r.status, priority: r.priority, dueDate: r.due_date, assignedTo: r.assigned_to,
    createdAt: r.created_at,
  };
}

function toContrainte(r: any): Contrainte {
  return {
    id: r.id, ouvrageId: r.ouvrage_id, typeReseau: r.type_reseau, nature: r.nature,
    description: r.description, pkLocalisation: r.pk_localisation, status: r.status,
    dateIdentification: r.date_identification, dateLevee: r.date_levee,
    responsable: r.responsable, notes: r.notes, createdAt: r.created_at,
  };
}

function toNote(r: any): Note {
  return { id: r.id, ouvrageId: r.ouvrage_id, contenu: r.contenu, auteur: r.auteur, createdAt: r.created_at };
}

function toTodo(r: any): Todo {
  return {
    id: r.id, ouvrageId: r.ouvrage_id, titre: r.titre, description: r.description,
    priority: r.priority, dueDate: r.due_date, assignedTo: r.assigned_to,
    done: r.done, createdAt: r.created_at,
  };
}

function toEtude(r: any): Etude {
  return {
    id: r.id, ouvrageId: r.ouvrage_id, type: r.type, nom: r.nom,
    status: r.status, version: r.version, dateSoumission: r.date_soumission,
    dateValidation: r.date_validation, responsable: r.responsable,
    observations: r.observations, createdAt: r.created_at,
  };
}

async function uploadPhoto(id: string, dataUrl: string): Promise<string | null> {
  if (!supabase) return null;
  const base64 = dataUrl.split(',')[1];
  if (!base64) return null;
  const mimeMatch = dataUrl.match(/data:([^;]+);/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const ext = mime.split('/')[1] ?? 'png';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `ouvrages/${id}.${ext}`;
  await supabase.storage.from('photos').upload(path, bytes, { contentType: mime, upsert: true });
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

export const useOuvrageStore = create<OuvrageStore>()(
  persist(
    (set, get) => ({
      cards: [],
      contraintes: [],
      notes: [],
      todos: [],
      etudes: [],
      photos: [],
      concessionnaires: DEFAULT_CONCESSIONNAIRES,
      naturesContrainte: DEFAULT_NATURES,
      typesEtude: DEFAULT_TYPES_ETUDE,
      synced: false,

      fetchFromSupabase: async () => {
        if (!supabase) return;
        try {
          const [cardsRes, contraintesRes, notesRes, todosRes, etudesRes, photosRes] = await Promise.all([
            supabase.from('kanban_cards').select('*').order('created_at', { ascending: true }),
            supabase.from('contraintes').select('*').order('created_at', { ascending: true }),
            supabase.from('notes').select('*').order('created_at', { ascending: true }),
            supabase.from('todos').select('*').order('created_at', { ascending: true }),
            supabase.from('etudes').select('*').order('created_at', { ascending: true }),
            supabase.from('photos').select('*').order('created_at', { ascending: true }),
          ]);

          const updates: Partial<OuvrageStore> = { synced: true };

          if (cardsRes.data && cardsRes.data.length > 0) {
            updates.cards = cardsRes.data.map(toKanbanCard);
          }
          if (contraintesRes.data && contraintesRes.data.length > 0) {
            updates.contraintes = contraintesRes.data.map(toContrainte);
          }
          if (notesRes.data && notesRes.data.length > 0) {
            updates.notes = notesRes.data.map(toNote);
          }
          if (todosRes.data && todosRes.data.length > 0) {
            updates.todos = todosRes.data.map(toTodo);
          }
          if (etudesRes.data && etudesRes.data.length > 0) {
            updates.etudes = etudesRes.data.map(toEtude);
          }
          if (photosRes.data && photosRes.data.length > 0) {
            updates.photos = photosRes.data.map((r: any) => ({
              id: r.id,
              ouvrageId: r.ouvrage_id,
              categorie: r.categorie,
              nom: r.nom,
              dataUrl: r.storage_path ?? '',
              createdAt: r.created_at,
            }));
          }

          set(updates as any);
        } catch {
          set({ synced: false });
        }
      },

      // Kanban
      addCard: (card) => {
        const newCard: KanbanCard = { ...card, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ cards: [...s.cards, newCard] }));
        if (supabase) {
          supabase.from('kanban_cards').insert({
            id: newCard.id, ouvrage_id: newCard.ouvrageId, titre: newCard.titre,
            description: newCard.description ?? null, status: newCard.status, priority: newCard.priority,
            due_date: newCard.dueDate ?? null, assigned_to: newCard.assignedTo ?? null,
          }).then();
        }
      },
      updateCard: (id, updates) => {
        set((s) => ({ cards: s.cards.map((c) => c.id === id ? { ...c, ...updates } : c) }));
        if (supabase) {
          const db: Record<string, any> = {};
          if (updates.titre !== undefined) db.titre = updates.titre;
          if (updates.description !== undefined) db.description = updates.description;
          if (updates.status !== undefined) db.status = updates.status;
          if (updates.priority !== undefined) db.priority = updates.priority;
          if (updates.dueDate !== undefined) db.due_date = updates.dueDate;
          if (updates.assignedTo !== undefined) db.assigned_to = updates.assignedTo;
          supabase.from('kanban_cards').update(db).eq('id', id).then();
        }
      },
      deleteCard: (id) => {
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
        if (supabase) supabase.from('kanban_cards').delete().eq('id', id).then();
      },
      moveCard: (id, status) => {
        set((s) => ({ cards: s.cards.map((c) => c.id === id ? { ...c, status } : c) }));
        if (supabase) supabase.from('kanban_cards').update({ status }).eq('id', id).then();
      },

      // Contraintes
      addContrainte: (c) => {
        const nc: Contrainte = { ...c, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ contraintes: [...s.contraintes, nc] }));
        if (supabase) {
          supabase.from('contraintes').insert({
            id: nc.id, ouvrage_id: nc.ouvrageId, type_reseau: nc.typeReseau,
            nature: nc.nature ?? null, description: nc.description,
            pk_localisation: nc.pkLocalisation ?? null, status: nc.status,
            date_identification: nc.dateIdentification ?? null,
            date_levee: nc.dateLevee ?? null, responsable: nc.responsable ?? null,
            notes: nc.notes ?? null,
          }).then();
        }
      },
      updateContrainte: (id, updates) => {
        set((s) => ({ contraintes: s.contraintes.map((c) => c.id === id ? { ...c, ...updates } : c) }));
        if (supabase) {
          const db: Record<string, any> = {};
          if (updates.typeReseau !== undefined) db.type_reseau = updates.typeReseau;
          if (updates.nature !== undefined) db.nature = updates.nature;
          if (updates.description !== undefined) db.description = updates.description;
          if (updates.pkLocalisation !== undefined) db.pk_localisation = updates.pkLocalisation;
          if (updates.status !== undefined) db.status = updates.status;
          if (updates.dateIdentification !== undefined) db.date_identification = updates.dateIdentification;
          if (updates.dateLevee !== undefined) db.date_levee = updates.dateLevee;
          if (updates.responsable !== undefined) db.responsable = updates.responsable;
          if (updates.notes !== undefined) db.notes = updates.notes;
          supabase.from('contraintes').update(db).eq('id', id).then();
        }
      },
      deleteContrainte: (id) => {
        set((s) => ({ contraintes: s.contraintes.filter((c) => c.id !== id) }));
        if (supabase) supabase.from('contraintes').delete().eq('id', id).then();
      },

      // Notes
      addNote: (n) => {
        const nn: Note = { ...n, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ notes: [...s.notes, nn] }));
        if (supabase) {
          supabase.from('notes').insert({
            id: nn.id, ouvrage_id: nn.ouvrageId, contenu: nn.contenu, auteur: nn.auteur,
          }).then();
        }
      },
      deleteNote: (id) => {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
        if (supabase) supabase.from('notes').delete().eq('id', id).then();
      },

      // Todos
      addTodo: (t) => {
        const nt: Todo = { ...t, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ todos: [...s.todos, nt] }));
        if (supabase) {
          supabase.from('todos').insert({
            id: nt.id, ouvrage_id: nt.ouvrageId, titre: nt.titre,
            description: nt.description ?? null, priority: nt.priority,
            due_date: nt.dueDate ?? null, assigned_to: nt.assignedTo ?? null, done: nt.done,
          }).then();
        }
      },
      updateTodo: (id, updates) => {
        set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, ...updates } : t) }));
        if (supabase) {
          const db: Record<string, any> = {};
          if (updates.titre !== undefined) db.titre = updates.titre;
          if (updates.description !== undefined) db.description = updates.description;
          if (updates.priority !== undefined) db.priority = updates.priority;
          if (updates.dueDate !== undefined) db.due_date = updates.dueDate;
          if (updates.assignedTo !== undefined) db.assigned_to = updates.assignedTo;
          if (updates.done !== undefined) db.done = updates.done;
          supabase.from('todos').update(db).eq('id', id).then();
        }
      },
      toggleTodo: (id) => {
        const current = get().todos.find((t) => t.id === id);
        const newDone = current ? !current.done : true;
        set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, done: newDone } : t) }));
        if (supabase) supabase.from('todos').update({ done: newDone }).eq('id', id).then();
      },
      deleteTodo: (id) => {
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
        if (supabase) supabase.from('todos').delete().eq('id', id).then();
      },

      // Études
      addEtude: (e) => {
        const ne: Etude = { ...e, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ etudes: [...s.etudes, ne] }));
        if (supabase) {
          supabase.from('etudes').insert({
            id: ne.id, ouvrage_id: ne.ouvrageId, type: ne.type, nom: ne.nom,
            status: ne.status, version: ne.version,
            date_soumission: ne.dateSoumission ?? null,
            date_validation: ne.dateValidation ?? null,
            responsable: ne.responsable ?? null,
            observations: ne.observations ?? null,
          }).then();
        }
      },
      updateEtude: (id, updates) => {
        set((s) => ({ etudes: s.etudes.map((e) => e.id === id ? { ...e, ...updates } : e) }));
        if (supabase) {
          const db: Record<string, any> = {};
          if (updates.type !== undefined) db.type = updates.type;
          if (updates.nom !== undefined) db.nom = updates.nom;
          if (updates.status !== undefined) db.status = updates.status;
          if (updates.version !== undefined) db.version = updates.version;
          if (updates.dateSoumission !== undefined) db.date_soumission = updates.dateSoumission;
          if (updates.dateValidation !== undefined) db.date_validation = updates.dateValidation;
          if (updates.responsable !== undefined) db.responsable = updates.responsable;
          if (updates.observations !== undefined) db.observations = updates.observations;
          supabase.from('etudes').update(db).eq('id', id).then();
        }
      },
      deleteEtude: (id) => {
        set((s) => ({ etudes: s.etudes.filter((e) => e.id !== id) }));
        if (supabase) supabase.from('etudes').delete().eq('id', id).then();
      },

      // Photos
      addPhoto: (p) => {
        const np: OuvragePhoto = { ...p, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ photos: [...s.photos, np] }));
        if (supabase) {
          uploadPhoto(np.id, np.dataUrl).then((storagePath) => {
            supabase!.from('photos').insert({
              id: np.id, ouvrage_id: np.ouvrageId, categorie: np.categorie,
              nom: np.nom, storage_path: storagePath,
            }).then();
          });
        }
      },
      deletePhoto: (id) => {
        const photo = get().photos.find((p) => p.id === id);
        set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }));
        if (supabase) {
          supabase.from('photos').delete().eq('id', id).then();
          if (photo) {
            const ext = photo.dataUrl.match(/data:image\/([^;]+)/)?.[1] ?? 'png';
            supabase.storage.from('photos').remove([`ouvrages/${id}.${ext}`]).then();
          }
        }
      },

      setConcessionnaires: (list) => set({ concessionnaires: list }),
      setNaturesContrainte: (list) => set({ naturesContrainte: list }),
      setTypesEtude: (list) => set({ typesEtude: list }),
    }),
    { name: 'oa-nge-ouvrage-store' }
  )
);
