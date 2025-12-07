import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocation } from 'wouter';
import { MapPin, Bed, Bath, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDjangoImageUrl } from '@/lib/utils';
import type { BienList, BienDetail } from '@shared/schema';

import 'leaflet/dist/leaflet.css';

import villaImage from '@assets/generated_images/luxury_villa_hero_image.png';
import apartmentImage from '@assets/generated_images/modern_apartment_interior.png';
import studioImage from '@assets/generated_images/cozy_studio_apartment.png';
import houseImage from '@assets/generated_images/family_house_with_garden.png';
import duplexImage from '@assets/generated_images/duplex_penthouse_terrace.png';

const defaultImages: Record<string, string> = {
  villa: villaImage,
  appartement: apartmentImage,
  studio: studioImage,
  maison: houseImage,
  duplex: duplexImage,
  terrain: houseImage,
};

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createCustomIcon = (selected: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${selected ? 'hsl(var(--primary))' : 'hsl(var(--background))'};
        border: 2px solid ${selected ? 'hsl(var(--primary))' : 'hsl(var(--border))'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${selected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface MapViewProps {
  properties?: BienList[];
  singleProperty?: BienDetail;
  selectedId?: number;
  onPropertySelect?: (id: number) => void;
  className?: string;
  height?: string;
}

function FitBounds({ properties, singleProperty }: { properties?: BienList[]; singleProperty?: BienDetail }) {
  const map = useMap();
  
  useEffect(() => {
    if (singleProperty?.latitude && singleProperty?.longitude) {
      const lat = parseFloat(singleProperty.latitude);
      const lng = parseFloat(singleProperty.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 15);
      }
    } else if (properties && properties.length > 0) {
      const validProperties = properties.filter(p => p.latitude && p.longitude);
      
      if (validProperties.length > 0) {
        const bounds = L.latLngBounds(
          validProperties.map(p => [parseFloat(p.latitude!), parseFloat(p.longitude!)])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, properties, singleProperty]);

  return null;
}

export function MapView({ 
  properties, 
  singleProperty,
  selectedId,
  onPropertySelect,
  className = '',
  height = '400px'
}: MapViewProps) {
  const [, setLocation] = useLocation();
  const mapRef = useRef<L.Map>(null);

  const defaultCenter: [number, number] = [5.345317, -4.024429];
  const defaultZoom = singleProperty ? 15 : 12;

  const formatPrice = (price?: string) => {
    if (!price) return 'N/A';
    const num = parseFloat(price);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getValidProperties = (): Array<{ property: BienList | BienDetail; lat: number; lng: number }> => {
    if (singleProperty?.latitude && singleProperty?.longitude) {
      const lat = parseFloat(singleProperty.latitude);
      const lng = parseFloat(singleProperty.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [{ property: singleProperty, lat, lng }];
      }
    }
    
    if (!properties) return [];
    
    return properties
      .filter(p => p.latitude && p.longitude)
      .map(p => ({
        property: p,
        lat: parseFloat(p.latitude!),
        lng: parseFloat(p.longitude!),
      }))
      .filter(({ lat, lng }) => !isNaN(lat) && !isNaN(lng));
  };

  const validProperties = getValidProperties();

  if (validProperties.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ height }}
        data-testid="map-no-properties"
      >
        <div className="text-center text-muted-foreground p-4">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Aucun bien avec coordonnées disponible</p>
        </div>
      </div>
    );
  }

  const initialCenter: [number, number] = validProperties.length > 0 
    ? [validProperties[0].lat, validProperties[0].lng]
    : defaultCenter;

  return (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{ height }} data-testid="map-container">
      <MapContainer
        center={initialCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds properties={properties} singleProperty={singleProperty} />
        
        {validProperties.map(({ property, lat, lng }) => (
          <Marker
            key={property.id}
            position={[lat, lng]}
            icon={createCustomIcon(selectedId === property.id)}
            eventHandlers={{
              click: () => {
                if (onPropertySelect) {
                  onPropertySelect(property.id);
                }
              },
            }}
          >
            <Popup className="property-popup" closeButton={false}>
              <div className="w-64" data-testid={`popup-property-${property.id}`}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-t-md -mx-3 -mt-3">
                  <img
                    src={getDjangoImageUrl(property.photo_principale?.image) || defaultImages[property.type_bien] || houseImage}
                    alt={property.titre}
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm"
                  >
                    {property.type_bien_display}
                  </Badge>
                </div>
                
                <div className="p-2 space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-1">{property.titre}</h3>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="line-clamp-1">{property.quartier}, {property.ville}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3 h-3" />
                      {property.nombre_chambres}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="w-3 h-3" />
                      {property.nombre_salles_bain}
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize className="w-3 h-3" />
                      {property.superficie}m²
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-bold text-primary">
                      {formatPrice(property.prix_mensuel)}/mois
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => setLocation(`/property/${property.id}`)}
                      data-testid={`button-view-property-${property.id}`}
                    >
                      Voir
                    </Button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
