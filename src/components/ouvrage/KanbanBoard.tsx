import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import type { KanbanCard, KanbanStatus, Priority } from '../../store/useOuvrageStore';
import { Plus, Calendar, User, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, Badge, Modal, Input, Textarea, Select } from '../ui/index';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props { ouvrageId: number }

const COLUMNS: { id: KanbanStatus; label: string; variant: 'gray' | 'blue' | 'amber' | 'green' }[] = [
  { id: 'planifie', label: 'Planifié', variant: 'gray' },
  { id: 'en_cours', label: 'En cours', variant: 'blue' },
  { id: 'en_attente', label: 'En attente', variant: 'amber' },
  { id: 'termine', label: 'Terminé', variant: 'green' },
];

const COL_STYLE: Record<KanbanStatus, string> = {
  planifie: 'bg-gray-50 border-gray-200',
  en_cours: 'bg-blue-50/50 border-blue-200',
  en_attente: 'bg-amber-50/50 border-amber-200',
  termine: 'bg-emerald-50/50 border-emerald-200',
};

const PRIORITY_MAP: Record<Priority, { variant: 'gray' | 'blue' | 'amber' | 'red'; label: string }> = {
  faible: { variant: 'gray', label: 'Faible' },
  moyen: { variant: 'blue', label: 'Moyen' },
  eleve: { variant: 'amber', label: 'Élevé' },
  critique: { variant: 'red', label: 'Critique' },
};

const EMPTY_FORM = { titre: '', description: '', priority: 'moyen' as Priority, dueDate: '', assignedTo: '', status: 'planifie' as KanbanStatus };

function KanbanCardItem({ card, onClick }: { card: KanbanCard; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const overdue = card.dueDate && isPast(parseISO(card.dueDate)) && card.status !== 'termine';
  const p = PRIORITY_MAP[card.priority];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes} {...listeners}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing group"
    >
      <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">{card.titre}</p>
      {card.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{card.description}</p>}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <Badge variant={p.variant} dot>{p.label}</Badge>
        {card.dueDate && (
          <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {overdue && <AlertCircle size={10} />}
            <Calendar size={10} />
            {format(parseISO(card.dueDate), 'dd/MM', { locale: fr })}
          </span>
        )}
        {card.assignedTo && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <User size={10} />{card.assignedTo}
          </span>
        )}
      </div>
    </div>
  );
}

function CardForm({ initial, onSave, onCancel, title }: {
  initial: typeof EMPTY_FORM;
  onSave: (f: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  const f = (k: keyof typeof EMPTY_FORM, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <Input label="Titre *" value={form.titre} onChange={(e) => f('titre', e.target.value)} placeholder="Titre de la carte..." />
      <Textarea label="Description" value={form.description} onChange={(e) => f('description', e.target.value)} rows={3} placeholder="Description..." />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Statut" value={form.status} onChange={(e) => f('status', e.target.value)}
          options={COLUMNS.map((c) => ({ value: c.id, label: c.label }))} />
        <Select label="Priorité" value={form.priority} onChange={(e) => f('priority', e.target.value)}
          options={[{ value: 'faible', label: 'Faible' }, { value: 'moyen', label: 'Moyen' }, { value: 'eleve', label: 'Élevé' }, { value: 'critique', label: 'Critique' }]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Échéance" type="date" value={form.dueDate} onChange={(e) => f('dueDate', e.target.value)} />
        <Input label="Assigné à" value={form.assignedTo} onChange={(e) => f('assignedTo', e.target.value)} placeholder="Nom..." />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" onClick={() => form.titre.trim() && onSave(form)} disabled={!form.titre.trim()}>{title}</Button>
      </div>
    </div>
  );
}

export function KanbanBoard({ ouvrageId }: Props) {
  const { cards, moveCard, deleteCard, addCard, updateCard } = useOuvrageStore();
  const [addingTo, setAddingTo] = useState<KanbanStatus | null>(null);
  const [editCard, setEditCard] = useState<KanbanCard | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const ouvrageCards = cards.filter((c) => c.ouvrageId === ouvrageId);
  const activeCard = ouvrageCards.find((c) => c.id === activeId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const col = COLUMNS.find((c) => c.id === over.id);
    if (col) { moveCard(active.id as string, col.id); return; }
    const overCard = ouvrageCards.find((c) => c.id === over.id);
    if (overCard) {
      const activeCard2 = ouvrageCards.find((c) => c.id === active.id);
      if (activeCard2 && overCard.status !== activeCard2.status) moveCard(active.id as string, overCard.status);
    }
  }

  return (
    <div>
      {/* Add card modal */}
      <Modal open={addingTo !== null} onClose={() => setAddingTo(null)} title="Nouvelle carte">
        <CardForm
          initial={{ ...EMPTY_FORM, status: addingTo ?? 'planifie' }}
          onSave={(f) => { addCard({ ouvrageId, titre: f.titre, description: f.description || undefined, status: f.status, priority: f.priority, dueDate: f.dueDate || undefined, assignedTo: f.assignedTo || undefined }); setAddingTo(null); }}
          onCancel={() => setAddingTo(null)}
          title="Créer"
        />
      </Modal>

      {/* Edit card modal */}
      <Modal open={editCard !== null} onClose={() => setEditCard(null)} title="Modifier la carte">
        {editCard && (
          <div className="space-y-4">
            <CardForm
              initial={{ titre: editCard.titre, description: editCard.description ?? '', priority: editCard.priority, dueDate: editCard.dueDate ?? '', assignedTo: editCard.assignedTo ?? '', status: editCard.status }}
              onSave={(f) => { updateCard(editCard.id, { ...f, description: f.description || undefined, dueDate: f.dueDate || undefined, assignedTo: f.assignedTo || undefined }); setEditCard(null); }}
              onCancel={() => setEditCard(null)}
              title="Enregistrer"
            />
            <div className="border-t pt-3">
              <Button variant="danger" size="sm" onClick={() => { deleteCard(editCard.id); setEditCard(null); }}>Supprimer la carte</Button>
            </div>
          </div>
        )}
      </Modal>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4 min-h-[500px]">
          {COLUMNS.map((col) => {
            const colCards = ouvrageCards.filter((c) => c.status === col.id);
            return (
              <div key={col.id} className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={col.variant}>{col.label}</Badge>
                    <span className="text-xs text-gray-400 font-semibold">{colCards.length}</span>
                  </div>
                  <button onClick={() => setAddingTo(col.id)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-1 transition-colors"><Plus size={14} /></button>
                </div>
                <div id={col.id} className={`flex-1 rounded-2xl border-2 border-dashed p-2 space-y-2 transition-colors ${COL_STYLE[col.id]}`}>
                  <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {colCards.map((card) => (
                      <KanbanCardItem key={card.id} card={card} onClick={() => setEditCard(card)} />
                    ))}
                  </SortableContext>
                  {colCards.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-300">Vide</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="bg-white rounded-xl border-2 border-blue-400 p-3.5 shadow-2xl rotate-1 w-56 opacity-95">
              <p className="text-sm font-semibold text-gray-800">{activeCard.titre}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
