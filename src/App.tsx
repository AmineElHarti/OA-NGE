import { useState } from 'react';
import { LayoutDashboard, ListTodo } from 'lucide-react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';

type Tab = 'dashboard' | 'tasks';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { tasks, updateProgress, resetAll } = useStore();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-700 text-white font-bold text-sm px-2 py-1 rounded">NGE</div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">Suivi des Travaux OA LGV</h1>
              <p className="text-xs text-gray-500">Augmentation capacité ferroviaire Kenitra–Marrakech</p>
            </div>
          </div>
          <button
            onClick={() => { if (confirm('Réinitialiser tous les avancements ?')) resetAll(); }}
            className="text-xs text-gray-500 hover:text-red-600 border rounded px-2 py-1"
          >
            Réinitialiser
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          <TabBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<LayoutDashboard size={15} />} label="Tableau de bord" />
          <TabBtn active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<ListTodo size={15} />} label="Tâches" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <Dashboard tasks={tasks} />}
        {tab === 'tasks' && <TaskList tasks={tasks} onUpdate={updateProgress} />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
