import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property-card";
import type { PropertyList, PaginatedResponse } from "@shared/schema";
import { apiGet } from "@/lib/api";

export function FeaturedProperties() {
  const [properties, setProperties] = useState<PropertyList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await apiGet<PaginatedResponse<PropertyList>>(
          "/properties/?ordering=-created_at&status=disponible"
        );
        setProperties(data.results);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const totalPages = Math.ceil(properties.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const visibleProperties = properties.slice(startIndex, startIndex + itemsPerPage);

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Propriétés en vedette
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Découvrez nos dernières annonces sélectionnées avec soin
            </p>
          </div>

          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevPage}
                  disabled={isLoading}
                  data-testid="button-prev-featured"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextPage}
                  disabled={isLoading}
                  data-testid="button-next-featured"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Link href="/properties">
              <Button variant="outline" className="gap-2" data-testid="link-view-all-properties">
                Voir tout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <PropertyCardSkeleton key={i} />)
          ) : visibleProperties.length > 0 ? (
            visibleProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-muted-foreground">Aucune propriété disponible pour le moment.</p>
              <Link href="/register?role=proprietaire">
                <Button variant="link" className="mt-2">
                  Devenez propriétaire et publiez votre annonce
                </Button>
              </Link>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-2 w-2 rounded-full transition-all ${
                  currentPage === i
                    ? "w-6 bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                data-testid={`button-page-dot-${i}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
