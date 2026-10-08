import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { messageErreur } from '@/lib/erreurs';
import type { Mandat, PaginatedResponse } from '@shared/schema';

const CLE_MANDATS = ['/api/v1/biens/mandats/?statut=propose'];

/** Les biens que des propriétaires inscrits proposent au commissionnaire.
 *  Accepté, le bien entre dans son portefeuille ; refusé, le propriétaire
 *  est prévenu et en choisit un autre. */
export function PropositionsMandat({ cleBiens }: { cleBiens: string[] }) {
  const { toast } = useToast();
  const propositions = useQuery<PaginatedResponse<Mandat>>({ queryKey: CLE_MANDATS });
  const [aRefuser, setARefuser] = useState<Mandat | null>(null);
  const [motif, setMotif] = useState('');

  const repondre = useMutation({
    mutationFn: ({ id, accepte }: { id: number; accepte: boolean }) =>
      api.post(`/api/v1/biens/mandats/${id}/${accepte ? 'accepter' : 'refuser'}/`, accepte ? {} : { motif }),
    onSuccess: (_, { accepte }) => {
      queryClient.invalidateQueries({ queryKey: CLE_MANDATS });
      queryClient.invalidateQueries({ queryKey: cleBiens });
      setARefuser(null);
      setMotif('');
      toast({ title: accepte ? 'Bien ajouté à votre portefeuille' : 'Proposition refusée' });
    },
    onError: (e) =>
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' }),
  });

  const liste = propositions.data?.results ?? [];
  if (propositions.error && !propositions.data) {
    return (
      <p className="mb-4 text-sm text-muted-foreground" role="status">
        Les propositions des propriétaires n’ont pas pu être vérifiées. {messageErreur(propositions.error)}{' '}
        <button type="button" className="underline" onClick={() => void propositions.refetch()}>Réessayer</button>
      </p>
    );
  }
  if (!liste.length) return null;

  return (
    <section className="space-y-2 mb-4">
      <h2 className="text-sm font-semibold">Propriétaires qui vous confient leur bien</h2>
      {liste.map((m) => (
        <Card key={m.id} data-testid={`proposition-${m.id}`}>
          <CardContent className="p-3 space-y-2">
            <p className="font-medium leading-tight">{m.bien_titre}</p>
            <p className="text-xs text-muted-foreground">
              {m.bien_quartier} · proposé par {m.proprietaire_detail?.full_name}
            </p>
            {m.message && <p className="text-sm italic text-muted-foreground">« {m.message} »</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={repondre.isPending}
                onClick={() => repondre.mutate({ id: m.id, accepte: true })}
                data-testid={`button-accepter-mandat-${m.id}`}
              >
                Accepter
              </Button>
              <Button size="sm" variant="outline" onClick={() => setARefuser(m)}>
                Refuser
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!aRefuser} onOpenChange={(o) => !o && setARefuser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser ce bien</DialogTitle>
            <DialogDescription>Le propriétaire sera prévenu, avec votre motif s’il y en a un.</DialogDescription>
          </DialogHeader>
          <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : trop loin de mon secteur" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setARefuser(null)}>Retour</Button>
            <Button
              variant="destructive"
              disabled={repondre.isPending}
              onClick={() => aRefuser && repondre.mutate({ id: aRefuser.id, accepte: false })}
            >
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
