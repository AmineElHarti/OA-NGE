import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { computeAlerts } from '../lib/scurve';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';

interface Props { tasks: Task[] }

function getOuvrageName(task: Task, tasks: Task[]): string {
  let cur: Task | undefined = task;
  while (cur) {
    const o = OUVRAGES.find((o) => o.id === cur!.id);
    if (o) return o.nom.split(' - ')[0];
    cur = tasks.find((t) => t.id === cur!.parentId);
  }
  return '—';
}

export function AlertsPanel({ tasks }: Props) {
  const alerts = computeAlerts(tasks);

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-3">
        <CheckCircle className="text-emerald-500" size={24} />
        <div>
          <p className="font-semibold text-gray-800">Aucun retard détecté</p>
          <p className="text-sm text-gray-500">Toutes les tâches en cours sont dans les délais.</p>
        </div>
      </div>
    );
  }

  const critical = alerts.filter((a) => a.gap >= 40);
  const warning = alerts.filter((a) => a.gap >= 20 && a.gap < 40);
  const minor = alerts.filter((a) => a.gap < 20);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Alertes & Retards</h2>
          <p className="text-sm text-gray-500 mt-0.5">{alerts.length} tâche{alerts.length > 1 ? 's' : ''} en retard par rapport au planning</p>
        </div>
        <div className="flex gap-2 text-xs">
          {critical.length > 0 && <Badge count={critical.length} label="Critique" color="bg-red-100 text-red-700" />}
          {warning.length > 0 && <Badge count={warning.length} label="Avertissement" color="bg-amber-100 text-amber-700" />}
          {minor.length > 0 && <Badge count={minor.length} label="Mineur" color="bg-blue-100 text-blue-700" />}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {alerts.slice(0, 20).map(({ task, expected, gap }) => {
          const isCritical = gap >= 40;
          const isWarning = gap >= 20 && gap < 40;
          return (
            <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
              isCritical ? 'bg-red-50 border-red-200' :
              isWarning ? 'bg-amber-50 border-amber-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              {isCritical ? <AlertCircle size={16} className="text-red-500 flex-shrink-0" /> :
               <AlertTriangle size={16} className={`flex-shrink-0 ${isWarning ? 'text-amber-500' : 'text-blue-500'}`} />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{task.nom}</p>
                <p className="text-xs text-gray-500">{getOuvrageName(task, [] as Task[])}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-xs font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-blue-600'}`}>
                  -{gap}%
                </p>
                <p className="text-xs text-gray-500">{task.progress}% / {expected}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={`${color} px-2 py-1 rounded-full font-medium`}>{count} {label}</span>
  );
}
