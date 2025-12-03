import { useState } from "react";
import { Search, SlidersHorizontal, X, MapPin, Bed, Bath, Euro, Home, Car, Trees, Waves, Dog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { PropertyFilters, PropertyType } from "@shared/schema";

interface SearchFiltersProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "villa", label: "Villa" },
  { value: "appartement", label: "Appartement" },
  { value: "studio", label: "Studio" },
  { value: "maison", label: "Maison" },
  { value: "duplex", label: "Duplex" },
  { value: "loft", label: "Loft" },
  { value: "penthouse", label: "Penthouse" },
];

export function SearchFilters({ filters, onFiltersChange, onSearch, isLoading }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([
    filters.price_per_month__gte || 0,
    filters.price_per_month__lte || 10000,
  ]);
  const [surfaceRange, setSurfaceRange] = useState([
    filters.surface__gte || 0,
    filters.surface__lte || 500,
  ]);

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value !== undefined && value !== "" && key !== "page" && key !== "ordering"
  ).length;

  const handlePriceChange = (values: number[]) => {
    setPriceRange(values);
    onFiltersChange({
      ...filters,
      price_per_month__gte: values[0] > 0 ? values[0] : undefined,
      price_per_month__lte: values[1] < 10000 ? values[1] : undefined,
    });
  };

  const handleSurfaceChange = (values: number[]) => {
    setSurfaceRange(values);
    onFiltersChange({
      ...filters,
      surface__gte: values[0] > 0 ? values[0] : undefined,
      surface__lte: values[1] < 500 ? values[1] : undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setPriceRange([0, 10000]);
    setSurfaceRange([0, 500]);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par ville, adresse..."
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        <div className="flex gap-2">
          <Select
            value={filters.property_type || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                property_type: value === "all" ? undefined : (value as PropertyType),
              })
            }
          >
            <SelectTrigger className="w-[160px]" data-testid="select-property-type">
              <Home className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Type de bien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {propertyTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-filters">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] overflow-y-auto sm:max-w-[400px]">
              <SheetHeader>
                <SheetTitle>Filtres de recherche</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Localisation</Label>
                  </div>
                  <Input
                    placeholder="Ville..."
                    value={filters.city || ""}
                    onChange={(e) => onFiltersChange({ ...filters, city: e.target.value })}
                    data-testid="input-city"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Prix mensuel</Label>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={priceRange}
                      min={0}
                      max={10000}
                      step={100}
                      onValueChange={handlePriceChange}
                      data-testid="slider-price"
                    />
                    <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                      <span>{formatPrice(priceRange[0])}</span>
                      <span>{formatPrice(priceRange[1])}{priceRange[1] >= 10000 ? "+" : ""}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Chambres</Label>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={num}
                        variant={filters.bedrooms__gte === num ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          onFiltersChange({
                            ...filters,
                            bedrooms__gte: filters.bedrooms__gte === num ? undefined : num,
                          })
                        }
                        data-testid={`button-bedrooms-${num}`}
                      >
                        {num}+
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Salles de bain</Label>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <Button
                        key={num}
                        variant={filters.bathrooms__gte === num ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          onFiltersChange({
                            ...filters,
                            bathrooms__gte: filters.bathrooms__gte === num ? undefined : num,
                          })
                        }
                        data-testid={`button-bathrooms-${num}`}
                      >
                        {num}+
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="font-medium">Surface (m²)</Label>
                  <div className="px-2">
                    <Slider
                      value={surfaceRange}
                      min={0}
                      max={500}
                      step={10}
                      onValueChange={handleSurfaceChange}
                      data-testid="slider-surface"
                    />
                    <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                      <span>{surfaceRange[0]} m²</span>
                      <span>{surfaceRange[1]}{surfaceRange[1] >= 500 ? "+" : ""} m²</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="font-medium">Équipements</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="furnished"
                        checked={filters.is_furnished || false}
                        onCheckedChange={(checked) =>
                          onFiltersChange({ ...filters, is_furnished: checked || undefined })
                        }
                        data-testid="checkbox-furnished"
                      />
                      <Label htmlFor="furnished" className="text-sm font-normal cursor-pointer">
                        Meublé
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="parking"
                        checked={filters.has_parking || false}
                        onCheckedChange={(checked) =>
                          onFiltersChange({ ...filters, has_parking: checked || undefined })
                        }
                        data-testid="checkbox-parking"
                      />
                      <Label htmlFor="parking" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                        <Car className="h-3 w-3" /> Parking
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="garden"
                        checked={filters.has_garden || false}
                        onCheckedChange={(checked) =>
                          onFiltersChange({ ...filters, has_garden: checked || undefined })
                        }
                        data-testid="checkbox-garden"
                      />
                      <Label htmlFor="garden" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                        <Trees className="h-3 w-3" /> Jardin
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pool"
                        checked={filters.has_pool || false}
                        onCheckedChange={(checked) =>
                          onFiltersChange({ ...filters, has_pool: checked || undefined })
                        }
                        data-testid="checkbox-pool"
                      />
                      <Label htmlFor="pool" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                        <Waves className="h-3 w-3" /> Piscine
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pets"
                        checked={filters.pets_allowed || false}
                        onCheckedChange={(checked) =>
                          onFiltersChange({ ...filters, pets_allowed: checked || undefined })
                        }
                        data-testid="checkbox-pets"
                      />
                      <Label htmlFor="pets" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                        <Dog className="h-3 w-3" /> Animaux
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex-1"
                  data-testid="button-clear-filters"
                >
                  <X className="mr-2 h-4 w-4" />
                  Effacer
                </Button>
                <Button
                  onClick={() => {
                    onSearch();
                    setIsOpen(false);
                  }}
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="button-apply-filters"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Appliquer
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Button onClick={onSearch} disabled={isLoading} data-testid="button-search">
            <Search className="mr-2 h-4 w-4" />
            Rechercher
          </Button>
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtres actifs:</span>
          {filters.city && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {filters.city}
              <button
                onClick={() => onFiltersChange({ ...filters, city: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.property_type && (
            <Badge variant="secondary" className="gap-1">
              {propertyTypes.find((t) => t.value === filters.property_type)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, property_type: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.bedrooms__gte && (
            <Badge variant="secondary" className="gap-1">
              <Bed className="h-3 w-3" />
              {filters.bedrooms__gte}+ ch.
              <button
                onClick={() => onFiltersChange({ ...filters, bedrooms__gte: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filters.price_per_month__gte || filters.price_per_month__lte) && (
            <Badge variant="secondary" className="gap-1">
              <Euro className="h-3 w-3" />
              {filters.price_per_month__gte ? formatPrice(filters.price_per_month__gte) : "0"} -
              {filters.price_per_month__lte ? formatPrice(filters.price_per_month__lte) : "10 000€+"}
              <button
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    price_per_month__gte: undefined,
                    price_per_month__lte: undefined,
                  })
                }
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
            data-testid="button-clear-all-filters"
          >
            Tout effacer
          </Button>
        </div>
      )}
    </div>
  );
}
