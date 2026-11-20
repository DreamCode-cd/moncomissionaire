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
import { t } from '@/i18n';

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
      toast({ title: accepte ? t('mandats.bienAjouteVotrePortefeuille') : t('mandats.propositionRefusee') });
    },
    onError: (e) =>
      toast({ title: t('mandats.erreur'), description: e instanceof Error ? e.message : '', variant: 'destructive' }),
  });

  const liste = propositions.data?.results ?? [];
  if (propositions.error && !propositions.data) {
    return (
      <p className="mb-4 text-sm text-muted-foreground" role="status">
        {t('reste.propositionsNonVerifiees')} {messageErreur(propositions.error)}{' '}
        <button type="button" className="inline-flex min-h-11 md:min-h-0 items-center underline" onClick={() => void propositions.refetch()}>{t('mandats.reessayer')}</button>
      </p>
    );
  }
  if (!liste.length) return null;

  return (
    <section className="space-y-2 mb-4">
      <h2 className="text-sm font-semibold">{t('mandats.proprietairesQuiVousConfient')}</h2>
      {liste.map((m) => (
        <Card key={m.id} data-testid={`proposition-${m.id}`}>
          <CardContent className="p-3 space-y-2">
            <p className="font-medium leading-tight">{m.bien_titre}</p>
            <p className="text-xs text-muted-foreground">
              {t('mandats.proposeB', { a: m.bien_quartier, b: m.proprietaire_detail?.full_name })}
            </p>
            {m.message && <p className="text-sm italic text-muted-foreground">« {m.message} »</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={repondre.isPending}
                onClick={() => repondre.mutate({ id: m.id, accepte: true })}
                data-testid={`button-accepter-mandat-${m.id}`}
              >
                {t('mandats.accepter')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setARefuser(m)}>
                {t('mandats.refuser')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!aRefuser} onOpenChange={(o) => !o && setARefuser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('mandats.refuserCeBien')}</DialogTitle>
            <DialogDescription>{t('mandats.proprietaireSeraPrevenuAvec')}</DialogDescription>
          </DialogHeader>
          <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t('mandats.exTropLoinMon')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setARefuser(null)}>{t('mandats.retour')}</Button>
            <Button
              variant="destructive"
              disabled={repondre.isPending}
              onClick={() => aRefuser && repondre.mutate({ id: aRefuser.id, accepte: false })}
            >
              {t('mandats.refuser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
