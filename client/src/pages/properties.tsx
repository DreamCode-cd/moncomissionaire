import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { ChevronDown, Grid, List, MapPin } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SearchFilters } from "@/components/search-filters";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PropertyList, PaginatedResponse, PropertyFilters } from "@shared/schema";
import { apiGet, buildQueryString } from "@/lib/api";

const sortOptions = [
  { value: "-created_at", label: "Plus récent" },
  { value: "created_at", label: "Plus ancien" },
  { value: "price_per_month", label: "Prix croissant" },
  { value: "-price_per_month", label: "Prix décroissant" },
  { value: "-average_rating", label: "Mieux noté" },
  { value: "surface", label: "Surface croissante" },
  { value: "-surface", label: "Surface décroissante" },
];

export default function Properties() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  
  const [properties, setProperties] = useState<PropertyList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [filters, setFilters] = useState<PropertyFilters>(() => {
    const initial: PropertyFilters = {};
    if (urlParams.get("search")) initial.search = urlParams.get("search") || undefined;
    if (urlParams.get("property_type")) initial.property_type = urlParams.get("property_type") as PropertyFilters["property_type"];
    if (urlParams.get("city")) initial.city = urlParams.get("city") || undefined;
    return initial;
  });
  
  const [ordering, setOrdering] = useState("-created_at");

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const queryParams = buildQueryString({
        ...filters,
        ordering,
        status: "disponible",
      });
      const data = await apiGet<PaginatedResponse<PropertyList>>(`/properties/${queryParams}`);
      setProperties(data.results);
      setTotalCount(data.count);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [ordering]);

  const handleSearch = () => {
    fetchProperties();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                  Propriétés à louer
                </h1>
                {!isLoading && (
                  <p className="text-sm text-muted-foreground">
                    <MapPin className="mr-1 inline h-4 w-4" />
                    {totalCount} bien{totalCount > 1 ? "s" : ""} disponible{totalCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            isLoading={isLoading}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Trier par:</span>
              <Select value={ordering} onValueChange={setOrdering}>
                <SelectTrigger className="w-[180px]" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className={`mt-6 grid gap-6 ${
              viewMode === "grid"
                ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            }`}
          >
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <PropertyCardSkeleton key={i} />)
            ) : properties.length > 0 ? (
              properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Aucun bien trouvé</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Essayez de modifier vos critères de recherche pour trouver plus de résultats.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setFilters({});
                    handleSearch();
                  }}
                  data-testid="button-reset-search"
                >
                  Réinitialiser la recherche
                </Button>
              </div>
            )}
          </div>

          {!isLoading && totalCount > properties.length && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setFilters({ ...filters, page: (filters.page || 1) + 1 });
                  handleSearch();
                }}
                data-testid="button-load-more"
              >
                Charger plus
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
