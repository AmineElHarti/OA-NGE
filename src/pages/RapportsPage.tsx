import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { OUVRAGES } from '../data/tasks';
import { generateWeeklyReport, generateOuvrageReport, generateCoordinationReport, exportTasksCSV } from '../lib/pdfReport';
import { Card, SectionHeader, Button, Select, Modal, showToast } from '../components/ui/index';
import { FileDown, Calendar, Building2, Users, FileSpreadsheet } from 'lucide-react';

export function RapportsPage() {
  const { tasks, userName } = useStore();
  const { contraintes, etudes, concessionnaires, typesEtude, photos } = useOuvrageStore();
  const [showOuvragePicker, setShowOuvragePicker] = useState(false);
  const [pickedOuvrage, setPickedOuvrage] = useState<number>(OUVRAGES[0]?.id ?? 0);

  function gen(fn: () => void, msg: string) {
    try { fn(); showToast(msg); }
    catch (e) { showToast('Erreur lors de la génération', 'error'); console.error(e); }
  }

  const reports = [
    {
      id: 'hebdo',
      icon: Calendar,
      color: 'blue',
      title: 'Rapport hebdomadaire',
      description: 'Synthèse globale 2 pages avec KPI, écart par ouvrage, retards, contraintes et études — pour MOE / MOA',
      action: () => gen(() => generateWeeklyReport(tasks, contraintes, etudes, concessionnaires, userName), 'Rapport hebdomadaire généré'),
    },
    {
      id: 'ouvrage',
      icon: Building2,
      color: 'emerald',
      title: 'Fiche par ouvrage',
      description: 'Détail complet d\'un ouvrage 2 pages : avancement, tâches, études et contraintes — pour réunions techniques',
      action: () => setShowOuvragePicker(true),
    },
    {
      id: 'coordination',
      icon: Users,
      color: 'amber',
      title: 'État de coordination',
      description: 'Toutes les contraintes par concessionnaire et études par type — pour réunions externes',
      action: () => gen(() => generateCoordinationReport(contraintes, etudes, concessionnaires, typesEtude, userName), 'Rapport coordination généré'),
    },
    {
      id: 'csv',
      icon: FileSpreadsheet,
      color: 'gray',
      title: 'Export Excel des tâches',
      description: 'Toutes les tâches au format CSV (ouvrable dans Excel) — pour analyse libre',
      action: () => gen(() => exportTasksCSV(tasks), 'Export CSV téléchargé'),
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Rapports" description="Génération de documents PDF et exports tableurs" />

      {/* Ouvrage picker modal */}
      <Modal open={showOuvragePicker} onClose={() => setShowOuvragePicker(false)} title="Choisir l'ouvrage">
        <div className="space-y-4">
          <Select
            label="Ouvrage"
            value={String(pickedOuvrage)}
            onChange={(e) => setPickedOuvrage(Number(e.target.value))}
            options={OUVRAGES.map((o) => ({ value: String(o.id), label: o.nom }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowOuvragePicker(false)}>Annuler</Button>
            <Button variant="primary" icon={<FileDown size={12} />} onClick={() => {
              gen(() => generateOuvrageReport(tasks, pickedOuvrage, contraintes, etudes, userName, photos), 'Fiche ouvrage générée');
              setShowOuvragePicker(false);
            }}>
              Générer PDF
            </Button>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          const bgColors: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            amber: 'bg-amber-50 text-amber-600',
            gray: 'bg-gray-100 text-gray-600',
          };
          return (
            <Card key={r.id} className="flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColors[r.color]}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{r.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.description}</p>
                <div className="mt-3">
                  <Button size="sm" variant="primary" icon={<FileDown size={12} />} onClick={r.action}>
                    {r.id === 'csv' ? 'Télécharger CSV' : 'Générer PDF'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Note :</strong> les PDF sont générés côté navigateur (aucune donnée n'est envoyée à un serveur).
          Vous pouvez personnaliser votre nom dans <em>Paramètres</em> pour qu'il apparaisse dans la signature des rapports.
        </p>
      </Card>
    </div>
  );
}
