import { ErreurRequete } from '@/components/etats';
import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Droplets, MapPin, Search, ShieldCheck, Wallet } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { getVilleName } from '@/lib/utils';
import type { BienList, PaginatedResponse } from '@shared/schema';


export default function House() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuth();

  const { data: allProperties, isLoading, error, refetch } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/', { statut_validation: 'valide', statut_location: 'disponible' }],
    refetchInterval: 60000, // Rafraîchir toutes les 60 secondes
    refetchOnWindowFocus: true, // Rafraîchir quand l'utilisateur revient sur l'onglet
  });

  // Une seule liste : avec quelques annonces, « les plus détaillées » et
  // « derniers ajouts » montraient deux fois les mêmes maisons.
  const annonces = allProperties?.results?.slice(0, 8) ?? [];

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

  const [, setLocation] = useLocation();
  const handleSearch = () => {
    const texte = searchQuery.trim();
    setLocation(texte ? `/search?q=${encodeURIComponent(texte)}` : '/search');
  };

  return (
    <Layout>
      {/* Pas de photo d'accueil tant qu'on n'a pas de vraies photos de
          Lubumbashi : la précédente montrait une villa face à la mer, dans
          une ville qui n'en a pas.
          Court à dessein : sur téléphone, l'ancien bloc occupait tout le
          premier écran et aucune annonce n'apparaissait sans défiler. */}
      <section className="border-b border-border bg-card px-4 py-6 md:py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            Trouvez une maison à louer à Lubumbashi
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Loyer, garantie, eau et courant : tout est dit avant la visite.
          </p>

          <form
            role="search"
            className="mt-4 flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                enterKeyHint="search"
                placeholder="Quartier, commune…"
                aria-label="Rechercher un quartier, une commune ou un type de bien"
                className="h-12 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-hero-search"
              />
            </div>
            <Button type="submit" size="lg" className="h-12" data-testid="button-hero-search">
              Rechercher
            </Button>
          </form>

          {/* Le vrai nombre, lu depuis l'API — l'ancien texte promettait « des
              milliers de propriétés » quand il y en avait quatre. */}
          {!isLoading && allProperties ? (
            <p className="mt-2 text-sm text-muted-foreground" data-testid="text-nombre-annonces">
              {allProperties.count === 0
                ? 'Les premières annonces arrivent.'
                : `${allProperties.count} annonce${allProperties.count > 1 ? 's' : ''} disponible${allProperties.count > 1 ? 's' : ''} aujourd’hui.`}
            </p>
          ) : null}
        </div>
      </section>

      <section className="py-6 md:py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Dernières annonces</h2>
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
            <PropertyGrid properties={annonces} isLoading={isLoading} />
          )}
        </div>
      </section>

      {/* Une seule ville, c'est le cas aujourd'hui : la carte « Lubumbashi,
          9 biens » répétait le titre et le compteur juste au-dessus. */}
      {popularCities.length > 1 && (
        <section className="py-6 md:py-12 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="mb-4 text-xl md:mb-6 md:text-2xl font-bold">Par ville</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularCities.map((city) => (
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ce qui distingue VillaGo, après les annonces plutôt qu'avant : on
          vient d'abord pour les maisons. */}
      <section className="border-t border-border px-4 py-8">
        <ul className="mx-auto grid max-w-5xl gap-3 text-sm sm:grid-cols-3">
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
