import { Card, SectionHeader } from '../components/ui/index';
import { Users } from 'lucide-react';

export function CoordinationPage() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Coordination" description="Vue transversale des contraintes et études" />
      <Card className="text-center py-16">
        <Users size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-600">En cours de développement</p>
        <p className="text-xs text-gray-400 mt-1">Vue par concessionnaire et par BET, à travers tous les ouvrages</p>
      </Card>
    </div>
  );
}
