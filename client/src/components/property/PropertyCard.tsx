import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { Link } from 'wouter';
import { MapPin, Bed, Bath, Maximize, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/ui/lazy-image';
import type { BienList } from '@shared/schema';
import { cn, getDjangoImageUrl, getVilleName } from '@/lib/utils';

import villaImage from '@assets/images/luxury_villa_hero_image.png';
import { formaterPrix } from '@/lib/prix';
const apartmentImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80";
const studioImage = "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80";
const houseImage = "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80";
const duplexImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";

const defaultImages: Record<string, string> = {
  villa: villaImage,
  appartement: apartmentImage,
  studio: studioImage,
  maison: houseImage,
  duplex: duplexImage,
  terrain: houseImage,
};

interface PropertyCardProps {
  property: BienList;
  variant?: 'default' | 'horizontal';
  rating?: number;
}

export function PropertyCard({ property, variant = 'default', rating }: PropertyCardProps) {
  const photoUrl = getDjangoImageUrl(property.photo_principale?.image);
  const imageUrl = photoUrl || defaultImages[property.type_bien] || houseImage;
  

  if (variant === 'horizontal') {
    return (
      <Link href={`/property/${property.id}`}>
        <Card 
          className="overflow-hidden hover-elevate cursor-pointer"
          data-testid={`card-property-${property.id}`}
        >
          <div className="flex h-24">
            <div className="relative w-28 h-full flex-shrink-0">
              <LazyImage
                src={imageUrl}
                alt={property.titre}
                className="w-full h-full"
              />
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
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 leading-none">
                        {property.type_bien_display}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center text-muted-foreground text-xs mb-1">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">{property.quartier}, {getVilleName(property.ville, property.ville_nom, property.ville_detail)}</span>
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
                  <span className="flex items-center gap-0.5">
                    <Maximize className="w-3 h-3" />
                    {property.superficie}m²
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">
                    {formaterPrix(property.prix_mensuel, property.devise)}
                    <span className="text-[10px] font-normal text-muted-foreground">/mois</span>
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
          <LazyImage
            src={imageUrl}
            alt={property.titre}
            className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
            <BadgeStatut
              famille="location"
              valeur={property.statut_location}
              libelle={property.statut_location_display}
              compact
            />
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm">
              {property.type_bien_display}
            </Badge>
          </div>
        </div>
        <CardContent className="p-2.5">
          <h3 className="font-semibold text-xs line-clamp-1 mb-1">{property.titre}</h3>
          <div className="flex items-center text-muted-foreground text-xs mb-2">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">{property.quartier}, {getVilleName(property.ville, property.ville_nom, property.ville_detail)}</span>
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
            <span className="flex items-center gap-1">
              <Maximize className="w-3 h-3" />
              <span className="md:hidden">{property.superficie}</span>
              <span className="hidden md:inline">{property.superficie}m²</span>
            </span>
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
