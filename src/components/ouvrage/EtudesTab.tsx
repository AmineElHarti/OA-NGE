import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import type { Etude, EtudeStatus, ContrainteOption } from '../../store/useOuvrageStore';
import { Plus, Settings, Trash2, FileText, CheckCircle, Clock, Send, RotateCcw, Circle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, Badge, Modal, Input, Textarea, Select, Card, SectionHeader, EmptyState, showToast } from '../ui/index';

const STATUS_CONFIG: Record<EtudeStatus, { label: string; variant: 'gray' | 'blue' | 'amber' | 'purple' | 'green'; icon: React.ReactNode }> = {
  non_demarre: { label: 'Non démarré', variant: 'gray', icon: <Circle size={11} /> },
  en_cours: { label: 'En cours', variant: 'blue', icon: <Clock size={11} /> },
  soumis: { label: 'Soumis', variant: 'purple', icon: <Send size={11} /> },
  en_revision: { label: 'En révision', variant: 'amber', icon: <RotateCcw size={11} /> },
  valide: { label: 'Validé', variant: 'green', icon: <CheckCircle size={11} /> },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));

const EMPTY: Omit<Etude, 'id' | 'ouvrageId' | 'createdAt'> = {
  type: '', nom: '', status: 'non_demarre', version: 'A',
  dateSoumission: '', dateValidation: '', responsable: '', observations: '',
};

function ListEditor({ title, items, onSave }: { title: string; items: ContrainteOption[]; onSave: (items: ContrainteOption[]) => void }) {
  const [list, setList] = useState(items);
  const [newLabel, setNewLabel] = useState('');

  function add() {
    if (!newLabel.trim()) return;
    const value = newLabel.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    setList([...list, { value, label: newLabel.trim() }]);
    setNewLabel('');
  }

  function remove(idx: number) { setList(list.filter((_, i) => i !== idx)); }

  function save() { onSave(list); showToast(`${title} mis à jour`); }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-600">{title}</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {list.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
            <span className="text-sm text-gray-700 flex-1">{item.label}</span>
            <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Nouveau..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
        <Button size="sm" variant="secondary" onClick={add} disabled={!newLabel.trim()}><Plus size={12} /></Button>
      </div>
      <Button size="sm" variant="primary" onClick={save}>Enregistrer</Button>
    </div>
  );
}

interface Props { ouvrageId: number }

export function EtudesTab({ ouvrageId }: Props) {
  const { etudes, typesEtude, addEtude, updateEtude, deleteEtude, setTypesEtude } = useOuvrageStore();
  const [modal, setModal] = useState<'add' | 'edit' | 'settings' | null>(null);
  const [selected, setSelected] = useState<Etude | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState<EtudeStatus | 'all'>('all');

  const typeOptions = typesEtude.map((t) => ({ value: t.value, label: t.label }));

  const items = etudes.filter((e) => e.ouvrageId === ouvrageId).sort((a, b) => {
    const order: EtudeStatus[] = ['non_demarre', 'en_cours', 'soumis', 'en_revision', 'valide'];
    return order.indexOf(a.status) - order.indexOf(b.status) || a.type.localeCompare(b.type);
  });

  const filtered = filter === 'all' ? items : items.filter((e) => e.status === filter);

  const stats = {
    total: items.length,
    valide: items.filter((e) => e.status === 'valide').length,
    en_cours: items.filter((e) => e.status === 'en_cours' || e.status === 'soumis' || e.status === 'en_revision').length,
    non_demarre: items.filter((e) => e.status === 'non_demarre').length,
  };

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function openAdd() {
    setForm({ ...EMPTY, type: typesEtude[0]?.value ?? '' });
    setModal('add');
  }

  function openEdit(e: Etude) {
    setSelected(e);
    setForm({
      type: e.type, nom: e.nom, status: e.status, version: e.version,
      dateSoumission: e.dateSoumission ?? '', dateValidation: e.dateValidation ?? '',
      responsable: e.responsable ?? '', observations: e.observations ?? '',
    });
    setModal('edit');
  }

  function save() {
    if (!form.nom.trim()) return;
    if (modal === 'add') { addEtude({ ...form, ouvrageId }); showToast('Étude ajoutée'); }
    else if (modal === 'edit' && selected) { updateEtude(selected.id, form); showToast('Étude mise à jour'); }
    setModal(null);
  }

  function advanceStatus(e: Etude) {
    const flow: EtudeStatus[] = ['non_demarre', 'en_cours', 'soumis', 'valide'];
    const idx = flow.indexOf(e.status);
    if (idx < flow.length - 1) {
      const next = flow[idx + 1];
      const updates: Partial<Etude> = { status: next };
      if (next === 'soumis') updates.dateSoumission = new Date().toISOString().split('T')[0];
      if (next === 'valide') updates.dateValidation = new Date().toISOString().split('T')[0];
      updateEtude(e.id, updates);
      showToast(`Statut → ${STATUS_CONFIG[next].label}`);
    }
  }

  const progressPct = stats.total > 0 ? Math.round((stats.valide / stats.total) * 100) : 0;

  const FormBody = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Type d'étude *" value={form.type} onChange={(e) => f('type', e.target.value)} options={typeOptions} />
        <Input label="Version" value={form.version} onChange={(e) => f('version', e.target.value)} placeholder="A, B, C..." />
      </div>
      <Input label="Nom / Référence *" value={form.nom} onChange={(e) => f('nom', e.target.value)} placeholder="Ex: Plan coffrage pile P3 — Ind. B" />
      <div className="grid grid-cols-3 gap-3">
        <Select label="Statut" value={form.status} onChange={(e) => f('status', e.target.value as EtudeStatus)} options={STATUS_OPTIONS} />
        <Input label="Date soumission" type="date" value={form.dateSoumission ?? ''} onChange={(e) => f('dateSoumission', e.target.value)} />
        <Input label="Date validation" type="date" value={form.dateValidation ?? ''} onChange={(e) => f('dateValidation', e.target.value)} />
      </div>
      <Input label="Responsable" value={form.responsable ?? ''} onChange={(e) => f('responsable', e.target.value)} placeholder="BET / Ingénieur..." />
      <Textarea label="Observations" value={form.observations ?? ''} onChange={(e) => f('observations', e.target.value)} rows={2} placeholder="Remarques, réserves..." />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
        <Button variant="primary" onClick={save} disabled={!form.nom.trim()}>Enregistrer</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Nouvelle étude / document">{FormBody}</Modal>
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Modifier l'étude">
        <div className="space-y-4">
          {FormBody}
          {selected && (
            <div className="border-t pt-3">
              <Button variant="danger" size="sm" onClick={() => { deleteEtude(selected.id); setModal(null); showToast('Étude supprimée', 'info'); }}>Supprimer</Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={modal === 'settings'} onClose={() => setModal(null)} title="Types d'études">
        <ListEditor title="Types d'études / documents" items={typesEtude} onSave={(list) => setTypesEtude(list)} />
      </Modal>

      <SectionHeader
        title="Études & Documents"
        description={`${stats.valide}/${stats.total} validés · ${progressPct}% complété`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Settings size={13} />} onClick={() => setModal('settings')}>Types</Button>
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openAdd}>Ajouter</Button>
          </div>
        }
      />

      {/* Progress summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="text-center py-3">
          <p className="text-3xl font-black text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">Total</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-3xl font-black text-emerald-600">{stats.valide}</p>
          <Badge variant="green" className="mt-1">Validés</Badge>
        </Card>
        <Card className="text-center py-3">
          <p className="text-3xl font-black text-blue-600">{stats.en_cours}</p>
          <Badge variant="blue" className="mt-1">En cours</Badge>
        </Card>
        <Card className="text-center py-3">
          <p className="text-3xl font-black text-gray-400">{stats.non_demarre}</p>
          <Badge variant="gray" className="mt-1">Non démarrés</Badge>
        </Card>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <Card className="!py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 w-24">Validation</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-sm font-black text-emerald-600 w-12 text-right">{progressPct}%</span>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {([['all', 'Tous', items.length], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label, items.filter((e) => e.status === k).length])] as [string, string, number][]).map(([value, label, count]) => (
          <button key={value} onClick={() => setFilter(value as EtudeStatus | 'all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === value ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label} ({count})
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title={filter === 'all' ? 'Aucune étude' : 'Aucune étude avec ce statut'}
          description="Ajoutez les études et documents à suivre"
          action={filter === 'all' ? <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openAdd}>Ajouter</Button> : undefined}
        />
      ) : (
        <Card padding={false}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nom / Référence</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">Ind.</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Statut</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Soumission</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Validation</th>
                <th className="py-2.5 px-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((e) => {
                const sc = STATUS_CONFIG[e.status];
                const typeLabel = typesEtude.find((t) => t.value === e.type)?.label?.split(' — ')[0] ?? e.type;
                return (
                  <tr key={e.id} className="hover:bg-slate-50 cursor-pointer transition-colors group" onClick={() => openEdit(e)}>
                    <td className="py-2.5 px-4">
                      <Badge variant="blue">{typeLabel}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.nom}</p>
                      {e.responsable && <p className="text-xs text-gray-400">{e.responsable}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{e.version}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant={sc.variant}>{sc.icon} {sc.label}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-400">
                      {e.dateSoumission ? format(parseISO(e.dateSoumission), 'dd/MM/yy', { locale: fr }) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-400">
                      {e.dateValidation ? format(parseISO(e.dateValidation), 'dd/MM/yy', { locale: fr }) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {e.status !== 'valide' && (
                        <Button size="sm" variant="secondary" onClick={(ev) => { ev.stopPropagation(); advanceStatus(e); }}>
                          {e.status === 'non_demarre' ? 'Démarrer' : e.status === 'en_cours' ? 'Soumettre' : e.status === 'soumis' ? 'Valider' : 'Valider'}
                        </Button>
                      )}
                      {e.status === 'valide' && <CheckCircle size={16} className="text-emerald-500 mx-auto" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
