import { useState, useMemo } from 'react';
import type { Task, Priority, KanbanStatus } from '../../data/tasks';
import { getTaskStatus } from '../../data/tasks';
import { Plus, Calendar, User, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, Badge, Modal, Input, Select, ProgressBar, showToast } from '../ui/index';
import { getDescendants, isLeaf } from '../../hooks/useOuvrageProgress';
import {
  DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  ouvrageId: number;
  tasks: Task[];
  color: string;
  onUpdateTask: (id: number, updates: Partial<Omit<Task, 'id'>>) => void;
  onUpdateProgress: (id: number, progress: number, notes?: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'progress' | 'updatedAt'>) => number;
  onDeleteTask: (id: number) => void;
}

const COLUMNS: { id: KanbanStatus; label: string; variant: 'gray' | 'blue' | 'amber' | 'green' }[] = [
  { id: 'planifie', label: 'Planifié', variant: 'gray' },
  { id: 'en_cours', label: 'En cours', variant: 'blue' },
  { id: 'en_attente', label: 'En attente', variant: 'amber' },
  { id: 'termine', label: 'Terminé', variant: 'green' },
];

const COL_STYLE: Record<KanbanStatus, string> = {
  planifie: 'bg-gray-50 border-gray-200',
  en_cours: 'bg-blue-50/50 border-blue-200',
  en_attente: 'bg-amber-50/50 border-amber-200',
  termine: 'bg-emerald-50/50 border-emerald-200',
};

const PRIORITY_MAP: Record<Priority, { variant: 'gray' | 'blue' | 'amber' | 'red'; label: string }> = {
  faible: { variant: 'gray', label: 'Faible' },
  moyen: { variant: 'blue', label: 'Moyen' },
  eleve: { variant: 'amber', label: 'Élevé' },
  critique: { variant: 'red', label: 'Critique' },
};

function TaskCard({ task, color, onClick }: { task: Task; color: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });
  const status = getTaskStatus(task);
  const overdue = isPast(parseISO(task.fin)) && status !== 'termine';
  const p = PRIORITY_MAP[task.priority ?? 'moyen'];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes} {...listeners}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing"
    >
      <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">{task.nom}</p>
      {/* Mini progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1"><ProgressBar value={task.progress} color={color} height="h-1" /></div>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{task.progress}%</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={p.variant} dot>{p.label}</Badge>
        <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
          {overdue && <AlertCircle size={10} />}
          <Calendar size={10} />
          {format(parseISO(task.fin), 'dd/MM', { locale: fr })}
        </span>
        {task.assignedTo && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <User size={10} />{task.assignedTo}
          </span>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
      {children}
    </div>
  );
}

export function KanbanBoard({ ouvrageId, tasks, color, onUpdateTask, onUpdateProgress, onAddTask, onDeleteTask }: Props) {
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ nom: '', debut: '', fin: '', duree: 1, priority: 'moyen' as Priority, assignedTo: '' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const [editForm, setEditForm] = useState({ nom: '', debut: '', fin: '', duree: 1, priority: 'moyen' as Priority, assignedTo: '', progress: 0, notes: '', blocked: false });

  const allOuvrTasks = getDescendants(tasks, ouvrageId);
  const leafTasks = useMemo(() =>
    allOuvrTasks.filter((t) => isLeaf(t.id, allOuvrTasks)).sort((a, b) => {
      const pOrder = ['critique', 'eleve', 'moyen', 'faible'];
      return pOrder.indexOf(a.priority ?? 'moyen') - pOrder.indexOf(b.priority ?? 'moyen');
    }),
    [allOuvrTasks]
  );

  const activeTask = leafTasks.find((t) => String(t.id) === activeId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = Number(active.id);
    const task = leafTasks.find((t) => t.id === taskId);
    if (!task) return;

    const targetCol = COLUMNS.find((c) => c.id === over.id)?.id
      ?? (() => { const overTask = leafTasks.find((t) => String(t.id) === over.id); return overTask ? getTaskStatus(overTask) : null; })();

    if (!targetCol) return;
    const currentStatus = getTaskStatus(task);
    if (targetCol === currentStatus) return;

    switch (targetCol) {
      case 'planifie':
        onUpdateProgress(taskId, 0);
        onUpdateTask(taskId, { blocked: false });
        break;
      case 'en_cours':
        onUpdateTask(taskId, { blocked: false });
        if (task.progress === 0) onUpdateProgress(taskId, 5);
        break;
      case 'en_attente':
        onUpdateTask(taskId, { blocked: true });
        break;
      case 'termine':
        onUpdateProgress(taskId, 100);
        onUpdateTask(taskId, { blocked: false });
        break;
    }
  }

  function openEdit(t: Task) {
    setEditTask(t);
    setEditForm({
      nom: t.nom,
      debut: t.debut,
      fin: t.fin,
      duree: t.duree,
      priority: t.priority ?? 'moyen',
      assignedTo: t.assignedTo ?? '',
      progress: t.progress,
      notes: t.notes ?? '',
      blocked: t.blocked ?? false,
    });
  }

  function saveEdit() {
    if (!editTask) return;
    onUpdateTask(editTask.id, {
      nom: editForm.nom,
      debut: editForm.debut,
      fin: editForm.fin,
      duree: editForm.duree,
      priority: editForm.priority,
      assignedTo: editForm.assignedTo || undefined,
      blocked: editForm.blocked,
    });
    onUpdateProgress(editTask.id, editForm.progress, editForm.notes);
    setEditTask(null);
    showToast('Tâche mise à jour');
  }

  function openAdd() {
    const today = new Date().toISOString().split('T')[0];
    const parent = allOuvrTasks.find((t) => t.id === ouvrageId);
    setAddForm({
      nom: '',
      debut: parent?.debut ?? today,
      fin: parent?.fin ?? today,
      duree: 1,
      priority: 'moyen',
      assignedTo: '',
    });
    setShowAdd(true);
  }

  function saveAdd() {
    if (!addForm.nom.trim()) return;
    onAddTask({
      nom: addForm.nom,
      debut: addForm.debut,
      fin: addForm.fin,
      duree: addForm.duree,
      parentId: ouvrageId,
      level: (allOuvrTasks.find((t) => t.id === ouvrageId)?.level ?? 1) + 1,
      priority: addForm.priority,
      assignedTo: addForm.assignedTo || undefined,
    });
    setShowAdd(false);
    showToast('Tâche ajoutée');
  }

  return (
    <div>
      {/* Add task modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle tâche">
        <div className="space-y-4">
          <Input label="Nom *" value={addForm.nom} onChange={(e) => setAddForm({ ...addForm, nom: e.target.value })} placeholder="Ex: Ferraillage semelle S1" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Début" type="date" value={addForm.debut} onChange={(e) => {
              const d = e.target.value;
              const f = new Date(new Date(d).getTime() + addForm.duree * 86400000).toISOString().split('T')[0];
              setAddForm({ ...addForm, debut: d, fin: f });
            }} />
            <Input label="Fin" type="date" value={addForm.fin} onChange={(e) => {
              const newFin = e.target.value;
              const days = Math.max(1, Math.round((new Date(newFin).getTime() - new Date(addForm.debut).getTime()) / 86400000));
              setAddForm({ ...addForm, fin: newFin, duree: days });
            }} />
            <Input label="Durée (j)" type="number" value={String(addForm.duree)} onChange={(e) => {
              const days = Math.max(1, Number(e.target.value));
              const f = new Date(new Date(addForm.debut).getTime() + days * 86400000).toISOString().split('T')[0];
              setAddForm({ ...addForm, duree: days, fin: f });
            }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priorité" value={addForm.priority} onChange={(e) => setAddForm({ ...addForm, priority: e.target.value as Priority })}
              options={[{ value: 'faible', label: 'Faible' }, { value: 'moyen', label: 'Moyen' }, { value: 'eleve', label: 'Élevé' }, { value: 'critique', label: 'Critique' }]} />
            <Input label="Assigné à" value={addForm.assignedTo} onChange={(e) => setAddForm({ ...addForm, assignedTo: e.target.value })} placeholder="Nom..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button variant="primary" onClick={saveAdd} disabled={!addForm.nom.trim()}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Edit task modal */}
      <Modal open={editTask !== null} onClose={() => setEditTask(null)} title={editTask ? `Modifier — ${editTask.nom}` : ''}>
        {editTask && (
          <div className="space-y-4">
            <Input label="Nom" value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Début" type="date" value={editForm.debut} onChange={(e) => {
                const newDebut = e.target.value;
                const days = editForm.duree;
                const newFin = new Date(new Date(newDebut).getTime() + days * 86400000).toISOString().split('T')[0];
                setEditForm({ ...editForm, debut: newDebut, fin: newFin });
              }} />
              <Input label="Fin" type="date" value={editForm.fin} onChange={(e) => {
                const newFin = e.target.value;
                const days = Math.max(1, Math.round((new Date(newFin).getTime() - new Date(editForm.debut).getTime()) / 86400000));
                setEditForm({ ...editForm, fin: newFin, duree: days });
              }} />
              <Input label="Durée (j)" type="number" value={String(editForm.duree)} onChange={(e) => {
                const days = Math.max(1, Number(e.target.value));
                const newFin = new Date(new Date(editForm.debut).getTime() + days * 86400000).toISOString().split('T')[0];
                setEditForm({ ...editForm, duree: days, fin: newFin });
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Priorité" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Priority })}
                options={[{ value: 'faible', label: 'Faible' }, { value: 'moyen', label: 'Moyen' }, { value: 'eleve', label: 'Élevé' }, { value: 'critique', label: 'Critique' }]} />
              <Input label="Assigné à" value={editForm.assignedTo} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })} placeholder="Nom..." />
            </div>
            {/* Progress */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Avancement</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} step={1} value={editForm.progress}
                  onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })}
                  className="flex-1 accent-blue-600 h-2" />
                <input type="number" min={0} max={100} value={editForm.progress}
                  onChange={(e) => setEditForm({ ...editForm, progress: Math.min(100, Math.max(0, Number(e.target.value))) })}
                  className="w-16 text-lg font-black text-right tabular-nums border border-gray-200 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  style={{ color }} />
                <span className="text-sm text-gray-400">%</span>
              </div>
              <div className="flex gap-1 mt-1.5">
                {[0, 25, 50, 75, 100].map((p) => (
                  <button key={p} onClick={() => setEditForm({ ...editForm, progress: p })}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${editForm.progress === p ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{p}%</button>
                ))}
              </div>
            </div>
            {/* Blocked toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.blocked} onChange={(e) => setEditForm({ ...editForm, blocked: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
              <span className="text-sm text-gray-700">En attente / bloquée</span>
              {editForm.blocked && <Badge variant="amber">Bloquée</Badge>}
            </label>
            <Input label="Observations" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notes terrain..." />
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="danger" size="sm" onClick={() => { setEditTask(null); setConfirmDelete(editTask.id); }}>Supprimer</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditTask(null)}>Annuler</Button>
                <Button variant="primary" onClick={saveEdit}>Enregistrer</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Supprimer la tâche ?">
        {confirmDelete !== null && (() => {
          const t = leafTasks.find((x) => x.id === confirmDelete);
          return (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">Supprimer <span className="font-semibold">"{t?.nom}"</span> ?</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Annuler</Button>
                <Button variant="danger" onClick={() => { onDeleteTask(confirmDelete); setConfirmDelete(null); showToast('Tâche supprimée', 'info'); }}>Supprimer</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4 min-h-[500px]">
          {COLUMNS.map((col) => {
            const colTasks = leafTasks.filter((t) => getTaskStatus(t) === col.id);
            return (
              <div key={col.id} className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={col.variant}>{col.label}</Badge>
                    <span className="text-xs text-gray-400 font-semibold">{colTasks.length}</span>
                  </div>
                  {col.id === 'planifie' && (
                    <button onClick={openAdd} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-1 transition-colors"><Plus size={14} /></button>
                  )}
                </div>
                <DroppableColumn id={col.id} className={`flex-1 rounded-2xl border-2 border-dashed p-2 space-y-2 transition-colors ${COL_STYLE[col.id]}`}>
                  <SortableContext items={colTasks.map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
                    {colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} color={color} onClick={() => openEdit(task)} />
                    ))}
                  </SortableContext>
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-300">Vide</div>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="bg-white rounded-xl border-2 border-blue-400 p-3.5 shadow-2xl rotate-1 w-56 opacity-95">
              <p className="text-sm font-semibold text-gray-800">{activeTask.nom}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1"><ProgressBar value={activeTask.progress} color={color} height="h-1" /></div>
                <span className="text-xs font-bold" style={{ color }}>{activeTask.progress}%</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
