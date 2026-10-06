import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  classesDuTon,
  lireStatut,
  lireStatutQuelconque,
  type Famille,
} from '@/lib/statuts';

/**
 * Badge de statut — unique façon d'afficher un statut dans l'application.
 *
 * Avant, quatre fonctions `getStatusBadge` quasi identiques coexistaient dans
 * MyVisits, ClientDashboard, ProprietaireDashboard et AgentDashboard, plus
 * trois `getEtatBadge` pour l'appréciation d'un rapport. Chacune décidait de
 * son libellé, de sa couleur et de son icône avec des primitives Tailwind
 * écrites en dur. Le même statut s'affichait donc de quatre façons.
 *
 * @param famille  Précisez-la quand vous la connaissez : c'est plus sûr.
 *                 Omise, le statut est cherché dans toutes les familles —
 *                 utile pour les écrans qui mêlent demandes et visites.
 * @param valeur   la valeur brute renvoyée par l'API
 * @param libelle  le champ `*_display` du serveur, s'il existe : il fait foi
 *                 sur le texte, pour que front et back ne divergent pas.
 */
export function BadgeStatut({
  famille,
  valeur,
  libelle,
  className,
  compact = false,
  avecIcone = true,
}: {
  famille?: Famille;
  valeur?: string | null;
  libelle?: string | null;
  className?: string;
  compact?: boolean;
  avecIcone?: boolean;
}) {
  const statut = famille
    ? lireStatut(famille, valeur, libelle)
    : lireStatutQuelconque(valeur, libelle);

  const Icone = statut.icone;

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent font-medium',
        compact ? 'px-1.5 py-0.5 text-[10px] leading-none' : '',
        classesDuTon(statut.ton),
        className,
      )}
      data-testid={`badge-statut-${valeur ?? 'inconnu'}`}
    >
      {avecIcone && Icone && !compact ? (
        <Icone className="mr-1 h-3 w-3" aria-hidden />
      ) : null}
      {statut.libelle}
    </Badge>
  );
}
