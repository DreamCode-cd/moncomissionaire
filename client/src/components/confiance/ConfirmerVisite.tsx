import { useMutation, type QueryKey } from '@tanstack/react-query';
import { CircleHelp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { messageErreur } from '@/lib/erreurs';
import { queryClient } from '@/lib/queryClient';
import { classesDuTon } from '@/lib/statuts';
import type { Visite } from '@shared/schema';

/**
 * Une visite dont l'heure est passée sans que personne ait dit si elle a eu
 * lieu (`a_confirmer`, calculé par le serveur).
 *
 * C'est au commissionnaire (ou à la modération) de le dire : l'application
 * ne déclare jamais « non faite » à sa place, la visite s'est peut-être faite
 * sans rapport. « Pas eu lieu » prévient le client, qui peut redemander.
 */
export function ConfirmerVisite({ visite, cle }: { visite: Visite; cle: QueryKey }) {
  const { toast } = useToast();
  const confirmer = useMutation({
    mutationFn: (eu_lieu: boolean) =>
      api.post(`/api/v1/visites/commissionnaire/visites/${visite.id}/confirmer/`, { eu_lieu }),
    onSuccess: (_r, eu_lieu) => {
      queryClient.invalidateQueries({ queryKey: cle });
      toast({
        title: eu_lieu ? 'Visite confirmée' : 'Visite non faite',
        description: eu_lieu ? undefined : 'Le client est prévenu et peut demander une autre visite.',
      });
    },
    onError: (e) => toast({ title: 'Erreur', description: messageErreur(e), variant: 'destructive' }),
  });

  if (!visite.a_confirmer) return null;
  return (
    <div className="w-full space-y-2 text-sm" data-testid={`a-confirmer-${visite.id}`}>
      <p className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium ${classesDuTon('attente')}`}>
        <CircleHelp className="h-4 w-4" aria-hidden />
        L’heure est passée : la visite a-t-elle eu lieu ?
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => confirmer.mutate(true)} disabled={confirmer.isPending}>
          Elle a eu lieu
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => confirmer.mutate(false)}
          disabled={confirmer.isPending}
          data-testid={`pas-eu-lieu-${visite.id}`}
        >
          Pas eu lieu
        </Button>
      </div>
    </div>
  );
}
