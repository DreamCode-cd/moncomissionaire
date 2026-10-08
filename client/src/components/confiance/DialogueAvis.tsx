import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

/**
 * Noter un commissionnaire, après une visite faite (client) ou un bail signé
 * chez soi (propriétaire). Le serveur déduit qui est noté et refuse une
 * seconde note pour le même fait.
 */
export function DialogueAvis({
  cible,
  nomCommissionnaire,
  clesARafraichir,
  onFermer,
}: {
  cible: { visite: number } | { commission: number };
  nomCommissionnaire?: string;
  clesARafraichir: string[][];
  onFermer: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');

  const envoyer = useMutation({
    mutationFn: () => api.post('/api/v1/commissions/avis/', { ...cible, note, commentaire }),
    onSuccess: () => {
      clesARafraichir.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast({ title: 'Merci pour votre avis', description: 'Il aide les autres à choisir.' });
      onFermer();
    },
    onError: (e) =>
      toast({
        title: 'Avis non envoyé',
        description: e instanceof Error ? e.message : 'Une erreur est survenue',
        variant: 'destructive',
      }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Noter {nomCommissionnaire ?? 'le commissionnaire'}</DialogTitle>
          <DialogDescription>
            Ponctualité, honnêteté sur l’état de la maison, frais annoncés respectés… Votre prénom seul sera affiché.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1" role="radiogroup" aria-label="Note sur 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={note === n}
              aria-label={`${n} sur 5`}
              onClick={() => setNote(n)}
              className="p-1"
              data-testid={`etoile-${n}`}
            >
              <Star className={`h-9 w-9 ${n <= note ? 'fill-current text-statut-attente' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
        <Textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Ce que les autres devraient savoir (facultatif)"
          maxLength={1000}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Plus tard</Button>
          <Button disabled={!note || envoyer.isPending} onClick={() => envoyer.mutate()} data-testid="button-envoyer-avis">
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
