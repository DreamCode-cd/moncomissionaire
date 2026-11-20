import { useMutation } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { formaterDateCourte } from '@/lib/dates';
import type { BienList } from '@shared/schema';
import { t } from '@/i18n';

const JOUR = 24 * 60 * 60 * 1000;

/**
 * Une annonce se reconfirme tous les trente jours, sinon elle disparaît de
 * la recherche : c'est ce qui évite de faire déplacer un client pour une
 * maison louée depuis longtemps. On ne montre rien tant que l'échéance est
 * loin ; à moins d'une semaine, un bouton « Toujours libre ».
 */
export function Expiration({ bien, routeApi, cle }: { bien: BienList; routeApi: string; cle: string[] }) {
  const { toast } = useToast();
  const reconfirmer = useMutation({
    mutationFn: () => api.post(`${routeApi}${bien.id}/reconfirmer/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cle });
      toast({ title: t('expiration.annonceReconfirmee'), description: t('expiration.elleResteLigneTrente') });
    },
    onError: (e) =>
      toast({ title: t('expiration.erreur'), description: e instanceof Error ? e.message : '', variant: 'destructive' }),
  });

  if (bien.statut_validation !== 'valide' || bien.statut_location === 'loue' || !bien.expire_le) return null;
  const restant = new Date(bien.expire_le).getTime() - Date.now();
  if (!bien.est_expiree && restant > 7 * JOUR) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md p-2 text-xs ${bien.est_expiree ? 'bg-statut-defavorable-fond text-statut-defavorable' : 'bg-statut-attente-fond text-statut-attente'}`}
      data-testid={`expiration-${bien.id}`}
    >
      <span>
        {bien.est_expiree
          ? t('expiration.masqueeClientsNeVoient')
          : t('expiration.masqueeLe', { date: formaterDateCourte(bien.expire_le) })}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 text-xs"
        disabled={reconfirmer.isPending}
        onClick={() => reconfirmer.mutate()}
        data-testid={`button-reconfirmer-${bien.id}`}
      >
        <RefreshCw className="mr-1 h-3 w-3" /> {t('expiration.toujoursLibre')}
      </Button>
    </div>
  );
}
