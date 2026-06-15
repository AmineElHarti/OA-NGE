import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, FileDown, RefreshCw, Wifi, WifiOff, Settings, ChevronRight, Menu, X } from 'lucide-react';
import type { Task } from './data/tasks';
import { OUVRAGES } from './data/tasks';
import { useStore } from './store/useStore';
import { useOuvrageStore } from './store/useOuvrageStore';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { OuvrageDetail } from './pages/OuvrageDetail';
import { generatePDFReport } from './lib/pdfReport';
import { hasSupabase } from './lib/supabase';
import { ProgressBar } from './components/ProgressBar';

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

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { tasks, history, updateProgress, resetAll, fetchFromSupabase, loading, synced, userName, setUserName } = useStore();
  const { contraintes, todos } = useOuvrageStore();

  useEffect(() => {
    if (hasSupabase) fetchFromSupabase();
  }, []);

  const isOuvragePage = location.pathname.startsWith('/ouvrage/');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        {/* Brand */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-800 text-white font-black text-xs px-2 py-1 rounded-lg">NGE</div>
            <div>
              <p className="text-xs font-bold text-gray-900 leading-tight">OA LGV</p>
              <p className="text-xs text-gray-400">Kenitra–Marrakech</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400"><X size={16} /></button>
        </div>

        {/* Main nav */}
        <nav className="px-2 py-3 border-b border-gray-100">
          <NavItem icon={<LayoutDashboard size={15} />} label="Tableau de bord" active={location.pathname === '/'} onClick={() => { navigate('/'); setSidebarOpen(false); }} />
          <NavItem icon={<ListTodo size={15} />} label={`Toutes les tâches`} active={location.pathname === '/taches'} onClick={() => { navigate('/taches'); setSidebarOpen(false); }} />
        </nav>

        {/* Ouvrages */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Ouvrages ({OUVRAGES.length})</p>
          {OUVRAGES.map((o) => {
            const progress = getOuvrageProgress(tasks, o.id);
            const active = location.pathname === `/ouvrage/${o.id}`;
            const pendingC = contraintes.filter((c) => c.ouvrageId === o.id && c.status !== 'levee').length;
            const pendingT = todos.filter((t) => t.ouvrageId === o.id && !t.done).length;
            const alerts = pendingC + pendingT;
            const [pk, ...rest] = o.nom.split(' - ');
            return (
              <button
                key={o.id}
                onClick={() => { navigate(`/ouvrage/${o.id}`); setSidebarOpen(false); }}
                className={`w-full text-left px-2 py-2 rounded-xl mb-0.5 group transition-colors ${active ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 truncate">{pk}</span>
                      {alerts > 0 && <span className="text-xs bg-red-100 text-red-600 rounded-full px-1.5 font-bold">{alerts}</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{rest.join(' - ')}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="flex-1"><ProgressBar value={progress} color={o.color} height="h-1" /></div>
                      <span className="text-xs font-bold" style={{ color: o.color }}>{progress}%</span>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Settings */}
        <div className="px-3 py-3 border-t border-gray-100">
          <button onClick={() => setShowSettings((v) => !v)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 w-full">
            <Settings size={13} /> Paramètres
          </button>
          {showSettings && (
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <label className="text-gray-500 mb-1 block">Votre nom</label>
                <input value={userName} onChange={(e) => setUserName(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              {!hasSupabase && <p className="text-amber-600 text-xs">⚠ Mode local — ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel pour partager les données.</p>}
              {hasSupabase && <button onClick={() => fetchFromSupabase()} className="text-blue-600 hover:underline flex items-center gap-1"><RefreshCw size={10} /> Resync Supabase</button>}
              <button onClick={() => { if (confirm('Réinitialiser tous les avancements ?')) resetAll(); }} className="text-red-500 hover:underline">Réinitialiser</button>
            </div>
          )}
        </div>
      </aside>

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (hidden on ouvrage pages which have their own header) */}
        {!isOuvragePage && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500"><Menu size={18} /></button>
                <h1 className="font-bold text-gray-900 text-sm">
                  {location.pathname === '/' ? 'Tableau de bord global' : 'Toutes les tâches'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${hasSupabase ? synced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                  {hasSupabase ? synced ? <><Wifi size={11} />Synchronisé</> : <><RefreshCw size={11} className="animate-spin" />Sync...</> : <><WifiOff size={11} />Local</>}
                </div>
                <button onClick={() => generatePDFReport(tasks, userName)}
                  className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <FileDown size={13} /> Rapport PDF
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Mobile top bar on ouvrage pages */}
        {isOuvragePage && (
          <div className="lg:hidden bg-white border-b px-4 py-2 flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500"><Menu size={18} /></button>
            <span className="text-xs text-gray-500">NGE OA LGV</span>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-white/60 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-6 flex items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Synchronisation...</span>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<main className="flex-1 max-w-screen-xl w-full mx-auto px-4 py-6"><Dashboard tasks={tasks} history={history} /></main>} />
          <Route path="/taches" element={<main className="flex-1 max-w-screen-xl w-full mx-auto px-4 py-6"><TaskList tasks={tasks} onUpdate={updateProgress} /></main>} />
          <Route path="/ouvrage/:id" element={<OuvrageDetail />} />
        </Routes>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
      {icon}{label}
    </button>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
