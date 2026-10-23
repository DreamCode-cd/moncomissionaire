import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Heart } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { EtatVide, ErreurRequete } from '@/components/etats';
import { Button } from '@/components/ui/button';
import type { BienList, PaginatedResponse } from '@shared/schema';

interface Favori {
  id: number;
  bien: BienList;
  created_at: string;
}

export const CLE_FAVORIS = ['/api/v1/biens/favoris/'];

/**
 * Les biens mis de côté.
 *
 * Le cœur de la fiche enregistrait le favori, mais aucune page ne les
 * montrait : un bien mis en favori ne se retrouvait plus.
 */
export default function MesFavoris() {
  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Favori>>({
    queryKey: CLE_FAVORIS,
  });
  const biens = (data?.results ?? []).map((favori) => favori.bien);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        <h1 className="mb-4 text-2xl font-bold">Mes favoris</h1>
        {error && !data ? (
          <ErreurRequete erreur={error} onReessayer={() => void refetch()} className="py-12" />
        ) : !isLoading && biens.length === 0 ? (
          <EtatVide
            icone={Heart}
            titre="Aucun favori pour l’instant"
            description="Touchez le cœur sur la fiche d’un bien pour le retrouver ici."
            action={
              <Link href="/search">
                <Button>Voir les annonces</Button>
              </Link>
            }
            className="py-12"
          />
        ) : (
          <PropertyGrid properties={biens} isLoading={isLoading} />
        )}
      </div>
    </Layout>
  );
}
