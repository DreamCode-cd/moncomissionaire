import { useMutation, type QueryKey } from '@tanstack/react-query';
import { ChoixCreneau } from '@/components/confiance/ChoixCreneau';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { messageErreur } from '@/lib/erreurs';
import { queryClient } from '@/lib/queryClient';
import type { Visite } from '@shared/schema';

/**
 * Reporter ou annuler une visite fixée qui n'a pas encore eu lieu.
 *
 * Le terrain change : bailleur absent, délestage, pluie. Le commissionnaire
 * (ou la modération) choisit le nouveau créneau, et le client est prévenu ;
 * il peut annuler si le créneau ne lui convient pas (décision de David,
 * 19/11/2026). Une annulation dit toujours pourquoi : le motif part au
 * client. Même règle que le mobile et le serveur (visites/views.py).
 */
export function ActionsVisite({ visite, cle }: { visite: Visite; cle: QueryKey }) {
  const { toast } = useToast();
  const [dialogue, setDialogue] = useState<'reporter' | 'annuler' | null>(null);
  const [jour, setJour] = useState(visite.date_visite);
  const [heure, setHeure] = useState(visite.heure_visite?.slice(0, 5) ?? '10:00');
  const [motif, setMotif] = useState('');

  const fermer = () => {
    setDialogue(null);
    setMotif('');
  };
  const apres = (titre: string) => {
    queryClient.invalidateQueries({ queryKey: cle });
    toast({ title: titre, description: 'Le client est prévenu.' });
    fermer();
  };
  const reporter = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/visites/commissionnaire/visites/${visite.id}/reporter/`, {
        date_visite: jour,
        heure_visite: heure,
      }),
    onSuccess: () => apres('Visite déplacée'),
    onError: (e) => toast({ title: 'Visite non déplacée', description: messageErreur(e), variant: 'destructive' }),
  });
  const annuler = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/visites/commissionnaire/visites/${visite.id}/annuler/`, { motif: motif.trim() }),
    onSuccess: () => apres('Visite annulée'),
    onError: (e) => toast({ title: 'Visite non annulée', description: messageErreur(e), variant: 'destructive' }),
  });

  // Seulement une visite à venir dont l'heure n'est pas passée : après, on
  // dit si elle a eu lieu (ConfirmerVisite).
  const aVenir = visite.statut === 'planifiee' || visite.statut === 'reportee';
  if (!aVenir || visite.a_confirmer) return null;

  const memeCreneau = jour === visite.date_visite && heure === visite.heure_visite?.slice(0, 5);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setDialogue('reporter')} data-testid={`reporter-${visite.id}`}>
        Reporter
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive"
        onClick={() => setDialogue('annuler')}
        data-testid={`annuler-visite-${visite.id}`}
      >
        Annuler la visite
      </Button>

      <Dialog open={dialogue === 'reporter'} onOpenChange={(ouvert) => !ouvert && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reporter la visite</DialogTitle>
            <DialogDescription>
              Le client est prévenu du nouveau créneau et peut annuler s’il ne lui convient pas.
            </DialogDescription>
          </DialogHeader>
          <ChoixCreneau
            jour={jour || null}
            heure={heure || null}
            onJour={setJour}
            onHeure={(h) => setHeure(h ?? '')}
            marque={{ jour: visite.date_visite, heure: visite.heure_visite }}
            libelleMarque="créneau actuel"
          />
          <DialogFooter>
            <Button variant="outline" onClick={fermer}>
              Retour
            </Button>
            <Button onClick={() => reporter.mutate()} disabled={!jour || !heure || memeCreneau || reporter.isPending}>
              Déplacer la visite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogue === 'annuler'} onOpenChange={(ouvert) => !ouvert && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la visite</DialogTitle>
            <DialogDescription>Le motif est envoyé au client, qui pourra demander une autre visite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor={`annulation-motif-${visite.id}`}>Motif</Label>
            <Textarea
              id={`annulation-motif-${visite.id}`}
              placeholder="Ex : le bailleur n’est pas disponible ce jour-là"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fermer}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={() => annuler.mutate()}
              disabled={motif.trim().length < 3 || annuler.isPending}
            >
              Confirmer l’annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
