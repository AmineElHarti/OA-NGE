import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { useStore } from '../store/useStore';
import { AvancementTab } from '../components/ouvrage/AvancementTab';
import { KanbanBoard } from '../components/ouvrage/KanbanBoard';
import { ContraintesTab } from '../components/ouvrage/ContraintesTab';
import { NotesTab } from '../components/ouvrage/NotesTab';
import { TodoTab } from '../components/ouvrage/TodoTab';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { ArrowLeft, TrendingUp, Kanban, AlertTriangle, MessageSquare, ClipboardList } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';

type Tab = 'avancement' | 'kanban' | 'contraintes' | 'notes' | 'todos';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'avancement', label: 'Avancement', icon: <TrendingUp size={15} /> },
  { id: 'kanban', label: 'Kanban', icon: <Kanban size={15} /> },
  { id: 'contraintes', label: 'Contraintes réseaux', icon: <AlertTriangle size={15} /> },
  { id: 'notes', label: 'Notes', icon: <MessageSquare size={15} /> },
  { id: 'todos', label: 'À faire', icon: <ClipboardList size={15} /> },
];

function isLeaf(id: number, tasks: Task[]) {
  return !tasks.some((t) => t.parentId === id);
}

function getOuvrageProgress(tasks: Task[], ouvrageId: number): number {
  function isDesc(t: Task): boolean {
    let cur: Task | undefined = t;
    while (cur) { if (cur.id === ouvrageId) return true; cur = tasks.find((x) => x.id === cur!.parentId); }
    return false;
  }
  const leaves = tasks.filter((t) => isLeaf(t.id, tasks) && isDesc(t));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length);
}

export function OuvrageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('avancement');
  const { tasks, history, updateProgress, userName } = useStore();
  const { contraintes, todos } = useOuvrageStore();

  const ouvrageId = Number(id);
  const ouvrage = OUVRAGES.find((o) => o.id === ouvrageId);

  if (!ouvrage) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">Ouvrage non trouvé.</p>
      <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:underline">← Retour au tableau de bord</button>
    </div>
  );

  const progress = getOuvrageProgress(tasks, ouvrageId);
  const pendingContraintes = contraintes.filter((c) => c.ouvrageId === ouvrageId && c.status !== 'levee').length;
  const pendingTodos = todos.filter((t) => t.ouvrageId === ouvrageId && !t.done).length;

  const [pk, ...nameParts] = ouvrage.nom.split(' - ');
  const name = nameParts.join(' - ');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Ouvrage header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <ArrowLeft size={14} /> Tableau de bord
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: ouvrage.color }} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: ouvrage.color }}>{pk}</span>
                  <h1 className="text-xl font-black text-gray-900">{name}</h1>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Ouvrages d'art LGV · Kenitra–Marrakech</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-3xl font-black" style={{ color: ouvrage.color }}>{progress}%</span>
              <p className="text-xs text-gray-400">avancement physique</p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress} color={ouvrage.color} height="h-2" />
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-4 -mb-px">
            {TABS.map((t) => {
              const badge = t.id === 'contraintes' ? pendingContraintes : t.id === 'todos' ? pendingTodos : 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.id
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
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
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {tab === 'avancement' && (
          <AvancementTab ouvrageId={ouvrageId} tasks={tasks} history={history} color={ouvrage.color} onUpdate={updateProgress} />
        )}
        {tab === 'kanban' && (
          <KanbanBoard ouvrageId={ouvrageId} color={ouvrage.color} userName={userName} />
        )}
        {tab === 'contraintes' && (
          <ContraintesTab ouvrageId={ouvrageId} />
        )}
        {tab === 'notes' && (
          <NotesTab ouvrageId={ouvrageId} userName={userName} />
        )}
        {tab === 'todos' && (
          <TodoTab ouvrageId={ouvrageId} userName={userName} />
        )}
      </main>
    </div>
  );
}
