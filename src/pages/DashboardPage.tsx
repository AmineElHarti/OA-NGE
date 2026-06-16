import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import type { ProgressEntry } from '../store/useStore';
import { useOuvrageProgress, useGlobalProgress, isLeaf, getDescendants } from '../hooks/useOuvrageProgress';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { computeAlerts } from '../lib/scurve';
import { SCurveChart } from '../components/charts/SCurveChart';
import { Card, ProgressBar, Badge } from '../components/ui/index';
import { differenceInDays, parseISO, format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TrendingUp, TrendingDown, AlertTriangle, ArrowRight, ArrowUpDown,
  Activity, Users, FileText, Clock,
} from 'lucide-react';

interface Props { tasks: Task[]; history: ProgressEntry[] }

type SortKey = 'nom' | 'progress' | 'theoretical' | 'gap' | 'leafCount';
type SortDir = 'asc' | 'desc';

export function DashboardPage({ tasks, history }: Props) {
  const navigate = useNavigate();
  const ouvrages = useOuvrageProgress(tasks);
  const { progress, theoretical, gap } = useGlobalProgress(tasks);
  const alerts = computeAlerts(tasks);
  const { contraintes, etudes } = useOuvrageStore();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'gap', dir: 'asc' });

  const root = tasks.find((t) => t.level === 0);
  const today = new Date();
  const daysRemaining = root ? Math.max(0, differenceInDays(parseISO(root.fin), today)) : 0;
  const totalDays = root ? differenceInDays(parseISO(root.fin), parseISO(root.debut)) : 1;
  const daysElapsed = totalDays - daysRemaining;
  const timeProgress = Math.round((daysElapsed / totalDays) * 100);

  // ── Per-ouvrage data ────────────────────────────────────────────────────
  const rows = useMemo(() => ouvrages.map((o) => {
    const desc = getDescendants(tasks, o.id);
    const leaves = desc.filter((t) => isLeaf(t.id, desc));
    const ouvrageAlerts = alerts.filter((a) => {
      let cur: Task | undefined = a.task;
      while (cur) { if (cur.id === o.id) return true; cur = tasks.find((t) => t.id === cur!.parentId); }
      return false;
    });
    return {
      ...o,
      leafCount: leaves.length,
      doneCount: leaves.filter((t) => t.progress === 100).length,
      blockedCount: leaves.filter((t) => t.blocked).length,
      alertCount: ouvrageAlerts.length,
      contrainteCount: contraintes.filter((c) => c.ouvrageId === o.id && c.status !== 'levee').length,
      etudeCount: etudes.filter((e) => e.ouvrageId === o.id && e.status !== 'valide').length,
    };
  }), [ouvrages, tasks, alerts, contraintes, etudes]);

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const v = sort.dir === 'asc' ? 1 : -1;
      if (sort.key === 'nom') return a.nom.localeCompare(b.nom) * v;
      const av = a[sort.key] as number;
      const bv = b[sort.key] as number;
      return (av - bv) * v;
    });
    return arr;
  }, [rows, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  // ── Global stats ────────────────────────────────────────────────────────
  const allLeaves = tasks.filter((t) => isLeaf(t.id, tasks));
  const tasksDone = allLeaves.filter((t) => t.progress === 100).length;
  const tasksBlocked = allLeaves.filter((t) => t.blocked).length;
  const openContraintes = contraintes.filter((c) => c.status !== 'levee').length;
  const openEtudes = etudes.filter((e) => e.status !== 'valide').length;

  // ── Urgences (top 5 actionable) ─────────────────────────────────────────
  const urgences = useMemo(() => {
    const list: { type: 'retard' | 'contrainte' | 'etude'; label: string; sublabel: string; ouvrageId: number; severity: number }[] = [];

    alerts.filter((a) => a.gap >= 30).forEach((a) => {
      let cur: Task | undefined = a.task;
      let ouvrageId = 0;
      while (cur) {
        if (ouvrages.find((o) => o.id === cur!.id)) { ouvrageId = cur.id; break; }
        cur = tasks.find((t) => t.id === cur!.parentId);
      }
      if (ouvrageId) {
        list.push({ type: 'retard', label: a.task.nom, sublabel: `Retard ${a.gap}%`, ouvrageId, severity: a.gap });
      }
    });

    contraintes.filter((c) => c.status === 'identifiee').forEach((c) => {
      const daysOld = c.dateIdentification ? differenceInDays(today, parseISO(c.dateIdentification)) : 0;
      if (daysOld > 14) {
        const ouv = ouvrages.find((o) => o.id === c.ouvrageId);
        if (ouv) {
          list.push({ type: 'contrainte', label: c.description.substring(0, 60), sublabel: `${ouv.shortName} · ${daysOld}j sans action`, ouvrageId: c.ouvrageId, severity: daysOld });
        }
      }
    });

    etudes.filter((e) => e.status === 'soumis').forEach((e) => {
      const daysOld = e.dateSoumission ? differenceInDays(today, parseISO(e.dateSoumission)) : 0;
      if (daysOld > 7) {
        const ouv = ouvrages.find((o) => o.id === e.ouvrageId);
        if (ouv) {
          list.push({ type: 'etude', label: e.nom, sublabel: `${ouv.shortName} · Soumise depuis ${daysOld}j`, ouvrageId: e.ouvrageId, severity: daysOld });
        }
      }
    });

    return list.sort((a, b) => b.severity - a.severity).slice(0, 6);
  }, [alerts, contraintes, etudes, ouvrages, tasks]);

  // ── Activity feed (last 8 updates) ──────────────────────────────────────
  const activity = useMemo(() => {
    const recent = [...history].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)).slice(0, 8);
    return recent.map((h) => {
      const task = tasks.find((t) => t.id === h.task_id);
      let ouvrage = null;
      let cur = task;
      while (cur) {
        const o = ouvrages.find((ow) => ow.id === cur!.id);
        if (o) { ouvrage = o; break; }
        cur = tasks.find((t) => t.id === cur!.parentId);
      }
      return { entry: h, task, ouvrage };
    });
  }, [history, tasks, ouvrages]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-5">
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Avancement global</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-6xl font-black tabular-nums">{progress}%</span>
              <div className={`flex items-center gap-1 text-base font-bold ${gap >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {gap >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {gap >= 0 ? '+' : ''}{gap}%
              </div>
            </div>
            <p className="text-blue-200 text-sm mt-1">
              {gap >= 0 ? 'En avance sur le prévu' : 'En retard sur le prévu'} · Prévu : {theoretical}%
            </p>
          </div>

          <div className="col-span-12 md:col-span-7 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-blue-300 mb-1.5">
                <span>Réalisé</span><span className="tabular-nums">{progress}%</span>
              </div>
              <div className="bg-blue-900/60 rounded-full h-2.5 overflow-hidden">
                <div className="h-2.5 rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-blue-300 mb-1.5">
                <span>Prévu</span><span className="tabular-nums">{theoretical}%</span>
              </div>
              <div className="bg-blue-900/60 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full bg-blue-300 transition-all duration-700" style={{ width: `${theoretical}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-blue-800/60">
              <HeroStat label="Jours écoulés" value={daysElapsed} sub={`/ ${totalDays}j`} />
              <HeroStat label="Jours restants" value={daysRemaining} sub={timeProgress > 0 ? `${timeProgress}% du temps` : ''} />
              <HeroStat label="Fin prévue" value={root ? format(parseISO(root.fin), 'dd/MM/yy', { locale: fr }) : '—'} sub="contractuelle" />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Tâches terminées" value={`${tasksDone}/${allLeaves.length}`} icon={<Activity size={16} />} color="#3b82f6" onClick={() => navigate('/ouvrages')} />
        <KpiTile label="Retards" value={alerts.length} sub={`${alerts.filter((a) => a.gap >= 40).length} critiques`} icon={<AlertTriangle size={16} />} color={alerts.length > 0 ? '#ef4444' : '#10b981'} onClick={() => navigate('/semaine')} />
        <KpiTile label="Contraintes" value={openContraintes} sub={`${tasksBlocked} tâches bloquées`} icon={<Users size={16} />} color={openContraintes > 0 ? '#f59e0b' : '#10b981'} onClick={() => navigate('/coordination')} />
        <KpiTile label="Études" value={openEtudes} sub="non validées" icon={<FileText size={16} />} color={openEtudes > 0 ? '#f59e0b' : '#10b981'} onClick={() => navigate('/coordination')} />
      </div>

      {/* ── Urgences + Activité ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" /> Urgences actionnables
            </p>
            <Badge variant="red">{urgences.length}</Badge>
          </div>
          {urgences.length === 0 ? (
            <p className="text-xs text-emerald-600 py-6 text-center">✓ Aucune urgence en cours</p>
          ) : (
            <div className="space-y-2">
              {urgences.map((u, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/ouvrage/${u.ouvrageId}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={`w-1 h-10 rounded-full flex-shrink-0 ${u.type === 'retard' ? 'bg-red-500' : u.type === 'contrainte' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600">{u.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{u.sublabel}</p>
                  </div>
                  <ArrowRight size={13} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Clock size={14} className="text-blue-500" /> Activité récente
            </p>
            <Badge variant="blue">{history.length}</Badge>
          </div>
          {activity.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">Aucune mise à jour récente</p>
          ) : (
            <div className="space-y-2">
              {activity.map((a, i) => (
                <button
                  key={i}
                  onClick={() => a.ouvrage && navigate(`/ouvrage/${a.ouvrage.id}`)}
                  className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  {a.ouvrage && <span className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.ouvrage.color }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 truncate group-hover:text-blue-600">
                      <span className="font-semibold">{a.entry.recorded_by}</span> a mis {a.task?.nom ?? `tâche #${a.entry.task_id}`} à <span className="font-bold">{a.entry.progress}%</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.ouvrage?.shortName ?? ''} · {formatDistanceToNow(parseISO(a.entry.recorded_at), { locale: fr, addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── S-Curve ──────────────────────────────────────────────────────── */}
      <Card>
        <p className="text-sm font-bold text-gray-800 mb-4">Courbe S — Prévu vs Réalisé</p>
        <SCurveChart tasks={tasks} history={history} height={260} />
      </Card>

      {/* ── Synthèse ouvrages (sortable) ─────────────────────────────────── */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">Synthèse par ouvrage</p>
          <button onClick={() => navigate('/ouvrages')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
            Voir tous <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th label="Ouvrage" sortKey="nom" sort={sort} onSort={toggleSort} />
                <Th label="Réalisé" sortKey="progress" sort={sort} onSort={toggleSort} align="center" w="w-36" />
                <Th label="Prévu" sortKey="theoretical" sort={sort} onSort={toggleSort} align="center" w="w-20" />
                <Th label="Écart" sortKey="gap" sort={sort} onSort={toggleSort} align="center" w="w-20" />
                <Th label="Tâches" sortKey="leafCount" sort={sort} onSort={toggleSort} align="center" w="w-24" />
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">Alertes</th>
                <th className="py-2.5 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedRows.map((o) => {
                const [pk, ...rest] = o.nom.split(' - ');
                return (
                  <tr key={o.id} onClick={() => navigate(`/ouvrage/${o.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-500">{pk}</span>
                          <p className="text-sm font-medium text-gray-800 truncate">{rest.join(' - ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><ProgressBar value={o.progress} color={o.color} height="h-1.5" /></div>
                        <span className="text-xs font-black w-10 text-right tabular-nums" style={{ color: o.color }}>{o.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-gray-400 tabular-nums">{o.theoretical}%</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs font-bold tabular-nums ${o.gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {o.gap >= 0 ? '+' : ''}{o.gap}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-gray-500 tabular-nums">{o.doneCount}/{o.leafCount}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {o.alertCount > 0 && <Badge variant="red">{o.alertCount}</Badge>}
                        {o.contrainteCount > 0 && <Badge variant="amber">{o.contrainteCount}</Badge>}
                        {o.etudeCount > 0 && <Badge variant="blue">{o.etudeCount}</Badge>}
                        {o.alertCount === 0 && o.contrainteCount === 0 && o.etudeCount === 0 && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <ArrowRight size={13} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function HeroStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-blue-300 font-semibold">{label}</p>
      <p className="text-xl font-black tabular-nums mt-0.5">{value}</p>
      {sub && <p className="text-xs text-blue-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function KpiTile({ label, value, sub, icon, color, onClick }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
      </div>
      <p className="text-3xl font-black mt-2 tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </button>
  );
}

function Th({ label, sortKey, sort, onSort, align = 'left', w = '' }: { label: string; sortKey: SortKey; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void; align?: 'left' | 'center'; w?: string }) {
  const active = sort.key === sortKey;
  return (
    <th className={`text-${align} py-2.5 px-3 text-xs font-semibold uppercase tracking-wide ${w}`}>
      <button onClick={() => onSort(sortKey)} className={`inline-flex items-center gap-1 ${active ? 'text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}>
        {label}
        <ArrowUpDown size={10} className={active ? '' : 'opacity-40'} />
      </button>
    </th>
  );
}
