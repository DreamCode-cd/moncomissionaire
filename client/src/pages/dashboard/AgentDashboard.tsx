import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Calendar, Clock, CheckCircle, MapPin, User, FileText,
  ChevronRight, Play, Square, Download
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Visite, RapportVisiteCreate, PaginatedResponse } from '@shared/schema';
import { generateVisiteReportPDF, generateVisiteSummaryPDF } from '@/lib/pdf-generator';

const etatOptions = [
  { value: 'tres_interessant', label: 'Très intéressant' },
  { value: 'interessant', label: 'Intéressant' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'peu_interessant', label: 'Peu intéressant' },
  { value: 'non_recommande', label: 'Non recommandé' },
];

export default function AgentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('today');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<Visite | null>(null);
  const [reportData, setReportData] = useState<Partial<RapportVisiteCreate>>({
    etat_general: 'interessant',
    conformite_annonce: true,
    client_interesse: true,
  });

  const { data: visites, isLoading } = useQuery<PaginatedResponse<Visite>>({
    queryKey: ['/api/v1/visites/agent/visites/'],
  });

  const startVisiteMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/visites/agent/visites/${id}/`, { statut: 'en_cours' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/visites/'] });
      toast({
        title: 'Visite démarrée',
        description: 'La visite est maintenant en cours.',
      });
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: ({ visiteId, data }: { visiteId: number; data: RapportVisiteCreate }) =>
      api.post(`/api/v1/visites/agent/visites/${visiteId}/rapport/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/agent/visites/'] });
      setReportDialogOpen(false);
      setSelectedVisite(null);
      setReportData({
        etat_general: 'interessant',
        conformite_annonce: true,
        client_interesse: true,
      });
      toast({
        title: 'Rapport soumis',
        description: 'Le rapport de visite a été enregistré.',
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

  const handleSubmitReport = () => {
    if (selectedVisite && reportData.etat_general) {
      submitReportMutation.mutate({
        visiteId: selectedVisite.id,
        data: reportData as RapportVisiteCreate,
      });
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Non spécifié';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  const today = new Date().toISOString().split('T')[0];
  const todayVisites = visites?.results?.filter(v => v.date_visite === today) || [];
  const upcomingVisites = visites?.results?.filter(v => v.date_visite > today) || [];
  const completedVisites = visites?.results?.filter(v => v.statut === 'terminee') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planifiee':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Planifiée</Badge>;
      case 'en_cours':
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400"><Play className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'terminee':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Terminée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            Dashboard Agent
          </h1>
          <p className="text-muted-foreground">
            Gérez vos visites et soumettez vos rapports
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayVisites.length}</p>
                  <p className="text-xs text-muted-foreground">Aujourd'hui</p>
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
                  <p className="text-2xl font-bold">{upcomingVisites.length}</p>
                  <p className="text-xs text-muted-foreground">À venir</p>
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
                  <p className="text-2xl font-bold">{completedVisites.length}</p>
                  <p className="text-xs text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedVisites.length}</p>
                  <p className="text-xs text-muted-foreground">Rapports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="today" data-testid="tab-today">
              Aujourd'hui ({todayVisites.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              À venir ({upcomingVisites.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Terminées ({completedVisites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : todayVisites.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Pas de visite aujourd'hui</h3>
                <p className="text-muted-foreground">
                  Vous n'avez pas de visite planifiée pour aujourd'hui
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayVisites.map((visite) => (
                  <Card key={visite.id} data-testid={`visite-${visite.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold text-lg">
                              {formatTime(visite.heure_visite)}
                            </span>
                            {getStatusBadge(visite.statut)}
                          </div>
                          <h3 className="font-medium mb-1">
                            {visite.demande_visite_detail?.bien_detail?.titre}
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground mb-2">
                            <MapPin className="w-4 h-4 mr-1" />
                            {visite.demande_visite_detail?.bien_detail?.quartier}, 
                            {visite.demande_visite_detail?.bien_detail?.ville}
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={visite.demande_visite_detail?.client.photo} />
                              <AvatarFallback className="text-xs">
                                {visite.demande_visite_detail?.client.first_name?.[0]}
                                {visite.demande_visite_detail?.client.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              Client: {visite.demande_visite_detail?.client.first_name} {visite.demande_visite_detail?.client.last_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 justify-end">
                          {visite.statut === 'planifiee' && (
                            <Button
                              onClick={() => startVisiteMutation.mutate(visite.id)}
                              disabled={startVisiteMutation.isPending}
                              data-testid={`button-start-${visite.id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Démarrer
                            </Button>
                          )}
                          {visite.statut === 'en_cours' && (
                            <Button
                              onClick={() => {
                                setSelectedVisite(visite);
                                setReportDialogOpen(true);
                              }}
                              data-testid={`button-report-${visite.id}`}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Terminer & Rapport
                            </Button>
                          )}
                          <Link href={`/property/${visite.demande_visite_detail?.bien}`}>
                            <Button variant="outline">
                              Voir le bien
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {upcomingVisites.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Pas de visite à venir</h3>
                <p className="text-muted-foreground">
                  Vous n'avez pas de visite planifiée
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingVisites.map((visite) => (
                  <Card key={visite.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {formatDate(visite.date_visite)} à {formatTime(visite.heure_visite)}
                          </p>
                          <h4 className="font-medium">
                            {visite.demande_visite_detail?.bien_detail?.titre}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {visite.demande_visite_detail?.bien_detail?.quartier}, 
                            {visite.demande_visite_detail?.bien_detail?.ville}
                          </p>
                        </div>
                        {getStatusBadge(visite.statut)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedVisites.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucune visite terminée</h3>
                <p className="text-muted-foreground">
                  Vos visites terminées apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const success = generateVisiteSummaryPDF(completedVisites);
                      if (!success) {
                        toast({
                          title: 'Aucune visite',
                          description: 'Il n\'y a pas de visite terminée à exporter.',
                          variant: 'destructive',
                        });
                      }
                    }}
                    disabled={completedVisites.length === 0}
                    data-testid="button-export-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exporter tout (PDF)
                  </Button>
                </div>
                {completedVisites.map((visite) => (
                  <Card key={visite.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1">
                            {formatDate(visite.date_visite)}
                          </p>
                          <h4 className="font-medium">
                            {visite.demande_visite_detail?.bien_detail?.titre}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {visite.demande_visite_detail?.bien_detail?.quartier}, 
                            {visite.demande_visite_detail?.bien_detail?.ville}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(visite.statut)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateVisiteReportPDF(visite)}
                            data-testid={`button-export-${visite.id}`}
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

        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Rapport de visite</DialogTitle>
              <DialogDescription>
                Remplissez le rapport pour terminer la visite
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>État général</Label>
                <Select
                  value={reportData.etat_general}
                  onValueChange={(value) => setReportData({ ...reportData, etat_general: value as any })}
                >
                  <SelectTrigger data-testid="select-etat">
                    <SelectValue />
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
                <Label>Conforme à l'annonce</Label>
                <Switch
                  checked={reportData.conformite_annonce}
                  onCheckedChange={(checked) => setReportData({ ...reportData, conformite_annonce: checked })}
                  data-testid="switch-conformite"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Client intéressé</Label>
                <Switch
                  checked={reportData.client_interesse}
                  onCheckedChange={(checked) => setReportData({ ...reportData, client_interesse: checked })}
                  data-testid="switch-interesse"
                />
              </div>

              <div>
                <Label>Points positifs</Label>
                <Textarea
                  placeholder="Décrivez les points positifs..."
                  value={reportData.points_positifs || ''}
                  onChange={(e) => setReportData({ ...reportData, points_positifs: e.target.value })}
                  data-testid="input-positifs"
                />
              </div>

              <div>
                <Label>Points négatifs</Label>
                <Textarea
                  placeholder="Décrivez les points négatifs..."
                  value={reportData.points_negatifs || ''}
                  onChange={(e) => setReportData({ ...reportData, points_negatifs: e.target.value })}
                  data-testid="input-negatifs"
                />
              </div>

              <div>
                <Label>Recommandations</Label>
                <Textarea
                  placeholder="Vos recommandations..."
                  value={reportData.recommandations || ''}
                  onChange={(e) => setReportData({ ...reportData, recommandations: e.target.value })}
                  data-testid="input-recommandations"
                />
              </div>

              <div>
                <Label>Commentaires additionnels</Label>
                <Textarea
                  placeholder="Autres commentaires..."
                  value={reportData.commentaires || ''}
                  onChange={(e) => setReportData({ ...reportData, commentaires: e.target.value })}
                  data-testid="input-commentaires"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmitReport}
                disabled={submitReportMutation.isPending}
                data-testid="button-submit-report"
              >
                {submitReportMutation.isPending ? 'Envoi...' : 'Soumettre le rapport'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
