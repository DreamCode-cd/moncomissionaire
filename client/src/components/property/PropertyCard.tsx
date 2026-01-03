import { Link } from 'wouter';
import { MapPin, Bed, Bath, Maximize, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BienList } from '@shared/schema';
import { cn, getDjangoImageUrl, getVilleName } from '@/lib/utils';

import villaImage from '@assets/images/luxury_villa_hero_image.png';
import apartmentImage from '@assets/images/modern_apartment_interior.png';
import studioImage from '@assets/images/cozy_studio_apartment.png';
import houseImage from '@assets/images/family_house_with_garden.png';
import duplexImage from '@assets/images/duplex_penthouse_terrace.png';

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
  
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'en_visite':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'loue':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (variant === 'horizontal') {
    return (
      <Link href={`/property/${property.id}`}>
        <Card 
          className="overflow-hidden hover-elevate cursor-pointer"
          data-testid={`card-property-${property.id}`}
        >
          <div className="flex h-24">
            <div className="relative w-28 h-full flex-shrink-0">
              <img
                src={imageUrl}
                alt={property.titre}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="flex-1 p-2 min-w-0">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-sm line-clamp-1">{property.titre}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge 
                        variant="secondary" 
                        className={cn("text-[10px] px-1.5 py-0.5 leading-none", getStatusColor(property.statut_location))}
                      >
                        {property.statut_location_display}
                      </Badge>
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
                    {formatPrice(property.prix_mensuel)}
                    <span className="text-[10px] font-normal text-muted-foreground">/mois</span>
                  </span>
                  {rating && (
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
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
          <img
            src={imageUrl}
            alt={property.titre}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
            <Badge 
              variant="secondary" 
              className={cn("text-[10px] px-1.5 py-0.5", getStatusColor(property.statut_location))}
            >
              {property.statut_location_display}
            </Badge>
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
              {formatPrice(property.prix_mensuel)}
              <span className="text-xs font-normal text-muted-foreground">/mois</span>
            </span>
            {rating && (
              <span className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
