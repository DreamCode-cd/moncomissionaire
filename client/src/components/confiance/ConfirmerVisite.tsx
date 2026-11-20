import { useMutation, type QueryKey } from '@tanstack/react-query';
import { CircleHelp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { messageErreur } from '@/lib/erreurs';
import { queryClient } from '@/lib/queryClient';
import { classesDuTon } from '@/lib/statuts';
import type { Visite } from '@shared/schema';
import { t } from '@/i18n';

/**
 * Une visite dont l'heure est passée sans que personne ait dit si elle a eu
 * lieu (`a_confirmer`, calculé par le serveur).
 *
 * C'est au commissionnaire, à la modération ou à l'agent de le dire :
 * l'application ne déclare jamais « non faite » à sa place, la visite s'est
 * peut-être faite sans rapport. « Pas eu lieu » prévient le client, qui peut
 * redemander.
 *
 * L'agent, lui, dit qu'elle a eu lieu en écrivant son rapport (bouton à côté,
 * comme sur le mobile) : ici, il n'a que « Pas eu lieu ».
 */
export function ConfirmerVisite({
  visite,
  cle,
  espace = 'commissionnaire',
}: {
  visite: Visite;
  cle: QueryKey;
  espace?: 'commissionnaire' | 'agent';
}) {
  const { toast } = useToast();
  const confirmer = useMutation({
    mutationFn: (eu_lieu: boolean) =>
      api.post(`/api/v1/visites/${espace}/visites/${visite.id}/confirmer/`, { eu_lieu }),
    onSuccess: (_r, eu_lieu) => {
      queryClient.invalidateQueries({ queryKey: cle });
      toast({
        title: eu_lieu ? t('confirmerVisite.visiteConfirmee') : t('confirmerVisite.visiteNonFaite'),
        description: eu_lieu ? undefined : t('confirmerVisite.clientEstPrevenuPeut'),
      });
    },
    onError: (e) => toast({ title: t('confirmerVisite.erreur'), description: messageErreur(e), variant: 'destructive' }),
  });

  if (!visite.a_confirmer) return null;
  return (
    <div className="w-full space-y-2 text-sm" data-testid={`a-confirmer-${visite.id}`}>
      <p className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium ${classesDuTon('attente')}`}>
        <CircleHelp className="h-4 w-4" aria-hidden />
        {t('confirmerVisite.heureEstPasseeVisite')}
      </p>
      <div className="flex flex-wrap gap-2">
        {espace === 'commissionnaire' && (
          <Button size="sm" onClick={() => confirmer.mutate(true)} disabled={confirmer.isPending}>
            {t('confirmerVisite.elleEuLieu')}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => confirmer.mutate(false)}
          disabled={confirmer.isPending}
          data-testid={`pas-eu-lieu-${visite.id}`}
        >
          {t('confirmerVisite.pasEuLieu')}
        </Button>
      </div>
    </div>
  );
}
