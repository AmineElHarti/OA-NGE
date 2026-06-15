import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { ProgressBar } from './ProgressBar';
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';

interface Props {
  tasks: Task[];
}

function getOuvrageProgress(tasks: Task[], ouvrageId: number): number {
  const ouvrageTasks = tasks.filter((t) => {
    let cur: Task | undefined = t;
    while (cur) {
      if (cur.id === ouvrageId) return true;
      cur = tasks.find((x) => x.id === cur!.parentId);
    }
    return false;
  });
  const leaves = ouvrageTasks.filter((t) => !ouvrageTasks.some((x) => x.parentId === t.id));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((sum, t) => sum + t.progress, 0) / leaves.length);
}

function getGlobalProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((sum, t) => sum + t.progress, 0) / leaves.length);
}

export function Dashboard({ tasks }: Props) {
  const global = getGlobalProgress(tasks);

  const ouvrageData = OUVRAGES.map((o) => ({
    ...o,
    progress: getOuvrageProgress(tasks, o.id),
    shortName: o.nom.split(' - ')[0],
  }));

  const completed = ouvrageData.filter((o) => o.progress === 100).length;
  const inProgress = ouvrageData.filter((o) => o.progress > 0 && o.progress < 100).length;

  const totalTasks = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id)).length;
  const doneTasks = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id) && t.progress === 100).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Avancement global" value={`${global}%`} sub="du projet" color="bg-blue-500" />
        <KpiCard label="Ouvrages terminés" value={`${completed}/${OUVRAGES.length}`} sub="ouvrages" color="bg-green-500" />
        <KpiCard label="En cours" value={`${inProgress}`} sub="ouvrages" color="bg-amber-500" />
        <KpiCard label="Tâches complétées" value={`${doneTasks}/${totalTasks}`} sub="tâches" color="bg-purple-500" />
      </div>

      {/* Global progress bar */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Avancement global du marché</h2>
          <span className="text-2xl font-bold text-blue-600">{global}%</span>
        </div>
        <ProgressBar value={global} color="#3b82f6" height="h-4" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>04/05/2026</span>
          <span>04/05/2027</span>
        </div>
      </div>

      {/* Ouvrage progress chart */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Avancement par ouvrage</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ouvrageData} layout="vertical" margin={{ left: 120, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="shortName" tick={{ fontSize: 11 }} width={115} />
              <Tooltip formatter={(v) => [`${v}%`, 'Avancement']} />
              <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                {ouvrageData.map((o) => (
                  <Cell key={o.id} fill={o.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ouvrage cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ouvrageData.map((o) => (
          <div key={o.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">{o.nom}</span>
              <span className="text-sm font-bold" style={{ color: o.color }}>{o.progress}%</span>
            </div>
            <ProgressBar value={o.progress} color={o.color} height="h-2" />
            <div className="mt-2 flex gap-2">
              <StatusBadge progress={o.progress} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
      <div className={`${color} text-white rounded-lg p-3 text-center min-w-[56px]`}>
        <div className="text-xl font-bold">{value}</div>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
    </div>
  );
}

function StatusBadge({ progress }: { progress: number }) {
  if (progress === 100) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Terminé</span>;
  if (progress > 0) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">En cours</span>;
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Non démarré</span>;
}
