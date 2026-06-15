import { useState } from 'react';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { ProgressBar } from './ProgressBar';
import { ChevronRight, ChevronDown, Edit2, Check, X } from 'lucide-react';

interface Props {
  tasks: Task[];
  onUpdate: (id: number, progress: number, notes?: string) => void;
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function TaskList({ tasks, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1, 3, 11, 17]));
  const [filter, setFilter] = useState<'all' | 'inprogress' | 'done' | 'todo'>('all');
  const [ouvrageFilter, setOuvrageFilter] = useState<number | 'all'>('all');
  const [editing, setEditing] = useState<{ id: number; value: number; notes: string } | null>(null);
  const [search, setSearch] = useState('');

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isVisible = (task: Task): boolean => {
    if (task.level === 0) return true;
    const parent = tasks.find((t) => t.id === task.parentId);
    if (!parent) return true;
    return expanded.has(parent.id) && isVisible(parent);
  };

  const hasChildren = (id: number) => tasks.some((t) => t.parentId === id);

  const getColor = (taskId: number): string => {
    let cur = tasks.find((t) => t.id === taskId);
    while (cur) {
      const o = OUVRAGES.find((o) => o.id === cur!.id);
      if (o) return o.color;
      cur = tasks.find((t) => t.id === cur!.parentId);
    }
    return '#3b82f6';
  };

  const isInOuvrage = (task: Task, ouvrageId: number): boolean => {
    let cur: Task | undefined = task;
    while (cur) {
      if (cur.id === ouvrageId) return true;
      cur = tasks.find((t) => t.id === cur!.parentId);
    }
    return false;
  };

  const visibleTasks = tasks.filter((t) => {
    if (!isVisible(t)) return false;
    if (search && !t.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'done' && t.progress !== 100) return false;
    if (filter === 'inprogress' && (t.progress === 0 || t.progress === 100)) return false;
    if (filter === 'todo' && t.progress !== 0) return false;
    if (ouvrageFilter !== 'all' && !isInOuvrage(t, ouvrageFilter) && t.id !== ouvrageFilter) return false;
    return true;
  });

  const startEdit = (t: Task) => setEditing({ id: t.id, value: t.progress, notes: t.notes ?? '' });
  const saveEdit = () => {
    if (!editing) return;
    onUpdate(editing.id, editing.value, editing.notes);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
        <input
          className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48"
          placeholder="Rechercher une tâche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded-lg px-3 py-1.5 text-sm"
          value={ouvrageFilter}
          onChange={(e) => setOuvrageFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">Tous les ouvrages</option>
          {OUVRAGES.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </select>
        {(['all', 'todo', 'inprogress', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Tout' : f === 'todo' ? 'Non démarré' : f === 'inprogress' ? 'En cours' : 'Terminé'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 w-8">N°</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Nom de la tâche</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Début</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Fin</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 w-40">Avancement</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((t) => {
                const indent = t.level * 20;
                const color = getColor(t.id);
                const isEdit = editing?.id === t.id;

                return (
                  <tr key={t.id} className={`border-b hover:bg-gray-50 ${t.level === 0 ? 'bg-blue-50' : t.level === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2 px-4 text-gray-400 text-xs">{t.id}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                        {hasChildren(t.id) ? (
                          <button onClick={() => toggle(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            {expanded.has(t.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <span className="w-3.5 flex-shrink-0" />
                        )}
                        {t.isMilestone && <span className="text-yellow-500 mr-1">◆</span>}
                        <span className={`${t.level <= 1 ? 'font-semibold' : ''} ${t.level === 0 ? 'text-blue-800' : 'text-gray-800'}`}>
                          {t.nom}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-gray-500 text-xs whitespace-nowrap">{formatDate(t.debut)}</td>
                    <td className="py-2 px-4 text-gray-500 text-xs whitespace-nowrap">{formatDate(t.fin)}</td>
                    <td className="py-2 px-4">
                      {isEdit ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs font-bold w-8 text-right">{editing.value}%</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Notes..."
                            value={editing.notes}
                            onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                            className="text-xs border rounded px-2 py-1"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <ProgressBar value={t.progress} color={color} height="h-1.5" />
                            <span className="text-xs font-medium w-8 text-right" style={{ color }}>{t.progress}%</span>
                          </div>
                          {t.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-48">{t.notes}</p>}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEdit ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                          <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
