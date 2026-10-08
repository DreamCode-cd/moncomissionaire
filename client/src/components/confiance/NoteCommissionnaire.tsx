import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import type { NoteCommissionnaire as Note } from '@shared/schema';

/** La note d'un commissionnaire, ou « nouveau » sous trois avis : une seule
 *  note ne dit rien, et un débutant ne doit pas être coulé par un mécontent. */
export function NoteCommissionnaire({ commissionnaireId }: { commissionnaireId: number }) {
  const { data } = useQuery<Note>({
    queryKey: [`/api/v1/commissions/commissionnaires/${commissionnaireId}/note/`],
  });
  if (!data) return null;
  return <AffichageNote note={data.note_moyenne} nombre={data.nombre_avis} />;
}

export function AffichageNote({ note, nombre }: { note: number | null; nombre: number }) {
  if (note == null) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="note-commissionnaire">
        {nombre ? `${nombre} avis, pas encore de note affichée` : 'Pas encore d’avis'}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1 text-sm" data-testid="note-commissionnaire">
      <Star className="h-4 w-4 fill-current text-statut-attente" aria-hidden />
      <span className="font-semibold">{note.toLocaleString('fr-CD')}</span>
      <span className="text-muted-foreground">/5 · {nombre} avis</span>
    </p>
  );
}
