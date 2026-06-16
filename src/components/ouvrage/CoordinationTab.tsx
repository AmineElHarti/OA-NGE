import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import { ContraintesTab } from './ContraintesTab';
import { NotesTab } from './NotesTab';
import { TodoTab } from './TodoTab';
import { Users, MessageSquare, ClipboardList } from 'lucide-react';
import { Badge } from '../ui/index';

interface Props {
  ouvrageId: number;
  userName: string;
}

type SubTab = 'contraintes' | 'todos' | 'notes';

export function CoordinationTab({ ouvrageId, userName }: Props) {
  const [tab, setTab] = useState<SubTab>('contraintes');
  const { contraintes, todos, notes } = useOuvrageStore();

  const openContraintes = contraintes.filter((c) => c.ouvrageId === ouvrageId && c.status !== 'levee').length;
  const openTodos = todos.filter((t) => t.ouvrageId === ouvrageId && !t.done).length;
  const noteCount = notes.filter((n) => n.ouvrageId === ouvrageId).length;

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode; count: number; badge?: boolean }[] = [
    { id: 'contraintes', label: 'Contraintes', icon: <Users size={13} />, count: openContraintes, badge: openContraintes > 0 },
    { id: 'todos', label: 'À faire', icon: <ClipboardList size={13} />, count: openTodos, badge: openTodos > 0 },
    { id: 'notes', label: 'Notes', icon: <MessageSquare size={13} />, count: noteCount },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && <Badge variant={t.badge ? 'red' : 'gray'} className="ml-1">{t.count}</Badge>}
          </button>
        ))}
      </div>

      {tab === 'contraintes' && <ContraintesTab ouvrageId={ouvrageId} />}
      {tab === 'todos' && <TodoTab ouvrageId={ouvrageId} />}
      {tab === 'notes' && <NotesTab ouvrageId={ouvrageId} userName={userName} />}
    </div>
  );
}
