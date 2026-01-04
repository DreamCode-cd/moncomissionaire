import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, Droplet, Zap, Car, Trees, Sofa, Snowflake, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ville {
  id: number;
  nom: string;
}

interface VillesResponse {
  results?: Ville[];
  count?: number;
}

export interface SearchFilters {
  query: string;
  type_bien?: string;
  ville?: string;
  min_price?: number;
  max_price?: number;
  min_chambres?: number;
  eau_courante?: boolean;
  electricite?: boolean;
  parking?: boolean;
  jardin?: boolean;
  meuble?: boolean;
  climatisation?: boolean;
  gardien?: boolean;
}

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const propertyTypes = [
  { value: 'all', label: 'Tous les types' },
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'villa', label: 'Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'terrain', label: 'Terrain' },
];


const amenities = [
  { key: 'eau_courante' as const, label: 'Eau courante', icon: Droplet },
  { key: 'electricite' as const, label: 'Electricite', icon: Zap },
  { key: 'parking' as const, label: 'Parking', icon: Car },
  { key: 'jardin' as const, label: 'Jardin', icon: Trees },
  { key: 'meuble' as const, label: 'Meuble', icon: Sofa },
  { key: 'climatisation' as const, label: 'Climatisation', icon: Snowflake },
  { key: 'gardien' as const, label: 'Gardien', icon: ShieldCheck },
];

export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.min_price || 0,
    filters.max_price || 5000,
  ]);

  const { data: villesData } = useQuery<VillesResponse | Ville[]>({
    queryKey: ['/api/v1/biens/villes/'],
  });
  
  const villes = Array.isArray(villesData) ? villesData : (villesData?.results || []);

  const activeAmenitiesCount = amenities.filter(a => filters[a.key]).length;
  const activeFiltersCount = [
    filters.type_bien && filters.type_bien !== 'all',
    filters.ville && filters.ville !== 'all',
    filters.min_price,
    filters.max_price,
    filters.min_chambres,
  ].filter(Boolean).length + activeAmenitiesCount;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, query: value });
  };

  const handleApplyFilters = () => {
    onFiltersChange({
      ...filters,
      min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
      max_price: priceRange[1] < 5000 ? priceRange[1] : undefined,
    });
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    setPriceRange([0, 5000]);
    onFiltersChange({ query: filters.query });
    setIsOpen(false);
  };

  const removeFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un bien..."
            className="pl-10 h-12"
            value={filters.query}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="relative" data-testid="button-filters">
              <SlidersHorizontal className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(80vh-140px)]">
            <div className="space-y-6 py-6 pr-4">
              <div className="space-y-2">
                <Label>Type de bien</Label>
                <Select
                  value={filters.type_bien || 'all'}
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    type_bien: value === 'all' ? undefined : value 
                  })}
                >
                  <SelectTrigger data-testid="select-type-bien">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ville</Label>
                <Select
                  value={filters.ville || 'all'}
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    ville: value === 'all' ? undefined : value 
                  })}
                >
                  <SelectTrigger data-testid="select-ville">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {villes.map((ville) => (
                      <SelectItem key={ville.id} value={ville.id.toString()}>
                        {ville.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Prix mensuel: ${priceRange[0]} - ${priceRange[1]}</Label>
                <Slider
                  min={0}
                  max={5000}
                  step={100}
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  className="py-4"
                  data-testid="slider-price"
                />
              </div>

              <div className="space-y-2">
                <Label>Chambres minimum</Label>
                <Select
                  value={filters.min_chambres?.toString() || 'any'}
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    min_chambres: value === 'any' ? undefined : parseInt(value) 
                  })}
                >
                  <SelectTrigger data-testid="select-chambres">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Peu importe</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Equipements</Label>
                <div className="grid grid-cols-2 gap-3">
                  {amenities.map((amenity) => {
                    const Icon = amenity.icon;
                    return (
                      <div
                        key={amenity.key}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={amenity.key}
                          checked={filters[amenity.key] || false}
                          onCheckedChange={(checked) => onFiltersChange({
                            ...filters,
                            [amenity.key]: checked === true ? true : undefined
                          })}
                          data-testid={`checkbox-${amenity.key}`}
                        />
                        <label
                          htmlFor={amenity.key}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {amenity.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={handleResetFilters} data-testid="button-reset-filters">
                Réinitialiser
              </Button>
              <Button className="flex-1" onClick={handleApplyFilters} data-testid="button-apply-filters">
                Appliquer
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {filters.type_bien && filters.type_bien !== 'all' && (
            <Badge variant="secondary" className="flex-shrink-0 gap-1">
              {propertyTypes.find(t => t.value === filters.type_bien)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter('type_bien')} />
            </Badge>
          )}
          {filters.ville && filters.ville !== 'all' && (
            <Badge variant="secondary" className="flex-shrink-0 gap-1">
              {villes.find(v => v.id.toString() === filters.ville)?.nom || filters.ville}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter('ville')} />
            </Badge>
          )}
          {filters.min_price && (
            <Badge variant="secondary" className="flex-shrink-0 gap-1">
              Min: ${filters.min_price}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter('min_price')} />
            </Badge>
          )}
          {filters.max_price && (
            <Badge variant="secondary" className="flex-shrink-0 gap-1">
              Max: ${filters.max_price}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter('max_price')} />
            </Badge>
          )}
          {filters.min_chambres && (
            <Badge variant="secondary" className="flex-shrink-0 gap-1">
              {filters.min_chambres}+ ch.
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter('min_chambres')} />
            </Badge>
          )}
          {amenities.filter(a => filters[a.key]).map((amenity) => {
            const Icon = amenity.icon;
            return (
              <Badge key={amenity.key} variant="secondary" className="flex-shrink-0 gap-1">
                <Icon className="w-3 h-3" />
                {amenity.label}
                <X className="w-3 h-3 cursor-pointer" onClick={() => removeFilter(amenity.key)} />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
