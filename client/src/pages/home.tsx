import { EtatVide } from '@/components/etats';
import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MapPin, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getVilleName } from '@/lib/utils';
import type { BienList, PaginatedResponse, AvisBien } from '@shared/schema';

import heroImage from '@assets/images/luxury_villa_hero_image.png';

export default function House() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuth();

  const { data: allProperties, isLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/', { statut_validation: 'valide', statut_location: 'disponible' }],
    refetchInterval: 60000, // Rafraîchir toutes les 60 secondes
    refetchOnWindowFocus: true, // Rafraîchir quand l'utilisateur revient sur l'onglet
  });

  // Calculate property details score (more amenities/features = higher score)
  const calculateDetailsScore = (property: BienList) => {
    let score = 0;
    
    // Features that add to the score
    if (property.nombre_chambres > 0) score += property.nombre_chambres;
    if (property.nombre_salles_bain > 0) score += property.nombre_salles_bain;
    if (parseFloat(property.superficie) > 0) score += Math.min(parseFloat(property.superficie) / 10, 10);
    
    return score;
  };

  // Get featured properties sorted by rating or details
  const featuredProperties = useMemo(() => {
    if (!allProperties?.results) return [];
    
    // Create a copy of the properties array to sort
    const propertiesWithScores = allProperties.results.map(property => ({
      property,
      detailsScore: calculateDetailsScore(property)
    }));
    
    // Sort by details score descending
    return propertiesWithScores
      .sort((a, b) => b.detailsScore - a.detailsScore)
      .slice(0, 8)
      .map(item => item.property);
  }, [allProperties?.results]);

  // Calculate popular cities from real property data
  const popularCities = useMemo(() => {
    if (!allProperties?.results) return [];
    
    const cityData: Record<string, { count: number; id: string }> = {};
    
    allProperties.results.forEach((property) => {
      const cityName = getVilleName(property.ville, property.ville_nom, property.ville_detail)?.trim();
      const cityId = property.ville_detail?.id?.toString() || 
                     (typeof property.ville === 'number' ? property.ville.toString() : '');
      if (cityName && cityId) {
        if (!cityData[cityName]) {
          cityData[cityName] = { count: 0, id: cityId };
        }
        cityData[cityName].count += 1;
      }
    });
    
    // Sort by count descending and take top 4
    return Object.entries(cityData)
      .map(([name, data]) => ({ name, count: data.count, id: data.id }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [allProperties?.results]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <Layout>
      <section className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
            Trouvez votre maison idéale
          </h1>
          <p className="text-white/90 text-base md:text-lg mb-6 md:mb-8 max-w-xl mx-auto">
            Découvrez des milliers de propriétés à louer dans les meilleures villes du pays
          </p>
          
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 md:p-3 max-w-xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                <Input
                  type="text"
                  placeholder="Ville, quartier ou type de bien..."
                  className="pl-10 h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="input-hero-search"
                />
              </div>
              <Button 
                size="lg" 
                onClick={handleSearch}
                className="h-12"
                data-testid="button-hero-search"
              >
                Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Villes populaires</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            ) : popularCities.length > 0 ? (
              popularCities.map((city) => (
                <Link key={city.name} href={`/search?ville=${city.id}`}>
                  <div 
                    className="bg-card rounded-lg p-4 hover-elevate cursor-pointer border border-border"
                    data-testid={`link-city-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{city.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {city.count} bien{city.count > 1 ? 's' : ''} disponible{city.count > 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <EtatVide
                icone={MapPin}
                titre="Aucune ville disponible"
                description="Les villes apparaîtront ici dès que des biens y seront publiés."
                className="col-span-full py-8"
              />
            )}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Biens en vedette</h2>
            <Link href="/search">
              <Button variant="ghost" className="gap-1" data-testid="link-view-all">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <PropertyGrid 
            properties={featuredProperties} 
            isLoading={isLoading}
          />
        </div>
      </section>

      <section className="py-8 md:py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Derniers ajouts</h2>
            <Link href="/search?sort=recent">
              <Button variant="ghost" className="gap-1" data-testid="link-recent">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {allProperties?.results?.slice(0, 5).map((property) => (
              <PropertyCard key={property.id} property={property} variant="horizontal" />
            ))}
          </div>
        </div>
      </section>

      {!isAuthenticated && (
        <section className="py-12 md:py-20 px-4 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-4xl font-bold mb-4">
              Vous êtes propriétaire ?
            </h2>
            <p className="text-primary-foreground/90 mb-8 max-w-xl mx-auto">
              Publiez votre bien gratuitement et trouvez des locataires qualifiés rapidement.
            </p>
            <Link href="/register?role=proprietaire">
              <Button 
                variant="secondary" 
                size="lg"
                data-testid="button-become-owner"
              >
                Devenir propriétaire
              </Button>
            </Link>
          </div>
        </section>
      )}
    </Layout>
  );
}
