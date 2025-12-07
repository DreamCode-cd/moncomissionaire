import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Home, Plus, Eye, Clock, CheckCircle, XCircle, ChevronRight,
  Building2, TrendingUp
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getDjangoImageUrl } from '@/lib/utils';
import type { BienList, PaginatedResponse } from '@shared/schema';

const getValidationBadge = (status: string) => {
  switch (status) {
    case 'en_attente':
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    case 'valide':
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Validé</Badge>;
    case 'rejete':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getLocationBadge = (status: string) => {
  switch (status) {
    case 'disponible':
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Disponible</Badge>;
    case 'en_visite':
      return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">En visite</Badge>;
    case 'loue':
      return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Loué</Badge>;
    case 'indisponible':
      return <Badge variant="secondary">Indisponible</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function ProprietaireDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const { data: myProperties, isLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/proprietaire/'],
  });

  const properties = myProperties?.results || [];
  const pendingCount = properties.filter(p => p.statut_validation === 'en_attente').length;
  const validatedCount = properties.filter(p => p.statut_validation === 'valide').length;
  const rentedCount = properties.filter(p => p.statut_location === 'loue').length;

  const filteredProperties = activeTab === 'all' 
    ? properties 
    : properties.filter(p => {
        if (activeTab === 'pending') return p.statut_validation === 'en_attente';
        if (activeTab === 'validated') return p.statut_validation === 'valide';
        if (activeTab === 'rented') return p.statut_location === 'loue';
        return true;
      });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Mes biens
            </h1>
            <p className="text-muted-foreground">
              Gérez vos propriétés et suivez leur statut
            </p>
          </div>
          <Link href="/add-property">
            <Button data-testid="button-add-property">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un bien
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-count">
                    {properties.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-count">
                    {pendingCount}
                  </p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-validated-count">
                    {validatedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Validés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-rented-count">
                    {rentedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Loués</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all" data-testid="tab-all">
              Tous ({properties.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              En attente ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="validated" data-testid="tab-validated">
              Validés ({validatedCount})
            </TabsTrigger>
            <TabsTrigger value="rented" data-testid="tab-rented">
              Loués ({rentedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-6 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun bien</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all' 
                    ? "Vous n'avez pas encore ajouté de bien"
                    : "Aucun bien dans cette catégorie"
                  }
                </p>
                <Link href="/add-property">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un bien
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden" data-testid={`property-${property.id}`}>
                    <Link href={`/property/${property.id}`}>
                      <div className="relative aspect-[4/3]">
                        {property.photo_principale?.image ? (
                          <img
                            src={getDjangoImageUrl(property.photo_principale.image) || undefined}
                            alt={property.titre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-muted flex items-center justify-center ${property.photo_principale?.image ? 'hidden' : ''}`}>
                          <Home className="w-12 h-12 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1 mb-2">
                        {property.titre}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {property.quartier}, {property.ville}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getValidationBadge(property.statut_validation)}
                        {property.statut_validation === 'valide' && 
                          getLocationBadge(property.statut_location)
                        }
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">
                          ${parseFloat(property.prix_mensuel).toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground">/mois</span>
                        </span>
                        <Link href={`/property/${property.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Modifier
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
