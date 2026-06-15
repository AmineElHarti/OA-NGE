import { useState } from 'react';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { ProgressBar } from './ProgressBar';
import { ChevronRight, ChevronDown, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { computeAlerts } from '../lib/scurve';
import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  tasks: Task[];
  onUpdate: (id: number, progress: number, notes?: string) => void;
}

function fmt(d: string) {
  try { return format(parseISO(d), 'dd/MM/yy', { locale: fr }); } catch { return d; }
}

export function TaskList({ tasks, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1, 3, 11, 17]));
  const [filter, setFilter] = useState<'all' | 'inprogress' | 'done' | 'todo' | 'alerts'>('all');
  const [ouvrageFilter, setOuvrageFilter] = useState<number | 'all'>('all');
  const [editing, setEditing] = useState<{ id: number; value: number; notes: string } | null>(null);
  const [search, setSearch] = useState('');

  const alerts = computeAlerts(tasks);
  const alertIds = new Set(alerts.map((a) => a.task.id));

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(tasks.map((t) => t.id)));
  const collapseAll = () => setExpanded(new Set([1]));

  function isVisible(task: Task): boolean {
    if (task.level === 0) return true;
    const parent = tasks.find((t) => t.id === task.parentId);
    if (!parent) return true;
    return expanded.has(parent.id) && isVisible(parent);
  }

  const hasChildren = (id: number) => tasks.some((t) => t.parentId === id);

  function getColor(taskId: number): string {
    let cur = tasks.find((t) => t.id === taskId);
    while (cur) {
      const o = OUVRAGES.find((o) => o.id === cur!.id);
      if (o) return o.color;
      cur = tasks.find((t) => t.id === cur!.parentId);
    }
    return '#3b82f6';
  }

  function isInOuvrage(task: Task, ouvrageId: number): boolean {
    let cur: Task | undefined = task;
    while (cur) {
      if (cur.id === ouvrageId) return true;
      cur = tasks.find((t) => t.id === cur!.parentId);
    }
    return false;
  }

  const visibleTasks = tasks.filter((t) => {
    if (!isVisible(t)) return false;
    if (search && !t.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'done' && t.progress !== 100) return false;
    if (filter === 'inprogress' && (t.progress === 0 || t.progress === 100)) return false;
    if (filter === 'todo' && t.progress !== 0) return false;
    if (filter === 'alerts' && !alertIds.has(t.id)) return false;
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
      {/* Filters bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <input
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Rechercher une tâche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={ouvrageFilter}
          onChange={(e) => setOuvrageFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">Tous les ouvrages</option>
          {OUVRAGES.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </select>
        <div className="flex gap-1.5">
          {(['all', 'todo', 'inprogress', 'done', 'alerts'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Tout' : f === 'todo' ? 'Non démarré' : f === 'inprogress' ? 'En cours' : f === 'done' ? 'Terminé' : `⚠ Retards (${alerts.length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          <button onClick={expandAll} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border rounded-lg">Tout ouvrir</button>
          <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border rounded-lg">Réduire</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide w-10">N°</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tâche</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Durée</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Début</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Fin</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide w-52">Avancement</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleTasks.map((t) => {
                const indent = t.level * 16;
                const color = getColor(t.id);
                const isEdit = editing?.id === t.id;
                const isAlerted = alertIds.has(t.id);
                const alertInfo = alerts.find((a) => a.task.id === t.id);

                const rowBg =
                  t.level === 0 ? 'bg-blue-50' :
                  t.level === 1 ? 'bg-slate-50' :
                  isAlerted ? 'bg-red-50/40' : '';

                return (
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>
                    <td className="py-2 px-4 text-gray-400 text-xs font-mono">{t.id}</td>
                    <td className="py-2 px-4 max-w-sm">
                      <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                        {hasChildren(t.id) ? (
                          <button onClick={() => toggle(t.id)} className="text-gray-400 hover:text-blue-600 flex-shrink-0 w-4">
                            {expanded.has(t.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        ) : <span className="w-4 flex-shrink-0" />}
                        {t.isMilestone && <span className="text-yellow-500 flex-shrink-0">◆</span>}
                        {isAlerted && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                        <span className={`truncate ${t.level === 0 ? 'font-bold text-blue-900' : t.level === 1 ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                          {t.nom}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-gray-400 text-xs whitespace-nowrap">{t.duree}j</td>
                    <td className="py-2 px-4 text-gray-500 text-xs whitespace-nowrap font-mono">{fmt(t.debut)}</td>
                    <td className="py-2 px-4 text-gray-500 text-xs whitespace-nowrap font-mono">{fmt(t.fin)}</td>
                    <td className="py-2 px-4 min-w-48">
                      {isEdit ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min={0} max={100} step={5}
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })}
                              className="flex-1 accent-blue-600"
                            />
                            <span className="text-xs font-bold text-blue-700 w-8 text-right">{editing.value}%</span>
                          </div>
                          <input
                            type="text" placeholder="Notes (optionnel)..."
                            value={editing.notes}
                            onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar value={t.progress} color={color} height="h-1.5" />
                            </div>
                            <span className="text-xs font-bold w-8 text-right" style={{ color }}>{t.progress}%</span>
                          </div>
                          {alertInfo && (
                            <p className="text-xs text-red-500 mt-0.5">Prévu: {alertInfo.expected}% · Retard: {alertInfo.gap}%</p>
                          )}
                          {t.notes && !alertInfo && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{t.notes}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEdit ? (
                        <div className="flex gap-1.5">
                          <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded p-1"><Check size={13} /></button>
                          <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-600 bg-red-50 rounded p-1"><X size={13} /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(t)} className="text-gray-300 hover:text-blue-600 rounded p-1 hover:bg-blue-50 transition-colors">
                          <Edit2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
          <span>{visibleTasks.length} tâche(s) affichée(s)</span>
          <span>{tasks.length} tâches au total</span>
        </div>
      </div>
    </div>
  );
}
