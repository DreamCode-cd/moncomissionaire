import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, Home, MessageCircle, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getDjangoImageUrl } from '@/lib/utils';
import type { DemandeVisite, PaginatedResponse, BienList } from '@shared/schema';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'en_attente':
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    case 'acceptee':
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Acceptée</Badge>;
    case 'rejetee':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejetée</Badge>;
    case 'annulee':
      return <Badge variant="outline">Annulée</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function ClientDashboard() {
  const { user } = useAuth();

  const { data: demandes, isLoading: demandesLoading } = useQuery<PaginatedResponse<DemandeVisite>>({
    queryKey: ['/api/v1/visites/client/demandes/'],
  });

  const { data: recommended, isLoading: recommendedLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/', { statut_validation: 'valide', statut_location: 'disponible' }],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const pendingDemandes = demandes?.results?.filter(d => d.statut === 'en_attente') || [];
  const acceptedDemandes = demandes?.results?.filter(d => d.statut === 'acceptee') || [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            Bonjour, {user?.first_name} !
          </h1>
          <p className="text-muted-foreground">
            Voici un résumé de votre activité
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-count">
                    {pendingDemandes.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Demandes en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-accepted-count">
                    {acceptedDemandes.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Visites confirmées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Messages non lus</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg">Mes demandes de visite</CardTitle>
              <Link href="/my-visits">
                <Button variant="ghost" size="sm">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {demandesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-20 h-20 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : demandes?.results?.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore fait de demande de visite
                  </p>
                  <Link href="/search">
                    <Button>Découvrir des biens</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {demandes?.results?.slice(0, 4).map((demande) => (
                    <div 
                      key={demande.id} 
                      className="flex gap-4 p-3 rounded-lg bg-muted/50"
                      data-testid={`demande-${demande.id}`}
                    >
                      <Link href={`/property/${demande.bien}`}>
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {demande.bien_detail?.photo_principale?.image ? (
                            <img
                              src={getDjangoImageUrl(demande.bien_detail.photo_principale.image) || undefined}
                              alt={demande.bien_detail.titre}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center ${demande.bien_detail?.photo_principale?.image ? 'hidden' : ''}`}>
                            <Home className="w-8 h-8 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium line-clamp-1">
                          {demande.bien_detail?.titre}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {formatDate(demande.date_souhaitee)} à {demande.heure_souhaitee}
                        </p>
                        <div className="mt-2">
                          {getStatusBadge(demande.statut)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg">Recommandés pour vous</CardTitle>
              <Link href="/search">
                <Button variant="ghost" size="sm">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recommendedLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recommended?.results?.slice(0, 3).map((property) => (
                    <PropertyCard 
                      key={property.id} 
                      property={property} 
                      variant="horizontal" 
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
