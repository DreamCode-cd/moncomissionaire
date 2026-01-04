import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, Clock, CheckCircle, XCircle, FileText, User, Eye, ArrowLeft, Home } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDjangoImageUrl } from '@/lib/utils';
import type { DemandeVisite, PaginatedResponse, RapportVisite, Visite } from '@shared/schema';

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
    case 'terminee':
      return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400"><CheckCircle className="w-3 h-3 mr-1" />Terminée</Badge>;
    case 'planifiee':
      return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400"><Calendar className="w-3 h-3 mr-1" />Planifiée</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getEtatBadge = (etat: string) => {
  switch (etat) {
    case 'tres_interessant':
      return <Badge className="bg-green-600 text-white">Très intéressant</Badge>;
    case 'interessant':
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Intéressant</Badge>;
    case 'moyen':
      return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Moyen</Badge>;
    case 'peu_interessant':
      return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400">Peu intéressant</Badge>;
    case 'non_recommande':
      return <Badge variant="destructive">Non recommandé</Badge>;
    default:
      return <Badge variant="secondary">{etat}</Badge>;
  }
};

interface DemandeWithVisite extends DemandeVisite {
  visite_detail?: Visite & { rapport?: RapportVisite };
}

export default function MyVisits() {
  const [selectedReport, setSelectedReport] = useState<RapportVisite | null>(null);

  const { data: demandes, isLoading } = useQuery<PaginatedResponse<DemandeWithVisite>>({
    queryKey: ['/api/v1/visites/client/demandes/'],
    refetchOnWindowFocus: true,
  });

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const allDemandes = demandes?.results || [];
  const pendingDemandes = allDemandes.filter(d => d.statut === 'en_attente');
  const acceptedDemandes = allDemandes.filter(d => d.statut === 'acceptee' || d.visite_detail?.statut === 'planifiee');
  const completedDemandes = allDemandes.filter(d => d.visite_detail?.statut === 'terminee');
  const rejectedDemandes = allDemandes.filter(d => d.statut === 'rejetee' || d.statut === 'annulee');

  const renderDemandeCard = (demande: DemandeWithVisite) => (
    <Card key={demande.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Link href={`/property/${demande.bien}`}>
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer">
              {demande.bien_detail?.photo_principale?.image ? (
                <img
                  src={getDjangoImageUrl(demande.bien_detail.photo_principale.image) || undefined}
                  alt={demande.bien_detail.titre}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/property/${demande.bien}`}>
              <h3 className="font-semibold truncate hover:text-primary cursor-pointer">
                {demande.bien_detail?.titre || `Bien #${demande.bien}`}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {demande.bien_detail?.quartier}
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {getStatusBadge(demande.visite_detail?.statut || demande.statut)}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Demandée le {formatDate(demande.created_at)}</span>
              </div>
              {demande.date_souhaitee && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Souhaitée: {formatDate(demande.date_souhaitee)} à {formatTime(demande.heure_souhaitee)}</span>
                </div>
              )}
              {demande.visite_detail?.date_visite && (
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="w-4 h-4" />
                  <span>Planifiée: {formatDate(demande.visite_detail.date_visite)} à {formatTime(demande.visite_detail.heure_visite)}</span>
                </div>
              )}
            </div>
            {demande.visite_detail?.agent_detail && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={demande.visite_detail.agent_detail.photo} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">
                    {demande.visite_detail.agent_detail.first_name} {demande.visite_detail.agent_detail.last_name}
                  </p>
                  <p className="text-muted-foreground">Agent assigné</p>
                </div>
              </div>
            )}
            {demande.visite_detail?.rapport && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSelectedReport(demande.visite_detail?.rapport || null)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Voir le rapport
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-12">
      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="w-24 h-24 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/my-visits">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Mes demandes de visite</h1>
            <p className="text-muted-foreground">
              {allDemandes.length} demande{allDemandes.length > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="overflow-x-auto pb-2 mb-4 -mx-4 px-4">
            <TabsList className="inline-flex w-max min-w-full sm:w-full sm:grid sm:grid-cols-5 gap-1">
              <TabsTrigger value="all" className="text-xs whitespace-nowrap px-3">
                Toutes ({allDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs whitespace-nowrap px-3">
                En attente ({pendingDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="accepted" className="text-xs whitespace-nowrap px-3">
                Acceptées ({acceptedDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs whitespace-nowrap px-3">
                Terminées ({completedDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs whitespace-nowrap px-3">
                Rejetées ({rejectedDemandes.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            {isLoading ? renderLoadingSkeleton() : 
              allDemandes.length === 0 ? renderEmptyState("Vous n'avez pas encore fait de demande de visite") :
              <div className="space-y-4">{allDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="pending">
            {isLoading ? renderLoadingSkeleton() :
              pendingDemandes.length === 0 ? renderEmptyState("Aucune demande en attente") :
              <div className="space-y-4">{pendingDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="accepted">
            {isLoading ? renderLoadingSkeleton() :
              acceptedDemandes.length === 0 ? renderEmptyState("Aucune demande acceptée") :
              <div className="space-y-4">{acceptedDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="completed">
            {isLoading ? renderLoadingSkeleton() :
              completedDemandes.length === 0 ? renderEmptyState("Aucune visite terminée") :
              <div className="space-y-4">{completedDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="rejected">
            {isLoading ? renderLoadingSkeleton() :
              rejectedDemandes.length === 0 ? renderEmptyState("Aucune demande rejetée") :
              <div className="space-y-4">{rejectedDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Rapport de visite
              </DialogTitle>
              <DialogDescription>
                {selectedReport && `Visite du ${formatDate(selectedReport.created_at)}`}
              </DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 pr-4">
                  <div>
                    <Label className="text-muted-foreground">État général du bien</Label>
                    <div className="mt-1">
                      {getEtatBadge(selectedReport.etat_general)}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">Points positifs</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.points_positifs || 'Aucun point positif mentionné'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">Points négatifs</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.points_negatifs || 'Aucun point négatif mentionné'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Recommandations</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.recommandations || 'Aucune recommandation'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Commentaires</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.commentaires || 'Aucun commentaire'}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
