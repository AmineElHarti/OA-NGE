import { useState, useEffect } from 'react';
import { LayoutDashboard, ListTodo, FileDown, RefreshCw, Wifi, WifiOff, Settings } from 'lucide-react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { generatePDFReport } from './lib/pdfReport';
import { hasSupabase } from './lib/supabase';

type Tab = 'dashboard' | 'tasks';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showSetup, setShowSetup] = useState(false);
  const { tasks, history, updateProgress, resetAll, fetchFromSupabase, loading, synced, userName, setUserName } = useStore();

  useEffect(() => {
    if (hasSupabase) fetchFromSupabase();
  }, []);

  const handleExportPDF = () => generatePDFReport(tasks, userName);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-800 text-white font-black text-sm px-2.5 py-1.5 rounded-lg tracking-wide">NGE</div>
              <div>
                <h1 className="font-bold text-gray-900 text-sm leading-tight">Suivi Travaux OA LGV</h1>
                <p className="text-xs text-gray-400">Kenitra → Marrakech · Augmentation capacité ferroviaire</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Sync status */}
              <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                hasSupabase
                  ? synced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {hasSupabase
                  ? synced ? <><Wifi size={11} /> Synchronisé</> : <><RefreshCw size={11} className="animate-spin" /> Sync...</>
                  : <><WifiOff size={11} /> Local</>}
              </div>

              {/* PDF Export */}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <FileDown size={13} />
                Rapport PDF
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSetup((v) => !v)}
                className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSetup && (
            <div className="pb-3 border-t border-gray-100 pt-3 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Votre nom :</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {hasSupabase && (
                <button
                  onClick={() => fetchFromSupabase()}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <RefreshCw size={11} /> Resynchroniser Supabase
                </button>
              )}
              {!hasSupabase && (
                <p className="text-xs text-amber-600">
                  ⚠ Supabase non configuré — données stockées localement. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les variables Vercel.
                </p>
              )}
              <button
                onClick={() => { if (confirm('Réinitialiser tous les avancements ?')) resetAll(); }}
                className="text-xs text-red-500 hover:underline ml-auto"
              >
                Réinitialiser tout
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0">
            <TabBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<LayoutDashboard size={14} />} label="Tableau de bord" />
            <TabBtn active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<ListTodo size={14} />} label={`Tâches (${tasks.length})`} />
          </div>
        </div>
      </header>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 flex items-center gap-3">
            <RefreshCw size={20} className="animate-spin text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Synchronisation avec Supabase...</span>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <Dashboard tasks={tasks} history={history} />}
        {tab === 'tasks' && <TaskList tasks={tasks} onUpdate={updateProgress} />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
        active ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
      }`}
    >
      {icon}{label}
    </button>
  );
}
