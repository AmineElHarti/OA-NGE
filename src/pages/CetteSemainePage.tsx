import type { Task } from '../data/tasks';
import { Card, SectionHeader } from '../components/ui/index';
import { CalendarDays } from 'lucide-react';

interface Props { tasks: Task[] }

export function CetteSemainePage(_props: Props) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Cette semaine" description="Pilotage hebdomadaire — ce qui se passe en ce moment" />
      <Card className="text-center py-16">
        <CalendarDays size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-600">En cours de développement</p>
        <p className="text-xs text-gray-400 mt-1">Vue cross-ouvrage des tâches, contraintes et études de la semaine</p>
      </Card>
    </div>
  );
}
