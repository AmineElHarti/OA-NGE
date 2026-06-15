import { useState, useMemo } from 'react';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { Card, ProgressBar, Badge, SectionHeader, showToast } from './ui/index';
import { Check, ChevronRight, ChevronDown, AlertTriangle, Zap, Table, ArrowRight, ArrowLeft } from 'lucide-react';
import { computeAlerts } from '../lib/scurve';
import { getDescendants, isLeaf, computeProgress, computeTheoreticalProgress } from '../hooks/useOuvrageProgress';
import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  tasks: Task[];
  onUpdate: (id: number, progress: number, notes?: string) => void;
}

function fmt(d: string) {
  try { return format(parseISO(d), 'dd/MM/yy', { locale: fr }); } catch { return d; }
}

// ── Quick Update Mode ────────────────────────────────────────────────────────

function QuickUpdateView({ tasks, onUpdate }: Pick<Props, 'tasks' | 'onUpdate'>) {
  const [filter, setFilter] = useState<'retard' | 'en_cours' | 'non_demarre'>('en_cours');
  const [activeOuvrage, setActiveOuvrage] = useState(0);

  const alerts = computeAlerts(tasks);
  const alertIds = new Set(alerts.map((a) => a.task.id));

  const ouvrageData = useMemo(() =>
    OUVRAGES.map((o) => {
      const desc = getDescendants(tasks, o.id);
      const leaves = desc.filter((t) => isLeaf(t.id, desc));
      const progress = computeProgress(desc);
      const theoretical = computeTheoreticalProgress(desc);
      return { ...o, leaves, progress, theoretical, gap: progress - theoretical };
    }),
    [tasks]
  );

  const currentOuvrage = ouvrageData[activeOuvrage];

  const filteredTasks = useMemo(() => {
    if (!currentOuvrage) return [];
    return currentOuvrage.leaves.filter((t) => {
      if (filter === 'retard') return alertIds.has(t.id);
      if (filter === 'en_cours') return t.progress > 0 && t.progress < 100;
      return t.progress === 0;
    });
  }, [currentOuvrage, filter, alertIds]);

  const [values, setValues] = useState<Record<number, { progress: number; notes: string }>>({});

  function getValue(t: Task) {
    return values[t.id] ?? { progress: t.progress, notes: t.notes ?? '' };
  }
  function setValue(id: number, progress: number, notes: string) {
    setValues((v) => ({ ...v, [id]: { progress, notes } }));
  }
  function saveOne(id: number) {
    const v = values[id];
    if (v) {
      onUpdate(id, v.progress, v.notes);
      setValues((prev) => { const n = { ...prev }; delete n[id]; return n; });
      showToast('Avancement enregistré');
    }
  }
  function saveAll() {
    const count = Object.keys(values).length;
    Object.entries(values).forEach(([id, v]) => onUpdate(Number(id), v.progress, v.notes));
    setValues({});
    showToast(`${count} tâche(s) mise(s) à jour`);
  }

  const hasChanges = Object.keys(values).length > 0;

  // Counts for filter badges
  const retardCount = currentOuvrage?.leaves.filter((t) => alertIds.has(t.id)).length ?? 0;
  const enCoursCount = currentOuvrage?.leaves.filter((t) => t.progress > 0 && t.progress < 100).length ?? 0;
  const nonDemarreCount = currentOuvrage?.leaves.filter((t) => t.progress === 0).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Ouvrage selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ouvrageData.map((o, i) => (
          <button
            key={o.id}
            onClick={() => { setActiveOuvrage(i); setValues({}); }}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              i === activeOuvrage
                ? 'bg-white shadow-sm border-gray-200 text-gray-800'
                : 'bg-transparent border-transparent text-gray-500 hover:bg-white/60 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }} />
              <span>{o.nom.split(' - ')[0]}</span>
              <span className="font-black tabular-nums" style={{ color: o.color }}>{o.progress}%</span>
            </div>
          </button>
        ))}
      </div>

      {currentOuvrage && (
        <>
          {/* Ouvrage summary */}
          <Card className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: currentOuvrage.color }} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{currentOuvrage.nom}</p>
                <p className="text-xs text-gray-400">{currentOuvrage.leaves.length} activités · {fmt(currentOuvrage.leaves[0]?.debut ?? '')} → {fmt(currentOuvrage.leaves[currentOuvrage.leaves.length - 1]?.fin ?? '')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-center">
                <p className="text-2xl font-black tabular-nums" style={{ color: currentOuvrage.color }}>{currentOuvrage.progress}%</p>
                <p className="text-xs text-gray-400">réalisé</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold tabular-nums ${currentOuvrage.gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {currentOuvrage.gap >= 0 ? '+' : ''}{currentOuvrage.gap}%
                </p>
                <p className="text-xs text-gray-400">écart</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setActiveOuvrage(Math.max(0, activeOuvrage - 1))}
                  disabled={activeOuvrage === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ArrowLeft size={14} /></button>
                <button onClick={() => setActiveOuvrage(Math.min(ouvrageData.length - 1, activeOuvrage + 1))}
                  disabled={activeOuvrage === ouvrageData.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ArrowRight size={14} /></button>
              </div>
            </div>
          </Card>

          {/* Filters + save all */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {([['retard', `En retard (${retardCount})`, 'red'], ['en_cours', `En cours (${enCoursCount})`, 'blue'], ['non_demarre', `Non démarré (${nonDemarreCount})`, 'gray']] as const).map(([v, l, c]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === v
                    ? c === 'red' ? 'bg-red-600 text-white' : c === 'blue' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {v === 'retard' && <AlertTriangle size={11} className="inline mr-1" />}
                  {l}
                </button>
              ))}
            </div>
            {hasChanges && (
              <button onClick={saveAll}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
                <Check size={13} /> Enregistrer tout ({Object.keys(values).length})
              </button>
            )}
          </div>

          {/* Tasks */}
          {filteredTasks.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-gray-400 text-sm">
                {filter === 'retard' ? 'Aucune tâche en retard' : filter === 'en_cours' ? 'Aucune tâche en cours' : 'Toutes les tâches sont démarrées'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((t) => {
                const v = getValue(t);
                const modified = values[t.id] !== undefined;
                const alertInfo = alerts.find((a) => a.task.id === t.id);
                return (
                  <Card key={t.id} className={`!p-4 ${modified ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-gray-800 truncate">{t.nom}</p>
                          {alertInfo && <Badge variant="red">-{alertInfo.gap}%</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                          <span className="font-mono">{fmt(t.debut)} → {fmt(t.fin)}</span>
                          <span>{t.duree}j</span>
                        </div>
                        {/* Progress slider */}
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={0} max={100} step={1}
                            value={v.progress}
                            onChange={(e) => setValue(t.id, Number(e.target.value), v.notes)}
                            className="flex-1 accent-blue-600 h-2 cursor-pointer"
                          />
                          <span className="text-lg font-black w-14 text-right tabular-nums" style={{ color: currentOuvrage.color }}>
                            {v.progress}%
                          </span>
                        </div>
                        {/* Quick percentage buttons */}
                        <div className="flex gap-1 mt-2">
                          {[0, 25, 50, 75, 100].map((p) => (
                            <button key={p} onClick={() => setValue(t.id, p, v.notes)}
                              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${v.progress === p
                                ? 'bg-blue-700 text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{p}%</button>
                          ))}
                        </div>
                        {/* Notes */}
                        <input
                          value={v.notes}
                          onChange={(e) => setValue(t.id, v.progress, e.target.value)}
                          placeholder="Observations terrain..."
                          className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-300"
                        />
                      </div>
                      {/* Save single */}
                      {modified && (
                        <button onClick={() => saveOne(t.id)}
                          className="mt-2 p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors flex-shrink-0">
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Planning Mode (read-only reference) ──────────────────────────────────────

function PlanningView({ tasks }: { tasks: Task[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1, 3, 11, 17]));
  const [search, setSearch] = useState('');
  const [ouvrageFilter, setOuvrageFilter] = useState<number | 'all'>('all');

  const alerts = computeAlerts(tasks);
  const alertIds = new Set(alerts.map((a) => a.task.id));

  const toggle = (id: number) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const hasChildren = (id: number) => tasks.some((t) => t.parentId === id);

  function isVisible(task: Task): boolean {
    if (task.level === 0) return true;
    const parent = tasks.find((t) => t.id === task.parentId);
    if (!parent) return true;
    return expanded.has(parent.id) && isVisible(parent);
  }

  function isInOuvrage(task: Task, ouvrageId: number): boolean {
    let cur: Task | undefined = task;
    while (cur) { if (cur.id === ouvrageId) return true; cur = tasks.find((t) => t.id === cur!.parentId); }
    return false;
  }

  function getColor(taskId: number): string {
    let cur = tasks.find((t) => t.id === taskId);
    while (cur) {
      const o = OUVRAGES.find((o2) => o2.id === cur!.id);
      if (o) return o.color;
      cur = tasks.find((t) => t.id === cur!.parentId);
    }
    return '#3b82f6';
  }

  const visibleTasks = tasks.filter((t) => {
    if (!isVisible(t)) return false;
    if (search && !t.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (ouvrageFilter !== 'all' && !isInOuvrage(t, ouvrageFilter) && t.id !== ouvrageFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
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
        <div className="flex gap-1.5 ml-auto">
          <button onClick={() => setExpanded(new Set(tasks.map((t) => t.id)))} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border rounded-lg">Tout ouvrir</button>
          <button onClick={() => setExpanded(new Set([1]))} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border rounded-lg">Réduire</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tâche</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Durée</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Début</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Fin</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide w-40">Avancement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleTasks.map((t) => {
                const indent = t.level * 16;
                const color = getColor(t.id);
                const isAlerted = alertIds.has(t.id);
                const alertInfo = alerts.find((a) => a.task.id === t.id);
                const rowBg = t.level === 0 ? 'bg-blue-50' : t.level === 1 ? 'bg-slate-50' : isAlerted ? 'bg-red-50/40' : '';

                return (
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>
                    <td className="py-2 px-4">
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
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><ProgressBar value={t.progress} color={color} height="h-1.5" /></div>
                        <span className="text-xs font-bold w-8 text-right tabular-nums" style={{ color }}>{t.progress}%</span>
                      </div>
                      {alertInfo && <p className="text-xs text-red-500 mt-0.5">Retard: {alertInfo.gap}%</p>}
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

// ── Main component ──────────────────────────────────────────────────────────

export function TaskList({ tasks, onUpdate }: Props) {
  const [mode, setMode] = useState<'quick' | 'planning'>('quick');

  return (
    <div className="space-y-5">
      <SectionHeader
        title={mode === 'quick' ? 'Mise à jour rapide' : 'Planning — vue d\'ensemble'}
        description={mode === 'quick'
          ? 'Mettez à jour l\'avancement par ouvrage, rapidement'
          : `${tasks.length} tâches · ${OUVRAGES.length} ouvrages`}
        actions={
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setMode('quick')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'quick' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Zap size={12} /> Mise à jour
            </button>
            <button
              onClick={() => setMode('planning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'planning' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Table size={12} /> Planning
            </button>
          </div>
        }
      />

      {mode === 'quick'
        ? <QuickUpdateView tasks={tasks} onUpdate={onUpdate} />
        : <PlanningView tasks={tasks} />}
    </div>
  );
}
