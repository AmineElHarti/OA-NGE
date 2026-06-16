import { useStore } from '../store/useStore';
import { generatePDFReport } from '../lib/pdfReport';
import { Card, SectionHeader, Button } from '../components/ui/index';
import { FileDown, FileText, Calendar, Building2, Users } from 'lucide-react';

export function RapportsPage() {
  const { tasks, userName } = useStore();

  const reports = [
    {
      id: 'hebdo',
      icon: Calendar,
      title: 'Rapport hebdomadaire',
      description: 'Synthèse globale d\'avancement — 1 à 2 pages — pour MOE / MOA',
      action: () => generatePDFReport(tasks, userName),
      available: true,
    },
    {
      id: 'ouvrage',
      icon: Building2,
      title: 'Fiche par ouvrage',
      description: 'Détail complet d\'un ouvrage — 2 à 3 pages — pour réunions techniques',
      action: () => {},
      available: false,
    },
    {
      id: 'coordination',
      icon: Users,
      title: 'État coordination',
      description: 'Contraintes par concessionnaire + études BET — pour réunions externes',
      action: () => {},
      available: false,
    },
    {
      id: 'mensuel',
      icon: FileText,
      title: 'Rapport mensuel direction',
      description: 'Synthèse 5-6 pages avec graphes et tableaux — pour la direction NGE',
      action: () => {},
      available: false,
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Rapports" description="Génération de documents et exports" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${r.available ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{r.title}</p>
                <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                <div className="mt-3">
                  {r.available ? (
                    <Button size="sm" variant="primary" icon={<FileDown size={12} />} onClick={r.action}>Générer PDF</Button>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Bientôt disponible</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
