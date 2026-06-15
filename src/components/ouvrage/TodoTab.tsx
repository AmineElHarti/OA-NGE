import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import type { Priority } from '../../store/useOuvrageStore';
import { Plus, X, Check, Calendar, User, CheckSquare, Square, ClipboardList } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  faible: { label: 'Faible', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  moyen: { label: 'Moyen', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  eleve: { label: 'Élevé', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  critique: { label: 'Critique', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
};

interface Props { ouvrageId: number; userName?: string }

export function TodoTab({ ouvrageId }: Props) {
  const { todos, addTodo, toggleTodo, deleteTodo } = useOuvrageStore();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [form, setForm] = useState({ titre: '', description: '', priority: 'moyen' as Priority, dueDate: '', assignedTo: '' });

  const items = todos
    .filter((t) => t.ouvrageId === ouvrageId)
    .filter((t) => filter === 'all' ? true : filter === 'pending' ? !t.done : t.done)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.priority !== b.priority) {
        const order = ['critique', 'eleve', 'moyen', 'faible'];
        return order.indexOf(a.priority) - order.indexOf(b.priority);
      }
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return b.createdAt.localeCompare(a.createdAt);
    });

  const all = todos.filter((t) => t.ouvrageId === ouvrageId);
  const pending = all.filter((t) => !t.done).length;
  const done = all.filter((t) => t.done).length;

  const save = () => {
    if (!form.titre.trim()) return;
    addTodo({ ouvrageId, titre: form.titre, description: form.description || undefined, priority: form.priority, dueDate: form.dueDate || undefined, assignedTo: form.assignedTo || undefined, done: false });
    setForm({ titre: '', description: '', priority: 'moyen', dueDate: '', assignedTo: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Stats + filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {[{ v: 'all', l: `Tout (${all.length})` }, { v: 'pending', l: `En attente (${pending})` }, { v: 'done', l: `Terminé (${done})` }].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f.v ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.l}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-800 ml-auto">
          <Plus size={13} /> Nouvelle tâche
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-blue-300 p-4 shadow-sm space-y-3">
          <input autoFocus value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Titre de la tâche *"
            className="w-full font-semibold text-sm border-b border-gray-200 pb-1.5 focus:outline-none" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optionnel)..." rows={2}
            className="w-full text-xs border rounded-xl p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
              className="text-xs border rounded-xl p-2 focus:outline-none">
              <option value="faible">Faible</option>
              <option value="moyen">Moyen</option>
              <option value="eleve">Élevé</option>
              <option value="critique">Critique</option>
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="text-xs border rounded-xl p-2 focus:outline-none" />
            <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              placeholder="Assigné à..." className="text-xs border rounded-xl p-2 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 px-3 py-1.5 border rounded-xl hover:bg-gray-50">Annuler</button>
            <button onClick={save} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-xl hover:bg-blue-800 flex items-center gap-1"><Check size={12} /> Ajouter</button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune tâche à faire</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((t) => {
            const pc = PRIORITY_CONFIG[t.priority];
            const overdue = t.dueDate && isPast(parseISO(t.dueDate)) && !t.done && !isToday(parseISO(t.dueDate));
            const dueToday = t.dueDate && isToday(parseISO(t.dueDate));
            return (
              <div key={t.id} className={`bg-white rounded-xl border p-3 flex items-start gap-3 group transition-all ${t.done ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleTodo(t.id)} className="mt-0.5 flex-shrink-0">
                  {t.done ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} className="text-gray-300 hover:text-blue-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-gray-800 ${t.done ? 'line-through text-gray-400' : ''}`}>{t.titre}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${pc.bg} ${pc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />{pc.label}
                    </span>
                    {t.dueDate && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-600' : dueToday ? 'text-amber-600' : 'text-gray-400'}`}>
                        <Calendar size={10} />
                        {overdue && 'En retard · '}
                        {dueToday && "Aujourd'hui · "}
                        {format(parseISO(t.dueDate), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    )}
                    {t.assignedTo && <span className="flex items-center gap-1 text-xs text-gray-400"><User size={10} />{t.assignedTo}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTodo(t.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 flex-shrink-0 transition-opacity">
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
