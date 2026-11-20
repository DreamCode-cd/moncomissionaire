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
import { t } from '@/i18n';

/** Ce qu'on note, et ce qu'on demande d'y regarder. */
const SUJETS = {
  commissionnaire: {
    route: '/api/v1/commissions/avis/',
    get titreParDefaut() { return t('avis.leCommissionnaire'); },
    get consigne() { return t('avis.consigneCommissionnaire'); },
  },
  agent: {
    route: '/api/v1/biens/avis-agents/',
    get titreParDefaut() { return t('avis.lAgent'); },
    get consigne() { return t('avis.consigneAgent'); },
  },
  bien: {
    route: '/api/v1/biens/avis-biens/',
    get titreParDefaut() { return t('avis.ceBien'); },
    get consigne() { return t('avis.consigneBien'); },
  },
} as const;

/**
 * Noter un commissionnaire, un agent ou un bien. On ne note que ce qu'on a vu : une
 * visite terminée (client) ou un bail signé chez soi (propriétaire). Le
 * serveur déduit qui ou quoi est noté et refuse une seconde note.
 */
export function DialogueAvis({
  sujet = 'commissionnaire',
  cible,
  nom,
  clesARafraichir,
  onFermer,
}: {
  sujet?: keyof typeof SUJETS;
  cible: { visite: number } | { commission: number };
  nom?: string;
  clesARafraichir: string[][];
  onFermer: () => void;
}) {
  const { route, titreParDefaut, consigne } = SUJETS[sujet];
  const { toast } = useToast();
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');

  const envoyer = useMutation({
    mutationFn: () => api.post(route, { ...cible, note, commentaire }),
    onSuccess: () => {
      clesARafraichir.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast({ title: t('avis.merciVotreAvis'), description: t('avis.ilAideAutresChoisir') });
      onFermer();
    },
    onError: (e) =>
      toast({
        title: t('avis.avisNonEnvoye'),
        description: e instanceof Error ? e.message : t('avis.erreurEstSurvenue'),
        variant: 'destructive',
      }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('avis.noter', { nom: nom ?? titreParDefaut })}</DialogTitle>
          <DialogDescription>{consigne} {t('avis.prenomSeul')}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1" role="radiogroup" aria-label={t('avis.note5')}>
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
          placeholder={t('avis.ceQueAutresDevraient')}
          maxLength={1000}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>{t('avis.plusTard')}</Button>
          <Button disabled={!note || envoyer.isPending} onClick={() => envoyer.mutate()} data-testid="button-envoyer-avis">
            {t('avis.envoyer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
