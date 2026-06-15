import type { Task } from '../../data/tasks';
import type { ProgressEntry } from '../../store/useStore';
import { ProgressBar } from '../ProgressBar';
import { generateSCurve } from '../../lib/scurve';
import { Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

interface Props {
  ouvrageId: number;
  tasks: Task[];
  history: ProgressEntry[];
  color: string;
  onUpdate: (id: number, progress: number, notes?: string) => void;
}

function isLeaf(task: Task, tasks: Task[]) {
  return !tasks.some((t) => t.parentId === task.id);
}

function isDescendantOf(task: Task, tasks: Task[], ancestorId: number): boolean {
  let cur: Task | undefined = task;
  while (cur) {
    if (cur.id === ancestorId) return true;
    cur = tasks.find((t) => t.id === cur!.parentId);
  }
  return false;
}

function getProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => isLeaf(t, tasks));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length);
}

function theoreticalProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => isLeaf(t, tasks));
  const today = new Date();
  const totalW = leaves.reduce((s, t) => s + t.duree, 0);
  const planW = leaves.reduce((s, t) => {
    const start = parseISO(t.debut);
    const end = parseISO(t.fin);
    if (today <= start) return s;
    if (today >= end) return s + t.duree;
    return s + t.duree * ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
  }, 0);
  return totalW > 0 ? Math.round((planW / totalW) * 100) : 0;
}

export function AvancementTab({ ouvrageId, tasks, history, color, onUpdate }: Props) {
  const [editing, setEditing] = useState<{ id: number; value: number; notes: string } | null>(null);

  const ouvrTasks = tasks.filter((t) => isDescendantOf(t, tasks, ouvrageId));
  const progress = getProgress(ouvrTasks);
  const theoretical = theoreticalProgress(ouvrTasks);
  const gap = progress - theoretical;

  // S-curve for this ouvrage only
  const ouvrHistory = history.filter((h) => ouvrTasks.some((t) => t.id === h.task_id));
  const scData = generateSCurve(ouvrTasks, ouvrHistory).filter((_, i) => i % 2 === 0);
  const todayLabel = format(new Date(), 'dd/MM/yy', { locale: fr });

  // Hierarchical task list for this ouvrage
  const root = tasks.find((t) => t.id === ouvrageId);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([ouvrageId]));

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

  const visibleTasks = ouvrTasks.filter(isVisible);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Réalisé</p>
          <p className="text-3xl font-black" style={{ color }}>{progress}%</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Prévu à ce jour</p>
          <p className="text-3xl font-black text-gray-400">{theoretical}%</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${gap >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Écart</p>
          <p className={`text-3xl font-black ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{gap >= 0 ? '+' : ''}{gap}%</p>
        </div>
      </div>

      {/* Progress bars */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1.5"><span className="font-medium text-gray-700">Avancement réalisé</span><span className="font-bold" style={{ color }}>{progress}%</span></div>
          <ProgressBar value={progress} color={color} height="h-3" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Prévu théorique</span><span className="text-gray-400">{theoretical}%</span></div>
          <ProgressBar value={theoretical} color="#d1d5db" height="h-2" />
        </div>
      </div>

      {/* S-curve */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Courbe S — Prévu vs Réalisé</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={scData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`grad-${ouvrageId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={3} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip />
              <ReferenceLine x={todayLabel} stroke="#ef4444" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="planned" name="Prévu" stroke={color} strokeWidth={2} fill={`url(#grad-${ouvrageId})`} dot={false} />
              <Line type="monotone" dataKey="actual" name="Réalisé" stroke="#10b981" strokeWidth={2.5} dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Tâches de l'ouvrage</h3>
          {root && <span className="text-xs text-gray-400">{ouvrTasks.length} tâches</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tâche</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Début</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Fin</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 w-44">Avancement</th>
              <th className="py-2 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visibleTasks.map((t) => {
              const isEdit = editing?.id === t.id;
              const indent = Math.max(0, t.level - 2) * 16;
              return (
                <tr key={t.id} className={`hover:bg-gray-50 ${t.level === 2 ? 'bg-slate-50' : ''}`}>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                      {hasChildren(t.id)
                        ? <button onClick={() => toggle(t.id)} className="text-gray-300 hover:text-gray-600 text-xs w-4">▶</button>
                        : <span className="w-4" />}
                      <span className={t.level === 2 ? 'font-semibold text-gray-800' : 'text-gray-700'}>{t.nom}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap font-mono">{format(parseISO(t.debut), 'dd/MM/yy')}</td>
                  <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap font-mono">{format(parseISO(t.fin), 'dd/MM/yy')}</td>
                  <td className="py-2 px-3">
                    {isEdit ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input type="range" min={0} max={100} step={5} value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: +e.target.value })}
                            className="flex-1 accent-blue-600" />
                          <span className="text-xs font-bold w-8 text-right" style={{ color }}>{editing.value}%</span>
                        </div>
                        <input type="text" placeholder="Notes..." value={editing.notes}
                          onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                          className="text-xs border rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={t.progress} color={color} height="h-1.5" />
                        <span className="text-xs font-bold w-8 text-right" style={{ color }}>{t.progress}%</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEdit ? (
                      <div className="flex gap-1">
                        <button onClick={() => { onUpdate(editing.id, editing.value, editing.notes); setEditing(null); }} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded p-0.5"><Check size={12} /></button>
                        <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-600 bg-red-50 rounded p-0.5"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditing({ id: t.id, value: t.progress, notes: t.notes ?? '' })} className="text-gray-300 hover:text-blue-500 p-0.5"><Edit2 size={12} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
