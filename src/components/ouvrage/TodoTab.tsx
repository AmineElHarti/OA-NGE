import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import type { Priority } from '../../store/useOuvrageStore';
import { Plus, X, CheckSquare, Square, ClipboardList, Calendar, User } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, Badge, Card, Modal, Input, Textarea, Select, SectionHeader, EmptyState } from '../ui/index';

const PRIORITY_MAP: Record<Priority, { variant: 'gray' | 'blue' | 'amber' | 'red'; label: string }> = {
  faible: { variant: 'gray', label: 'Faible' },
  moyen: { variant: 'blue', label: 'Moyen' },
  eleve: { variant: 'amber', label: 'Élevé' },
  critique: { variant: 'red', label: 'Critique' },
};

const EMPTY = { titre: '', description: '', priority: 'moyen' as Priority, dueDate: '', assignedTo: '' };

interface Props { ouvrageId: number }

export function TodoTab({ ouvrageId }: Props) {
  const { todos, addTodo, toggleTodo, deleteTodo } = useOuvrageStore();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [form, setForm] = useState(EMPTY);

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const all = todos.filter((t) => t.ouvrageId === ouvrageId);
  const items = all
    .filter((t) => filter === 'all' ? true : filter === 'pending' ? !t.done : t.done)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const order = ['critique', 'eleve', 'moyen', 'faible'];
      if (a.priority !== b.priority) return order.indexOf(a.priority) - order.indexOf(b.priority);
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return b.createdAt.localeCompare(a.createdAt);
    });

  const pending = all.filter((t) => !t.done).length;
  const done = all.filter((t) => t.done).length;

  const save = () => {
    if (!form.titre.trim()) return;
    addTodo({ ouvrageId, titre: form.titre, description: form.description || undefined, priority: form.priority, dueDate: form.dueDate || undefined, assignedTo: form.assignedTo || undefined, done: false });
    setForm(EMPTY);
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle tâche à faire">
        <div className="space-y-4">
          <Input label="Titre *" value={form.titre} onChange={(e) => f('titre', e.target.value)} placeholder="Titre de la tâche..." />
          <Textarea label="Description" value={form.description} onChange={(e) => f('description', e.target.value)} rows={2} placeholder="Description optionnelle..." />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Priorité" value={form.priority} onChange={(e) => f('priority', e.target.value)}
              options={[{ value: 'faible', label: 'Faible' }, { value: 'moyen', label: 'Moyen' }, { value: 'eleve', label: 'Élevé' }, { value: 'critique', label: 'Critique' }]} />
            <Input label="Échéance" type="date" value={form.dueDate} onChange={(e) => f('dueDate', e.target.value)} />
            <Input label="Assigné à" value={form.assignedTo} onChange={(e) => f('assignedTo', e.target.value)} placeholder="Nom..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={save} disabled={!form.titre.trim()}>Créer</Button>
          </div>
        </div>
      </Modal>

      <SectionHeader
        title="À faire"
        description={`${pending} en attente · ${done} terminées`}
        actions={<Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowModal(true)}>Ajouter</Button>}
      />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([['all', `Tout (${all.length})`], ['pending', `En attente (${pending})`], ['done', `Terminées (${done})`]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === v ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<ClipboardList size={40} />} title="Aucune tâche" description="Ajoutez des actions à réaliser pour cet ouvrage"
          action={<Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowModal(true)}>Ajouter</Button>} />
      ) : (
        <div className="space-y-2">
          {items.map((t) => {
            const p = PRIORITY_MAP[t.priority];
            const overdue = t.dueDate && isPast(parseISO(t.dueDate)) && !t.done && !isToday(parseISO(t.dueDate));
            const dueToday = t.dueDate && isToday(parseISO(t.dueDate));
            return (
              <Card key={t.id} className={`group flex items-start gap-3 !p-3.5 ${t.done ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleTodo(t.id)} className="mt-0.5 flex-shrink-0">
                  {t.done
                    ? <CheckSquare size={18} className="text-emerald-500" />
                    : <Square size={18} className="text-gray-300 hover:text-blue-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-gray-800 ${t.done ? 'line-through text-gray-400' : ''}`}>{t.titre}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant={p.variant} dot>{p.label}</Badge>
                    {t.dueDate && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-600' : dueToday ? 'text-amber-600' : 'text-gray-400'}`}>
                        <Calendar size={10} />
                        {overdue && 'En retard · '}{dueToday && "Aujourd'hui · "}
                        {format(parseISO(t.dueDate), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    )}
                    {t.assignedTo && <span className="flex items-center gap-1 text-xs text-gray-400"><User size={10} />{t.assignedTo}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTodo(t.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 flex-shrink-0 transition-opacity">
                  <X size={13} />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
