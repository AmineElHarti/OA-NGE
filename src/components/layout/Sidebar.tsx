import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, ChevronRight, X, Settings, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Task } from '../../data/tasks';
import { useOuvrageProgress } from '../../hooks/useOuvrageProgress';
import { useOuvrageStore } from '../../store/useOuvrageStore';

interface Props {
  tasks: Task[];
  onClose?: () => void;
}

export function Sidebar({ tasks, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const metrics = useOuvrageProgress(tasks);
  const { contraintes, todos } = useOuvrageStore();

  function go(path: string) {
    navigate(path);
    onClose?.();
  }

  const activeOuvrageId = location.pathname.startsWith('/ouvrage/')
    ? parseInt(location.pathname.split('/')[2])
    : null;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">NGE</p>
            <p className="text-slate-500 text-xs mt-0.5">OA LGV · Kenitra–Marrakech</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 lg:hidden"><X size={16} /></button>
        )}
      </div>

      {/* Main nav */}
      <div className="px-2 py-3 border-b border-slate-800">
        <SidebarItem icon={<LayoutDashboard size={15} />} label="Tableau de bord" active={location.pathname === '/'} onClick={() => go('/')} />
        <SidebarItem icon={<ListTodo size={15} />} label="Mise à jour" active={location.pathname === '/taches'} onClick={() => go('/taches')} />
      </div>

      {/* Ouvrages */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Ouvrages</p>
        {metrics.map((m) => {
          const active = activeOuvrageId === m.id;
          const pendingC = contraintes.filter((c) => c.ouvrageId === m.id && c.status !== 'levee').length;
          const pendingT = todos.filter((t) => t.ouvrageId === m.id && !t.done).length;
          const alerts = pendingC + pendingT;
          const TrendIcon = m.gap > 5 ? TrendingUp : m.gap < -5 ? TrendingDown : Minus;
          const trendColor = m.gap > 5 ? '#10b981' : m.gap < -5 ? '#ef4444' : '#94a3b8';

          return (
            <button
              key={m.id}
              onClick={() => go(`/ouvrage/${m.id}`)}
              className={`w-full text-left px-2 py-2.5 rounded-xl mb-0.5 group transition-all duration-150 ${
                active
                  ? 'bg-blue-600/20 border border-blue-500/30'
                  : 'hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-semibold truncate ${active ? 'text-white' : 'text-slate-300'}`}>
                      {m.shortName}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {alerts > 0 && (
                        <span className="text-xs bg-red-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold">{alerts}</span>
                      )}
                      <TrendIcon size={10} style={{ color: trendColor }} />
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 bg-slate-700 rounded-full h-1 overflow-hidden">
                      <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${m.progress}%`, backgroundColor: m.color }} />
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: m.color }}>{m.progress}%</span>
                  </div>
                </div>
                <ChevronRight size={11} className={`flex-shrink-0 transition-opacity ${active ? 'text-blue-400 opacity-100' : 'text-slate-600 opacity-0 group-hover:opacity-100'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-slate-800">
        <SidebarItem icon={<Settings size={15} />} label="Paramètres" onClick={() => go('/settings')} active={location.pathname === '/settings'} />
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
        active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      {icon}{label}
    </button>
  );
}
