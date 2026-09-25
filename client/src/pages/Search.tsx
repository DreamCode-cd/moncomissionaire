import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { SearchBar, type SearchFilters } from '@/components/property/SearchBar';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import type { BienList, PaginatedResponse } from '@shared/schema';

const ITEMS_PER_PAGE = 10;

export default function Search() {
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const parseSearchParams = (): SearchFilters => {
    const params = new URLSearchParams(searchParams);
    const page = params.get('page') ? parseInt(params.get('page')!) : 1;
    setCurrentPage(page);
    return {
      query: params.get('q') || '',
      type_bien: params.get('type') || undefined,
      ville: params.get('ville') || undefined,
      devise: (params.get('devise') as 'USD' | 'CDF') || undefined,
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

  const buildQueryString = (f: SearchFilters, page: number = 1) => {
    const params = new URLSearchParams();
    if (f.query) params.set('q', f.query);
    if (f.type_bien) params.set('type', f.type_bien);
    if (f.ville) params.set('ville', f.ville);
    if (f.devise) params.set('devise', f.devise);
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
    if (page > 1) params.set('page', page.toString());
    return params.toString();
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    const queryString = buildQueryString(newFilters, 1);
    setLocation(`/search${queryString ? `?${queryString}` : ''}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const queryString = buildQueryString(filters, page);
    setLocation(`/search${queryString ? `?${queryString}` : ''}`);
  };

  const apiParams = useMemo(() => {
    const params: Record<string, string> = {
      statut_validation: 'valide',
      statut_location: 'disponible',
      limit: ITEMS_PER_PAGE.toString(),
      offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
    };
    if (filters.query) params.search = filters.query;
    if (filters.type_bien) params.type_bien = filters.type_bien;
    if (filters.ville) params.ville = filters.ville;
    // La devise accompagne toujours un filtre de prix : côté serveur, un
    // intervalle sans devise retombe sur le dollar et masquerait les
    // annonces en francs sans le dire.
    if (filters.devise) params.devise = filters.devise;
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
  }, [currentPage, filters]);
  
  const { data, isLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/', apiParams],
  });

  const totalPages = data?.count ? Math.ceil(data.count / ITEMS_PER_PAGE) : 0;

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
          </div>
        </div>

        <PropertyGrid
          properties={data?.results || []}
          isLoading={isLoading}
          variant={viewMode === 'list' ? 'horizontal' : 'default'}
        />

        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page);
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </Layout>
  );
}