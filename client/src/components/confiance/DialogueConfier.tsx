import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { EtatChargement, EtatVide } from '@/components/etats';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { getDjangoImageUrl } from '@/lib/utils';
import type { BienList, CommissionnaireAnnuaire } from '@shared/schema';
import { AffichageNote } from './NoteCommissionnaire';

/**
 * Le propriétaire choisit à qui confier son bien. Ceux qui ont déjà des
 * maisons dans sa ville passent en tête, puis l'identité vérifiée, puis la
 * note. Le commissionnaire choisi accepte ou refuse : rien ne change tant
 * qu'il n'a pas répondu.
 */
export function DialogueConfier({ bien, onFermer }: { bien: BienList; onFermer: () => void }) {
  const { toast } = useToast();
  const ville = typeof bien.ville === 'number' ? bien.ville : bien.ville_detail?.id;
  const annuaire = useQuery<CommissionnaireAnnuaire[]>({
    queryKey: [`/api/v1/biens/commissionnaires/${ville ? `?ville=${ville}` : ''}`],
  });
  const [choisi, setChoisi] = useState<CommissionnaireAnnuaire | null>(null);
  const [message, setMessage] = useState('');

  const confier = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/biens/proprietaire/${bien.id}/confier/`, { commissionnaire: choisi!.id, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/proprietaire/'] });
      toast({ title: 'Proposition envoyée', description: `${choisi?.full_name} va accepter ou refuser.` });
      onFermer();
    },
    onError: (e) =>
      toast({
        title: 'Proposition non envoyée',
        description: e instanceof Error ? e.message : 'Une erreur est survenue',
        variant: 'destructive',
      }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confier « {bien.titre} »</DialogTitle>
          <DialogDescription>
            Le commissionnaire reçoit les demandes et fait visiter. Vous gardez votre compte, et vous pouvez lui reprendre le bien à tout moment.
          </DialogDescription>
        </DialogHeader>

        {annuaire.isLoading ? (
          <EtatChargement texte="Chargement des commissionnaires…" />
        ) : !annuaire.data?.length ? (
          <EtatVide titre="Aucun commissionnaire inscrit" description="Revenez bientôt : ils s’inscrivent au fil des semaines." />
        ) : (
          <ul className="space-y-2" role="radiogroup">
            {annuaire.data.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={choisi?.id === c.id}
                  onClick={() => setChoisi(c)}
                  className={`w-full flex items-center gap-3 rounded-md border p-3 text-left ${choisi?.id === c.id ? 'border-primary bg-primary/5' : ''}`}
                  data-testid={`choix-commissionnaire-${c.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={c.avatar ? getDjangoImageUrl(c.avatar) || undefined : undefined} />
                    <AvatarFallback>{c.full_name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.full_name}</p>
                    <AffichageNote note={c.note_moyenne} nombre={c.nombre_avis} />
                    <p className="text-xs text-muted-foreground">
                      {c.identite_verifiee && (
                        <span className="inline-flex items-center gap-1 text-statut-favorable">
                          <ShieldCheck className="h-3 w-3" /> Identité vérifiée ·{' '}
                        </span>
                      )}
                      {c.biens_dans_la_ville
                        ? `${c.biens_dans_la_ville} bien(s) dans votre ville`
                        : 'Pas encore de bien dans votre ville'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {choisi && (
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Un mot pour lui : disponibilités pour les visites, clés… (facultatif)"
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button disabled={!choisi || confier.isPending} onClick={() => confier.mutate()} data-testid="button-confier">
            Proposer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
