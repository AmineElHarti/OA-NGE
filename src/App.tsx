import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Menu, RefreshCw, Wifi, WifiOff, FileDown } from 'lucide-react';
import { useStore } from './store/useStore';
import { DashboardPage } from './pages/DashboardPage';
import { OuvrageDetail } from './pages/OuvrageDetail';
import { Sidebar } from './components/layout/Sidebar';
import { TaskList } from './components/TaskList';
import { generatePDFReport } from './lib/pdfReport';
import { hasSupabase } from './lib/supabase';

function AppShell() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tasks, history, updateProgress, fetchFromSupabase, loading, synced, userName } = useStore();

  useEffect(() => {
    if (hasSupabase) fetchFromSupabase();
  }, []);

  const isOuvragePage = location.pathname.startsWith('/ouvrage/');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <Sidebar tasks={tasks} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!isOuvragePage && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-800 p-1">
                  <Menu size={18} />
                </button>
                <h1 className="font-bold text-gray-900 text-sm">
                  {location.pathname === '/' ? 'Tableau de bord global' : 'Suivi des tâches'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${hasSupabase ? synced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                  {hasSupabase
                    ? synced ? <><Wifi size={11} />Synchronisé</> : <><RefreshCw size={11} className="animate-spin" />Sync...</>
                    : <><WifiOff size={11} />Local</>}
                </div>
                <button
                  onClick={() => generatePDFReport(tasks, userName)}
                  className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FileDown size={13} /> Rapport PDF
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Mobile menu button on ouvrage page */}
        {isOuvragePage && (
          <div className="lg:hidden bg-white border-b px-4 py-2 flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
              <Menu size={18} />
            </button>
            <span className="text-xs font-semibold text-gray-500">NGE · OA LGV</span>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-white/60 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-6 flex items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Synchronisation en cours...</span>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={
            <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-6">
              <DashboardPage tasks={tasks} history={history} />
            </main>
          } />
          <Route path="/taches" element={
            <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-6">
              <TaskList tasks={tasks} onUpdate={updateProgress} />
            </main>
          } />
          <Route path="/ouvrage/:id" element={<OuvrageDetail />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
