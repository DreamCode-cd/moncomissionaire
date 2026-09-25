import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { formaterDateLongue } from '@/lib/dates';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, House, MessageCircle, ChevronRight, Clock, CircleCheck, CircleX, FileText, CircleAlert, User, Eye } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { getDjangoImageUrl } from '@/lib/utils';
import type { DemandeVisite, PaginatedResponse, BienList, RapportVisite, Visite } from '@shared/schema';



// Extended interface to handle visite_detail with rapport
interface DemandeWithVisite extends DemandeVisite {
  visite_detail?: Visite & { rapport?: RapportVisite };
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<RapportVisite | null>(null);

  const { data: demandes, isLoading: demandesLoading } = useQuery<PaginatedResponse<DemandeWithVisite>>({
    queryKey: ['/api/v1/visites/client/demandes/'],
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  const { data: recommended, isLoading: recommendedLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/', { statut_validation: 'valide', statut_location: 'disponible' }],
    refetchOnWindowFocus: true,
  });


  const pendingDemandes = demandes?.results?.filter(d => d.statut === 'en_attente') || [];
  const acceptedDemandes = demandes?.results?.filter(d => d.statut === 'acceptee') || [];
  
  // Get demandes with completed visites that have reports
  const completedWithReports = demandes?.results?.filter(d => 
    d.visite_detail?.statut === 'terminee' && d.visite_detail?.rapport
  ) || [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.photo} alt={user?.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user?.first_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                Bonjour, {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-muted-foreground">Client</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Voici un résumé de votre activité
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl md:text-2xl font-bold" data-testid="text-pending-count">
                    {pendingDemandes.length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-statut-favorable-fond flex items-center justify-center shrink-0">
                  <CircleCheck className="w-5 h-5 md:w-6 md:h-6 text-statut-favorable" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl md:text-2xl font-bold" data-testid="text-accepted-count">
                    {acceptedDemandes.length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Confirmées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-statut-information-fond flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-statut-information" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl md:text-2xl font-bold" data-testid="text-reports-count">
                    {completedWithReports.length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Rapports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl md:text-2xl font-bold">0</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg">Mes demandes de visite</CardTitle>
              <Link href="/my-visits/all">
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
                            <House className="w-8 h-8 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium line-clamp-1">
                          {demande.bien_detail?.titre}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {formaterDateLongue(demande.date_souhaitee)} à {demande.heure_souhaitee}
                        </p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {demande.visite_detail ? <BadgeStatut valeur={demande.visite_detail.statut} /> : <BadgeStatut valeur={demande.statut} />}
                          {demande.visite_detail?.rapport && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedReport(demande.visite_detail?.rapport || null)}
                              data-testid={`button-view-report-${demande.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Voir rapport
                            </Button>
                          )}
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

        {/* Reports Section - Only show if there are completed visits with reports */}
        {completedWithReports.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Rapports de visite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedWithReports.map((demande) => (
                  <div 
                    key={demande.id} 
                    className="flex gap-4 p-4 rounded-lg border hover-elevate"
                    data-testid={`report-item-${demande.id}`}
                  >
                    <Link href={`/property/${demande.bien}`}>
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
                          <House className="w-8 h-8 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">
                        {demande.bien_detail?.titre}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Visite du {formaterDateLongue(demande.visite_detail?.date_visite)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {demande.visite_detail?.rapport && <BadgeStatut famille="appreciation" valeur={demande.visite_detail.rapport.etat_general} />}
                        {demande.visite_detail?.rapport?.conformite_annonce && (
                          <Badge variant="outline" className="bg-statut-favorable-fond text-statut-favorable">
                            <CircleCheck className="w-3 h-3 mr-1" />Conforme
                          </Badge>
                        )}
                        {demande.visite_detail?.rapport?.client_interesse && (
                          <Badge variant="outline" className="bg-statut-information-fond text-statut-information">
                            <User className="w-3 h-3 mr-1" />Intéressé
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedReport(demande.visite_detail?.rapport || null)}
                        data-testid={`button-open-report-${demande.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir le rapport
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Rapport de visite
            </DialogTitle>
            <DialogDescription>
              Rapport #{selectedReport?.id} - Créé le {formaterDateLongue(selectedReport?.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                {/* Summary */}
                <div>
                  <h4 className="font-semibold mb-3">Résumé</h4>
                  <div className="flex flex-wrap gap-2">
                    <BadgeStatut famille="appreciation" valeur={selectedReport.etat_general} />
                    {selectedReport.conformite_annonce && (
                      <Badge variant="outline" className="bg-statut-favorable-fond text-statut-favorable">
                        <CircleCheck className="w-3 h-3 mr-1" />Conforme à l'annonce
                      </Badge>
                    )}
                    {!selectedReport.conformite_annonce && (
                      <Badge variant="outline" className="bg-statut-defavorable-fond text-statut-defavorable">
                        <CircleAlert className="w-3 h-3 mr-1" />Non conforme
                      </Badge>
                    )}
                    {selectedReport.client_interesse && (
                      <Badge variant="outline" className="bg-statut-information-fond text-statut-information">
                        <User className="w-3 h-3 mr-1" />Client intéressé
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Technical State */}
                {(selectedReport.etat_electricite || selectedReport.etat_plomberie || 
                  selectedReport.etat_peinture || selectedReport.etat_sols || 
                  selectedReport.etat_fenetres || selectedReport.etat_portes) && (
                  <div>
                    <h4 className="font-semibold mb-3">État technique</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedReport.etat_electricite && (
                        <div>
                          <Label className="text-muted-foreground">Électricité</Label>
                          <p>{selectedReport.etat_electricite}</p>
                        </div>
                      )}
                      {selectedReport.etat_plomberie && (
                        <div>
                          <Label className="text-muted-foreground">Plomberie</Label>
                          <p>{selectedReport.etat_plomberie}</p>
                        </div>
                      )}
                      {selectedReport.etat_peinture && (
                        <div>
                          <Label className="text-muted-foreground">Peinture</Label>
                          <p>{selectedReport.etat_peinture}</p>
                        </div>
                      )}
                      {selectedReport.etat_sols && (
                        <div>
                          <Label className="text-muted-foreground">Sols</Label>
                          <p>{selectedReport.etat_sols}</p>
                        </div>
                      )}
                      {selectedReport.etat_fenetres && (
                        <div>
                          <Label className="text-muted-foreground">Fenêtres</Label>
                          <p>{selectedReport.etat_fenetres}</p>
                        </div>
                      )}
                      {selectedReport.etat_portes && (
                        <div>
                          <Label className="text-muted-foreground">Portes</Label>
                          <p>{selectedReport.etat_portes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Environment */}
                {(selectedReport.accessibilite || selectedReport.environnement) && (
                  <div>
                    <h4 className="font-semibold mb-3">Environnement</h4>
                    <div className="space-y-3 text-sm">
                      {selectedReport.accessibilite && (
                        <div>
                          <Label className="text-muted-foreground">Accessibilité</Label>
                          <p>{selectedReport.accessibilite}</p>
                        </div>
                      )}
                      {selectedReport.environnement && (
                        <div>
                          <Label className="text-muted-foreground">Environnement</Label>
                          <p>{selectedReport.environnement}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Evaluation */}
                {(selectedReport.points_positifs || selectedReport.points_negatifs || 
                  selectedReport.recommandations || selectedReport.commentaires) && (
                  <div>
                    <h4 className="font-semibold mb-3">Évaluation</h4>
                    <div className="space-y-3">
                      {selectedReport.points_positifs && (
                        <div className="p-3 bg-statut-favorable-fond rounded-lg">
                          <Label className="text-statut-favorable">Points positifs</Label>
                          <p className="text-sm mt-1">{selectedReport.points_positifs}</p>
                        </div>
                      )}
                      {selectedReport.points_negatifs && (
                        <div className="p-3 bg-statut-defavorable-fond rounded-lg">
                          <Label className="text-statut-defavorable">Points négatifs</Label>
                          <p className="text-sm mt-1">{selectedReport.points_negatifs}</p>
                        </div>
                      )}
                      {selectedReport.recommandations && (
                        <div className="p-3 bg-statut-information-fond rounded-lg">
                          <Label className="text-statut-information">Recommandations</Label>
                          <p className="text-sm mt-1">{selectedReport.recommandations}</p>
                        </div>
                      )}
                      {selectedReport.commentaires && (
                        <div className="p-3 bg-muted rounded-lg">
                          <Label className="text-muted-foreground">Commentaires</Label>
                          <p className="text-sm mt-1">{selectedReport.commentaires}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
