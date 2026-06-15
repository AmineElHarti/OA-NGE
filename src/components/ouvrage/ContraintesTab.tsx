import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import type { Contrainte, ContrainteStatus, ContrainteOption } from '../../store/useOuvrageStore';
import { AlertTriangle, CheckCircle, Clock, Plus, Settings, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, Badge, Modal, Input, Textarea, Select, Card, SectionHeader, EmptyState, showToast } from '../ui/index';

const STATUS_CONFIG: Record<ContrainteStatus, { label: string; variant: 'red' | 'amber' | 'green'; icon: React.ReactNode }> = {
  identifiee: { label: 'Identifiée', variant: 'red', icon: <AlertTriangle size={11} /> },
  en_cours_levee: { label: 'En cours de levée', variant: 'amber', icon: <Clock size={11} /> },
  levee: { label: 'Levée', variant: 'green', icon: <CheckCircle size={11} /> },
};

const EMPTY: Omit<Contrainte, 'id' | 'ouvrageId' | 'createdAt'> = {
  typeReseau: '', nature: '', description: '', pkLocalisation: '', status: 'identifiee',
  dateIdentification: '', dateLevee: '', responsable: '', notes: '',
};

interface Props { ouvrageId: number }

function ListEditor({ title, items, onSave }: { title: string; items: ContrainteOption[]; onSave: (items: ContrainteOption[]) => void }) {
  const [list, setList] = useState(items);
  const [newLabel, setNewLabel] = useState('');

  function add() {
    if (!newLabel.trim()) return;
    const value = newLabel.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    setList([...list, { value, label: newLabel.trim() }]);
    setNewLabel('');
  }

  function remove(idx: number) {
    setList(list.filter((_, i) => i !== idx));
  }

  function save() {
    onSave(list);
    showToast(`${title} mis à jour`);
  }

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
        <Button size="sm" variant="secondary" onClick={add} disabled={!newLabel.trim()}>
          <Plus size={12} />
        </Button>
      </div>
      <Button size="sm" variant="primary" onClick={save}>Enregistrer</Button>
    </div>
  );
}

export function ContraintesTab({ ouvrageId }: Props) {
  const { contraintes, concessionnaires, naturesContrainte, addContrainte, updateContrainte, deleteContrainte, setConcessionnaires, setNaturesContrainte } = useOuvrageStore();
  const [modal, setModal] = useState<'add' | 'edit' | 'settings' | null>(null);
  const [selected, setSelected] = useState<Contrainte | null>(null);
  const [form, setForm] = useState(EMPTY);

  const typeOptions = concessionnaires.map((c) => ({ value: c.value, label: c.label }));
  const natureOptions = naturesContrainte.map((n) => ({ value: n.value, label: n.label }));

  const items = contraintes.filter((c) => c.ouvrageId === ouvrageId).sort((a, b) => {
    const order = ['identifiee', 'en_cours_levee', 'levee'];
    return order.indexOf(a.status) - order.indexOf(b.status) || b.createdAt.localeCompare(a.createdAt);
  });

  const stats = {
    identifiee: items.filter((c) => c.status === 'identifiee').length,
    en_cours: items.filter((c) => c.status === 'en_cours_levee').length,
    levee: items.filter((c) => c.status === 'levee').length,
  };

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function openAdd() {
    setForm({ ...EMPTY, typeReseau: concessionnaires[0]?.value ?? '', nature: naturesContrainte[0]?.value ?? '' });
    setModal('add');
  }
  function openEdit(c: Contrainte) {
    setSelected(c);
    setForm({ typeReseau: c.typeReseau, nature: c.nature ?? '', description: c.description, pkLocalisation: c.pkLocalisation ?? '', status: c.status, dateIdentification: c.dateIdentification ?? '', dateLevee: c.dateLevee ?? '', responsable: c.responsable ?? '', notes: c.notes ?? '' });
    setModal('edit');
  }

  function save() {
    if (!form.description.trim()) return;
    if (modal === 'add') { addContrainte({ ...form, ouvrageId }); showToast('Contrainte ajoutée'); }
    else if (modal === 'edit' && selected) { updateContrainte(selected.id, form); showToast('Contrainte mise à jour'); }
    setModal(null);
  }

  function quickUpdate(c: Contrainte) {
    if (c.status === 'identifiee') { updateContrainte(c.id, { status: 'en_cours_levee' }); showToast('Contrainte prise en charge'); }
    else if (c.status === 'en_cours_levee') { updateContrainte(c.id, { status: 'levee', dateLevee: new Date().toISOString().split('T')[0] }); showToast('Contrainte levée'); }
  }

  const FormBody = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Concessionnaire *" value={form.typeReseau} onChange={(e) => f('typeReseau', e.target.value)} options={typeOptions} />
        <Select label="Nature" value={form.nature ?? ''} onChange={(e) => f('nature', e.target.value)} options={[{ value: '', label: '—' }, ...natureOptions]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Localisation PK" value={form.pkLocalisation ?? ''} onChange={(e) => f('pkLocalisation', e.target.value)} placeholder="ex: PK 78+200" />
        <Input label="Responsable levée" value={form.responsable ?? ''} onChange={(e) => f('responsable', e.target.value)} placeholder="Nom / organisme..." />
      </div>
      <Textarea label="Description *" value={form.description} onChange={(e) => f('description', e.target.value)} rows={2} placeholder="Détails de la contrainte..." />
      <div className="grid grid-cols-3 gap-3">
        <Select label="Statut" value={form.status} onChange={(e) => f('status', e.target.value as ContrainteStatus)}
          options={[{ value: 'identifiee', label: 'Identifiée' }, { value: 'en_cours_levee', label: 'En cours de levée' }, { value: 'levee', label: 'Levée' }]} />
        <Input label="Date identification" type="date" value={form.dateIdentification ?? ''} onChange={(e) => f('dateIdentification', e.target.value)} />
        <Input label="Date levée" type="date" value={form.dateLevee ?? ''} onChange={(e) => f('dateLevee', e.target.value)} />
      </div>
      <Input label="Observations" value={form.notes ?? ''} onChange={(e) => f('notes', e.target.value)} placeholder="Notes complémentaires..." />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
        <Button variant="primary" onClick={save} disabled={!form.description.trim()}>Enregistrer</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Nouvelle contrainte">{FormBody}</Modal>
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Modifier la contrainte">
        <div className="space-y-4">
          {FormBody}
          {selected && (
            <div className="border-t pt-3">
              <Button variant="danger" size="sm" onClick={() => { deleteContrainte(selected.id); setModal(null); showToast('Contrainte supprimée', 'info'); }}>Supprimer</Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Settings modal */}
      <Modal open={modal === 'settings'} onClose={() => setModal(null)} title="Paramètres des contraintes" width="max-w-xl">
        <div className="space-y-6">
          <ListEditor title="Concessionnaires" items={concessionnaires} onSave={(list) => setConcessionnaires(list)} />
          <hr className="border-gray-100" />
          <ListEditor title="Natures de contrainte" items={naturesContrainte} onSave={(list) => setNaturesContrainte(list)} />
        </div>
      </Modal>

      <SectionHeader
        title="Contraintes réseaux"
        description="Suivi des réseaux identifiés et de leur levée"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Settings size={13} />} onClick={() => setModal('settings')}>Paramètres</Button>
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openAdd}>Ajouter</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Identifiées', count: stats.identifiee, variant: 'red' as const },
          { label: 'En cours de levée', count: stats.en_cours, variant: 'amber' as const },
          { label: 'Levées', count: stats.levee, variant: 'green' as const },
        ].map((s) => (
          <Card key={s.label} className="text-center py-3">
            <p className="text-3xl font-black text-gray-900">{s.count}</p>
            <Badge variant={s.variant} className="mt-1.5">{s.label}</Badge>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={40} />} title="Aucune contrainte" description="Ajoutez les contraintes réseaux identifiées" action={<Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openAdd}>Ajouter</Button>} />
      ) : (
        <div className="space-y-2.5">
          {items.map((c) => {
            const sc = STATUS_CONFIG[c.status];
            const typeLabel = concessionnaires.find((t) => t.value === c.typeReseau)?.label ?? c.typeReseau;
            const natureLabel = naturesContrainte.find((n) => n.value === c.nature)?.label;
            return (
              <Card key={c.id} className="!p-4" onClick={() => openEdit(c)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant="blue">{typeLabel}</Badge>
                      {natureLabel && <Badge variant="gray">{natureLabel}</Badge>}
                      {c.pkLocalisation && <span className="text-xs font-mono text-gray-400">{c.pkLocalisation}</span>}
                      <Badge variant={sc.variant}>{sc.icon} {sc.label}</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{c.description}</p>
                    {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                      {c.dateIdentification && <span>Identifiée le {format(parseISO(c.dateIdentification), 'dd/MM/yyyy', { locale: fr })}</span>}
                      {c.dateLevee && <span>Levée le {format(parseISO(c.dateLevee), 'dd/MM/yyyy', { locale: fr })}</span>}
                      {c.responsable && <span>Resp. : <span className="font-semibold text-gray-600">{c.responsable}</span></span>}
                    </div>
                  </div>
                  {c.status !== 'levee' && (
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); quickUpdate(c); }}>
                      {c.status === 'identifiee' ? 'Prendre en charge' : '✓ Marquer levée'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
