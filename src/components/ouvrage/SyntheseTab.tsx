import { useRef } from 'react';
import type { Task } from '../../data/tasks';
import type { ProgressEntry } from '../../store/useStore';
import type { PhotoCategorie } from '../../store/useOuvrageStore';
import { getDescendants, computeProgress, computeTheoreticalProgress, isLeaf } from '../../hooks/useOuvrageProgress';
import { computeAlerts } from '../../lib/scurve';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import { SCurveChart } from '../charts/SCurveChart';
import { Card, ProgressBar, Badge, Button, showToast } from '../ui/index';
import { TrendingUp, TrendingDown, AlertTriangle, PauseCircle, CheckCircle, Flag, ImagePlus, Trash2, Image } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  ouvrageId: number;
  tasks: Task[];
  history: ProgressEntry[];
  color: string;
}

export function SyntheseTab({ ouvrageId, tasks, history, color }: Props) {
  const ouvrTasks = getDescendants(tasks, ouvrageId);
  const leaves = ouvrTasks.filter((t) => isLeaf(t.id, ouvrTasks));
  const progress = computeProgress(ouvrTasks);
  const theoretical = computeTheoreticalProgress(ouvrTasks);
  const gap = progress - theoretical;
  const ouvrHistory = history.filter((h) => ouvrTasks.some((t) => t.id === h.task_id));
  const ouvrAlerts = computeAlerts(ouvrTasks);
  const { contraintes, etudes, todos, photos, addPhoto, deletePhoto } = useOuvrageStore();

  const root = ouvrTasks.find((t) => t.id === ouvrageId);
  const today = new Date();
  const totalDays = root ? differenceInDays(parseISO(root.fin), parseISO(root.debut)) : 0;
  const daysElapsed = root ? Math.max(0, differenceInDays(today, parseISO(root.debut))) : 0;
  const daysRemaining = root ? Math.max(0, differenceInDays(parseISO(root.fin), today)) : 0;

  const milestones = ouvrTasks.filter((t) => t.isMilestone).sort((a, b) => a.debut.localeCompare(b.debut));
  const blockedCount = leaves.filter((t) => t.blocked).length;
  const doneCount = leaves.filter((t) => t.progress === 100).length;
  const openContraintes = contraintes.filter((c) => c.ouvrageId === ouvrageId && c.status !== 'levee').length;
  const openEtudes = etudes.filter((e) => e.ouvrageId === ouvrageId && e.status !== 'valide').length;
  const openTodos = todos.filter((t) => t.ouvrageId === ouvrageId && !t.done).length;

  return (
    <div className="space-y-5">
      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Réalisé</p>
          <p className="text-4xl font-black tabular-nums" style={{ color }}>{progress}%</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Prévu à ce jour</p>
          <p className="text-4xl font-black text-gray-300 tabular-nums">{theoretical}%</p>
        </Card>
        <Card className={`text-center ${gap >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border`}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Écart</p>
          <div className={`flex items-center justify-center gap-1 ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {gap >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <p className="text-4xl font-black tabular-nums">{gap >= 0 ? '+' : ''}{gap}%</p>
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Jours restants</p>
          <p className="text-4xl font-black text-gray-700 tabular-nums">{daysRemaining}</p>
          <p className="text-xs text-gray-400">/ {totalDays}j total</p>
        </Card>
      </div>

      {/* ── Avancement + Jalons ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 space-y-4">
          <p className="text-sm font-bold text-gray-800">Avancement</p>
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-gray-700">Réalisé</span>
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
          {root && (
            <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-gray-400">Début</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{format(parseISO(root.debut), 'dd MMM yyyy', { locale: fr })}</p>
              </div>
              <div>
                <p className="text-gray-400">Fin prévue</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{format(parseISO(root.fin), 'dd MMM yyyy', { locale: fr })}</p>
              </div>
              <div>
                <p className="text-gray-400">Jours écoulés</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{daysElapsed} / {totalDays}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Quick stats */}
        <Card className="space-y-3">
          <p className="text-sm font-bold text-gray-800">État</p>
          <QuickStat icon={<CheckCircle size={14} className="text-emerald-500" />} label="Tâches terminées" value={`${doneCount}/${leaves.length}`} />
          <QuickStat icon={<PauseCircle size={14} className="text-amber-500" />} label="Tâches bloquées" value={blockedCount} alert={blockedCount > 0} />
          <QuickStat icon={<AlertTriangle size={14} className="text-red-500" />} label="Tâches en retard" value={ouvrAlerts.length} alert={ouvrAlerts.length > 0} />
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <QuickStat label="Études en cours" value={openEtudes} variant="blue" />
            <QuickStat label="Contraintes ouvertes" value={openContraintes} variant="amber" />
            <QuickStat label="Actions à faire" value={openTodos} variant="gray" />
          </div>
        </Card>
      </div>

      {/* ── Courbe S ───────────────────────────────────────────────────── */}
      <Card>
        <p className="text-sm font-bold text-gray-800 mb-4">Courbe S — Prévu vs Réalisé</p>
        <SCurveChart tasks={ouvrTasks} history={ouvrHistory} height={240} />
      </Card>

      {/* ── Jalons ─────────────────────────────────────────────────────── */}
      {milestones.length > 0 && (
        <Card>
          <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Flag size={14} className="text-blue-500" /> Jalons clés
          </p>
          <div className="space-y-2">
            {milestones.map((m) => {
              const date = parseISO(m.debut);
              const isPast = date < today;
              const done = m.progress === 100;
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`text-yellow-500 ${done ? 'opacity-100' : isPast ? 'opacity-40' : ''}`}>◆</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-800 font-medium'}`}>{m.nom}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{format(date, 'dd MMM yyyy', { locale: fr })}</span>
                  {done ? <Badge variant="green">Atteint</Badge> : isPast ? <Badge variant="red">En retard</Badge> : <Badge variant="gray">À venir</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Photos / Plans ─────────────────────────────────────────────── */}
      <PhotosSection ouvrageId={ouvrageId} photos={photos} addPhoto={addPhoto} deletePhoto={deletePhoto} />
    </div>
  );
}

const PHOTO_CATEGORIES: { value: PhotoCategorie; label: string }[] = [
  { value: 'conception', label: 'Conception de l\'ouvrage' },
  { value: 'vue_en_plan', label: 'Vue en plan' },
];

function PhotosSection({ ouvrageId, photos, addPhoto, deletePhoto }: {
  ouvrageId: number;
  photos: ReturnType<typeof useOuvrageStore.getState>['photos'];
  addPhoto: ReturnType<typeof useOuvrageStore.getState>['addPhoto'];
  deletePhoto: ReturnType<typeof useOuvrageStore.getState>['deletePhoto'];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadCatRef = useRef<PhotoCategorie>('conception');
  const ouvrPhotos = photos.filter((p) => p.ouvrageId === ouvrageId);
  const conceptionPhotos = ouvrPhotos.filter((p) => p.categorie === 'conception');
  const planPhotos = ouvrPhotos.filter((p) => p.categorie === 'vue_en_plan');

  function handleUpload(cat: PhotoCategorie) {
    uploadCatRef.current = cat;
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image trop volumineuse (max 5 Mo)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1200;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          addPhoto({ ouvrageId, categorie: uploadCatRef.current, nom: file.name, dataUrl });
          showToast('Photo ajoutée');
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  return (
    <Card>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
      <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Image size={14} className="text-blue-500" /> Plans et conception
      </p>

      {PHOTO_CATEGORIES.map((cat) => {
        const items = cat.value === 'conception' ? conceptionPhotos : planPhotos;
        return (
          <div key={cat.value} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600">{cat.label}</p>
              <Button size="sm" variant="secondary" icon={<ImagePlus size={12} />} onClick={() => handleUpload(cat.value)}>
                Ajouter
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">Aucune image</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((p) => (
                  <div key={p.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                    <img src={p.dataUrl} alt={p.nom} className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => { deletePhoto(p.id); showToast('Photo supprimée'); }}
                        className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 truncate px-2 py-1 bg-gray-50">{p.nom}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function QuickStat({ icon, label, value, alert, variant }: { icon?: React.ReactNode; label: string; value: string | number; alert?: boolean; variant?: 'blue' | 'amber' | 'gray' }) {
  const color = alert ? 'text-red-600' : variant === 'blue' ? 'text-blue-600' : variant === 'amber' ? 'text-amber-600' : 'text-gray-700';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
