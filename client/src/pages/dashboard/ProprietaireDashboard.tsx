import { EtatVide } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  House, Plus, Clock, CircleCheck, CircleX,
  Building2, TrendingUp, MapPin, Pencil
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { getDjangoImageUrl, getVilleName } from '@/lib/utils';
import type { BienList, PaginatedResponse } from '@shared/schema';
import { formaterLoyer } from '@/lib/prix';

const locationStatuses = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_visite', label: 'En visite' },
  { value: 'loue', label: 'Loué' },
  { value: 'indisponible', label: 'Indisponible' },
];



export default function ProprietaireDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const { data: myProperties, isLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/proprietaire/'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await api.request(`/api/v1/biens/proprietaire/${id}/`, {
        method: 'PATCH',
        body: { statut_location: status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/proprietaire/'] });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du bien a été modifié.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    },
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
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 md:w-16 md:h-16">
                <AvatarImage src={user?.photo} alt={user?.username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {user?.first_name?.[0]?.toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-sm text-muted-foreground">Propriétaire</p>
              </div>
            </div>
            <Link href="/add-property">
              <Button size="sm" data-testid="button-add-property">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-bold" data-testid="text-total-count">
                    {properties.length}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-statut-attente-fond flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-statut-attente" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-bold" data-testid="text-pending-count">
                    {pendingCount}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-statut-favorable-fond flex items-center justify-center shrink-0">
                  <CircleCheck className="w-4 h-4 text-statut-favorable" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-bold" data-testid="text-validated-count">
                    {validatedCount}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Validés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-statut-information-fond flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-statut-information" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-bold" data-testid="text-rented-count">
                    {rentedCount}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Loués</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" data-testid="tab-all" className="text-xs md:text-sm">
              Tous ({properties.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending" className="text-xs md:text-sm">
              Attente ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="validated" data-testid="tab-validated" className="text-xs md:text-sm">
              Validés ({validatedCount})
            </TabsTrigger>
            <TabsTrigger value="rented" data-testid="tab-rented" className="text-xs md:text-sm">
              Loués ({rentedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[16/10]" />
                    <CardContent className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProperties.length === 0 ? (
              <EtatVide
                icone={House}
                titre="Aucun bien"
                description={
                  activeTab === 'all'
                    ? "Publiez votre premier bien : les annonces avec photos reçoivent nettement plus de demandes de visite."
                    : 'Aucun bien dans cette catégorie pour le moment.'
                }
                action={
                  activeTab === 'all' ? (
                    <Link href="/add-property">
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter un bien
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden" data-testid={`property-${property.id}`}>
                    <Link href={`/property/${property.id}`}>
                      <div className="relative aspect-[16/10]">
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
                          <House className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="absolute top-2 left-2">
                          <BadgeStatut famille="validation" valeur={property.statut_validation} />
                        </div>
                      </div>
                    </Link>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                        {property.titre}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {property.quartier}, {getVilleName(property.ville, property.ville_nom, property.ville_detail)}
                      </p>
                      
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-sm">
                          {formaterLoyer(property.prix_mensuel, property.devise)}
                        </span>
                        {property.statut_validation === 'valide' && (
                          <Select
                            value={property.statut_location}
                            onValueChange={(value) => updateStatusMutation.mutate({ id: property.id, status: value })}
                          >
                            <SelectTrigger className="h-7 text-xs w-[110px]" data-testid={`select-status-${property.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {locationStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value} className="text-xs">
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <Link href={`/property/${property.id}/edit`}>
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                          <Pencil className="w-3 h-3 mr-1" />
                          Modifier
                        </Button>
                      </Link>
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
