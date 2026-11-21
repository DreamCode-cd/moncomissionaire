import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import type { CibleSignalement, MotifSignalement } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { messageErreur } from '@/lib/erreurs';
import { libelleMotif, MOTIFS, signaler } from '@/lib/moderation';
import { versConnexion } from '@/lib/suite';
import { t } from '@/i18n';

/**
 * Signaler une annonce, un message ou une personne.
 *
 * Il faut un compte : un visiteur est envoyé à la connexion, puis revient
 * sur la page où il était. L'annonce signalée reste en ligne le temps que
 * l'équipe vérifie : on le dit, pour que personne ne croie l'avoir fait
 * disparaître.
 */
export function DialogueSignalement({
  ouvert,
  onFermer,
  cible,
  identifiant,
  nom,
}: {
  ouvert: boolean;
  onFermer: () => void;
  cible: CibleSignalement;
  identifiant: number;
  /** Ce qu'on signale, en clair : le titre de l'annonce, le nom de la personne. */
  nom?: string;
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [motif, setMotif] = useState<MotifSignalement | ''>('');
  const [details, setDetails] = useState('');

  const envoi = useMutation({
    mutationFn: () =>
      signaler({
        cible,
        motif: motif as MotifSignalement,
        details: details.trim(),
        ...(cible === 'annonce' ? { bien: identifiant } : cible === 'message' ? { message: identifiant } : { utilisateur: identifiant }),
      }),
    onSuccess: () => {
      toast({ title: t('signaler.merci'), description: t('signaler.equipeVaExaminer') });
      setMotif('');
      setDetails('');
      onFermer();
    },
    onError: (e) => toast({ title: t('signaler.nonEnvoye'), description: messageErreur(e), variant: 'destructive' }),
  });

  const titre = {
    annonce: t('signaler.titreAnnonce'),
    message: t('signaler.titreMessage'),
    utilisateur: t('signaler.titrePersonne'),
  }[cible];

  if (ouvert && !user) {
    const ici = `${window.location.pathname}${window.location.search}`;
    return (
      <Dialog open onOpenChange={(o) => !o && onFermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titre}</DialogTitle>
            <DialogDescription>{t('signaler.connectezVous')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setLocation(versConnexion(ici))} data-testid="signaler-connexion">
              {t('signaler.seConnecter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent data-testid="dialogue-signalement">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          {nom ? <DialogDescription className="line-clamp-2">{nom}</DialogDescription> : null}
        </DialogHeader>

        <fieldset className="space-y-3">
          <legend className="font-medium mb-2">{t('signaler.queSePasseTIl')}</legend>
          <RadioGroup value={motif} onValueChange={(v) => setMotif(v as MotifSignalement)}>
            {MOTIFS[cible].map((m) => (
              <div key={m} className="flex items-center gap-3 min-h-11">
                <RadioGroupItem value={m} id={`motif-${m}`} data-testid={`motif-${m}`} />
                <Label htmlFor={`motif-${m}`} className="font-normal cursor-pointer">
                  {libelleMotif(m)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="signaler-details">{t('signaler.precisions')}</Label>
          <Textarea
            id="signaler-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            placeholder={cible === 'annonce' ? t('signaler.exemplePrecisions') : t('signaler.exemplePrecisionsPersonne')}
            data-testid="signaler-details"
          />
          <p className="text-xs text-muted-foreground">
            {cible === 'annonce' ? t('signaler.annonceResteEnLigne') : t('signaler.personneNEstPasPrevenue')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            {t('signaler.annuler')}
          </Button>
          <Button disabled={!motif || envoi.isPending} onClick={() => envoi.mutate()} data-testid="envoyer-signalement">
            {t('signaler.envoyer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
