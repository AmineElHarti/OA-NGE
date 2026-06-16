import { useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import { getTaskStatus } from '../data/tasks';
import type { ProgressEntry } from '../store/useStore';
import { useOuvrageProgress, useGlobalProgress, isLeaf, getDescendants } from '../hooks/useOuvrageProgress';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { computeAlerts } from '../lib/scurve';
import { SCurveChart } from '../components/charts/SCurveChart';
import { Card, ProgressBar } from '../components/ui/index';
import {
  TrendingUp, TrendingDown, AlertTriangle, ArrowRight, PauseCircle,
} from 'lucide-react';

interface Props { tasks: Task[]; history: ProgressEntry[] }

export function DashboardPage({ tasks, history }: Props) {
  const navigate = useNavigate();
  const ouvrages = useOuvrageProgress(tasks);
  const { progress, theoretical, gap } = useGlobalProgress(tasks);
  const alerts = computeAlerts(tasks);
  const { contraintes, todos, etudes } = useOuvrageStore();

  const allLeaves = tasks.filter((t) => isLeaf(t.id, tasks));
  const done = allLeaves.filter((t) => t.progress === 100).length;
  const blocked = allLeaves.filter((t) => t.blocked).length;
  const criticalAlerts = alerts.filter((a) => a.gap >= 40);
  const openContraintes = contraintes.filter((c) => c.status !== 'levee').length;
  const pendingTodos = todos.filter((t) => !t.done).length;

  // Per-ouvrage data for the table
  const ouvrageRows = ouvrages.map((o) => {
    const oDesc = getDescendants(tasks, o.id);
    const oLeaves = oDesc.filter((t) => isLeaf(t.id, oDesc));
    const oAlerts = alerts.filter((a) => {
      let cur: Task | undefined = a.task;
      while (cur) { if (cur.id === o.id) return true; cur = tasks.find((t) => t.id === cur!.parentId); }
      return false;
    });
    return {
      ...o,
      leafCount: oLeaves.length,
      doneCount: oLeaves.filter((t) => t.progress === 100).length,
      activeCount: oLeaves.filter((t) => getTaskStatus(t) === 'en_cours').length,
      blockedCount: oLeaves.filter((t) => t.blocked).length,
      alertCount: oAlerts.length,
      contrainteCount: contraintes.filter((c) => c.ouvrageId === o.id && c.status !== 'levee').length,
      todoCount: todos.filter((t) => t.ouvrageId === o.id && !t.done).length,
      etudeTotal: etudes.filter((e) => e.ouvrageId === o.id).length,
      etudeValide: etudes.filter((e) => e.ouvrageId === o.id && e.status === 'valide').length,
    };
  });

  const openEtudes = etudes.filter((e) => e.status !== 'valide').length;

  return (
    <div className="space-y-6">

      {/* ── Row 1 : Hero KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Main progress */}
        <div className="col-span-5 bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 text-white flex flex-col justify-between">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Avancement global</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl font-black">{progress}%</span>
              <div className={`flex items-center gap-1 text-sm font-semibold ${gap >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {gap >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {gap >= 0 ? '+' : ''}{gap}%
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-blue-300"><span>Réalisé</span><span>{progress}%</span></div>
            <div className="bg-blue-800/60 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-blue-400"><span>Prévu</span><span>{theoretical}%</span></div>
            <div className="bg-blue-800/60 rounded-full h-1 overflow-hidden">
              <div className="h-1 rounded-full bg-blue-300 transition-all duration-700" style={{ width: `${theoretical}%` }} />
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="col-span-7 grid grid-cols-5 gap-3">
          <KpiCard label="Tâches" value={`${done}/${allLeaves.length}`} sub="terminées" color="#3b82f6" />
          <KpiCard label="Retards" value={criticalAlerts.length} sub={`${alerts.length} au total`} color={alerts.length > 0 ? '#ef4444' : '#10b981'} />
          <KpiCard label="Bloquées" value={blocked} sub="en attente" color={blocked > 0 ? '#f59e0b' : '#10b981'} />
          <KpiCard label="Contraintes" value={openContraintes} sub={`${pendingTodos} todos`} color={openContraintes > 0 ? '#f59e0b' : '#10b981'} />
          <KpiCard label="Études" value={openEtudes} sub="non validées" color={openEtudes > 0 ? '#f59e0b' : '#10b981'} />
        </div>
      </div>

      {/* ── Row 2 : S-Curve + Alerts side by side ─────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-8">
          <p className="text-sm font-bold text-gray-800 mb-3">Courbe S — Prévu vs Réalisé</p>
          <SCurveChart tasks={tasks} history={history} height={240} />
        </Card>

        <div className="col-span-4 space-y-4">
          {/* Critical alerts */}
          <Card className="space-y-2">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red-500" /> Retards critiques
            </p>
            {criticalAlerts.length === 0 ? (
              <p className="text-xs text-emerald-600 py-2">Aucun retard critique</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {criticalAlerts.slice(0, 8).map((a) => (
                  <div key={a.task.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-700 truncate flex-1">{a.task.nom}</span>
                    <span className="text-red-600 font-bold whitespace-nowrap">-{a.gap}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Blocked tasks */}
          {blocked > 0 && (
            <Card className="space-y-2">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <PauseCircle size={14} className="text-amber-500" /> Tâches bloquées
              </p>
              <div className="space-y-1.5">
                {allLeaves.filter((t) => t.blocked).slice(0, 5).map((t) => {
                  const ouv = ouvrages.find((o) => getDescendants(tasks, o.id).some((d) => d.id === t.id));
                  return (
                    <div key={t.id} onClick={() => ouv && navigate(`/ouvrage/${ouv.id}`)}
                      className="flex items-center gap-2 text-xs cursor-pointer group">
                      {ouv && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ouv.color }} />}
                      <span className="text-gray-700 truncate group-hover:text-blue-600">{t.nom}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Row 3 : Ouvrages table ────────────────────────────────────────── */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-800">Synthèse par ouvrage</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-2.5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Ouvrage</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">Réalisé</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">Prévu</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">Écart</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">Tâches</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">Études</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">Alertes</th>
                <th className="py-2.5 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ouvrageRows.map((o) => {
                const [pk, ...rest] = o.nom.split(' - ');
                return (
                  <tr key={o.id} onClick={() => navigate(`/ouvrage/${o.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group">
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
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs text-gray-500 tabular-nums">{o.doneCount}/{o.leafCount}</span>
                      {o.blockedCount > 0 && <span className="text-xs text-amber-500 ml-1">({o.blockedCount} bloq.)</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {o.etudeTotal > 0 ? (
                        <span className="text-xs text-gray-500 tabular-nums">{o.etudeValide}/{o.etudeTotal}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {o.alertCount > 0 && <span className="bg-red-100 text-red-700 text-xs font-bold rounded-full px-1.5 py-0.5">{o.alertCount}</span>}
                        {o.contrainteCount > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold rounded-full px-1.5 py-0.5">{o.contrainteCount}</span>}
                        {o.alertCount === 0 && o.contrainteCount === 0 && <span className="text-xs text-gray-300">—</span>}
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

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-black mt-1 tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
