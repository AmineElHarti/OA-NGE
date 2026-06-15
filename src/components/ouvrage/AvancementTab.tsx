import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit2, Check, X, ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Task } from '../../data/tasks';
import type { ProgressEntry } from '../../store/useStore';
import { getDescendants, computeProgress, computeTheoreticalProgress } from '../../hooks/useOuvrageProgress';
import { SCurveChart } from '../charts/SCurveChart';
import { Card, ProgressBar, Button, Modal, Input, Select, showToast } from '../ui/index';

interface Props {
  ouvrageId: number;
  tasks: Task[];
  history: ProgressEntry[];
  color: string;
  onUpdate: (id: number, progress: number, notes?: string) => void;
  onUpdateTask: (id: number, updates: Partial<Omit<Task, 'id'>>) => void;
  onAddTask: (task: Omit<Task, 'id' | 'progress' | 'updatedAt'>) => number;
  onDeleteTask: (id: number) => void;
}

interface EditState {
  id: number;
  nom: string;
  debut: string;
  fin: string;
  duree: number;
  progress: number;
  notes: string;
}

const EMPTY_ADD = { nom: '', debut: '', fin: '', duree: 1, parentId: 0, level: 3 };

export function AvancementTab({ ouvrageId, tasks, history, color, onUpdate, onUpdateTask, onAddTask, onDeleteTask }: Props) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([ouvrageId]));
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const ouvrTasks = getDescendants(tasks, ouvrageId);
  const progress = computeProgress(ouvrTasks);
  const theoretical = computeTheoreticalProgress(ouvrTasks);
  const gap = progress - theoretical;
  const ouvrHistory = history.filter((h) => ouvrTasks.some((t) => t.id === h.task_id));

  function toggle(id: number) {
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function hasChildren(id: number) { return ouvrTasks.some((t) => t.parentId === id); }

  function isExpanded(t: Task): boolean {
    if (t.id === ouvrageId) return true;
    const par = ouvrTasks.find((x) => x.id === t.parentId);
    if (!par) return true;
    return expanded.has(par.id) && isExpanded(par);
  }
  function isVisible(t: Task): boolean {
    if (t.id === ouvrageId) return false;
    return isExpanded(t);
  }

  function startEdit(t: Task) {
    setEditing({ id: t.id, nom: t.nom, debut: t.debut, fin: t.fin, duree: t.duree, progress: t.progress, notes: t.notes ?? '' });
  }
  function saveEdit() {
    if (!editing) return;
    onUpdateTask(editing.id, { nom: editing.nom, debut: editing.debut, fin: editing.fin, duree: editing.duree });
    onUpdate(editing.id, editing.progress, editing.notes);
    setEditing(null);
    showToast('Tâche mise à jour');
  }

  // Parent options for add form
  const parentOptions = ouvrTasks
    .filter((t) => t.id === ouvrageId || t.level < 4)
    .map((t) => ({ value: String(t.id), label: `${'— '.repeat(Math.max(0, t.level - 1))}${t.nom}` }));

  function openAdd(parentId?: number) {
    const parent = ouvrTasks.find((t) => t.id === (parentId ?? ouvrageId));
    const today = new Date().toISOString().split('T')[0];
    setAddForm({
      nom: '',
      debut: parent?.debut ?? today,
      fin: parent?.fin ?? today,
      duree: 1,
      parentId: parentId ?? ouvrageId,
      level: (parent?.level ?? 1) + 1,
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
      parentId: addForm.parentId,
      level: addForm.level,
    });
    setShowAdd(false);
    setAddForm(EMPTY_ADD);
    setExpanded((p) => new Set([...p, addForm.parentId]));
    showToast('Tâche ajoutée');
  }

  function handleDelete(id: number) {
    onDeleteTask(id);
    setConfirmDelete(null);
    showToast('Tâche supprimée', 'info');
  }

  return (
    <div className="space-y-5">
      {/* Add task modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter une tâche">
        <div className="space-y-4">
          <Input label="Nom de la tâche *" value={addForm.nom} onChange={(e) => setAddForm({ ...addForm, nom: e.target.value })} placeholder="Ex: Ferraillage semelle S1" />
          <Select label="Tâche parente" value={String(addForm.parentId)} onChange={(e) => {
            const pid = Number(e.target.value);
            const parent = ouvrTasks.find((t) => t.id === pid);
            setAddForm({ ...addForm, parentId: pid, level: (parent?.level ?? 1) + 1 });
          }} options={parentOptions} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Début" type="date" value={addForm.debut} onChange={(e) => setAddForm({ ...addForm, debut: e.target.value })} />
            <Input label="Fin" type="date" value={addForm.fin} onChange={(e) => setAddForm({ ...addForm, fin: e.target.value })} />
            <Input label="Durée (jours)" type="number" value={String(addForm.duree)} onChange={(e) => setAddForm({ ...addForm, duree: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button variant="primary" onClick={saveAdd} disabled={!addForm.nom.trim()}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Supprimer la tâche ?">
        {confirmDelete !== null && (() => {
          const t = ouvrTasks.find((x) => x.id === confirmDelete);
          const childCount = ouvrTasks.filter((x) => x.parentId === confirmDelete).length;
          return (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Supprimer <span className="font-semibold">"{t?.nom}"</span> ?
                {childCount > 0 && <span className="text-red-600"> Attention : {childCount} sous-tâche(s) seront aussi supprimées.</span>}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Annuler</Button>
                <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>Supprimer</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Réalisé</p>
          <p className="text-4xl font-black" style={{ color }}>{progress}%</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Prévu à ce jour</p>
          <p className="text-4xl font-black text-gray-300">{theoretical}%</p>
        </Card>
        <Card className={`text-center ${gap >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border`}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Écart</p>
          <p className={`text-4xl font-black ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{gap >= 0 ? '+' : ''}{gap}%</p>
        </Card>
      </div>

      {/* Progress bars */}
      <Card>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-gray-700">Avancement réalisé</span>
              <span style={{ color }}>{progress}%</span>
            </div>
            <ProgressBar value={progress} color={color} height="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Prévu théorique</span>
              <span className="text-gray-400">{theoretical}%</span>
            </div>
            <ProgressBar value={theoretical} color="#e2e8f0" height="h-1.5" />
          </div>
        </div>
      </Card>

      {/* S-curve */}
      <Card>
        <p className="text-sm font-bold text-gray-800 mb-4">Courbe S — Prévu vs Réalisé</p>
        <SCurveChart tasks={ouvrTasks} history={ouvrHistory} height={220} />
      </Card>

      {/* Task list with CRUD */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">Tâches de l'ouvrage</p>
            <p className="text-xs text-gray-400 mt-0.5">{ouvrTasks.length - 1} tâches · Cliquer sur le crayon pour modifier</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => openAdd()}>Ajouter</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-2.5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tâche</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap w-20">Durée</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap w-28">Début</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap w-28">Fin</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-44">Avancement</th>
                <th className="py-2.5 px-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ouvrTasks.filter(isVisible).map((t) => {
                const isEdit = editing?.id === t.id;
                const indent = Math.max(0, t.level - 2) * 14;
                return (
                  <tr key={t.id} className={`group hover:bg-slate-50/60 transition-colors ${t.level === 2 ? 'bg-slate-50/30' : ''}`}>
                    {/* Nom */}
                    <td className="py-2 px-5">
                      <div className="flex items-center gap-1.5" style={{ paddingLeft: indent }}>
                        {hasChildren(t.id)
                          ? <button onClick={() => toggle(t.id)} className="text-gray-300 hover:text-gray-600 w-4 flex-shrink-0">
                              {expanded.has(t.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          : <span className="w-4 flex-shrink-0" />}
                        {isEdit ? (
                          <input value={editing.nom} onChange={(e) => setEditing({ ...editing, nom: e.target.value })}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium" />
                        ) : (
                          <span className={`truncate ${t.level === 2 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{t.nom}</span>
                        )}
                      </div>
                    </td>
                    {/* Durée */}
                    <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">
                      {isEdit ? (
                        <input type="number" min={1} value={editing.duree} onChange={(e) => {
                            const days = Math.max(1, Number(e.target.value));
                            const newFin = new Date(new Date(editing.debut).getTime() + days * 86400000).toISOString().split('T')[0];
                            setEditing({ ...editing, duree: days, fin: newFin });
                          }}
                          className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" />
                      ) : (
                        <>{t.duree}j</>
                      )}
                    </td>
                    {/* Début */}
                    <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">
                      {isEdit ? (
                        <input type="date" value={editing.debut} onChange={(e) => {
                            const newDebut = e.target.value;
                            const newFin = new Date(new Date(newDebut).getTime() + editing.duree * 86400000).toISOString().split('T')[0];
                            setEditing({ ...editing, debut: newDebut, fin: newFin });
                          }}
                          className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none" />
                      ) : (
                        <span className="font-mono">{format(parseISO(t.debut), 'dd/MM/yy', { locale: fr })}</span>
                      )}
                    </td>
                    {/* Fin */}
                    <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">
                      {isEdit ? (
                        <input type="date" value={editing.fin} onChange={(e) => setEditing({ ...editing, fin: e.target.value })}
                          className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none" />
                      ) : (
                        <span className="font-mono">{format(parseISO(t.fin), 'dd/MM/yy', { locale: fr })}</span>
                      )}
                    </td>
                    {/* Avancement */}
                    <td className="py-2 px-3">
                      {isEdit ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input type="range" min={0} max={100} step={1} value={editing.progress}
                              onChange={(e) => setEditing({ ...editing, progress: +e.target.value })}
                              className="flex-1 accent-blue-600 h-1.5" />
                            <span className="text-xs font-black w-8 text-right tabular-nums" style={{ color }}>{editing.progress}%</span>
                          </div>
                          <input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                            placeholder="Observations..."
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                      ) : (
                        <ProgressBar value={t.progress} color={color} height="h-1.5" showLabel />
                      )}
                    </td>
                    {/* Actions */}
                    <td className="py-2 px-3">
                      {isEdit ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit}
                            className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg p-1 transition-colors"><Check size={12} /></button>
                          <button onClick={() => setEditing(null)}
                            className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg p-1 transition-colors"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 hover:!opacity-100" style={{ opacity: undefined }}>
                          <button onClick={() => openAdd(t.id)} title="Ajouter sous-tâche"
                            className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg p-1 transition-colors"><Plus size={12} /></button>
                          <button onClick={() => startEdit(t)} title="Modifier"
                            className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg p-1 transition-colors"><Edit2 size={12} /></button>
                          <button onClick={() => setConfirmDelete(t.id)} title="Supprimer"
                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg p-1 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
