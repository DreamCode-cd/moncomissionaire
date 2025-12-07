import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Map } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { MapView } from '@/components/property/MapView';
import { SearchBar, type SearchFilters } from '@/components/property/SearchBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BienList, PaginatedResponse } from '@shared/schema';

export default function Search() {
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>();
  
  const parseSearchParams = (): SearchFilters => {
    const params = new URLSearchParams(searchParams);
    return {
      query: params.get('q') || '',
      type_bien: params.get('type') || undefined,
      ville: params.get('ville') || undefined,
      min_price: params.get('min_price') ? parseInt(params.get('min_price')!) : undefined,
      max_price: params.get('max_price') ? parseInt(params.get('max_price')!) : undefined,
      min_chambres: params.get('chambres') ? parseInt(params.get('chambres')!) : undefined,
      eau_courante: params.get('eau_courante') === 'true' ? true : undefined,
      electricite: params.get('electricite') === 'true' ? true : undefined,
      parking: params.get('parking') === 'true' ? true : undefined,
      jardin: params.get('jardin') === 'true' ? true : undefined,
      meuble: params.get('meuble') === 'true' ? true : undefined,
      climatisation: params.get('climatisation') === 'true' ? true : undefined,
      gardien: params.get('gardien') === 'true' ? true : undefined,
    };
  };

  const [filters, setFilters] = useState<SearchFilters>(parseSearchParams);

  useEffect(() => {
    setFilters(parseSearchParams());
  }, [searchParams]);

  const buildQueryString = (f: SearchFilters) => {
    const params = new URLSearchParams();
    if (f.query) params.set('q', f.query);
    if (f.type_bien) params.set('type', f.type_bien);
    if (f.ville) params.set('ville', f.ville);
    if (f.min_price) params.set('min_price', f.min_price.toString());
    if (f.max_price) params.set('max_price', f.max_price.toString());
    if (f.min_chambres) params.set('chambres', f.min_chambres.toString());
    if (f.eau_courante) params.set('eau_courante', 'true');
    if (f.electricite) params.set('electricite', 'true');
    if (f.parking) params.set('parking', 'true');
    if (f.jardin) params.set('jardin', 'true');
    if (f.meuble) params.set('meuble', 'true');
    if (f.climatisation) params.set('climatisation', 'true');
    if (f.gardien) params.set('gardien', 'true');
    return params.toString();
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    const queryString = buildQueryString(newFilters);
    setLocation(`/search${queryString ? `?${queryString}` : ''}`);
  };

  const buildApiParams = () => {
    const params: Record<string, string> = {
      statut_validation: 'valide',
      statut_location: 'disponible',
    };
    if (filters.query) params.search = filters.query;
    if (filters.type_bien) params.type_bien = filters.type_bien;
    if (filters.ville) params.ville = filters.ville;
    if (filters.min_price) params.prix_min = filters.min_price.toString();
    if (filters.max_price) params.prix_max = filters.max_price.toString();
    if (filters.min_chambres) params.nombre_chambres_min = filters.min_chambres.toString();
    if (filters.eau_courante) params.eau_courante = 'true';
    if (filters.electricite) params.electricite = 'true';
    if (filters.parking) params.parking = 'true';
    if (filters.jardin) params.jardin = 'true';
    if (filters.meuble) params.meuble = 'true';
    if (filters.climatisation) params.climatisation = 'true';
    if (filters.gardien) params.gardien = 'true';
    return params;
  };

  const { data, isLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/', buildApiParams()],
  });

  return (
    <Layout>
      <div className="px-4 py-4 md:py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Rechercher un bien</h1>
          <SearchBar filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-sm text-muted-foreground">
            {data?.count !== undefined ? (
              <span data-testid="text-results-count">{data.count} bien{data.count !== 1 ? 's' : ''} trouvé{data.count !== 1 ? 's' : ''}</span>
            ) : (
              <span>Recherche en cours...</span>
            )}
          </p>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(viewMode === 'grid' && 'bg-muted')}
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(viewMode === 'list' && 'bg-muted')}
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(viewMode === 'map' && 'bg-muted')}
              onClick={() => setViewMode('map')}
              data-testid="button-view-map"
            >
              <Map className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <MapView 
            properties={data?.results || []} 
            selectedId={selectedPropertyId}
            onPropertySelect={setSelectedPropertyId}
            height="calc(100vh - 280px)"
            className="min-h-[400px]"
          />
        ) : (
          <PropertyGrid
            properties={data?.results || []}
            isLoading={isLoading}
            variant={viewMode === 'list' ? 'horizontal' : 'default'}
          />
        )}

        {data && data.next && (
          <div className="mt-8 text-center">
            <Button variant="outline" data-testid="button-load-more">
              Charger plus
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
