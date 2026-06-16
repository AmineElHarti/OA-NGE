import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { AvancementTab } from '../components/ouvrage/AvancementTab';
import { Card, ProgressBar } from '../components/ui/index';
import { getGeneralTasks, computeProgress, computeTheoreticalProgress } from '../hooks/useOuvrageProgress';

export function TravauxGenerauxPage() {
  const { tasks, updateProgress, updateTask, addTask, deleteTask } = useStore();

  const generalTasks = useMemo(() => getGeneralTasks(tasks), [tasks]);
  const rootIds = useMemo(() => [...new Set(generalTasks.filter((t) => t.parentId === 1).map((t) => t.id))], [generalTasks]);
  const progress = computeProgress(generalTasks);
  const theoretical = computeTheoreticalProgress(generalTasks);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">Travaux généraux</h2>
        <p className="text-sm text-gray-500 mt-0.5">Tâches non rattachées à un ouvrage spécifique (installation de chantier, études, fabrication des poutres...)</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">Avancement global</p>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{progress}%</p>
        </div>
        <ProgressBar value={progress} color="#475569" height="h-2" />
        <p className="text-xs text-gray-400 mt-1.5">Théorique : {theoretical}%</p>
      </Card>

      <AvancementTab
        rootIds={rootIds}
        hideRoots={false}
        label="Tâches générales"
        tasks={generalTasks}
        color="#475569"
        onUpdate={updateProgress}
        onUpdateTask={updateTask}
        onAddTask={addTask}
        onDeleteTask={deleteTask}
      />
    </div>
  );
}
