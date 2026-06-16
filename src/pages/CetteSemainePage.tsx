import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { useStore } from '../store/useStore';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { isLeaf } from '../hooks/useOuvrageProgress';
import { computeAlerts } from '../lib/scurve';
import { Card, SectionHeader, Badge, Button, showToast } from '../components/ui/index';
import {
  startOfWeek, endOfWeek, addWeeks, parseISO, isWithinInterval, format,
  isPast, differenceInDays, isAfter, isBefore,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, AlertTriangle, Play, Flag, Check, Users, FileText, Calendar } from 'lucide-react';

interface Props { tasks: Task[] }

function ouvrageOf(task: Task, tasks: Task[]) {
  let cur: Task | undefined = task;
  while (cur) {
    const o = OUVRAGES.find((ow) => ow.id === cur!.id);
    if (o) return o;
    cur = tasks.find((t) => t.id === cur!.parentId);
  }
  return null;
}

export function CetteSemainePage({ tasks }: Props) {
  const navigate = useNavigate();
  const { updateProgress } = useStore();
  const { contraintes, etudes, updateContrainte, updateEtude } = useOuvrageStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [values, setValues] = useState<Record<number, number>>({});

  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const isCurrentWeek = weekOffset === 0;

  const allLeaves = useMemo(() => tasks.filter((t) => isLeaf(t.id, tasks)), [tasks]);
  const alerts = useMemo(() => computeAlerts(tasks), [tasks]);

  // ── Categorize tasks ──────────────────────────────────────────────────
  const enRetard = useMemo(() => allLeaves.filter((t) => {
    if (t.progress === 100) return false;
    return isPast(parseISO(t.fin)) && !isPast(addWeeks(parseISO(t.fin), 100));
  }), [allLeaves]);

  const demarrages = useMemo(() => allLeaves.filter((t) => {
    const start = parseISO(t.debut);
    return isWithinInterval(start, { start: weekStart, end: weekEnd });
  }), [allLeaves, weekStart, weekEnd]);

  const echeances = useMemo(() => allLeaves.filter((t) => {
    const end = parseISO(t.fin);
    return isWithinInterval(end, { start: weekStart, end: weekEnd }) && t.progress < 100;
  }), [allLeaves, weekStart, weekEnd]);

  const enCours = useMemo(() => allLeaves.filter((t) => {
    if (t.progress === 0 || t.progress === 100 || t.blocked) return false;
    const start = parseISO(t.debut);
    const end = parseISO(t.fin);
    return isBefore(start, weekEnd) && isAfter(end, weekStart);
  }), [allLeaves, weekStart, weekEnd]);

  // ── Coordination ──────────────────────────────────────────────────────
  const coordItems = useMemo(() => {
    const items: { kind: 'contrainte' | 'etude'; id: string; label: string; sub: string; ouvrageId: number; daysOld: number; severity: 'high' | 'med' | 'low' }[] = [];
    contraintes.filter((c) => c.status !== 'levee').forEach((c) => {
      const days = c.dateIdentification ? differenceInDays(today, parseISO(c.dateIdentification)) : 0;
      if (days > 7) {
        items.push({
          kind: 'contrainte',
          id: c.id,
          label: c.description.substring(0, 80),
          sub: `${c.status === 'identifiee' ? 'Identifiée' : 'En cours'} · ${days}j`,
          ouvrageId: c.ouvrageId,
          daysOld: days,
          severity: days > 30 ? 'high' : days > 14 ? 'med' : 'low',
        });
      }
    });
    etudes.filter((e) => e.status === 'soumis').forEach((e) => {
      const days = e.dateSoumission ? differenceInDays(today, parseISO(e.dateSoumission)) : 0;
      if (days > 5) {
        items.push({
          kind: 'etude',
          id: e.id,
          label: e.nom,
          sub: `Soumise depuis ${days}j sans validation`,
          ouvrageId: e.ouvrageId,
          daysOld: days,
          severity: days > 14 ? 'high' : days > 7 ? 'med' : 'low',
        });
      }
    });
    return items.sort((a, b) => b.daysOld - a.daysOld);
  }, [contraintes, etudes]);

  // ── Quick update ──────────────────────────────────────────────────────
  function setValue(id: number, v: number) { setValues((p) => ({ ...p, [id]: v })); }
  function getValue(t: Task) { return values[t.id] ?? t.progress; }
  function saveOne(t: Task) {
    if (values[t.id] !== undefined) {
      updateProgress(t.id, values[t.id]);
      setValues((p) => { const n = { ...p }; delete n[t.id]; return n; });
      showToast('Avancement enregistré');
    }
  }
  function saveAll() {
    const count = Object.keys(values).length;
    Object.entries(values).forEach(([id, v]) => updateProgress(Number(id), v));
    setValues({});
    showToast(`${count} tâche(s) mise(s) à jour`);
  }

  const hasChanges = Object.keys(values).length > 0;
  const allTasksThisWeek = [...new Set([...enCours, ...demarrages, ...echeances].map((t) => t.id))]
    .map((id) => allLeaves.find((t) => t.id === id))
    .filter((t): t is Task => !!t);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Cette semaine"
        description="Pilotage hebdomadaire — tâches actives, échéances et coordination"
      />

      {/* Week navigator */}
      <Card className="!py-3">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center flex-1">
            <p className="text-sm font-bold text-gray-800">
              {isCurrentWeek ? 'Semaine en cours' : weekOffset > 0 ? `Dans ${weekOffset} semaine(s)` : `Il y a ${Math.abs(weekOffset)} semaine(s)`}
            </p>
            <p className="text-xs text-gray-400">
              Du {format(weekStart, 'EEEE dd MMM', { locale: fr })} au {format(weekEnd, 'EEEE dd MMM yyyy', { locale: fr })}
            </p>
          </div>
          {!isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50">
              Cette semaine
            </button>
          )}
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={16} />
          </button>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniStat label="En retard" value={enRetard.length} color="#ef4444" />
        <MiniStat label="Démarrages" value={demarrages.length} color="#3b82f6" />
        <MiniStat label="En cours" value={enCours.length} color="#8b5cf6" />
        <MiniStat label="Échéances" value={echeances.length} color="#f59e0b" />
        <MiniStat label="Coordination" value={coordItems.length} color="#ec4899" />
      </div>

      {/* Save all sticky */}
      {hasChanges && (
        <div className="sticky top-16 z-20 bg-emerald-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <p className="text-sm font-semibold">{Object.keys(values).length} tâche(s) modifiée(s)</p>
          <Button variant="secondary" size="sm" icon={<Check size={12} />} onClick={saveAll}>Tout enregistrer</Button>
        </div>
      )}

      {/* ── 1. En retard ─────────────────────────────────────────────── */}
      {enRetard.length > 0 && (
        <Section
          title="En retard"
          icon={<AlertTriangle size={14} className="text-red-500" />}
          count={enRetard.length}
          variant="red"
          description="Tâches qui devaient être terminées et qui ne le sont pas"
        >
          <TaskList tasks={enRetard} tasksAll={tasks} alerts={alerts} getValue={getValue} setValue={setValue} saveOne={saveOne} navigate={navigate} />
        </Section>
      )}

      {/* ── 2. Coordination urgente ─────────────────────────────────── */}
      {coordItems.length > 0 && (
        <Section
          title="Coordination — actions en attente"
          icon={<Users size={14} className="text-amber-500" />}
          count={coordItems.length}
          variant="amber"
          description="Contraintes et études qui stagnent depuis plusieurs jours"
        >
          <div className="divide-y divide-gray-50">
            {coordItems.map((item) => {
              const ouv = OUVRAGES.find((o) => o.id === item.ouvrageId);
              return (
                <div key={`${item.kind}-${item.id}`} className="py-2.5 flex items-center gap-3">
                  <div className={`w-1 h-9 rounded-full flex-shrink-0 ${item.severity === 'high' ? 'bg-red-500' : item.severity === 'med' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                  {item.kind === 'contrainte' ? <Users size={14} className="text-amber-500" /> : <FileText size={14} className="text-blue-500" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                    <p className="text-xs text-gray-400">{ouv?.nom.split(' - ')[0]} · {item.sub}</p>
                  </div>
                  <div className="flex gap-2">
                    {item.kind === 'contrainte' && (
                      <Button size="sm" variant="secondary" onClick={() => { updateContrainte(item.id, { status: 'en_cours_levee' }); showToast('Contrainte prise en charge'); }}>
                        Avancer
                      </Button>
                    )}
                    {item.kind === 'etude' && (
                      <Button size="sm" variant="secondary" onClick={() => { updateEtude(item.id, { status: 'valide', dateValidation: today.toISOString().split('T')[0] }); showToast('Étude validée'); }}>
                        Valider
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/ouvrage/${item.ouvrageId}`)}>Ouvrir</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── 3. Échéances cette semaine ──────────────────────────────── */}
      {echeances.length > 0 && (
        <Section
          title="Échéances cette semaine"
          icon={<Flag size={14} className="text-amber-500" />}
          count={echeances.length}
          variant="amber"
          description="Tâches qui doivent se terminer cette semaine"
        >
          <TaskList tasks={echeances} tasksAll={tasks} alerts={alerts} getValue={getValue} setValue={setValue} saveOne={saveOne} navigate={navigate} />
        </Section>
      )}

      {/* ── 4. En cours ─────────────────────────────────────────────── */}
      {enCours.length > 0 && (
        <Section
          title="En cours — à mettre à jour"
          icon={<Play size={14} className="text-blue-500" />}
          count={enCours.length}
          variant="blue"
          description="Tâches actuellement en cours d'exécution"
        >
          <TaskList tasks={enCours} tasksAll={tasks} alerts={alerts} getValue={getValue} setValue={setValue} saveOne={saveOne} navigate={navigate} />
        </Section>
      )}

      {/* ── 5. Démarrages prévus ────────────────────────────────────── */}
      {demarrages.length > 0 && (
        <Section
          title="Démarrages prévus"
          icon={<Calendar size={14} className="text-gray-500" />}
          count={demarrages.length}
          variant="gray"
          description="Tâches qui démarrent cette semaine"
        >
          <TaskList tasks={demarrages} tasksAll={tasks} alerts={alerts} getValue={getValue} setValue={setValue} saveOne={saveOne} navigate={navigate} />
        </Section>
      )}

      {/* Empty state */}
      {allTasksThisWeek.length === 0 && coordItems.length === 0 && enRetard.length === 0 && (
        <Card className="text-center py-12">
          <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">Aucune activité cette semaine</p>
          <p className="text-xs text-gray-400 mt-1">Rien à mettre à jour, échéance ou démarrage prévu</p>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Section({ title, icon, count, variant, description, children }: { title: string; icon: React.ReactNode; count: number; variant: 'red' | 'amber' | 'blue' | 'gray'; description: string; children: React.ReactNode }) {
  return (
    <Card padding={false}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-bold text-gray-800">{title}</p>
          <Badge variant={variant}>{count}</Badge>
        </div>
        <p className="text-xs text-gray-400 hidden md:block">{description}</p>
      </div>
      <div className="px-5 py-2">{children}</div>
    </Card>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black tabular-nums mt-1" style={{ color: value > 0 ? color : '#94a3b8' }}>{value}</p>
    </div>
  );
}

function TaskList({ tasks, tasksAll, alerts, getValue, setValue, saveOne, navigate }: {
  tasks: Task[];
  tasksAll: Task[];
  alerts: ReturnType<typeof computeAlerts>;
  getValue: (t: Task) => number;
  setValue: (id: number, v: number) => void;
  saveOne: (t: Task) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const alertIds = new Set(alerts.map((a) => a.task.id));
  return (
    <div className="divide-y divide-gray-50">
      {tasks.slice(0, 20).map((t) => {
        const ouv = ouvrageOf(t, tasksAll);
        const v = getValue(t);
        const modified = v !== t.progress;
        const isAlerted = alertIds.has(t.id);
        return (
          <div key={t.id} className="py-2.5 flex items-center gap-3">
            <div className="flex-shrink-0 w-32 truncate">
              {ouv && (
                <button onClick={() => navigate(`/ouvrage/${ouv.id}`)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ouv.color }} />
                  <span className="truncate">{ouv.nom.split(' - ')[0]}</span>
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800 truncate">{t.nom}</p>
                {isAlerted && <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-400">
                {format(parseISO(t.debut), 'dd/MM', { locale: fr })} → {format(parseISO(t.fin), 'dd/MM', { locale: fr })} · {t.duree}j
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-56">
              <input
                type="range" min={0} max={100} step={1}
                value={v}
                onChange={(e) => setValue(t.id, Number(e.target.value))}
                className="flex-1 accent-blue-600 h-1.5 cursor-pointer"
              />
              <span className="text-sm font-bold w-10 text-right tabular-nums" style={{ color: ouv?.color ?? '#3b82f6' }}>{v}%</span>
            </div>
            <div className="w-10 flex-shrink-0">
              {modified && (
                <button onClick={() => saveOne(t)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors">
                  <Check size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {tasks.length > 20 && (
        <p className="text-xs text-gray-400 text-center py-3">+ {tasks.length - 20} autre(s) tâche(s)</p>
      )}
    </div>
  );
}
