import { useState } from 'react';
import { useOuvrageStore } from '../../store/useOuvrageStore';
import { Trash2, Send, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, SectionHeader, EmptyState } from '../ui/index';

interface Props { ouvrageId: number; userName: string }

export function NotesTab({ ouvrageId, userName }: Props) {
  const { notes, addNote, deleteNote } = useOuvrageStore();
  const [contenu, setContenu] = useState('');

  const items = notes.filter((n) => n.ouvrageId === ouvrageId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const save = () => {
    if (!contenu.trim()) return;
    addNote({ ouvrageId, contenu: contenu.trim(), auteur: userName });
    setContenu('');
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Notes & observations" description="Comptes-rendus, remarques, informations de terrain" />

      <Card>
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) save(); }}
          placeholder="Saisir une note, observation, compte-rendu... (Ctrl+Entrée pour envoyer)"
          rows={3}
          className="w-full text-sm resize-none focus:outline-none placeholder-gray-400 text-gray-800"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Par <span className="font-semibold text-gray-600">{userName}</span> · {format(new Date(), 'dd MMM yyyy HH:mm', { locale: fr })}
          </span>
          <button
            onClick={save}
            disabled={!contenu.trim()}
            className="flex items-center gap-1.5 bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={12} /> Ajouter
          </button>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={<MessageSquare size={40} />} title="Aucune note" description="Ajoutez des observations, comptes-rendus, remarques de terrain..." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.contenu}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span className="bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">{n.auteur}</span>
                    <span>{format(parseISO(n.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
