import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { useStore } from '../store/useStore';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { SyntheseTab } from '../components/ouvrage/SyntheseTab';
import { TachesTab } from '../components/ouvrage/TachesTab';
import { EtudesTab } from '../components/ouvrage/EtudesTab';
import { CoordinationTab } from '../components/ouvrage/CoordinationTab';
import { ProgressBar } from '../components/ui/index';
import { ArrowLeft, LayoutDashboard, ListChecks, FileText, Users } from 'lucide-react';
import { getDescendants, computeProgress } from '../hooks/useOuvrageProgress';

type Tab = 'synthese' | 'taches' | 'etudes' | 'coordination';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'synthese', label: 'Synthèse', icon: <LayoutDashboard size={14} /> },
  { id: 'taches', label: 'Tâches', icon: <ListChecks size={14} /> },
  { id: 'etudes', label: 'Études', icon: <FileText size={14} /> },
  { id: 'coordination', label: 'Coordination', icon: <Users size={14} /> },
];

function getOuvrageProgress(tasks: Task[], ouvrageId: number): number {
  return computeProgress(getDescendants(tasks, ouvrageId));
}

export function OuvrageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('synthese');
  const { tasks, history, updateProgress, updateTask, addTask, deleteTask, userName } = useStore();
  const { contraintes, todos, etudes } = useOuvrageStore();

  const ouvrageId = Number(id);
  const ouvrage = OUVRAGES.find((o) => o.id === ouvrageId);

  if (!ouvrage) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">Ouvrage non trouvé.</p>
      <button onClick={() => navigate('/ouvrages')} className="mt-4 text-blue-600 hover:underline text-sm">← Retour aux ouvrages</button>
    </div>
  );

  const progress = getOuvrageProgress(tasks, ouvrageId);
  const pendingContraintes = contraintes.filter((c) => c.ouvrageId === ouvrageId && c.status !== 'levee').length;
  const pendingTodos = todos.filter((t) => t.ouvrageId === ouvrageId && !t.done).length;
  const pendingEtudes = etudes.filter((e) => e.ouvrageId === ouvrageId && e.status !== 'valide').length;
  const [pk, ...nameParts] = ouvrage.nom.split(' - ');
  const name = nameParts.join(' - ');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="pt-4 pb-0">
            <button onClick={() => navigate('/ouvrages')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors">
              <ArrowLeft size={13} /> Ouvrages
            </button>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: ouvrage.color }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: ouvrage.color }}>{pk}</span>
                  </div>
                  <h1 className="text-lg font-black text-gray-900 truncate">{name}</h1>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-black tabular-nums" style={{ color: ouvrage.color }}>{progress}%</p>
                <p className="text-xs text-gray-400">avancement</p>
              </div>
            </div>
            <ProgressBar value={progress} color={ouvrage.color} height="h-1.5" />
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-3 -mb-px overflow-x-auto">
            {TABS.map((t) => {
              const badge =
                t.id === 'etudes' ? pendingEtudes :
                t.id === 'coordination' ? pendingContraintes + pendingTodos :
                0;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none font-bold">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {tab === 'synthese' && <SyntheseTab ouvrageId={ouvrageId} tasks={tasks} history={history} color={ouvrage.color} />}
        {tab === 'taches' && <TachesTab ouvrageId={ouvrageId} tasks={tasks} color={ouvrage.color} onUpdate={updateProgress} onUpdateTask={updateTask} onAddTask={addTask} onDeleteTask={deleteTask} />}
        {tab === 'etudes' && <EtudesTab ouvrageId={ouvrageId} />}
        {tab === 'coordination' && <CoordinationTab ouvrageId={ouvrageId} userName={userName} />}
      </main>
    </div>
  );
}
