import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit2, Check, X, ChevronRight, ChevronDown } from 'lucide-react';
import type { Task } from '../../data/tasks';
import type { ProgressEntry } from '../../store/useStore';
import { getDescendants, computeProgress, computeTheoreticalProgress } from '../../hooks/useOuvrageProgress';
import { SCurveChart } from '../charts/SCurveChart';
import { Card, ProgressBar } from '../ui/index';

interface Props {
  ouvrageId: number;
  tasks: Task[];
  history: ProgressEntry[];
  color: string;
  onUpdate: (id: number, progress: number, notes?: string) => void;
}

export function AvancementTab({ ouvrageId, tasks, history, color, onUpdate }: Props) {
  const [editing, setEditing] = useState<{ id: number; value: number; notes: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([ouvrageId]));

  const ouvrTasks = getDescendants(tasks, ouvrageId);
  const progress = computeProgress(ouvrTasks);
  const theoretical = computeTheoreticalProgress(ouvrTasks);
  const gap = progress - theoretical;

  const ouvrHistory = history.filter((h) => ouvrTasks.some((t) => t.id === h.task_id));

  function toggle(id: number) {
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function hasChildren(id: number) { return ouvrTasks.some((t) => t.parentId === id); }
  function isVisible(t: Task): boolean {
    if (t.id === ouvrageId) return false;
    const par = ouvrTasks.find((x) => x.id === t.parentId);
    if (!par) return true;
    return expanded.has(par.id) && isVisible(par);
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Réalisé</p>
          <p className="text-4xl font-black" style={{ color }}>{progress}%</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Prévu à ce jour</p>
          <p className="text-4xl font-black text-gray-300">{theoretical}%</p>
        </Card>
        <Card className={`text-center ${gap >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border`}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Écart</p>
          <p className={`text-4xl font-black ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{gap >= 0 ? '+' : ''}{gap}%</p>
        </Card>
      </div>

      {/* Progress bars */}
      <Card>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-gray-700">Avancement réalisé</span>
              <span style={{ color }}>{progress}%</span>
            </div>
            <ProgressBar value={progress} color={color} height="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Prévu théorique</span>
              <span className="text-gray-400">{theoretical}%</span>
            </div>
            <ProgressBar value={theoretical} color="#e2e8f0" height="h-1.5" />
          </div>
        </div>
      </Card>

      {/* S-curve */}
      <Card>
        <p className="text-sm font-bold text-gray-800 mb-4">Courbe S — Prévu vs Réalisé</p>
        <SCurveChart tasks={ouvrTasks} history={ouvrHistory} height={220} />
      </Card>

      {/* Task list */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">Tâches de l'ouvrage</p>
          <span className="text-xs text-gray-400">{ouvrTasks.length} tâches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-2.5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tâche</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Début</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Fin</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-48">Avancement</th>
                <th className="py-2.5 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ouvrTasks.filter(isVisible).map((t) => {
                const isEdit = editing?.id === t.id;
                const indent = Math.max(0, t.level - 2) * 14;
                return (
                  <tr key={t.id} className={`hover:bg-slate-50/60 transition-colors ${t.level === 2 ? 'bg-slate-50/30' : ''}`}>
                    <td className="py-2.5 px-5">
                      <div className="flex items-center gap-1.5" style={{ paddingLeft: indent }}>
                        {hasChildren(t.id)
                          ? <button onClick={() => toggle(t.id)} className="text-gray-300 hover:text-gray-600 w-4 flex-shrink-0">
                              {expanded.has(t.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          : <span className="w-4 flex-shrink-0" />}
                        <span className={`truncate ${t.level === 2 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{t.nom}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap font-mono">{format(parseISO(t.debut), 'dd/MM/yy', { locale: fr })}</td>
                    <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap font-mono">{format(parseISO(t.fin), 'dd/MM/yy', { locale: fr })}</td>
                    <td className="py-2.5 px-4">
                      {isEdit ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input type="range" min={0} max={100} step={5} value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: +e.target.value })}
                              className="flex-1 accent-blue-600 h-1.5" />
                            <span className="text-xs font-black w-8 text-right tabular-nums" style={{ color }}>{editing.value}%</span>
                          </div>
                          <input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                            placeholder="Observations..."
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                      ) : (
                        <ProgressBar value={t.progress} color={color} height="h-1.5" showLabel />
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {isEdit ? (
                        <div className="flex gap-1">
                          <button onClick={() => { onUpdate(editing.id, editing.value, editing.notes); setEditing(null); }}
                            className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg p-1 transition-colors"><Check size={12} /></button>
                          <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg p-1 transition-colors"><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setEditing({ id: t.id, value: t.progress, notes: t.notes ?? '' })}
                          className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg p-1 transition-colors"><Edit2 size={12} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
