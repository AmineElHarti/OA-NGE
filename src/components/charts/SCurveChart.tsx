import type { Task } from '../../data/tasks';
import type { ProgressEntry } from '../../store/useStore';
import { generateSCurve } from '../../lib/scurve';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { tasks: Task[]; history: ProgressEntry[]; height?: number }

const todayLabel = format(new Date(), 'dd/MM/yy', { locale: fr });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-32">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => p.value != null && (
        <div key={p.name} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold tabular-nums">{Number(p.value).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export function SCurveChart({ tasks, history, height = 280 }: Props) {
  const data = generateSCurve(tasks, history).filter((_, i) => i % 2 === 0);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={3} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={todayLabel} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5}
            label={{ value: "Aujourd'hui", position: 'insideTopRight', fontSize: 9, fill: '#ef4444', offset: 4 }} />
          <Area type="monotone" dataKey="planned" name="Prévu" stroke="#3b82f6" strokeWidth={2} fill="url(#gradPlanned)" dot={false} />
          <Line type="monotone" dataKey="actual" name="Réalisé" stroke="#10b981" strokeWidth={2.5} dot={false} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
