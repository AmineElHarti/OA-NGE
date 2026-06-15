import { useNavigate } from 'react-router-dom';
import type { Task } from '../data/tasks';
import { getTaskStatus } from '../data/tasks';
import type { ProgressEntry } from '../store/useStore';
import { useOuvrageProgress, useGlobalProgress, isLeaf, getDescendants } from '../hooks/useOuvrageProgress';
import { useOuvrageStore } from '../store/useOuvrageStore';
import { computeAlerts } from '../lib/scurve';
import { SCurveChart } from '../components/charts/SCurveChart';
import { Card, Stat, Badge, ProgressBar, SectionHeader } from '../components/ui/index';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle,
  Building2, ArrowRight, Kanban, MessageSquare, ClipboardList, PauseCircle,
} from 'lucide-react';

interface Props { tasks: Task[]; history: ProgressEntry[] }

function findOuvrageId(task: Task, tasks: Task[], ouvrages: ReturnType<typeof useOuvrageProgress>): number | undefined {
  let cur: Task | undefined = task;
  while (cur) {
    if (ouvrages.find((o) => o.id === cur!.id)) return cur.id;
    cur = tasks.find((t) => t.id === cur!.parentId);
  }
  return undefined;
}

export function DashboardPage({ tasks, history }: Props) {
  const navigate = useNavigate();
  const ouvrages = useOuvrageProgress(tasks);
  const { progress, theoretical, gap } = useGlobalProgress(tasks);
  const alerts = computeAlerts(tasks);
  const { contraintes, notes, todos } = useOuvrageStore();

  const allLeaves = tasks.filter((t) => isLeaf(t.id, tasks));
  const done = allLeaves.filter((t) => t.progress === 100).length;
  const completed = ouvrages.filter((o) => o.progress === 100).length;
  const inProgress = ouvrages.filter((o) => o.progress > 0 && o.progress < 100).length;
  const criticalAlerts = alerts.filter((a) => a.gap >= 40).length;

  // Task-based activity (replaces old kanban cards)
  const activeTasks = allLeaves.filter((t) => getTaskStatus(t) === 'en_cours');
  const blockedTasks = allLeaves.filter((t) => t.blocked);
  const critiqueTasks = allLeaves.filter((t) => t.priority === 'critique' && t.progress < 100);
  const openContraintes = contraintes.filter((c) => c.status !== 'levee').length;
  const pendingTodos = todos.filter((t) => !t.done).length;
  const recentNotes = notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const PCOLOR: Record<string, string> = { faible: 'bg-gray-300', moyen: 'bg-blue-400', eleve: 'bg-amber-400', critique: 'bg-red-500' };

  return (
    <div className="space-y-7">
      {/* Global progress hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide">Avancement global du marché</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-6xl font-black">{progress}%</span>
              <div className={`flex items-center gap-1 text-sm font-semibold ${gap >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {gap >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {gap >= 0 ? '+' : ''}{gap}% vs planning
              </div>
            </div>
            <p className="text-blue-300 text-xs mt-1">Planifié à ce jour : {theoretical}%</p>
          </div>
          <div className="text-right text-sm text-blue-200 space-y-1">
            <p>Début : <span className="text-white font-semibold">04/05/2026</span></p>
            <p>Fin : <span className="text-white font-semibold">04/05/2027</span></p>
            <p>Durée : <span className="text-white font-semibold">305 jours</span></p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs text-blue-300 mb-1"><span>Réalisé</span><span>{progress}%</span></div>
          <div className="bg-blue-800/60 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-blue-300 mb-1"><span>Prévu</span><span>{theoretical}%</span></div>
          <div className="bg-blue-800/60 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 rounded-full bg-blue-300 transition-all duration-700" style={{ width: `${theoretical}%` }} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Ouvrages terminés" value={`${completed}/${ouvrages.length}`} sub={`${inProgress} en cours`} icon={<CheckCircle2 size={20} />} accent="#10b981" />
        <Stat label="Tâches complètes" value={`${done}/${allLeaves.length}`} sub={`${Math.round(done / allLeaves.length * 100)}% des tâches`} icon={<Building2 size={20} />} accent="#6366f1" />
        <Stat label="Alertes retards" value={criticalAlerts} sub={`${alerts.length} retards au total`} icon={<AlertTriangle size={20} />} accent={criticalAlerts > 0 ? '#ef4444' : '#10b981'} />
        <Stat label="Avance / Retard" value={`${gap >= 0 ? '+' : ''}${gap}%`} sub="vs planning théorique" icon={gap >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />} accent={gap >= 0 ? '#10b981' : '#ef4444'} />
      </div>

      {/* Activity summary */}
      <div className="grid grid-cols-3 gap-4">
        {/* Active tasks + blocked */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Kanban size={15} className="text-blue-600" />
              <span className="text-sm font-bold text-gray-800">Tâches actives</span>
            </div>
            <div className="flex gap-1.5">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{activeTasks.length} en cours</span>
              {blockedTasks.length > 0 && <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{blockedTasks.length} bloquées</span>}
            </div>
          </div>
          {critiqueTasks.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Priorité critique</p>
              {critiqueTasks.slice(0, 4).map((t) => {
                const oId = findOuvrageId(t, tasks, ouvrages);
                const ouv = ouvrages.find((o) => o.id === oId);
                return (
                  <div key={t.id} onClick={() => oId && navigate(`/ouvrage/${oId}`)} className="flex items-center gap-2 cursor-pointer group">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate group-hover:text-blue-600 flex-1">{t.nom}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: ouv?.color }}>{t.progress}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeTasks.slice(0, 5).map((t) => {
                const oId = findOuvrageId(t, tasks, ouvrages);
                const ouv = ouvrages.find((o) => o.id === oId);
                return (
                  <div key={t.id} onClick={() => oId && navigate(`/ouvrage/${oId}`)} className="flex items-center gap-2 cursor-pointer group">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PCOLOR[t.priority ?? 'moyen']}`} />
                    <span className="text-xs text-gray-700 truncate group-hover:text-blue-600 flex-1">{t.nom}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: ouv?.color }}>{t.progress}%</span>
                  </div>
                );
              })}
              {activeTasks.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Aucune tâche en cours</p>}
            </div>
          )}
          {blockedTasks.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-amber-600 flex items-center gap-1"><PauseCircle size={11} /> En attente</p>
              {blockedTasks.slice(0, 3).map((t) => {
                const oId = findOuvrageId(t, tasks, ouvrages);
                return (
                  <div key={t.id} onClick={() => oId && navigate(`/ouvrage/${oId}`)} className="flex items-center gap-2 cursor-pointer group">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate group-hover:text-blue-600">{t.nom}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Contraintes */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <span className="text-sm font-bold text-gray-800">Contraintes</span>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{openContraintes} ouvertes</span>
          </div>
          <div className="space-y-1.5">
            {contraintes.filter((c) => c.status !== 'levee').slice(0, 5).map((c) => {
              const ouv = ouvrages.find((o) => o.id === c.ouvrageId);
              const STATUS_COLOR: Record<string, string> = { identifiee: 'bg-red-500', en_cours_levee: 'bg-amber-400' };
              return (
                <div key={c.id} onClick={() => navigate(`/ouvrage/${c.ouvrageId}`)} className="flex items-center gap-2 cursor-pointer group">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLOR[c.status] ?? 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-700 truncate group-hover:text-blue-600 flex-1">{c.typeReseau} — {c.description}</span>
                  {ouv && <span className="text-xs text-gray-400 shrink-0">{ouv.shortName}</span>}
                </div>
              );
            })}
            {openContraintes === 0 && <p className="text-xs text-gray-400 text-center py-2">Aucune contrainte ouverte</p>}
            {openContraintes > 5 && <p className="text-xs text-gray-400">+{openContraintes - 5} autres</p>}
          </div>
        </Card>

        {/* À faire + Notes */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-purple-500" />
                <span className="text-sm font-bold text-gray-800">À faire</span>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{pendingTodos} en attente</span>
            </div>
            <div className="space-y-1.5">
              {todos.filter((t) => !t.done).slice(0, 4).map((t) => {
                const ouv = ouvrages.find((o) => o.id === t.ouvrageId);
                return (
                  <div key={t.id} onClick={() => navigate(`/ouvrage/${t.ouvrageId}`)} className="flex items-center gap-2 cursor-pointer group">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PCOLOR[t.priority]}`} />
                    <span className="text-xs text-gray-700 truncate group-hover:text-blue-600 flex-1">{t.titre}</span>
                    {ouv && <span className="text-xs text-gray-400 shrink-0">{ouv.shortName}</span>}
                  </div>
                );
              })}
              {pendingTodos === 0 && <p className="text-xs text-gray-400 text-center py-1">Tout est à jour</p>}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-gray-500" />
              <span className="text-sm font-bold text-gray-800">Notes récentes</span>
            </div>
            <div className="space-y-2">
              {recentNotes.map((n) => {
                const ouv = ouvrages.find((o) => o.id === n.ouvrageId);
                return (
                  <div key={n.id} onClick={() => navigate(`/ouvrage/${n.ouvrageId}`)} className="cursor-pointer group">
                    <p className="text-xs text-gray-700 line-clamp-1 group-hover:text-blue-600">{n.contenu}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ouv?.shortName} · {format(parseISO(n.createdAt), 'dd/MM HH:mm', { locale: fr })}
                    </p>
                  </div>
                );
              })}
              {recentNotes.length === 0 && <p className="text-xs text-gray-400 text-center py-1">Aucune note</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* S-Curve */}
      <Card>
        <SectionHeader title="Courbe S — Avancement cumulé" description="Progression planifiée vs réalisée semaine par semaine" />
        <SCurveChart tasks={tasks} history={history} />
      </Card>

      {/* Ouvrages grid */}
      <div>
        <SectionHeader title="Avancement par ouvrage" description={`${ouvrages.length} ouvrages · ${completed} terminés · ${inProgress} en cours`} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ouvrages.map((o) => {
            const oAlerts = alerts.filter((a) => {
              let cur: Task | undefined = a.task;
              while (cur) { if (cur.id === o.id) return true; cur = tasks.find((t) => t.id === cur!.parentId); }
              return false;
            });
            const oDesc = getDescendants(tasks, o.id);
            const oLeaves = oDesc.filter((t) => isLeaf(t.id, oDesc));
            const oActive = oLeaves.filter((t) => getTaskStatus(t) === 'en_cours').length;
            const oBlocked = oLeaves.filter((t) => t.blocked).length;
            const oContraintes = contraintes.filter((c) => c.ouvrageId === o.id && c.status !== 'levee').length;
            const oTodos = todos.filter((t) => t.ouvrageId === o.id && !t.done).length;
            return (
              <OuvrageCard
                key={o.id}
                ouvrage={o}
                alertCount={oAlerts.length}
                criticalCount={oAlerts.filter((a) => a.gap >= 40).length}
                activeTasks={oActive}
                blockedTasks={oBlocked}
                openContraintes={oContraintes}
                pendingTodos={oTodos}
                onClick={() => navigate(`/ouvrage/${o.id}`)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OuvrageCard({ ouvrage, alertCount, criticalCount, activeTasks, blockedTasks, openContraintes, pendingTodos, onClick }: {
  ouvrage: ReturnType<typeof useOuvrageProgress>[0];
  alertCount: number; criticalCount: number;
  activeTasks: number; blockedTasks: number; openContraintes: number; pendingTodos: number;
  onClick: () => void;
}) {
  const { nom, color, progress, theoretical, gap } = ouvrage;
  const [pk, ...rest] = nom.split(' - ');
  const status = progress === 100 ? 'done' : progress > 0 ? 'active' : 'pending';

  return (
    <div onClick={onClick} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color }} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-500">{pk}</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{rest.join(' - ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {criticalCount > 0 && <Badge variant="red">{criticalCount}</Badge>}
          {alertCount > 0 && criticalCount === 0 && <Badge variant="amber">{alertCount}</Badge>}
          {status === 'done' && <Badge variant="green"><CheckCircle2 size={10} /> OK</Badge>}
          {status === 'pending' && <Badge variant="gray"><Clock size={10} /> En attente</Badge>}
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-0.5">
          <span>Réalisé</span>
          <span className="font-bold" style={{ color }}>{progress}%</span>
        </div>
        <ProgressBar value={progress} color={color} height="h-2" />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Prévu</span>
          <span>{theoretical}%</span>
        </div>
        <ProgressBar value={theoretical} color="#e2e8f0" height="h-1" />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {gap >= 0 ? <TrendingUp size={11} className="inline mr-0.5" /> : <TrendingDown size={11} className="inline mr-0.5" />}
          {gap >= 0 ? '+' : ''}{gap}% vs planning
        </span>
        <div className="flex items-center gap-2">
          {activeTasks > 0 && <span className="text-xs text-blue-500 flex items-center gap-0.5"><Kanban size={10} />{activeTasks}</span>}
          {blockedTasks > 0 && <span className="text-xs text-amber-500 flex items-center gap-0.5"><PauseCircle size={10} />{blockedTasks}</span>}
          {openContraintes > 0 && <span className="text-xs text-amber-500 flex items-center gap-0.5"><AlertTriangle size={10} />{openContraintes}</span>}
          {pendingTodos > 0 && <span className="text-xs text-gray-400 flex items-center gap-0.5"><ClipboardList size={10} />{pendingTodos}</span>}
          <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}
