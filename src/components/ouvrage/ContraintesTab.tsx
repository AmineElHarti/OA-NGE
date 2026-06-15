import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import type { Contrainte, ContrainteStatus, TypeReseau } from '../../store/useOuvrageStore';
import { Plus, X, Edit2, Check, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<TypeReseau, string> = {
  OCP: 'OCP (Phosphate)',
  ONEE_ELEC: 'ONEE Électricité',
  ONEE_EAU: 'ONEE Eau potable',
  IAM: 'Maroc Telecom / IAM',
  ONCF: 'ONCF (Ferroviaire)',
  AUTOROUTE: 'Autoroute',
  ROUTE: 'Route / Piste',
  ASSAINISSEMENT: 'Assainissement',
  HYDRAULIQUE: 'Réseau hydraulique',
  AUTRE: 'Autre',
};
const STATUS_CONFIG: Record<ContrainteStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  identifiee: { label: 'Identifiée', color: 'text-red-700', bg: 'bg-red-100', icon: <AlertTriangle size={13} /> },
  en_cours_levee: { label: 'En cours de levée', color: 'text-amber-700', bg: 'bg-amber-100', icon: <Clock size={13} /> },
  levee: { label: 'Levée', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <CheckCircle size={13} /> },
};

const EMPTY_FORM: Omit<Contrainte, 'id' | 'ouvrageId' | 'createdAt'> = {
  typeReseau: 'ONEE_ELEC',
  description: '',
  pkLocalisation: '',
  status: 'identifiee',
  dateIdentification: '',
  dateLevee: '',
  responsable: '',
  notes: '',
};

interface Props { ouvrageId: number }

export function ContraintesTab({ ouvrageId }: Props) {
  const { contraintes, addContrainte, updateContrainte, deleteContrainte } = useOuvrageStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const items = contraintes.filter((c) => c.ouvrageId === ouvrageId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const stats = { total: items.length, identifiee: items.filter((c) => c.status === 'identifiee').length, en_cours: items.filter((c) => c.status === 'en_cours_levee').length, levee: items.filter((c) => c.status === 'levee').length };

  const saveForm = () => {
    if (!form.description.trim()) return;
    if (editingId) {
      updateContrainte(editingId, form);
      setEditingId(null);
    } else {
      addContrainte({ ...form, ouvrageId });
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const startEdit = (c: Contrainte) => {
    setForm({ typeReseau: c.typeReseau, description: c.description, pkLocalisation: c.pkLocalisation ?? '', status: c.status, dateIdentification: c.dateIdentification ?? '', dateLevee: c.dateLevee ?? '', responsable: c.responsable ?? '', notes: c.notes ?? '' });
    setEditingId(c.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Identifiées', value: stats.identifiee, color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'En cours', value: stats.en_cours, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Levées', value: stats.levee, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      {!showForm && (
        <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-800 transition-colors">
          <Plus size={15} /> Ajouter une contrainte réseau
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-blue-300 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-800">{editingId ? 'Modifier la contrainte' : 'Nouvelle contrainte réseau'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type de réseau *</label>
              <select value={form.typeReseau} onChange={(e) => setForm({ ...form, typeReseau: e.target.value as TypeReseau })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Localisation PK</label>
              <input value={form.pkLocalisation} onChange={(e) => setForm({ ...form, pkLocalisation: e.target.value })}
                placeholder="ex: PK 78+200"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              placeholder="Description de la contrainte..."
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Statut</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContrainteStatus })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="identifiee">Identifiée</option>
                <option value="en_cours_levee">En cours de levée</option>
                <option value="levee">Levée</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date identification</label>
              <input type="date" value={form.dateIdentification} onChange={(e) => setForm({ ...form, dateIdentification: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date levée</label>
              <input type="date" value={form.dateLevee} onChange={(e) => setForm({ ...form, dateLevee: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Responsable</label>
              <input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                placeholder="Responsable de la levée..."
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observations..."
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 text-sm text-gray-600 border rounded-xl hover:bg-gray-50">Annuler</button>
            <button onClick={saveForm} className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 flex items-center gap-1.5"><Check size={14} /> Enregistrer</button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune contrainte réseau enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const sc = STATUS_CONFIG[c.status];
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{TYPE_LABELS[c.typeReseau]}</span>
                      {c.pkLocalisation && <span className="text-xs text-gray-500 font-mono">{c.pkLocalisation}</span>}
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.icon}{sc.label}</span>
                    </div>
                    <p className="text-sm text-gray-800">{c.description}</p>
                    {c.notes && <p className="text-xs text-gray-500 mt-1">{c.notes}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {c.dateIdentification && <span>Identifiée le {format(parseISO(c.dateIdentification), 'dd/MM/yyyy', { locale: fr })}</span>}
                      {c.dateLevee && <span>Levée le {format(parseISO(c.dateLevee), 'dd/MM/yyyy', { locale: fr })}</span>}
                      {c.responsable && <span>Resp. : <strong className="text-gray-600">{c.responsable}</strong></span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {c.status !== 'levee' && (
                      <button onClick={() => updateContrainte(c.id, { status: c.status === 'identifiee' ? 'en_cours_levee' : 'levee', dateLevee: c.status === 'en_cours_levee' ? new Date().toISOString().split('T')[0] : c.dateLevee })}
                        className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-lg font-medium">
                        {c.status === 'identifiee' ? 'Prendre en charge' : 'Marquer levée'}
                      </button>
                    )}
                    <button onClick={() => startEdit(c)} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={13} /></button>
                    <button onClick={() => deleteContrainte(c.id)} className="text-gray-400 hover:text-red-500 p-1"><X size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
