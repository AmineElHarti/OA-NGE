import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, CalendarDays, Users, FileText, Settings, X } from 'lucide-react';

interface Props {
  onClose?: () => void;
}

const NAV = [
  { path: '/', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { path: '/ouvrages', label: 'Ouvrages', icon: Building2 },
  { path: '/semaine', label: 'Cette semaine', icon: CalendarDays },
  { path: '/coordination', label: 'Coordination', icon: Users },
  { path: '/rapports', label: 'Rapports', icon: FileText },
] as const;

export function Sidebar({ onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  function go(path: string) {
    navigate(path);
    onClose?.();
  }

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/';
    if (path === '/ouvrages') return location.pathname === '/ouvrages' || location.pathname.startsWith('/ouvrage/');
    return location.pathname.startsWith(path);
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xs">NGE</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">OA LGV</p>
            <p className="text-slate-500 text-xs mt-0.5">Kenitra – Marrakech</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 lg:hidden"><X size={16} /></button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-slate-800">
        <button
          onClick={() => go('/parametres')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive('/parametres') ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings size={16} />
          <span>Paramètres</span>
        </button>
      </div>
    </div>
  );
}
