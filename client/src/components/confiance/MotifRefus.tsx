import type { BienList } from '@shared/schema';

/** Le motif du dernier refus d'une annonce, pour son auteur et pour la
 *  modération.
 *
 *  Le portefeuille affichait « Rejeté » sans dire pourquoi : le motif
 *  n'arrivait qu'en notification. Une annonce corrigée repart en validation
 *  (backend, `resoumettre_si_rejete`) en gardant le motif, pour que la
 *  modération voie ce qu'elle avait demandé. */
export function MotifRefus({ bien }: { bien: Pick<BienList, 'id' | 'statut_validation' | 'motif_rejet'> }) {
  const motif = bien.motif_rejet?.trim();
  if (!motif || bien.statut_validation === 'valide') return null;

  if (bien.statut_validation === 'rejete') {
    return (
      <p className="text-sm text-statut-defavorable" data-testid={`motif-refus-${bien.id}`}>
        Refusée : « {motif} ». Corrigez l’annonce, elle repartira en validation.
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground" data-testid={`motif-refus-${bien.id}`}>
      Corrigée après un refus (« {motif} »), en attente de validation.
    </p>
  );
}
