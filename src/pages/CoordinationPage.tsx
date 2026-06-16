import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OUVRAGES } from '../data/tasks';
import { useOuvrageStore } from '../store/useOuvrageStore';
import type { Contrainte, Etude } from '../store/useOuvrageStore';
import { Card, SectionHeader, Badge, Button, showToast } from '../components/ui/index';
import {
  Users, FileText, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight,
  Building2,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'contraintes' | 'etudes';

export function CoordinationPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('contraintes');
  const { contraintes, etudes, concessionnaires, typesEtude, updateContrainte, updateEtude } = useOuvrageStore();

  const today = new Date();

  // ── Group contraintes by concessionnaire ──────────────────────────────
  const contraintesByConc = useMemo(() => {
    const groups = new Map<string, Contrainte[]>();
    contraintes.forEach((c) => {
      if (!groups.has(c.typeReseau)) groups.set(c.typeReseau, []);
      groups.get(c.typeReseau)!.push(c);
    });
    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        label: concessionnaires.find((cc) => cc.value === key)?.label ?? key,
        items: items.sort((a, b) => {
          const order = ['identifiee', 'en_cours_levee', 'levee'];
          return order.indexOf(a.status) - order.indexOf(b.status);
        }),
        identifiees: items.filter((c) => c.status === 'identifiee').length,
        enCours: items.filter((c) => c.status === 'en_cours_levee').length,
        levees: items.filter((c) => c.status === 'levee').length,
      }))
      .sort((a, b) => (b.identifiees + b.enCours) - (a.identifiees + a.enCours));
  }, [contraintes, concessionnaires]);

  // ── Group études by type ──────────────────────────────────────────────
  const etudesByType = useMemo(() => {
    const groups = new Map<string, Etude[]>();
    etudes.forEach((e) => {
      if (!groups.has(e.type)) groups.set(e.type, []);
      groups.get(e.type)!.push(e);
    });
    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        label: typesEtude.find((t) => t.value === key)?.label ?? key,
        items: items.sort((a, b) => {
          const order = ['non_demarre', 'en_cours', 'soumis', 'en_revision', 'valide'];
          return order.indexOf(a.status) - order.indexOf(b.status);
        }),
        nonValides: items.filter((e) => e.status !== 'valide').length,
        valides: items.filter((e) => e.status === 'valide').length,
        soumis: items.filter((e) => e.status === 'soumis').length,
      }))
      .sort((a, b) => b.nonValides - a.nonValides);
  }, [etudes, typesEtude]);

  // Stats summary
  const totalContraintes = contraintes.length;
  const openContraintes = contraintes.filter((c) => c.status !== 'levee').length;
  const totalEtudes = etudes.length;
  const openEtudes = etudes.filter((e) => e.status !== 'valide').length;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Coordination"
        description="Vue transversale par concessionnaire et par type d'étude"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryStat label="Contraintes" value={`${openContraintes}/${totalContraintes}`} sub="ouvertes" color="#f59e0b" />
        <SummaryStat label="Concessionnaires" value={contraintesByConc.length} sub="impliqués" color="#3b82f6" />
        <SummaryStat label="Études" value={`${openEtudes}/${totalEtudes}`} sub="non validées" color="#8b5cf6" />
        <SummaryStat label="Types d'études" value={etudesByType.length} sub="suivis" color="#10b981" />
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <TabBtn active={tab === 'contraintes'} onClick={() => setTab('contraintes')} icon={<Users size={13} />} label={`Contraintes (${openContraintes})`} />
        <TabBtn active={tab === 'etudes'} onClick={() => setTab('etudes')} icon={<FileText size={13} />} label={`Études (${openEtudes})`} />
      </div>

      {/* Content */}
      {tab === 'contraintes' && (
        contraintesByConc.length === 0 ? (
          <Card className="text-center py-12">
            <Users size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Aucune contrainte enregistrée</p>
            <p className="text-xs text-gray-400 mt-1">Ajoutez des contraintes depuis les ouvrages</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {contraintesByConc.map((g) => (
              <ConcessionnaireGroup
                key={g.key}
                group={g}
                today={today}
                onAdvance={(id) => { updateContrainte(id, { status: 'en_cours_levee' }); showToast('Contrainte avancée'); }}
                onResolve={(id) => { updateContrainte(id, { status: 'levee', dateLevee: today.toISOString().split('T')[0] }); showToast('Contrainte levée'); }}
                navigate={navigate}
              />
            ))}
          </div>
        )
      )}

      {tab === 'etudes' && (
        etudesByType.length === 0 ? (
          <Card className="text-center py-12">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Aucune étude enregistrée</p>
            <p className="text-xs text-gray-400 mt-1">Ajoutez des études depuis les ouvrages</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {etudesByType.map((g) => (
              <TypeEtudeGroup
                key={g.key}
                group={g}
                today={today}
                onValidate={(id) => { updateEtude(id, { status: 'valide', dateValidation: today.toISOString().split('T')[0] }); showToast('Étude validée'); }}
                navigate={navigate}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SummaryStat({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-black tabular-nums mt-1" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </Card>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
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

function ConcessionnaireGroup({ group, today, onAdvance, onResolve, navigate }: {
  group: { key: string; label: string; items: Contrainte[]; identifiees: number; enCours: number; levees: number };
  today: Date;
  onAdvance: (id: string) => void;
  onResolve: (id: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [open, setOpen] = useState(group.identifiees + group.enCours > 0);

  return (
    <Card padding={false}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          <Building2 size={16} className="text-blue-500" />
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">{group.label}</p>
            <p className="text-xs text-gray-400">{group.items.length} contrainte(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {group.identifiees > 0 && <Badge variant="red">{group.identifiees} identifiées</Badge>}
          {group.enCours > 0 && <Badge variant="amber">{group.enCours} en cours</Badge>}
          {group.levees > 0 && <Badge variant="green">{group.levees} levées</Badge>}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {group.items.map((c) => {
            const ouv = OUVRAGES.find((o) => o.id === c.ouvrageId);
            const daysOld = c.dateIdentification ? differenceInDays(today, parseISO(c.dateIdentification)) : 0;
            return (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                <StatusIcon status={c.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    {ouv && (
                      <button onClick={() => navigate(`/ouvrage/${ouv.id}`)} className="flex items-center gap-1 hover:text-blue-600">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ouv.color }} />
                        {ouv.nom.split(' - ')[0]}
                      </button>
                    )}
                    {c.pkLocalisation && <span>{c.pkLocalisation}</span>}
                    {c.dateIdentification && <span>{daysOld}j depuis identification</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {c.status === 'identifiee' && (
                    <Button size="sm" variant="secondary" onClick={() => onAdvance(c.id)}>Avancer</Button>
                  )}
                  {c.status === 'en_cours_levee' && (
                    <Button size="sm" variant="secondary" onClick={() => onResolve(c.id)}>Lever</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TypeEtudeGroup({ group, today, onValidate, navigate }: {
  group: { key: string; label: string; items: Etude[]; nonValides: number; valides: number; soumis: number };
  today: Date;
  onValidate: (id: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [open, setOpen] = useState(group.nonValides > 0);

  return (
    <Card padding={false}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          <FileText size={16} className="text-purple-500" />
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">{group.label}</p>
            <p className="text-xs text-gray-400">{group.items.length} document(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {group.soumis > 0 && <Badge variant="purple">{group.soumis} soumis</Badge>}
          {group.nonValides > 0 && <Badge variant="amber">{group.nonValides} en cours</Badge>}
          {group.valides > 0 && <Badge variant="green">{group.valides} validés</Badge>}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {group.items.map((e) => {
            const ouv = OUVRAGES.find((o) => o.id === e.ouvrageId);
            const daysSoumis = e.dateSoumission ? differenceInDays(today, parseISO(e.dateSoumission)) : null;
            const late = e.status === 'soumis' && daysSoumis !== null && daysSoumis > 7;
            return (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                <StatusEtude status={e.status} late={late} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.nom} <span className="text-xs text-gray-400 font-mono">Ind. {e.version}</span></p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    {ouv && (
                      <button onClick={() => navigate(`/ouvrage/${ouv.id}`)} className="flex items-center gap-1 hover:text-blue-600">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ouv.color }} />
                        {ouv.nom.split(' - ')[0]}
                      </button>
                    )}
                    {e.responsable && <span>{e.responsable}</span>}
                    {e.dateSoumission && <span>Soumis {format(parseISO(e.dateSoumission), 'dd/MM', { locale: fr })} {daysSoumis !== null && `(${daysSoumis}j)`}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {(e.status === 'soumis' || e.status === 'en_revision') && (
                    <Button size="sm" variant="secondary" onClick={() => onValidate(e.id)}>Valider</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function StatusIcon({ status }: { status: Contrainte['status'] }) {
  if (status === 'levee') return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === 'en_cours_levee') return <Clock size={14} className="text-amber-500" />;
  return <AlertTriangle size={14} className="text-red-500" />;
}

function StatusEtude({ status, late }: { status: Etude['status']; late?: boolean }) {
  if (status === 'valide') return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === 'soumis') return <Clock size={14} className={late ? 'text-red-500' : 'text-purple-500'} />;
  if (status === 'en_revision') return <Clock size={14} className="text-amber-500" />;
  return <FileText size={14} className="text-gray-400" />;
}
