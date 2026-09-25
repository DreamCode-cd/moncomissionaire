import { EtatVide } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { formaterDateLongue } from '@/lib/dates';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Calendar, Clock, CircleCheck, MapPin, User, FileText,
  ChevronRight, Play, Square, Download, Eye, Filter,
  House, Phone, Mail, CircleX, CircleAlert, ChevronLeft,
  Droplets, Zap, Car, Trees, Sofa, Wind, Shield, Image,
  Bed, Bath, Ruler, Building, Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Visite, RapportVisite, RapportVisiteCreate, PaginatedResponse, BienDetail } from '@shared/schema';
import { generateVisiteReportPDF, generateVisiteSummaryPDF } from '@/lib/pdf-generator';
import { getDjangoImageUrl, getVilleName } from '@/lib/utils';
import { installerMarqueurParDefaut } from '@/lib/leaflet-marqueur';
import { formaterPrix } from '@/lib/prix';

// Marqueur dessiné en SVG inline : plus aucune requête vers un CDN tiers.
installerMarqueurParDefaut();

const etatOptions = [
  { value: 'tres_interessant', label: 'Très intéressant' },
  { value: 'interessant', label: 'Intéressant' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'peu_interessant', label: 'Peu intéressant' },
  { value: 'non_recommande', label: 'Non recommandé' },
];

// Extended report data with all optional fields
interface ExtendedReportData extends Partial<RapportVisiteCreate> {
  visite?: number;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('visites');
  const [visiteFilter, setVisiteFilter] = useState<string>('all');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [reportDetailDialogOpen, setReportDetailDialogOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<Visite | null>(null);
  const [selectedReport, setSelectedReport] = useState<RapportVisite | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [reportData, setReportData] = useState<ExtendedReportData>({
    etat_general: 'interessant',
    conformite_annonce: true,
    client_interesse: true,
    etat_electricite: '',
    etat_plomberie: '',
    etat_peinture: '',
    etat_sols: '',
    etat_fenetres: '',
    etat_portes: '',
    accessibilite: '',
    environnement: '',
    points_positifs: '',
    points_negatifs: '',
    recommandations: '',
    commentaires: '',
  });

  // Fetch all visits for the agent
  const { data: visites, isLoading: visitesLoading } = useQuery<PaginatedResponse<Visite>>({
    queryKey: ['/api/v1/visites/agent/visites/', visiteFilter],
    queryFn: async () => {
      const url = visiteFilter !== 'all' 
        ? `/api/v1/visites/agent/visites/?statut=${visiteFilter}`
        : '/api/v1/visites/agent/visites/';
      return api.get(url);
    },
  });

  // Fetch agent's reports
  const { data: reports, isLoading: reportsLoading } = useQuery<PaginatedResponse<RapportVisite>>({
    queryKey: ['/api/v1/visites/agent/rapports/'],
  });

  // Mutation to terminate a visit (used after report creation)
  const terminerVisiteMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/visites/agent/visites/${id}/terminer/`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/visites/'] });
      toast({
        title: 'Visite terminée',
        description: 'La visite a été marquée comme terminée.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de terminer la visite',
        variant: 'destructive',
      });
    },
  });

  // Mutation to change visit status
  const changeStatusMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) => 
      api.patch(`/api/v1/visites/agent/visites/${id}/`, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/visites/'] });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut de la visite a été modifié.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de modifier le statut',
        variant: 'destructive',
      });
    },
  });

  // Mutation to create a report and terminate visit
  const createReportMutation = useMutation({
    mutationFn: async (data: ExtendedReportData & { shouldTerminate?: boolean }) => {
      const { shouldTerminate, ...reportData } = data;
      // Create the report
      const report = await api.post('/api/v1/visites/agent/rapports/', reportData);
      // If visit was not already terminated, terminate it
      if (shouldTerminate && data.visite) {
        await api.post(`/api/v1/visites/agent/visites/${data.visite}/terminer/`, {});
      }
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/visites/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/rapports/'] });
      setReportDialogOpen(false);
      setSelectedVisite(null);
      resetReportData();
      toast({
        title: 'Rapport créé',
        description: 'Le rapport de visite a été enregistré et la visite est terminée.',
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

  const resetReportData = () => {
    setReportData({
      etat_general: 'interessant',
      conformite_annonce: true,
      client_interesse: true,
      etat_electricite: '',
      etat_plomberie: '',
      etat_peinture: '',
      etat_sols: '',
      etat_fenetres: '',
      etat_portes: '',
      accessibilite: '',
      environnement: '',
      points_positifs: '',
      points_negatifs: '',
      recommandations: '',
      commentaires: '',
    });
  };

  const handleOpenReportDialog = (visite: Visite) => {
    setSelectedVisite(visite);
    setReportData({
      ...reportData,
      visite: visite.id,
    });
    setReportDialogOpen(true);
  };

  const handleSubmitReport = () => {
    if (selectedVisite && reportData.etat_general) {
      const submitData: ExtendedReportData & { shouldTerminate?: boolean } = {
        visite: selectedVisite.id,
        etat_general: reportData.etat_general,
        conformite_annonce: reportData.conformite_annonce,
        client_interesse: reportData.client_interesse,
        // Terminate visit if it's not already terminated
        shouldTerminate: selectedVisite.statut !== 'terminee',
      };

      // Add optional fields only if they have values
      if (reportData.etat_electricite) submitData.etat_electricite = reportData.etat_electricite;
      if (reportData.etat_plomberie) submitData.etat_plomberie = reportData.etat_plomberie;
      if (reportData.etat_peinture) submitData.etat_peinture = reportData.etat_peinture;
      if (reportData.etat_sols) submitData.etat_sols = reportData.etat_sols;
      if (reportData.etat_fenetres) submitData.etat_fenetres = reportData.etat_fenetres;
      if (reportData.etat_portes) submitData.etat_portes = reportData.etat_portes;
      if (reportData.accessibilite) submitData.accessibilite = reportData.accessibilite;
      if (reportData.environnement) submitData.environnement = reportData.environnement;
      if (reportData.points_positifs) submitData.points_positifs = reportData.points_positifs;
      if (reportData.points_negatifs) submitData.points_negatifs = reportData.points_negatifs;
      if (reportData.recommandations) submitData.recommandations = reportData.recommandations;
      if (reportData.commentaires) submitData.commentaires = reportData.commentaires;

      createReportMutation.mutate(submitData);
    }
  };


  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  const today = new Date().toISOString().split('T')[0];
  const allVisites = visites?.results || [];
  const todayVisites = allVisites.filter(v => v.date_visite === today);
  const planifiedVisites = allVisites.filter(v => v.statut === 'planifiee');
  const enCoursVisites = allVisites.filter(v => v.statut === 'en_cours');
  const completedVisites = allVisites.filter(v => v.statut === 'terminee');
  const cancelledVisites = allVisites.filter(v => v.statut === 'annulee');



  // Check if a visit already has a report
  const hasReport = (visiteId: number) => {
    return reports?.results?.some(r => r.visite === visiteId) || false;
  };

  const renderVisiteCard = (visite: Visite) => {
    const bien = visite.demande_detail?.bien_detail;
    const client = visite.demande_detail?.client;
    const visitHasReport = hasReport(visite.id);

    return (
      <Card key={visite.id} data-testid={`visite-card-${visite.id}`}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Property Image */}
            <div className="w-full md:w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {bien?.photo_principale?.image ? (
                <img
                  src={getDjangoImageUrl(bien.photo_principale.image) || undefined}
                  alt={bien?.titre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <House className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Visit Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold">
                  {formaterDateLongue(visite.date_visite)} à {formatTime(visite.heure_visite)}
                </span>
                <BadgeStatut valeur={visite.statut} />
                {visitHasReport && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400">
                    <FileText className="w-3 h-3 mr-1" />Rapport
                  </Badge>
                )}
              </div>
              
              <h3 className="font-medium mb-1 truncate" data-testid={`visite-title-${visite.id}`}>
                {bien?.titre || 'Bien non spécifié'}
              </h3>
              
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">
                  {bien?.quartier}, {bien?.ville}
                </span>
              </div>

              {client && (
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={client.photo} />
                    <AvatarFallback className="text-xs">
                      {client.first_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    Client: {client.first_name} {client.last_name}
                  </span>
                </div>
              )}

              {visite.notes_commissionnaire && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  Note: {visite.notes_commissionnaire}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-row md:flex-col gap-2 justify-end flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedVisite(visite);
                  setDetailDialogOpen(true);
                }}
                data-testid={`button-detail-${visite.id}`}
              >
                <Eye className="w-4 h-4 mr-1" />
                Détails
              </Button>

              {/* Status change dropdown - only for non-terminated visits */}
              {visite.statut !== 'terminee' && visite.statut !== 'annulee' && (
                <Select
                  value={visite.statut}
                  onValueChange={(newStatus) => {
                    if (newStatus === 'terminee') {
                      // When selecting "terminee", open report dialog first
                      handleOpenReportDialog(visite);
                    } else {
                      changeStatusMutation.mutate({ id: visite.id, statut: newStatus });
                    }
                  }}
                  disabled={changeStatusMutation.isPending}
                >
                  <SelectTrigger className="w-[140px]" data-testid={`select-status-${visite.id}`}>
                    <SelectValue placeholder="Changer statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiée</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee">Terminée</SelectItem>
                    <SelectItem value="annulee">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Terminer button opens report dialog */}
              {(visite.statut === 'planifiee' || visite.statut === 'en_cours') && (
                <Button
                  size="sm"
                  onClick={() => handleOpenReportDialog(visite)}
                  disabled={createReportMutation.isPending}
                  data-testid={`button-terminer-${visite.id}`}
                >
                  <CircleCheck className="w-4 h-4 mr-1" />
                  Terminer
                </Button>
              )}

              {visite.statut === 'terminee' && !visitHasReport && (
                <Button
                  size="sm"
                  onClick={() => handleOpenReportDialog(visite)}
                  data-testid={`button-create-report-${visite.id}`}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Créer rapport
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.photo} alt={user?.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user?.first_name?.[0]?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-muted-foreground">Agent</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Gérez vos visites assignées et soumettez vos rapports
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-statut-information-fond flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-statut-information" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-today">{todayVisites.length}</p>
                  <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-statut-attente-fond flex items-center justify-center">
                  <Clock className="w-5 h-5 text-statut-attente" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-planifiees">{planifiedVisites.length}</p>
                  <p className="text-xs text-muted-foreground">Planifiées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-statut-information-fond flex items-center justify-center">
                  <Play className="w-5 h-5 text-statut-information" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-encours">{enCoursVisites.length}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-statut-favorable-fond flex items-center justify-center">
                  <CircleCheck className="w-5 h-5 text-statut-favorable" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-terminees">{completedVisites.length}</p>
                  <p className="text-xs text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-rapports">{reports?.results?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Rapports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="visites" data-testid="tab-visites">
              Mes visites
            </TabsTrigger>
            <TabsTrigger value="rapports" data-testid="tab-rapports">
              Mes rapports ({reports?.results?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Visits Tab */}
          <TabsContent value="visites">
            {/* Filter */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtrer:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={visiteFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('all')}
                  data-testid="filter-all"
                >
                  Toutes ({allVisites.length})
                </Button>
                <Button
                  variant={visiteFilter === 'planifiee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('planifiee')}
                  data-testid="filter-planifiee"
                >
                  Planifiées ({planifiedVisites.length})
                </Button>
                <Button
                  variant={visiteFilter === 'en_cours' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('en_cours')}
                  data-testid="filter-encours"
                >
                  En cours ({enCoursVisites.length})
                </Button>
                <Button
                  variant={visiteFilter === 'terminee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('terminee')}
                  data-testid="filter-terminee"
                >
                  Terminées ({completedVisites.length})
                </Button>
                <Button
                  variant={visiteFilter === 'annulee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('annulee')}
                  data-testid="filter-annulee"
                >
                  Annulées ({cancelledVisites.length})
                </Button>
              </div>
            </div>

            {visitesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : allVisites.length === 0 ? (
              <EtatVide
                icone={Calendar}
                titre="Aucune visite"
                description="Les visites que le commissionnaire vous assignera apparaîtront ici."
              />
            ) : (
              <div className="space-y-4">
                {allVisites.map(renderVisiteCard)}
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="rapports">
            {reportsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : !reports?.results?.length ? (
              <EtatVide
                icone={FileText}
                titre="Aucun rapport"
                description="Vos rapports apparaîtront ici une fois vos visites terminées."
              />
            ) : (
              <div className="space-y-4">
                {reports.results.map((report) => (
                  <Card key={report.id} data-testid={`report-card-${report.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold">Rapport #{report.id}</span>
                            <BadgeStatut famille="appreciation" valeur={report.etat_general} />
                            {report.conformite_annonce && (
                              <Badge variant="outline" className="bg-statut-favorable-fond text-statut-favorable">
                                <CircleCheck className="w-3 h-3 mr-1" />Conforme
                              </Badge>
                            )}
                            {report.client_interesse && (
                              <Badge variant="outline" className="bg-statut-information-fond text-statut-information">
                                <User className="w-3 h-3 mr-1" />Client intéressé
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            Visite #{report.visite} - Créé le {formaterDateLongue(report.created_at)}
                          </p>

                          {report.points_positifs && (
                            <p className="text-sm mb-1">
                              <span className="font-medium text-statut-favorable">Points positifs:</span>{' '}
                              {report.points_positifs.substring(0, 100)}
                              {report.points_positifs.length > 100 ? '...' : ''}
                            </p>
                          )}

                          {report.points_negatifs && (
                            <p className="text-sm">
                              <span className="font-medium text-statut-defavorable">Points négatifs:</span>{' '}
                              {report.points_negatifs.substring(0, 100)}
                              {report.points_negatifs.length > 100 ? '...' : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setReportDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-report-${report.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Find the visit for this report to generate PDF
                              const visite = visites?.results?.find(v => v.id === report.visite);
                              if (visite) {
                                generateVisiteReportPDF(visite);
                              }
                            }}
                            data-testid={`button-download-report-${report.id}`}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Visit Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setCurrentPhotoIndex(0);
        }}>
          <DialogContent className="w-[95vw] max-w-4xl h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Détails de la visite</DialogTitle>
              <DialogDescription>
                Informations complètes sur la visite et le bien assigné
              </DialogDescription>
            </DialogHeader>
            {selectedVisite && (() => {
              const bien = selectedVisite.demande_detail?.bien_detail as BienDetail | undefined;
              const allPhotos = [
                ...(bien?.photo_principale ? [bien.photo_principale] : []),
                ...(bien?.photos || [])
              ];
              const lat = bien?.latitude ? parseFloat(bien.latitude) : null;
              const lng = bien?.longitude ? parseFloat(bien.longitude) : null;
              const hasCoordinates = lat && lng && !isNaN(lat) && !isNaN(lng);

              return (
                <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:-mx-6 sm:px-6">
                  <div className="space-y-6 py-4">
                    {/* Photo Gallery */}
                    {allPhotos.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Photos du bien ({allPhotos.length})
                        </h4>
                        <div className="relative">
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <img
                              src={getDjangoImageUrl(allPhotos[currentPhotoIndex]?.image) || undefined}
                              alt={`Photo ${currentPhotoIndex + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {allPhotos.length > 1 && (
                            <>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
                                onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? allPhotos.length - 1 : prev - 1)}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
                                onClick={() => setCurrentPhotoIndex(prev => prev === allPhotos.length - 1 ? 0 : prev + 1)}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                                {currentPhotoIndex + 1} / {allPhotos.length}
                              </div>
                            </>
                          )}
                        </div>
                        {allPhotos.length > 1 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                            {allPhotos.map((photo, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentPhotoIndex(index)}
                                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                  index === currentPhotoIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={getDjangoImageUrl(photo.image) || undefined}
                                  alt={`Miniature ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Property Details */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <House className="w-4 h-4" />
                        Informations du bien
                      </h4>
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <h5 className="text-lg font-semibold">{bien?.titre}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{bien?.type_bien_display}</Badge>
                              <Badge variant="outline">{bien?.statut_location_display || bien?.statut_location}</Badge>
                            </div>
                          </div>

                          <p className="text-2xl font-bold text-primary">
                            {formaterPrix(bien?.prix_mensuel, bien?.devise)}<span className="text-sm font-normal text-muted-foreground">/mois</span>
                          </p>

                          {bien?.description && (
                            <div>
                              <Label className="text-muted-foreground">Description</Label>
                              <p className="text-sm mt-1">{bien.description}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {bien?.nombre_chambres !== undefined && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Bed className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{bien.nombre_chambres} chambre{bien.nombre_chambres > 1 ? 's' : ''}</span>
                              </div>
                            )}
                            {bien?.nombre_salles_bain !== undefined && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Bath className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{bien.nombre_salles_bain} salle{bien.nombre_salles_bain > 1 ? 's' : ''} de bain</span>
                              </div>
                            )}
                            {bien?.superficie && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Ruler className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{bien.superficie} m²</span>
                              </div>
                            )}
                            {bien?.nombre_pieces !== undefined && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{bien.nombre_pieces} pièce{bien.nombre_pieces > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>

                          {/* Amenities */}
                          <div>
                            <Label className="text-muted-foreground mb-2 block">Équipements</Label>
                            <div className="flex flex-wrap gap-2">
                              {bien?.eau_courante && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Droplets className="w-3 h-3" /> Eau courante
                                </Badge>
                              )}
                              {bien?.electricite && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> Électricité
                                </Badge>
                              )}
                              {bien?.parking && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Car className="w-3 h-3" /> Parking
                                </Badge>
                              )}
                              {bien?.jardin && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Trees className="w-3 h-3" /> Jardin
                                </Badge>
                              )}
                              {bien?.meuble && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Sofa className="w-3 h-3" /> Meublé
                                </Badge>
                              )}
                              {bien?.climatisation && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Wind className="w-3 h-3" /> Climatisation
                                </Badge>
                              )}
                              {bien?.gardien && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> Gardien
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Address & Map */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Navigation className="w-4 h-4" />
                        Adresse et localisation
                      </h4>
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-2">
                            {bien?.adresse && (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div>
                                  <p className="font-medium">{bien.adresse}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {bien.quartier}, {bien.commune && `${bien.commune}, `}{getVilleName(bien.ville, bien.ville_nom, bien.ville_detail)}
                                  </p>
                                </div>
                              </div>
                            )}
                            {!bien?.adresse && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  {bien?.quartier}, {bien?.commune && `${bien?.commune}, `}{bien?.ville}
                                </p>
                              </div>
                            )}
                          </div>

                          {hasCoordinates && (
                            <div className="h-[200px] rounded-lg overflow-hidden border">
                              <MapContainer
                                center={[lat, lng]}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={false}
                              >
                                <TileLayer
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <Marker position={[lat, lng]}>
                                  <Popup>
                                    <div className="text-center">
                                      <p className="font-semibold">{bien?.titre}</p>
                                      <p className="text-sm">{bien?.adresse || `${bien?.quartier}, ${bien?.ville}`}</p>
                                    </div>
                                  </Popup>
                                </Marker>
                              </MapContainer>
                            </div>
                          )}

                          {hasCoordinates && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                              }}
                            >
                              <Navigation className="w-4 h-4 mr-2" />
                              Ouvrir dans Google Maps
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Visit Info */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Informations de la visite
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Date</Label>
                          <p className="font-medium">{formaterDateLongue(selectedVisite.date_visite)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Heure</Label>
                          <p className="font-medium">{formatTime(selectedVisite.heure_visite)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Statut</Label>
                          <div className="mt-1"><BadgeStatut valeur={selectedVisite.statut} /></div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">ID Visite</Label>
                          <p className="font-medium">#{selectedVisite.id}</p>
                        </div>
                      </div>
                      {selectedVisite.notes_commissionnaire && (
                        <div className="mt-4">
                          <Label className="text-muted-foreground">Notes du commissionnaire</Label>
                          <p className="mt-1 p-3 bg-muted rounded-lg text-sm">
                            {selectedVisite.notes_commissionnaire}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Client Info */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Client
                      </h4>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={selectedVisite.demande_detail?.client?.photo} />
                              <AvatarFallback>
                                {selectedVisite.demande_detail?.client?.first_name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">
                                {selectedVisite.demande_detail?.client?.first_name}{' '}
                                {selectedVisite.demande_detail?.client?.last_name}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Commissionnaire Info */}
                    {selectedVisite.commissionnaire_detail && (
                      <div>
                        <h4 className="font-semibold mb-3">Commissionnaire</h4>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {selectedVisite.commissionnaire_detail.first_name?.[0]?.toUpperCase() || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {selectedVisite.commissionnaire_detail.first_name}{' '}
                            {selectedVisite.commissionnaire_detail.last_name}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4">
                      {(selectedVisite.statut === 'planifiee' || selectedVisite.statut === 'en_cours') && (
                        <Button
                          onClick={() => {
                            handleOpenReportDialog(selectedVisite);
                            setDetailDialogOpen(false);
                          }}
                          disabled={createReportMutation.isPending}
                        >
                          <CircleCheck className="w-4 h-4 mr-2" />
                          Terminer la visite
                        </Button>
                      )}
                      {selectedVisite.statut === 'terminee' && !hasReport(selectedVisite.id) && (
                        <Button onClick={() => {
                          setDetailDialogOpen(false);
                          handleOpenReportDialog(selectedVisite);
                        }}>
                          <FileText className="w-4 h-4 mr-2" />
                          Créer un rapport
                        </Button>
                      )}
                      <Link href={`/property/${selectedVisite.demande_detail?.bien}`}>
                        <Button variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          Voir la page du bien
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Report Creation Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader className="pb-2 flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl">Créer un rapport de visite</DialogTitle>
              <DialogDescription className="text-sm">
                Rapport pour la visite #{selectedVisite?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 sm:pr-4">
              <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                {/* Required Fields */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    Informations requises
                  </h4>
                  
                  <div>
                    <Label>État général du bien *</Label>
                    <Select
                      value={reportData.etat_general}
                      onValueChange={(value) => setReportData({ ...reportData, etat_general: value as any })}
                    >
                      <SelectTrigger data-testid="select-etat">
                        <SelectValue placeholder="Sélectionner l'état" />
                      </SelectTrigger>
                      <SelectContent>
                        {etatOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Conforme à l'annonce *</Label>
                    <Switch
                      checked={reportData.conformite_annonce}
                      onCheckedChange={(checked) => setReportData({ ...reportData, conformite_annonce: checked })}
                      data-testid="switch-conformite"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Client intéressé *</Label>
                    <Switch
                      checked={reportData.client_interesse}
                      onCheckedChange={(checked) => setReportData({ ...reportData, client_interesse: checked })}
                      data-testid="switch-interesse"
                    />
                  </div>
                </div>

                <Separator />

                {/* Technical State */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    État technique (optionnel)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm">Électricité</Label>
                      <Input
                        placeholder="État électrique"
                        value={reportData.etat_electricite || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_electricite: e.target.value })}
                        data-testid="input-electricite"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Plomberie</Label>
                      <Input
                        placeholder="État plomberie"
                        value={reportData.etat_plomberie || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_plomberie: e.target.value })}
                        data-testid="input-plomberie"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Peinture</Label>
                      <Input
                        placeholder="État peinture"
                        value={reportData.etat_peinture || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_peinture: e.target.value })}
                        data-testid="input-peinture"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Sols</Label>
                      <Input
                        placeholder="État sols"
                        value={reportData.etat_sols || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_sols: e.target.value })}
                        data-testid="input-sols"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Fenêtres</Label>
                      <Input
                        placeholder="État fenêtres"
                        value={reportData.etat_fenetres || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_fenetres: e.target.value })}
                        data-testid="input-fenetres"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Portes</Label>
                      <Input
                        placeholder="État portes"
                        value={reportData.etat_portes || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_portes: e.target.value })}
                        data-testid="input-portes"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Environment */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    Environnement (optionnel)
                  </h4>
                  
                  <div>
                    <Label>Accessibilité</Label>
                    <Input
                      placeholder="Accès aux transports, parking, etc."
                      value={reportData.accessibilite || ''}
                      onChange={(e) => setReportData({ ...reportData, accessibilite: e.target.value })}
                      data-testid="input-accessibilite"
                    />
                  </div>
                  <div>
                    <Label>Environnement</Label>
                    <Input
                      placeholder="Quartier, voisinage, sécurité, etc."
                      value={reportData.environnement || ''}
                      onChange={(e) => setReportData({ ...reportData, environnement: e.target.value })}
                      data-testid="input-environnement"
                    />
                  </div>
                </div>

                <Separator />

                {/* Evaluation */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    Évaluation (optionnel)
                  </h4>
                  
                  <div>
                    <Label>Points positifs</Label>
                    <Textarea
                      placeholder="Décrivez les points positifs du bien..."
                      value={reportData.points_positifs || ''}
                      onChange={(e) => setReportData({ ...reportData, points_positifs: e.target.value })}
                      data-testid="input-positifs"
                    />
                  </div>

                  <div>
                    <Label>Points négatifs</Label>
                    <Textarea
                      placeholder="Décrivez les points négatifs du bien..."
                      value={reportData.points_negatifs || ''}
                      onChange={(e) => setReportData({ ...reportData, points_negatifs: e.target.value })}
                      data-testid="input-negatifs"
                    />
                  </div>

                  <div>
                    <Label>Recommandations</Label>
                    <Textarea
                      placeholder="Vos recommandations concernant ce bien..."
                      value={reportData.recommandations || ''}
                      onChange={(e) => setReportData({ ...reportData, recommandations: e.target.value })}
                      data-testid="input-recommandations"
                    />
                  </div>

                  <div>
                    <Label>Commentaires additionnels</Label>
                    <Textarea
                      placeholder="Autres commentaires ou observations..."
                      value={reportData.commentaires || ''}
                      onChange={(e) => setReportData({ ...reportData, commentaires: e.target.value })}
                      data-testid="input-commentaires"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4 pb-2">
                  <Button
                    className="flex-1"
                    onClick={handleSubmitReport}
                    disabled={createReportMutation.isPending}
                    data-testid="button-submit-report"
                  >
                    {createReportMutation.isPending ? 'Création...' : 'Créer le rapport'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReportDialogOpen(false);
                      resetReportData();
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Detail Dialog */}
        <Dialog open={reportDetailDialogOpen} onOpenChange={setReportDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Détails du rapport</DialogTitle>
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
                    <div className="flex flex-wrap gap-2 mb-4">
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
                  <div>
                    <h4 className="font-semibold mb-3">Évaluation</h4>
                    <div className="space-y-4">
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
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
