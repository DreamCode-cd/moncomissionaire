import { PropertyCard } from './PropertyCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { BienList } from '@shared/schema';

interface PropertyGridProps {
  properties: BienList[];
  isLoading?: boolean;
  variant?: 'default' | 'horizontal';
}

export function PropertyGrid({ properties, isLoading, variant = 'default' }: PropertyGridProps) {
  if (isLoading) {
    return (
      <div className={variant === 'horizontal' 
        ? "space-y-2" 
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
      }>
        {[...Array(6)].map((_, i) => (
          <PropertyCardSkeleton key={i} variant={variant} />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-24 h-24 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="w-12 h-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Aucun bien trouvé</h3>
        <p className="text-muted-foreground max-w-sm">
          Essayez de modifier vos critères de recherche pour trouver plus de résultats.
        </p>
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className="space-y-2">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} variant="horizontal" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}

function PropertyCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'horizontal' }) {
  if (variant === 'horizontal') {
    return (
      <div className="flex h-28 border rounded-lg overflow-hidden">
        <Skeleton className="w-36 h-full flex-shrink-0" />
        <div className="flex-1 p-2.5 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Skeleton className="aspect-[4/3]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}
