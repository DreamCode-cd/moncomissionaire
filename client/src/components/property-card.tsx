import { Link } from "wouter";
import { Heart, Star, MapPin, Bed, Bath, Maximize2, Car, Trees, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PropertyList } from "@shared/schema";
import { useState } from "react";

interface PropertyCardProps {
  property: PropertyList;
  onFavoriteToggle?: (id: number) => void;
  isFavorite?: boolean;
}

const propertyTypeLabels: Record<string, string> = {
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  maison: "Maison",
  duplex: "Duplex",
  loft: "Loft",
  penthouse: "Penthouse",
};

const statusColors: Record<string, string> = {
  disponible: "bg-green-500/10 text-green-600 dark:text-green-400",
  louee: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  en_attente: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  indisponible: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function PropertyCard({ property, onFavoriteToggle, isFavorite = false }: PropertyCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const placeholderImage = `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop`;
  const imageUrl = property.main_image?.image || placeholderImage;

  return (
    <Link href={`/properties/${property.id}`}>
      <Card
        className="group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`card-property-${property.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageUrl}
            alt={property.title}
            className={`h-full w-full object-cover transition-transform duration-500 ${
              isHovered ? "scale-110" : "scale-100"
            }`}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {propertyTypeLabels[property.property_type] || property.property_type_display}
            </Badge>
            <Badge className={`${statusColors[property.status]} backdrop-blur-sm`}>
              {property.status_display}
            </Badge>
          </div>

          {onFavoriteToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavoriteToggle(property.id);
              }}
              data-testid={`button-favorite-${property.id}`}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                }`}
              />
            </Button>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 backdrop-blur-sm">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">{property.city}, {property.country}</span>
            </div>
            
            {property.average_rating && parseFloat(property.average_rating) > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">
                  {parseFloat(property.average_rating).toFixed(1)}
                </span>
                {property.total_reviews && (
                  <span className="text-xs text-muted-foreground">
                    ({property.total_reviews})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="line-clamp-1 text-lg font-semibold transition-colors group-hover:text-primary">
            {property.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms} ch.</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms} sdb.</span>
            </div>
            <div className="flex items-center gap-1">
              <Maximize2 className="h-4 w-4" />
              <span>{property.surface} m²</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {property.is_furnished && (
              <Badge variant="outline" className="text-xs">Meublé</Badge>
            )}
            {property.has_parking && (
              <Badge variant="outline" className="text-xs">
                <Car className="mr-1 h-3 w-3" />
                Parking
              </Badge>
            )}
            {property.has_garden && (
              <Badge variant="outline" className="text-xs">
                <Trees className="mr-1 h-3 w-3" />
                Jardin
              </Badge>
            )}
            {property.has_pool && (
              <Badge variant="outline" className="text-xs">
                <Waves className="mr-1 h-3 w-3" />
                Piscine
              </Badge>
            )}
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(property.price_per_month)}
              </span>
              <span className="text-sm text-muted-foreground"> / mois</span>
            </div>
            <span className="text-xs text-muted-foreground">
              par {property.owner.first_name}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <CardContent className="p-4">
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 flex gap-3">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-3 flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
