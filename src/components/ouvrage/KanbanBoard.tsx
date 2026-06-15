import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import type { KanbanCard, KanbanStatus, Priority } from '../../store/useOuvrageStore';
import { Plus, X, Edit2, Check, Calendar, User, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props { ouvrageId: number; color?: string; userName?: string }

const COLUMNS: { id: KanbanStatus; label: string; color: string; bg: string }[] = [
  { id: 'planifie', label: 'Planifié', color: 'text-gray-600', bg: 'bg-gray-100' },
  { id: 'en_cours', label: 'En cours', color: 'text-blue-700', bg: 'bg-blue-100' },
  { id: 'en_attente', label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100' },
  { id: 'termine', label: 'Terminé', color: 'text-emerald-700', bg: 'bg-emerald-100' },
];

const PRIORITY_STYLES: Record<Priority, string> = {
  faible: 'bg-gray-100 text-gray-600',
  moyen: 'bg-blue-100 text-blue-700',
  eleve: 'bg-orange-100 text-orange-700',
  critique: 'bg-red-100 text-red-700',
};
const PRIORITY_LABELS: Record<Priority, string> = { faible: 'Faible', moyen: 'Moyen', eleve: 'Élevé', critique: 'Critique' };

function CardItem({ card, onEdit, onDelete }: { card: KanbanCard; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const overdue = card.dueDate && isPast(parseISO(card.dueDate)) && card.status !== 'termine';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 flex-1 leading-tight">{card.titre}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 p-0.5"><Edit2 size={12} /></button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-0.5"><X size={12} /></button>
        </div>
      </div>
      {card.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[card.priority]}`}>{PRIORITY_LABELS[card.priority]}</span>
        {card.dueDate && (
          <span className={`flex items-center gap-0.5 text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {overdue && <AlertCircle size={10} />}
            <Calendar size={10} />
            {format(parseISO(card.dueDate), 'dd/MM', { locale: fr })}
          </span>
        )}
        {card.assignedTo && (
          <span className="flex items-center gap-0.5 text-xs text-gray-400"><User size={10} />{card.assignedTo}</span>
        )}
      </div>
    </div>
  );
}

function AddCardForm({ ouvrageId, status, onClose }: { ouvrageId: number; status: KanbanStatus; onClose: () => void }) {
  const addCard = useOuvrageStore((s) => s.addCard);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('moyen');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const save = () => {
    if (!titre.trim()) return;
    addCard({ ouvrageId, titre, description: description || undefined, status, priority, dueDate: dueDate || undefined, assignedTo: assignedTo || undefined });
    onClose();
  };

  return (
    <div className="bg-white rounded-xl border-2 border-blue-400 p-3 shadow-lg space-y-2">
      <input autoFocus value={titre} onChange={(e) => setTitre(e.target.value)}
        placeholder="Titre de la carte..." onKeyDown={(e) => e.key === 'Enter' && save()}
        className="w-full text-sm font-semibold border-b border-gray-200 pb-1 focus:outline-none" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optionnel)..." rows={2}
        className="w-full text-xs border rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
      <div className="grid grid-cols-2 gap-2">
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
          className="text-xs border rounded p-1 focus:outline-none">
          <option value="faible">Faible</option>
          <option value="moyen">Moyen</option>
          <option value="eleve">Élevé</option>
          <option value="critique">Critique</option>
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
          className="text-xs border rounded p-1 focus:outline-none" />
      </div>
      <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
        placeholder="Assigné à..." className="w-full text-xs border rounded p-1.5 focus:outline-none" />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Annuler</button>
        <button onClick={save} className="text-xs bg-blue-700 text-white px-3 py-1 rounded-lg hover:bg-blue-800">Ajouter</button>
      </div>
    </div>
  );
}

export function KanbanBoard({ ouvrageId }: Props) {
  const { cards, moveCard, deleteCard, updateCard } = useOuvrageStore();
  const [addingTo, setAddingTo] = useState<KanbanStatus | null>(null);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const ouvrageCards = cards.filter((c) => c.ouvrageId === ouvrageId);
  const activeCard = activeId ? ouvrageCards.find((c) => c.id === activeId) : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    // over.id could be a card id or column id
    const col = COLUMNS.find((c) => c.id === over.id);
    if (col) { moveCard(active.id as string, col.id); return; }
    const overCard = ouvrageCards.find((c) => c.id === over.id);
    if (overCard && overCard.status !== ouvrageCards.find((c) => c.id === active.id)?.status) {
      moveCard(active.id as string, overCard.status);
    }
  }

  return (
    <div>
      {editingCard && (
        <EditCardModal card={editingCard} onClose={() => setEditingCard(null)}
          onSave={(updates) => { updateCard(editingCard.id, updates); setEditingCard(null); }} />
      )}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4 min-h-96">
          {COLUMNS.map((col) => {
            const colCards = ouvrageCards.filter((c) => c.status === col.id);
            return (
              <div key={col.id} className="flex flex-col">
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${col.bg} mb-3`}>
                  <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                  <span className={`text-xs font-semibold ${col.color} bg-white rounded-full w-5 h-5 flex items-center justify-center`}>{colCards.length}</span>
                </div>
                <div className="flex-1 space-y-2 min-h-16 p-1 rounded-xl border-2 border-dashed border-transparent hover:border-gray-200 transition-colors" id={col.id}>
                  <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {colCards.map((card) => (
                      <CardItem key={card.id} card={card}
                        onEdit={() => setEditingCard(card)}
                        onDelete={() => deleteCard(card.id)} />
                    ))}
                  </SortableContext>
                  {addingTo === col.id
                    ? <AddCardForm ouvrageId={ouvrageId} status={col.id} onClose={() => setAddingTo(null)} />
                    : <button onClick={() => setAddingTo(col.id)}
                        className="w-full flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors">
                        <Plus size={13} /> Ajouter une carte
                      </button>}
                </div>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="bg-white rounded-xl border-2 border-blue-400 p-3 shadow-xl rotate-2 w-52">
              <p className="text-sm font-semibold text-gray-800">{activeCard.titre}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function EditCardModal({ card, onClose, onSave }: { card: KanbanCard; onClose: () => void; onSave: (u: Partial<KanbanCard>) => void }) {
  const [titre, setTitre] = useState(card.titre);
  const [description, setDescription] = useState(card.description ?? '');
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');
  const [assignedTo, setAssignedTo] = useState(card.assignedTo ?? '');
  const [status, setStatus] = useState<KanbanStatus>(card.status);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Modifier la carte</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <input value={titre} onChange={(e) => setTitre(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          placeholder="Description..."
          className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as KanbanStatus)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Priorité</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="faible">Faible</option>
              <option value="moyen">Moyen</option>
              <option value="eleve">Élevé</option>
              <option value="critique">Critique</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Échéance</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Assigné à</label>
            <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-xl">Annuler</button>
          <button onClick={() => onSave({ titre, description: description || undefined, priority, dueDate: dueDate || undefined, assignedTo: assignedTo || undefined, status })}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 flex items-center gap-1.5">
            <Check size={14} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
