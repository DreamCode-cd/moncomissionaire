import { EtatVide, ErreurRequete } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { ConfirmerVisite } from '@/components/confiance/ConfirmerVisite';
import { formaterDateLongue, formaterHeure, jourLocalIso } from '@/lib/dates';
import { numeroLisible } from '@/lib/contact';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Calendar, Clock, CircleCheck, MapPin, User, FileText,
  ChevronRight, Square, Download, Eye, Filter,
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
import { getDjangoImageUrl, nomAffiche, vignetteDe } from '@/lib/utils';
import { initiale, libelleTypeBien } from '@/lib/annonce';
import { lieuVisite } from '@/lib/visite';
import { libelleRole } from '@/lib/roles';
import { installerMarqueurParDefaut } from '@/lib/leaflet-marqueur';
import { formaterPrix } from '@/lib/prix';
import { t } from '@/i18n';
import { libelleChoixCourant, libelleChoixEau } from '@/lib/terrain';
import { lireStatut } from '@/lib/statuts';

// Marqueur dessiné en SVG inline : plus aucune requête vers un CDN tiers.
installerMarqueurParDefaut();

const etatOptions = [
  { value: 'tres_interessant', get label() { return t('statut.appreciation.tres_interessant'); } },
  { value: 'interessant', get label() { return t('statut.appreciation.interessant'); } },
  { value: 'moyen', get label() { return t('statut.appreciation.moyen'); } },
  { value: 'peu_interessant', get label() { return t('statut.appreciation.peu_interessant'); } },
  { value: 'non_recommande', get label() { return t('statut.appreciation.non_recommande'); } },
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
  const { data: visites, isLoading: visitesLoading, error: erreurVisites, refetch: rechargerVisites } = useQuery<PaginatedResponse<Visite>>({
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

  // Créer le rapport : le serveur passe alors la visite à « terminée ».
  const createReportMutation = useMutation({
    // Le serveur termine la visite en enregistrant le rapport : un appel à
    // `terminer` derrière serait refusé (visite déjà close) et afficherait une
    // erreur alors que le rapport est bien parti.
    mutationFn: (reportData: ExtendedReportData) => api.post('/api/v1/visites/agent/rapports/', reportData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/visites/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/rapports/'] });
      setReportDialogOpen(false);
      setSelectedVisite(null);
      resetReportData();
      toast({
        title: t('agentTableau.rapportCree'),
        description: t('agentTableau.rapportVisiteEteEnregistre'),
      });
    },
    onError: (error) => {
      toast({
        title: t('agentTableau.erreur'),
        description: error instanceof Error ? error.message : t('agentTableau.erreurEstSurvenue'),
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
      const submitData: ExtendedReportData = {
        visite: selectedVisite.id,
        etat_general: reportData.etat_general,
        conformite_annonce: reportData.conformite_annonce,
        client_interesse: reportData.client_interesse,
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


  const formatTime = (timeString: string | null | undefined) => (timeString ? formaterHeure(timeString) : '—');

  // Jour de Lubumbashi, et non jour UTC : entre minuit et 2 h, « aujourd'hui » glissait à hier.
  const today = jourLocalIso();
  const allVisites = visites?.results || [];
  const todayVisites = allVisites.filter(v => v.date_visite === today);
  const planifiedVisites = allVisites.filter(v => v.statut === 'planifiee');
  const completedVisites = allVisites.filter(v => v.statut === 'terminee');
  const cancelledVisites = allVisites.filter(v => v.statut === 'annulee');



  // Check if a visit already has a report
  const hasReport = (visiteId: number) => {
    return reports?.results?.some(r => r.visite === visiteId) || false;
  };

  const renderVisiteCard = (visite: Visite) => {
    const bien = visite.demande_detail?.bien_detail;
    const client = visite.demande_detail?.client;
    const lieu = lieuVisite(visite);
    const visitHasReport = hasReport(visite.id);

    return (
      <Card key={visite.id} data-testid={`visite-card-${visite.id}`}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Property Image */}
            <div className="w-full md:w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {bien?.photo_principale?.image ? (
                <img
                  src={vignetteDe(bien.photo_principale) || undefined}
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
                  {t('date.dateEtHeure', { date: formaterDateLongue(visite.date_visite), heure: formatTime(visite.heure_visite) })}
                </span>
                <BadgeStatut valeur={visite.statut} />
                {visitHasReport && (
                  <Badge variant="outline" className="bg-statut-information-fond text-statut-information">
                    <FileText className="w-3 h-3 mr-1" />{t('agentTableau.rapport')}
                  </Badge>
                )}
              </div>
              
              <h3 className="font-medium mb-1 truncate" data-testid={`visite-title-${visite.id}`}>
                {bien?.titre || t('agentTableau.bienNonSpecifie')}
              </h3>
              
              <div className="flex items-start text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                <span data-testid={`visite-lieu-${visite.id}`}>
                  {lieu.adresse && <span className="font-medium text-foreground">{lieu.adresse}, </span>}
                  {lieu.secteur}
                </span>
              </div>

              {client && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={getDjangoImageUrl(client.avatar) || undefined} />
                    <AvatarFallback className="text-xs">{initiale(client)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground" data-testid={`visite-client-${visite.id}`}>
                    {t('agentTableau.clientNom', { nom: nomAffiche(client, t('agentTableau.nonPrecise')) })}
                  </span>
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="text-sm text-primary underline-offset-2 hover:underline">
                      {numeroLisible(client.phone)}
                    </a>
                  )}
                </div>
              )}

              {visite.notes_commissionnaire && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  {t('agentTableau.note', { a: visite.notes_commissionnaire })}
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
                {t('agentTableau.details')}
              </Button>

              {/* Plus de liste déroulante de statut (audit du 19/11/2026,
                  A-2) : l'agent annulait une visite sans motif et sans
                  prévenir le client. Comme sur le mobile, il dit qu'elle a eu
                  lieu par son rapport, une fois l'heure passée
                  (`a_confirmer`, calculé par le serveur), ou qu'elle n'a pas
                  eu lieu. Avant l'heure, il n'y a rien à faire. */}
              {visite.a_confirmer && !visitHasReport && (
                <Button
                  size="sm"
                  onClick={() => handleOpenReportDialog(visite)}
                  disabled={createReportMutation.isPending}
                  data-testid={`button-terminer-${visite.id}`}
                >
                  <CircleCheck className="w-4 h-4 mr-1" />
                  {t('agentTableau.elleEuLieuRapport')}
                </Button>
              )}
              <ConfirmerVisite visite={visite} cle={['/api/v1/visites/agent/visites/']} espace="agent" />

              {visite.statut === 'terminee' && !visitHasReport && (
                <Button
                  size="sm"
                  onClick={() => handleOpenReportDialog(visite)}
                  data-testid={`button-create-report-${visite.id}`}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  {t('agentTableau.creerRapport')}
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
              <p className="text-muted-foreground">{t('agentTableau.agent')}</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            {t('agentTableau.gerezVosVisitesAssignees')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-statut-information-fond flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-statut-information" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-today">{todayVisites.length}</p>
                  <p className="text-xs text-muted-foreground">{t('agentTableau.aujourdHui')}</p>
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
                  <p className="text-xs text-muted-foreground">{t('agentTableau.planifiees')}</p>
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
                  <p className="text-xs text-muted-foreground">{t('agentTableau.terminees')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-statut-information-fond flex items-center justify-center">
                  <FileText className="w-5 h-5 text-statut-information" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-rapports">{reports?.results?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('agentTableau.rapports')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="visites" data-testid="tab-visites">
              {t('agentTableau.mesVisites')}
            </TabsTrigger>
            <TabsTrigger value="rapports" data-testid="tab-rapports">
              {t('agentTableau.mesRapports', { a: reports?.results?.length || 0 })}
            </TabsTrigger>
          </TabsList>

          {/* Visits Tab */}
          <TabsContent value="visites">
            {/* Filter */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('agentTableau.filtrer')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={visiteFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('all')}
                  data-testid="filter-all"
                >
                  {t('agentTableau.filtreToutes', { n: allVisites.length })}
                </Button>
                <Button
                  variant={visiteFilter === 'planifiee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('planifiee')}
                  data-testid="filter-planifiee"
                >
                  {t('agentTableau.filtrePlanifiees', { n: planifiedVisites.length })}
                </Button>
                <Button
                  variant={visiteFilter === 'terminee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('terminee')}
                  data-testid="filter-terminee"
                >
                  {t('agentTableau.filtreTerminees', { n: completedVisites.length })}
                </Button>
                <Button
                  variant={visiteFilter === 'annulee' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisiteFilter('annulee')}
                  data-testid="filter-annulee"
                >
                  {t('agentTableau.filtreAnnulees', { n: cancelledVisites.length })}
                </Button>
              </div>
            </div>

            {visitesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : erreurVisites && !visites ? (
              <ErreurRequete erreur={erreurVisites} titre={t('agentTableau.vosVisitesNOnt')} onReessayer={() => void rechargerVisites()} />
            ) : allVisites.length === 0 ? (
              <EtatVide
                icone={Calendar}
                titre={t('agentTableau.aucuneVisite')}
                description={t('agentTableau.visitesQueCommissionnaireVous')}
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
                titre={t('agentTableau.aucunRapport')}
                description={t('agentTableau.vosRapportsApparaitrontIci')}
              />
            ) : (
              <div className="space-y-4">
                {reports.results.map((report) => (
                  <Card key={report.id} data-testid={`report-card-${report.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold">{t('agentTableau.rapport2')}{report.id}</span>
                            <BadgeStatut famille="appreciation" valeur={report.etat_general} />
                            {report.conformite_annonce && (
                              <Badge variant="outline" className="bg-statut-favorable-fond text-statut-favorable">
                                <CircleCheck className="w-3 h-3 mr-1" />{t('agentTableau.conforme')}
                              </Badge>
                            )}
                            {report.client_interesse && (
                              <Badge variant="outline" className="bg-statut-information-fond text-statut-information">
                                <User className="w-3 h-3 mr-1" />{t('agentTableau.clientInteresse')}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {t('agentTableau.visiteCreeB', { a: report.visite, b: formaterDateLongue(report.created_at) })}
                          </p>

                          {report.points_positifs && (
                            <p className="text-sm mb-1">
                              <span className="font-medium text-statut-favorable">{t('agentTableau.pointsPositifs')}</span>{' '}
                              {report.points_positifs.substring(0, 100)}
                              {report.points_positifs.length > 100 ? '...' : ''}
                            </p>
                          )}

                          {report.points_negatifs && (
                            <p className="text-sm">
                              <span className="font-medium text-statut-defavorable">{t('agentTableau.pointsNegatifs')}</span>{' '}
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
                            {t('agentTableau.voir')}
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
              <DialogTitle>{t('agentTableau.detailsVisite')}</DialogTitle>
              <DialogDescription>
                {t('agentTableau.informationsCompletesVisiteBien')}
              </DialogDescription>
            </DialogHeader>
            {selectedVisite && (() => {
              const bien = selectedVisite.demande_detail?.bien_detail as BienDetail | undefined;
              const allPhotos = [
                ...(bien?.photo_principale ? [bien.photo_principale] : []),
                ...(bien?.photos || [])
              ];
              // L'adresse et la position ne sont pas dans bien_detail (version
              // publique de l'annonce) : elles arrivent dans visite.localisation.
              const lieu = lieuVisite(selectedVisite);
              const lat = lieu.latitude;
              const lng = lieu.longitude;
              const hasCoordinates = lat !== null && lng !== null;
              const client = selectedVisite.demande_detail?.client;

              return (
                <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:-mx-6 sm:px-6">
                  <div className="space-y-6 py-4">
                    {/* Photo Gallery */}
                    {allPhotos.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          {t('agentTableau.photosBien', { a: allPhotos.length })}
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
                        {t('agentTableau.informationsBien')}
                      </h4>
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <h5 className="text-lg font-semibold">{bien?.titre}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{libelleTypeBien(bien?.type_bien)}</Badge>
                              <Badge variant="outline">{lireStatut('location', bien?.statut_location).libelle}</Badge>
                            </div>
                          </div>

                          <p className="text-2xl font-bold text-primary">
                            {formaterPrix(bien?.prix_mensuel, bien?.devise)}<span className="text-sm font-normal text-muted-foreground">{t('fiche.parMois')}</span>
                          </p>

                          {bien?.description && (
                            <div>
                              <Label className="text-muted-foreground">{t('agentTableau.description')}</Label>
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
                                <span className="text-sm">{t('reste.pieces', { n: bien.nombre_pieces })}</span>
                              </div>
                            )}
                          </div>

                          {/* Amenities */}
                          <div>
                            <Label className="text-muted-foreground mb-2 block">{t('agentTableau.equipements')}</Label>
                            <div className="flex flex-wrap gap-2">
                              {bien?.eau_display && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Droplets className="w-3 h-3" /> {libelleChoixEau(bien.eau ?? '') ?? bien.eau_display}
                                </Badge>
                              )}
                              {bien?.electricite_display && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> {libelleChoixCourant(bien.electricite ?? '') ?? bien.electricite_display}
                                </Badge>
                              )}
                              {bien?.parking && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Car className="w-3 h-3" /> {t('agentTableau.parking')}
                                </Badge>
                              )}
                              {bien?.jardin && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Trees className="w-3 h-3" /> {t('agentTableau.jardin')}
                                </Badge>
                              )}
                              {bien?.meuble && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Sofa className="w-3 h-3" /> {t('agentTableau.meuble')}
                                </Badge>
                              )}
                              {bien?.climatisation && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Wind className="w-3 h-3" /> {t('agentTableau.climatisation')}
                                </Badge>
                              )}
                              {bien?.gardien && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> {t('agentTableau.gardien')}
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
                        {t('agentTableau.adresseLocalisation')}
                      </h4>
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-start gap-2" data-testid="detail-lieu">
                              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div>
                                {lieu.adresse ? (
                                  <p className="font-medium">{lieu.adresse}</p>
                                ) : (
                                  <p className="font-medium text-muted-foreground">{t('agentTableau.adresseExacteNonCommuniquee')}</p>
                                )}
                                <p className="text-sm text-muted-foreground">{lieu.secteur}</p>
                              </div>
                            </div>
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
                                      <p className="text-sm">{lieu.adresse || lieu.secteur}</p>
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
                              {t('agentTableau.ouvrirDansGoogleMaps')}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Visit Info */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('agentTableau.informationsVisite')}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">{t('agentTableau.date')}</Label>
                          <p className="font-medium">{formaterDateLongue(selectedVisite.date_visite)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{t('agentTableau.heure')}</Label>
                          <p className="font-medium">{formatTime(selectedVisite.heure_visite)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{t('agentTableau.statut')}</Label>
                          <div className="mt-1"><BadgeStatut valeur={selectedVisite.statut} /></div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{t('agentTableau.idVisite')}</Label>
                          <p className="font-medium">#{selectedVisite.id}</p>
                        </div>
                      </div>
                      {selectedVisite.notes_commissionnaire && (
                        <div className="mt-4">
                          <Label className="text-muted-foreground">{t('agentTableau.notesCommissionnaire')}</Label>
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
                        {t('agentTableau.client')}
                      </h4>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={getDjangoImageUrl(client?.avatar) || undefined} />
                              <AvatarFallback>{initiale(client)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium" data-testid="detail-client">{nomAffiche(client, t('agentTableau.nonPrecise2'))}</p>
                            </div>
                            {client?.phone && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={`tel:${client.phone}`}>
                                  <Phone className="w-4 h-4 mr-1" /> {t('agentTableau.appeler')}
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Commissionnaire Info */}
                    {selectedVisite.commissionnaire_detail && (
                      <div>
                        {/* Celui qui a fixé la visite : un commissionnaire, ou un
                            membre de l'équipe pour un bien de propriétaire. */}
                        <h4 className="font-semibold mb-3">{t('agentTableau.visiteFixee')}</h4>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{initiale(selectedVisite.commissionnaire_detail)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm" data-testid="detail-gestionnaire">
                            {nomAffiche(selectedVisite.commissionnaire_detail)}
                            {selectedVisite.commissionnaire_detail.user_type && (
                              <span className="text-muted-foreground"> · {libelleRole(selectedVisite.commissionnaire_detail.user_type)}</span>
                            )}
                          </span>
                          {selectedVisite.commissionnaire_detail.phone && (
                            <a href={`tel:${selectedVisite.commissionnaire_detail.phone}`} className="text-sm text-primary underline-offset-2 hover:underline">
                              {numeroLisible(selectedVisite.commissionnaire_detail.phone)}
                            </a>
                          )}
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
                          {t('agentTableau.terminerVisite')}
                        </Button>
                      )}
                      {selectedVisite.statut === 'terminee' && !hasReport(selectedVisite.id) && (
                        <Button onClick={() => {
                          setDetailDialogOpen(false);
                          handleOpenReportDialog(selectedVisite);
                        }}>
                          <FileText className="w-4 h-4 mr-2" />
                          {t('agentTableau.creerRapport2')}
                        </Button>
                      )}
                      <Link href={`/property/${selectedVisite.demande_detail?.bien}`}>
                        <Button variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          {t('agentTableau.voirPageBien')}
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
              <DialogTitle className="text-lg sm:text-xl">{t('agentTableau.creerRapportVisite')}</DialogTitle>
              <DialogDescription className="text-sm">
                {t('agentTableau.rapportVisite', { a: selectedVisite?.id })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 sm:pr-4">
              <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                {/* Required Fields */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    {t('agentTableau.informationsRequises')}
                  </h4>
                  
                  <div>
                    <Label>{t('agentTableau.appreciationGenerale')}</Label>
                    <Select
                      value={reportData.etat_general}
                      onValueChange={(value) => setReportData({ ...reportData, etat_general: value as any })}
                    >
                      <SelectTrigger data-testid="select-etat">
                        <SelectValue placeholder={t('agentTableau.selectionnerEtat')} />
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
                    <Label>{t('agentTableau.conformeAnnonce')}</Label>
                    <Switch
                      checked={reportData.conformite_annonce}
                      onCheckedChange={(checked) => setReportData({ ...reportData, conformite_annonce: checked })}
                      data-testid="switch-conformite"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>{t('agentTableau.clientInteresse2')}</Label>
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
                    {t('agentTableau.etatTechniqueOptionnel')}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm">{t('agentTableau.electricite')}</Label>
                      <Input
                        placeholder={t('agentTableau.etatElectrique')}
                        value={reportData.etat_electricite || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_electricite: e.target.value })}
                        data-testid="input-electricite"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('agentTableau.plomberie')}</Label>
                      <Input
                        placeholder={t('agentTableau.etatPlomberie')}
                        value={reportData.etat_plomberie || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_plomberie: e.target.value })}
                        data-testid="input-plomberie"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('agentTableau.peinture')}</Label>
                      <Input
                        placeholder={t('agentTableau.etatPeinture')}
                        value={reportData.etat_peinture || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_peinture: e.target.value })}
                        data-testid="input-peinture"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('agentTableau.sols')}</Label>
                      <Input
                        placeholder={t('agentTableau.etatSols')}
                        value={reportData.etat_sols || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_sols: e.target.value })}
                        data-testid="input-sols"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('agentTableau.fenetres')}</Label>
                      <Input
                        placeholder={t('agentTableau.etatFenetres')}
                        value={reportData.etat_fenetres || ''}
                        onChange={(e) => setReportData({ ...reportData, etat_fenetres: e.target.value })}
                        data-testid="input-fenetres"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('agentTableau.portes')}</Label>
                      <Input
                        placeholder={t('agentTableau.etatPortes')}
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
                    {t('agentTableau.environnementOptionnel')}
                  </h4>
                  
                  <div>
                    <Label>{t('agentTableau.accessibilite')}</Label>
                    <Input
                      placeholder={t('agentTableau.accesTransportsParkingEtc')}
                      value={reportData.accessibilite || ''}
                      onChange={(e) => setReportData({ ...reportData, accessibilite: e.target.value })}
                      data-testid="input-accessibilite"
                    />
                  </div>
                  <div>
                    <Label>{t('agentTableau.environnement')}</Label>
                    <Input
                      placeholder={t('agentTableau.quartierVoisinageSecuriteEtc')}
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
                    {t('agentTableau.evaluationOptionnel')}
                  </h4>
                  
                  <div>
                    <Label>{t('agentTableau.pointsPositifs2')}</Label>
                    <Textarea
                      placeholder={t('agentTableau.decrivezPointsPositifsBien')}
                      value={reportData.points_positifs || ''}
                      onChange={(e) => setReportData({ ...reportData, points_positifs: e.target.value })}
                      data-testid="input-positifs"
                    />
                  </div>

                  <div>
                    <Label>{t('agentTableau.pointsNegatifs2')}</Label>
                    <Textarea
                      placeholder={t('agentTableau.decrivezPointsNegatifsBien')}
                      value={reportData.points_negatifs || ''}
                      onChange={(e) => setReportData({ ...reportData, points_negatifs: e.target.value })}
                      data-testid="input-negatifs"
                    />
                  </div>

                  <div>
                    <Label>{t('agentTableau.recommandations')}</Label>
                    <Textarea
                      placeholder={t('agentTableau.vosRecommandationsConcernantCe')}
                      value={reportData.recommandations || ''}
                      onChange={(e) => setReportData({ ...reportData, recommandations: e.target.value })}
                      data-testid="input-recommandations"
                    />
                  </div>

                  <div>
                    <Label>{t('agentTableau.commentairesAdditionnels')}</Label>
                    <Textarea
                      placeholder={t('agentTableau.autresCommentairesOuObservations')}
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
                    {createReportMutation.isPending ? t('agentTableau.creation') : t('agentTableau.creerRapport3')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReportDialogOpen(false);
                      resetReportData();
                    }}
                  >
                    {t('agentTableau.annuler')}
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
              <DialogTitle>{t('agentTableau.detailsRapport')}</DialogTitle>
              <DialogDescription>
                {t('agentTableau.rapportCreeB', { a: selectedReport?.id, b: formaterDateLongue(selectedReport?.created_at) })}
              </DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-4">
                  {/* Summary */}
                  <div>
                    <h4 className="font-semibold mb-3">{t('agentTableau.resume')}</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <BadgeStatut famille="appreciation" valeur={selectedReport.etat_general} />
                      {selectedReport.conformite_annonce && (
                        <Badge variant="outline" className="bg-statut-favorable-fond text-statut-favorable">
                          <CircleCheck className="w-3 h-3 mr-1" />{t('agentTableau.conformeAnnonce2')}
                        </Badge>
                      )}
                      {!selectedReport.conformite_annonce && (
                        <Badge variant="outline" className="bg-statut-defavorable-fond text-statut-defavorable">
                          <CircleAlert className="w-3 h-3 mr-1" />{t('agentTableau.nonConforme')}
                        </Badge>
                      )}
                      {selectedReport.client_interesse && (
                        <Badge variant="outline" className="bg-statut-information-fond text-statut-information">
                          <User className="w-3 h-3 mr-1" />{t('agentTableau.clientInteresse')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Technical State */}
                  {(selectedReport.etat_electricite || selectedReport.etat_plomberie || 
                    selectedReport.etat_peinture || selectedReport.etat_sols || 
                    selectedReport.etat_fenetres || selectedReport.etat_portes) && (
                    <div>
                      <h4 className="font-semibold mb-3">{t('agentTableau.etatTechnique')}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedReport.etat_electricite && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.electricite')}</Label>
                            <p>{selectedReport.etat_electricite}</p>
                          </div>
                        )}
                        {selectedReport.etat_plomberie && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.plomberie')}</Label>
                            <p>{selectedReport.etat_plomberie}</p>
                          </div>
                        )}
                        {selectedReport.etat_peinture && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.peinture')}</Label>
                            <p>{selectedReport.etat_peinture}</p>
                          </div>
                        )}
                        {selectedReport.etat_sols && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.sols')}</Label>
                            <p>{selectedReport.etat_sols}</p>
                          </div>
                        )}
                        {selectedReport.etat_fenetres && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.fenetres')}</Label>
                            <p>{selectedReport.etat_fenetres}</p>
                          </div>
                        )}
                        {selectedReport.etat_portes && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.portes')}</Label>
                            <p>{selectedReport.etat_portes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Environment */}
                  {(selectedReport.accessibilite || selectedReport.environnement) && (
                    <div>
                      <h4 className="font-semibold mb-3">{t('agentTableau.environnement')}</h4>
                      <div className="space-y-3 text-sm">
                        {selectedReport.accessibilite && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.accessibilite')}</Label>
                            <p>{selectedReport.accessibilite}</p>
                          </div>
                        )}
                        {selectedReport.environnement && (
                          <div>
                            <Label className="text-muted-foreground">{t('agentTableau.environnement')}</Label>
                            <p>{selectedReport.environnement}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Evaluation */}
                  <div>
                    <h4 className="font-semibold mb-3">{t('agentTableau.evaluation')}</h4>
                    <div className="space-y-4">
                      {selectedReport.points_positifs && (
                        <div className="p-3 bg-statut-favorable-fond rounded-lg">
                          <Label className="text-statut-favorable">{t('agentTableau.pointsPositifs2')}</Label>
                          <p className="text-sm mt-1">{selectedReport.points_positifs}</p>
                        </div>
                      )}
                      {selectedReport.points_negatifs && (
                        <div className="p-3 bg-statut-defavorable-fond rounded-lg">
                          <Label className="text-statut-defavorable">{t('agentTableau.pointsNegatifs2')}</Label>
                          <p className="text-sm mt-1">{selectedReport.points_negatifs}</p>
                        </div>
                      )}
                      {selectedReport.recommandations && (
                        <div className="p-3 bg-statut-information-fond rounded-lg">
                          <Label className="text-statut-information">{t('agentTableau.recommandations')}</Label>
                          <p className="text-sm mt-1">{selectedReport.recommandations}</p>
                        </div>
                      )}
                      {selectedReport.commentaires && (
                        <div className="p-3 bg-muted rounded-lg">
                          <Label className="text-muted-foreground">{t('agentTableau.commentaires')}</Label>
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
