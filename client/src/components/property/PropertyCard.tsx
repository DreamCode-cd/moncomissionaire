import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { Link } from 'wouter';
import { MapPin, Bed, Bath, Maximize, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/ui/lazy-image';
import type { BienList } from '@shared/schema';
import { cn, getDjangoImageUrl, getVilleName } from '@/lib/utils';
import { formaterPrix } from '@/lib/prix';
import { formaterSurface, lieuAnnonce } from '@/lib/annonce';
import { VignetteSansPhoto } from '@/components/property/VignetteSansPhoto';

interface PropertyCardProps {
  property: BienList;
  variant?: 'default' | 'horizontal';
  rating?: number;
}

export function PropertyCard({ property, variant = 'default', rating }: PropertyCardProps) {
  const photoUrl = getDjangoImageUrl(property.photo_principale?.image);
  const surface = formaterSurface(property.superficie);
  const lieu = lieuAnnonce([
    property.quartier,
    property.commune,
    getVilleName(property.ville, property.ville_nom, property.ville_detail),
  ]);

  if (variant === 'horizontal') {
    return (
      <Link href={`/property/${property.id}`}>
        <Card 
          className="overflow-hidden hover-elevate cursor-pointer"
          data-testid={`card-property-${property.id}`}
        >
          <div className="flex h-24">
            <div className="relative w-28 h-full flex-shrink-0">
              {photoUrl ? (
                <LazyImage src={photoUrl} alt={property.titre} className="w-full h-full" />
              ) : (
                <VignetteSansPhoto compacte />
              )}
            </div>
            <CardContent className="flex-1 p-2 min-w-0">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-sm line-clamp-1">{property.titre}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <BadgeStatut
                          famille="location"
                          valeur={property.statut_location}
                          libelle={property.statut_location_display}
                          compact
                        />
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 leading-none">
                        {property.type_bien_display}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center text-muted-foreground text-xs mb-1">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">{lieu}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {property.nombre_chambres > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Bed className="w-3 h-3" />
                      {property.nombre_chambres}
                    </span>
                  )}
                  {property.nombre_salles_bain > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Bath className="w-3 h-3" />
                      {property.nombre_salles_bain}
                    </span>
                  )}
                  {surface && (
                    <span className="flex items-center gap-0.5">
                      <Maximize className="w-3 h-3" />
                      {surface}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">
                    {formaterPrix(property.prix_mensuel, property.devise)}
                    <span className="text-xs font-normal text-muted-foreground">/mois</span>
                  </span>
                  {rating && (
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 fill-note text-note" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/property/${property.id}`}>
      <Card 
        className="overflow-hidden hover-elevate cursor-pointer group"
        data-testid={`card-property-${property.id}`}
      >
        <div className="relative aspect-square">
          {photoUrl ? (
            <>
              <LazyImage
                src={photoUrl}
                alt={property.titre}
                className="w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </>
          ) : (
            <VignetteSansPhoto />
          )}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
            <BadgeStatut
              famille="location"
              valeur={property.statut_location}
              libelle={property.statut_location_display}
              compact
            />
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-background/80 backdrop-blur-sm">
              {property.type_bien_display}
            </Badge>
          </div>
        </div>
        <CardContent className="p-2.5">
          <h3 className="font-semibold text-sm line-clamp-1 mb-1">{property.titre}</h3>
          <div className="flex items-center text-muted-foreground text-xs mb-2">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">{lieu}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            {property.nombre_chambres > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="w-3 h-3" />
                <span className="md:hidden">{property.nombre_chambres}</span>
                <span className="hidden md:inline">{property.nombre_chambres} ch.</span>
              </span>
            )}
            {property.nombre_salles_bain > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="w-3 h-3" />
                <span className="md:hidden">{property.nombre_salles_bain}</span>
                <span className="hidden md:inline">{property.nombre_salles_bain} sdb.</span>
              </span>
            )}
            {surface && (
              <span className="flex items-center gap-1">
                <Maximize className="w-3 h-3" />
                {surface}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-base">
              {formaterPrix(property.prix_mensuel, property.devise)}
              <span className="text-xs font-normal text-muted-foreground">/mois</span>
            </span>
            {rating && (
              <span className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 fill-note text-note" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
