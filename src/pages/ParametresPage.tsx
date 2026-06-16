import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { Card, SectionHeader, Button, Input, showToast } from '../components/ui/index';
import { User, Database, AlertTriangle, RotateCcw } from 'lucide-react';

export function ParametresPage() {
  const { userName, setUserName, resetAll } = useStore();
  const { concessionnaires, naturesContrainte, typesEtude } = useOuvrageStore();
  const [name, setName] = useState(userName);
  const [confirmReset, setConfirmReset] = useState(false);

  function saveName() {
    setUserName(name);
    showToast('Nom enregistré');
  }

  async function doReset() {
    await resetAll();
    setConfirmReset(false);
    showToast('Données réinitialisées', 'info');
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader title="Paramètres" description="Configuration de l'application" />

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <User size={16} className="text-blue-600" />
          <p className="text-sm font-bold text-gray-800">Utilisateur</p>
        </div>
        <div className="flex items-end gap-2">
          <Input label="Votre nom" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Amine EL HARTI" />
          <Button variant="primary" onClick={saveName} disabled={!name.trim() || name === userName}>Enregistrer</Button>
        </div>
        <p className="text-xs text-gray-400">Apparaît dans l'historique des mises à jour et les rapports PDF</p>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-blue-600" />
          <p className="text-sm font-bold text-gray-800">Listes personnalisables</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Concessionnaires</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{concessionnaires.length}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Natures de contrainte</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{naturesContrainte.length}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Types d'études</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{typesEtude.length}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Modifiables directement depuis les onglets Contraintes et Études d'un ouvrage (bouton "Paramètres" / "Types")
        </p>
      </Card>

      <Card className="space-y-4 border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600" />
          <p className="text-sm font-bold text-red-700">Zone dangereuse</p>
        </div>
        {!confirmReset ? (
          <div>
            <p className="text-xs text-gray-500 mb-3">
              Réinitialise toutes les tâches, l'historique et les contraintes. Action irréversible.
            </p>
            <Button variant="danger" size="sm" icon={<RotateCcw size={12} />} onClick={() => setConfirmReset(true)}>
              Réinitialiser toutes les données
            </Button>
          </div>
        ) : (
          <div className="bg-red-50 rounded-xl p-3 space-y-3">
            <p className="text-sm font-semibold text-red-700">Êtes-vous sûr ? Cette action est définitive.</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Annuler</Button>
              <Button variant="danger" size="sm" onClick={doReset}>Oui, tout réinitialiser</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
