import { useState } from 'react';
import type { Task } from '../../data/tasks';
import { AvancementTab } from './AvancementTab';
import { KanbanBoard } from './KanbanBoard';
import { Table, Kanban } from 'lucide-react';

interface Props {
  ouvrageId: number;
  tasks: Task[];
  color: string;
  onUpdate: (id: number, progress: number, notes?: string) => void;
  onUpdateTask: (id: number, updates: Partial<Omit<Task, 'id'>>) => void;
  onAddTask: (task: Omit<Task, 'id' | 'progress' | 'updatedAt'>) => number;
  onDeleteTask: (id: number) => void;
}

type View = 'table' | 'kanban';

export function TachesTab(props: Props) {
  const [view, setView] = useState<View>('table');

  return (
    <div className="space-y-4">
      {/* View switcher */}
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <ViewBtn active={view === 'table'} onClick={() => setView('table')} icon={<Table size={13} />} label="Tableau" />
          <ViewBtn active={view === 'kanban'} onClick={() => setView('kanban')} icon={<Kanban size={13} />} label="Kanban" />
        </div>
      </div>

      {view === 'table' ? (
        <AvancementTab {...props} />
      ) : (
        <KanbanBoard
          ouvrageId={props.ouvrageId}
          tasks={props.tasks}
          color={props.color}
          onUpdateTask={props.onUpdateTask}
          onUpdateProgress={props.onUpdate}
          onAddTask={props.onAddTask}
          onDeleteTask={props.onDeleteTask}
        />
      )}
    </div>
  );
}

function ViewBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
