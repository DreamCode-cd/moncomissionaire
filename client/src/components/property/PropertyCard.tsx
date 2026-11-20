import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { Link } from 'wouter';
import { LazyImage } from '@/components/ui/lazy-image';
import type { BienList } from '@shared/schema';
import { cn, getVilleName, vignetteDe } from '@/lib/utils';
import { formaterPrix } from '@/lib/prix';
import { lieuAnnonce } from '@/lib/annonce';
import { FaitsBien } from '@/components/property/FaitsBien';
import { VignetteSansPhoto } from '@/components/property/VignetteSansPhoto';
import { t } from '@/i18n';

interface PropertyCardProps {
  property: BienList;
  /**
   * `default` : une ligne pleine largeur sur téléphone, une carte en grille
   * à partir de 768 px. `horizontal` : toujours une ligne.
   */
  variant?: 'default' | 'horizontal';
}

/**
 * Une annonce dans une liste, sur le modèle de l'application mobile : la
 * photo, le titre en entier (deux lignes au plus), le lieu, le loyer « par
 * mois », puis les faits qui décident une visite.
 *
 * Sur téléphone, deux cartes de front coupaient le titre au milieu
 * (« Villa avec jardin au… ») et réduisaient les faits à des chiffres.
 */
export function PropertyCard({ property, variant = 'default' }: PropertyCardProps) {
  const photoUrl = vignetteDe(property.photo_principale);
  const enGrille = variant === 'default';
  // Les listes publiques ne montrent que des biens disponibles : un badge
  // « Disponible » sur chaque annonce ne disait rien. Seuls « En visite » ou
  // « Loué » (un favori ancien, par exemple) méritent d'être signalés.
  const estDisponible = property.statut_location === 'disponible';
  const lieu = lieuAnnonce([
    property.quartier,
    property.commune,
    getVilleName(property.ville, property.ville_nom, property.ville_detail),
  ]);

  return (
    <Link
      href={`/property/${property.id}`}
      className={cn(
        'group flex gap-4 py-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        enGrille && 'md:flex-col md:gap-0 md:py-0 md:border md:bg-card md:overflow-hidden md:hover-elevate',
      )}
      data-testid={`card-property-${property.id}`}
    >
      <div
        className={cn(
          'relative w-24 h-24 shrink-0 overflow-hidden rounded-lg bg-muted',
          enGrille && 'md:w-full md:h-auto md:aspect-[4/3] md:rounded-none',
        )}
      >
        {photoUrl ? (
          <LazyImage src={photoUrl} alt="" className="w-full h-full" />
        ) : (
          <VignetteSansPhoto compacte className={cn(enGrille && 'md:[&>svg]:h-8 md:[&>svg]:w-8')} />
        )}
      </div>

      <div className={cn('min-w-0 flex-1 space-y-1', enGrille && 'md:p-3')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug line-clamp-2 [overflow-wrap:anywhere] group-hover:underline underline-offset-2">
            {property.titre}
          </h3>
          {!estDisponible && (
            <BadgeStatut
              famille="location"
              valeur={property.statut_location}
              libelle={property.statut_location_display}
              compact
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{lieu}</p>
        <p className="text-lg font-extrabold text-primary tabular-nums">
          {formaterPrix(property.prix_mensuel, property.devise)}
          <span className="text-base font-semibold">{t('fiche.parMois')}</span>
        </p>
        <FaitsBien bien={property} />
      </div>
    </Link>
  );
}
