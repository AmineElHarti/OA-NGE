import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import type { ProgressEntry } from '../store/useStore';
import { ProgressBar } from './ProgressBar';
import { SCurveChart } from './SCurveChart';
import { AlertsPanel } from './AlertsPanel';
import { computeAlerts } from '../lib/scurve';
import { TrendingUp, TrendingDown, Minus, Building2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';

interface Props {
  tasks: Task[];
  history: ProgressEntry[];
}

function isLeaf(task: Task, tasks: Task[]) {
  return !tasks.some((t) => t.parentId === task.id);
}

function getOuvrageProgress(tasks: Task[], ouvrageId: number): number {
  function isDesc(t: Task): boolean {
    let cur: Task | undefined = t;
    while (cur) {
      if (cur.id === ouvrageId) return true;
      cur = tasks.find((x) => x.id === cur!.parentId);
    }
    return false;
  }
  const leaves = tasks.filter((t) => isLeaf(t, tasks) && isDesc(t));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length);
}

function getGlobalProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => isLeaf(t, tasks));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length);
}

function theoreticalGlobalProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => isLeaf(t, tasks));
  const today = new Date();
  const totalW = leaves.reduce((s, t) => s + t.duree, 0);
  const planW = leaves.reduce((s, t) => {
    const start = new Date(t.debut);
    const end = new Date(t.fin);
    if (today <= start) return s;
    if (today >= end) return s + t.duree;
    return s + t.duree * ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
  }, 0);
  return totalW > 0 ? Math.round((planW / totalW) * 100) : 0;
}

export function Dashboard({ tasks, history }: Props) {
  const global = getGlobalProgress(tasks);
  const theoreticalGlobal = theoreticalGlobalProgress(tasks);
  const gap = global - theoreticalGlobal;
  const alerts = computeAlerts(tasks);

  const ouvrageData = OUVRAGES.map((o) => ({
    ...o,
    progress: getOuvrageProgress(tasks, o.id),
    shortName: o.nom.split(' - ')[0],
  }));

  const completed = ouvrageData.filter((o) => o.progress === 100).length;
  const inProgress = ouvrageData.filter((o) => o.progress > 0 && o.progress < 100).length;
  const notStarted = ouvrageData.filter((o) => o.progress === 0).length;
  const totalLeaves = tasks.filter((t) => isLeaf(t, tasks)).length;
  const doneTasks = tasks.filter((t) => isLeaf(t, tasks) && t.progress === 100).length;

  const radarData = ouvrageData.slice(0, 8).map((o) => ({ subject: o.shortName, value: o.progress, fullMark: 100 }));

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Avancement global"
          value={`${global}%`}
          sub={gap >= 0 ? `+${gap}% vs prévu` : `${gap}% vs prévu`}
          icon={gap >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          color={gap >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
          subColor={gap >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <KpiCard
          label="Ouvrages terminés"
          value={`${completed}/${OUVRAGES.length}`}
          sub={`${inProgress} en cours · ${notStarted} non démarrés`}
          icon={<CheckCircle2 size={20} />}
          color="bg-blue-600"
        />
        <KpiCard
          label="Tâches complétées"
          value={`${doneTasks}/${totalLeaves}`}
          sub={`${Math.round(doneTasks / totalLeaves * 100)}% des tâches élémentaires`}
          icon={<Building2 size={20} />}
          color="bg-violet-600"
        />
        <KpiCard
          label="Alertes retards"
          value={`${alerts.length}`}
          sub={`${alerts.filter((a) => a.gap >= 40).length} critique(s) · ${alerts.filter((a) => a.gap >= 20 && a.gap < 40).length} avert.`}
          icon={<AlertCircle size={20} />}
          color={alerts.length > 0 ? 'bg-red-500' : 'bg-emerald-500'}
        />
      </div>

      {/* Global progress bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-base font-bold text-gray-900">Avancement global du marché</h2>
            <p className="text-xs text-gray-500 mt-0.5">04/05/2026 → 04/05/2027 · 305 jours</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-blue-700">{global}%</span>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {gap >= 0
                ? <TrendingUp size={12} className="text-emerald-500" />
                : <TrendingDown size={12} className="text-red-500" />}
              <span className={`text-xs font-medium ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {gap >= 0 ? '+' : ''}{gap}% vs planning ({theoreticalGlobal}% prévu)
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Réalisé</span><span>{global}%</span>
            </div>
            <ProgressBar value={global} color="#1d4ed8" height="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Prévu (théorique)</span><span>{theoreticalGlobal}%</span>
            </div>
            <ProgressBar value={theoreticalGlobal} color="#93c5fd" height="h-2" />
          </div>
        </div>
      </div>

      {/* S-Curve + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <SCurveChart tasks={tasks} history={history} />
        </div>
        <div>
          <AlertsPanel tasks={tasks} />
        </div>
      </div>

      {/* Ouvrage grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-5">Avancement par ouvrage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ouvrageData.map((o) => {
            const alertCount = alerts.filter((a) => {
              let cur: Task | undefined = tasks.find((t) => t.id === a.task.id);
              while (cur) {
                if (cur.id === o.id) return true;
                cur = tasks.find((t) => t.id === cur!.parentId);
              }
              return false;
            }).length;
            return (
              <OuvrageCard key={o.id} ouvrage={o} alertCount={alertCount} />
            );
          })}
        </div>
      </div>

      {/* Radar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Vue radar — 8 premiers ouvrages</h2>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <Radar name="Avancement" dataKey="value" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip formatter={(v) => [`${v}%`, 'Avancement']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color, subColor = 'text-gray-500' }: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string; subColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`${color} text-white rounded-xl p-2.5 flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-0.5">{value}</p>
        <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>
      </div>
    </div>
  );
}

function OuvrageCard({ ouvrage, alertCount }: { ouvrage: typeof OUVRAGES[0] & { progress: number; shortName: string }; alertCount: number }) {
  const { nom, color, progress, shortName } = ouvrage;
  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color }}>{shortName}</p>
          <p className="text-xs text-gray-500 truncate">{nom.split(' - ')[1] ?? ''}</p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          {alertCount > 0 && (
            <span className="flex items-center gap-0.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
              <AlertCircle size={10} />{alertCount}
            </span>
          )}
          <span className="text-sm font-black" style={{ color }}>{progress}%</span>
        </div>
      </div>
      <ProgressBar value={progress} color={color} height="h-2" />
      <div className="mt-2">
        <StatusBadge progress={progress} />
      </div>
    </div>
  );
}

function StatusBadge({ progress }: { progress: number }) {
  if (progress === 100) return (
    <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={10} /> Terminé
    </span>
  );
  if (progress > 0) return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
      <Clock size={10} /> En cours
    </span>
  );
  return <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"><Minus size={10} /> Non démarré</span>;
}
