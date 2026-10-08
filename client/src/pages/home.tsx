import { EtatVide, ErreurRequete } from '@/components/etats';
import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Droplets, MapPin, Search, ShieldCheck, Wallet } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getVilleName } from '@/lib/utils';
import type { BienList, PaginatedResponse, AvisBien } from '@shared/schema';


export default function House() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuth();

  const { data: allProperties, isLoading, error, refetch } = useQuery<PaginatedResponse<BienList>>({
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
    const superficie = parseFloat(property.superficie ?? '');
    if (superficie > 0) score += Math.min(superficie / 10, 10);
    
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
      {/* Pas de photo d'accueil tant qu'on n'a pas de vraies photos de
          Lubumbashi : la précédente montrait une villa face à la mer, dans
          une ville qui n'en a pas. Le premier écran doit dire où l'on est. */}
      <section className="border-b border-border bg-card px-4 py-10 md:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary">
            <MapPin className="h-4 w-4" aria-hidden /> Lubumbashi
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            Trouvez une maison à louer, et sachez à quoi vous attendre avant de vous déplacer.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Les annonces sont publiées par des commissionnaires et des propriétaires de la ville.
            Chacune dit le loyer, la garantie, l’eau et le courant.
          </p>

          <div className="mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="text"
                placeholder="Quartier, commune ou type de bien…"
                className="h-12 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="input-hero-search"
              />
            </div>
            <Button size="lg" onClick={handleSearch} className="h-12" data-testid="button-hero-search">
              Rechercher
            </Button>
          </div>

          {/* Le vrai nombre, lu depuis l'API — l'ancien texte promettait « des
              milliers de propriétés » quand il y en avait quatre. */}
          {!isLoading && allProperties ? (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="text-nombre-annonces">
              {allProperties.count === 0
                ? 'Les premières annonces arrivent.'
                : `${allProperties.count} annonce${allProperties.count > 1 ? 's' : ''} disponible${allProperties.count > 1 ? 's' : ''} aujourd’hui.`}
            </p>
          ) : null}

          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-start gap-2">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>Loyer et garantie affichés, trois mois au plus comme le veut la loi.</span>
            </li>
            <li className="flex items-start gap-2">
              <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>L’eau et le courant dits clairement : REGIDESO, forage, délestages.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>Un badge signale les commissionnaires dont l’équipe VillaGo a vérifié l’identité.</span>
            </li>
          </ul>
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
            ) : error && !allProperties ? (
              <ErreurRequete erreur={error} className="col-span-full py-8" onReessayer={() => void refetch()} />
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
            {/* Ce n'est pas une sélection éditoriale : un tri sur le nombre de
                pièces et la surface. Le titre dit ce qu'il fait. */}
            <h2 className="text-xl md:text-2xl font-bold">Les annonces les plus détaillées</h2>
            <Link href="/search">
              <Button variant="ghost" className="gap-1" data-testid="link-view-all">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {error && !allProperties ? (
            <ErreurRequete erreur={error} titre="Les annonces n’ont pas pu être chargées" onReessayer={() => void refetch()} />
          ) : (
            <PropertyGrid properties={featuredProperties} isLoading={isLoading} />
          )}
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
        <section className="bg-muted/40 px-4 py-12 md:py-16">
          {/* La plateforme repose sur les commissionnaires : l'ancien appel ne
              s'adressait qu'aux propriétaires. */}
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-bold">Vous êtes commissionnaire ?</h2>
              <p className="mt-2 text-muted-foreground">
                Gérez vos maisons, vos bailleurs et vos visites depuis votre téléphone. Votre carnet reste à vous : aucun confrère ne le voit.
              </p>
              <Link href="/register?role=commissionnaire">
                <Button className="mt-5" data-testid="button-devenir-commissionnaire">
                  Créer mon compte commissionnaire
                </Button>
              </Link>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-bold">Vous êtes propriétaire ?</h2>
              <p className="mt-2 text-muted-foreground">
                Publiez votre bien vous-même. Les demandes de visite sont suivies par l’équipe VillaGo.
              </p>
              <Link href="/register?role=proprietaire">
                <Button variant="outline" className="mt-5" data-testid="button-become-owner">
                  Publier mon bien
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
