import type { Task } from '../data/tasks';
import type { ProgressEntry } from '../store/useStore';
import { generateSCurve } from '../lib/scurve';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { tasks: Task[]; history: ProgressEntry[] }

export function SCurveChart({ tasks, history }: Props) {
  const data = generateSCurve(tasks, history);
  // Thin out points for readability (every 2 weeks)
  const thinned = data.filter((_, i) => i % 2 === 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>{p.value?.toFixed(1)}%</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Courbe S — Avancement cumulé</h2>
          <p className="text-sm text-gray-500 mt-0.5">Prévu vs Réalisé</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-blue-500 inline-block rounded" /> Prévu</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-emerald-500 inline-block rounded border-dashed" /> Réalisé</span>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={thinned} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={format(new Date(), 'dd/MM/yy', { locale: fr })} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Aujourd'hui", position: 'top', fontSize: 10, fill: '#ef4444' }} />
            <Area type="monotone" dataKey="planned" name="Prévu" stroke="#3b82f6" strokeWidth={2} fill="url(#plannedGrad)" dot={false} />
            <Line type="monotone" dataKey="actual" name="Réalisé" stroke="#10b981" strokeWidth={2.5} strokeDasharray="0" dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
