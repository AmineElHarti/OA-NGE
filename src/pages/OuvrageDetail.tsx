import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { useStore } from '../store/useStore';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { AvancementTab } from '../components/ouvrage/AvancementTab';
import { KanbanBoard } from '../components/ouvrage/KanbanBoard';
import { ContraintesTab } from '../components/ouvrage/ContraintesTab';
import { EtudesTab } from '../components/ouvrage/EtudesTab';
import { NotesTab } from '../components/ouvrage/NotesTab';
import { TodoTab } from '../components/ouvrage/TodoTab';
import { ProgressBar } from '../components/ui/index';
import { ArrowLeft, TrendingUp, Kanban, AlertTriangle, MessageSquare, ClipboardList, FileText } from 'lucide-react';
import { getDescendants, computeProgress } from '../hooks/useOuvrageProgress';

type Tab = 'avancement' | 'etudes' | 'kanban' | 'contraintes' | 'notes' | 'todos';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'avancement', label: 'Avancement', icon: <TrendingUp size={14} /> },
  { id: 'etudes', label: 'Études', icon: <FileText size={14} /> },
  { id: 'kanban', label: 'Kanban', icon: <Kanban size={14} /> },
  { id: 'contraintes', label: 'Contraintes', icon: <AlertTriangle size={14} /> },
  { id: 'notes', label: 'Notes', icon: <MessageSquare size={14} /> },
  { id: 'todos', label: 'À faire', icon: <ClipboardList size={14} /> },
];

function getOuvrageProgress(tasks: Task[], ouvrageId: number): number {
  return computeProgress(getDescendants(tasks, ouvrageId));
}

export function OuvrageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('avancement');
  const { tasks, history, updateProgress, updateTask, addTask, deleteTask, userName } = useStore();
  const { contraintes, todos, etudes } = useOuvrageStore();

  const ouvrageId = Number(id);
  const ouvrage = OUVRAGES.find((o) => o.id === ouvrageId);

  if (!ouvrage) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">Ouvrage non trouvé.</p>
      <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:underline text-sm">← Retour au tableau de bord</button>
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
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors">
              <ArrowLeft size={13} /> Tableau de bord
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
                <p className="text-xs text-gray-400">avancement physique</p>
              </div>
            </div>
            <ProgressBar value={progress} color={ouvrage.color} height="h-1.5" />
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-3 -mb-px overflow-x-auto">
            {TABS.map((t) => {
              const badge = t.id === 'contraintes' ? pendingContraintes : t.id === 'todos' ? pendingTodos : t.id === 'etudes' ? pendingEtudes : 0;
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
        {tab === 'avancement' && <AvancementTab ouvrageId={ouvrageId} tasks={tasks} history={history} color={ouvrage.color} onUpdate={updateProgress} onUpdateTask={updateTask} onAddTask={addTask} onDeleteTask={deleteTask} />}
        {tab === 'etudes' && <EtudesTab ouvrageId={ouvrageId} />}
        {tab === 'kanban' && <KanbanBoard ouvrageId={ouvrageId} tasks={tasks} color={ouvrage.color} onUpdateTask={updateTask} onUpdateProgress={updateProgress} onAddTask={addTask} onDeleteTask={deleteTask} />}
        {tab === 'contraintes' && <ContraintesTab ouvrageId={ouvrageId} />}
        {tab === 'notes' && <NotesTab ouvrageId={ouvrageId} userName={userName} />}
        {tab === 'todos' && <TodoTab ouvrageId={ouvrageId} />}
      </main>
    </div>
  );
}
