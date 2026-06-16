import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import { useOuvrageProgress, getDescendants, isLeaf } from '../hooks/useOuvrageProgress';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { computeAlerts } from '../lib/scurve';
import { Search, AlertTriangle, FileText, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, ProgressBar, Badge, SectionHeader } from '../components/ui/index';

interface Props { tasks: Task[] }

type Filter = 'all' | 'en_retard' | 'a_risque' | 'en_avance' | 'termine';

export function OuvragesListPage({ tasks }: Props) {
  const navigate = useNavigate();
  const ouvrages = useOuvrageProgress(tasks);
  const { contraintes, todos, etudes } = useOuvrageStore();
  const alerts = computeAlerts(tasks);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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
      todoCount: todos.filter((t) => t.ouvrageId === o.id && !t.done).length,
    };
  }), [ouvrages, tasks, alerts, contraintes, todos, etudes]);

  const filtered = rows.filter((r) => {
    if (search && !r.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'termine' && r.progress < 100) return false;
    if (filter === 'en_retard' && r.gap >= 0) return false;
    if (filter === 'a_risque' && r.gap >= -10) return false;
    if (filter === 'en_avance' && r.gap < 5) return false;
    return true;
  });

  const counts = {
    all: rows.length,
    en_retard: rows.filter((r) => r.gap < 0).length,
    a_risque: rows.filter((r) => r.gap < -10).length,
    en_avance: rows.filter((r) => r.gap >= 5).length,
    termine: rows.filter((r) => r.progress === 100).length,
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Ouvrages d'art"
        description={`${rows.length} ouvrages · LGV Kenitra–Marrakech`}
      />

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un ouvrage par nom ou PK..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            ['all', 'Tous', counts.all],
            ['en_retard', 'En retard', counts.en_retard],
            ['a_risque', 'À risque', counts.a_risque],
            ['en_avance', 'En avance', counts.en_avance],
            ['termine', 'Terminés', counts.termine],
          ] as [Filter, string, number][]).map(([v, l, c]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                filter === v ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {l} <span className={filter === v ? 'opacity-70' : 'text-gray-400'}>({c})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-sm text-gray-400">Aucun ouvrage ne correspond aux critères</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => {
            const [pk, ...rest] = o.nom.split(' - ');
            const Trend = o.gap > 5 ? TrendingUp : o.gap < -5 ? TrendingDown : Minus;
            const trendColor = o.gap > 5 ? 'text-emerald-600' : o.gap < -5 ? 'text-red-600' : 'text-gray-400';
            return (
              <Card
                key={o.id}
                onClick={() => navigate(`/ouvrage/${o.id}`)}
                className="hover:shadow-md transition-all !p-0 overflow-hidden group"
              >
                {/* Colored top bar */}
                <div className="h-1.5" style={{ backgroundColor: o.color }} />
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: o.color }}>{pk}</span>
                        <Trend size={13} className={trendColor} />
                      </div>
                      <p className="text-sm font-bold text-gray-800 mt-1.5 leading-tight">{rest.join(' - ')}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: o.color }}>{o.progress}%</p>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-1.5">
                    <ProgressBar value={o.progress} color={o.color} height="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Prévu {o.theoretical}%</span>
                      <span className={`font-bold ${o.gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {o.gap >= 0 ? '+' : ''}{o.gap}% écart
                      </span>
                    </div>
                  </div>

                  {/* Stats footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-3 text-gray-500">
                      <span className="tabular-nums"><span className="font-bold text-gray-800">{o.doneCount}</span>/{o.leafCount} tâches</span>
                      {o.blockedCount > 0 && (
                        <span className="text-amber-600 font-semibold">{o.blockedCount} bloq.</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {o.alertCount > 0 && <Badge variant="red"><AlertTriangle size={9} />{o.alertCount}</Badge>}
                      {o.etudeCount > 0 && <Badge variant="blue"><FileText size={9} />{o.etudeCount}</Badge>}
                      {o.contrainteCount > 0 && <Badge variant="amber"><Users size={9} />{o.contrainteCount}</Badge>}
                      {o.alertCount + o.etudeCount + o.contrainteCount === 0 && (
                        <Badge variant="green">OK</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
