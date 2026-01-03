import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Home, CheckCircle, XCircle, Clock, Calendar, Users, 
  Eye, MessageCircle, FileText, UserPlus, RefreshCw,
  MapPin, Phone, Mail, Star, AlertCircle, Trash2, Plus, Pencil
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getDjangoImageUrl, getVilleName } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import type { 
  BienList, BienDetail, DemandeVisite, Visite, RapportVisite, UserList, UserProfile, PaginatedResponse 
} from '@shared/schema';

type AgentDetail = UserList & Partial<UserProfile>;

export default function CommissionnaireDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('properties');
  const [demandesVisible, setDemandesVisible] = useState(10);

  const [rejectPropertyDialogOpen, setRejectPropertyDialogOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [propertyRejectReason, setPropertyRejectReason] = useState('');

  const [processDemandeDialogOpen, setProcessDemandeDialogOpen] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<DemandeVisite | null>(null);
  const [demandeAction, setDemandeAction] = useState<'acceptee' | 'rejetee'>('acceptee');
  const [demandeRejectReason, setDemandeRejectReason] = useState('');

  const [createVisiteDialogOpen, setCreateVisiteDialogOpen] = useState(false);
  const [selectedDemandeForVisite, setSelectedDemandeForVisite] = useState<DemandeVisite | null>(null);
  const [visiteDate, setVisiteDate] = useState('');
  const [visiteHeure, setVisiteHeure] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<Visite | null>(null);
  const [newAgentId, setNewAgentId] = useState<string>('');

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RapportVisite | null>(null);

  const [deleteAgentDialogOpen, setDeleteAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<UserList | null>(null);

  const [propertyDetailDialogOpen, setPropertyDetailDialogOpen] = useState(false);
  const [propertyIdForDetail, setPropertyIdForDetail] = useState<number | null>(null);
  const [selectedPropertyFromList, setSelectedPropertyFromList] = useState<BienList | null>(null);

  const [agentDetailDialogOpen, setAgentDetailDialogOpen] = useState(false);
  const [selectedAgentForDetail, setSelectedAgentForDetail] = useState<AgentDetail | null>(null);

  const [createAgentDialogOpen, setCreateAgentDialogOpen] = useState(false);
  const [newAgentFirstName, setNewAgentFirstName] = useState('');
  const [newAgentLastName, setNewAgentLastName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentUsername, setNewAgentUsername] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');
  const [newAgentPassword2, setNewAgentPassword2] = useState('');

  const [editAgentDialogOpen, setEditAgentDialogOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<UserList | null>(null);
  const [editAgentFirstName, setEditAgentFirstName] = useState('');
  const [editAgentLastName, setEditAgentLastName] = useState('');
  const [editAgentEmail, setEditAgentEmail] = useState('');
  const [editAgentPhone, setEditAgentPhone] = useState('');

  const { data: propertyDetailData, isLoading: propertyDetailLoading, isError: propertyDetailError } = useQuery<BienDetail>({
    queryKey: ['/api/v1/biens/commissionnaire', propertyIdForDetail],
    queryFn: async () => {
      if (!propertyIdForDetail) throw new Error('No property ID');
      return api.get<BienDetail>(`/api/v1/biens/commissionnaire/${propertyIdForDetail}/`);
    },
    enabled: propertyDetailDialogOpen && propertyIdForDetail !== null,
    staleTime: 0,
    retry: 1,
  });

  const { data: pendingProperties, isLoading: propertiesLoading } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/commissionnaire/', { statut_validation: 'en_attente' }],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: allProperties } = useQuery<PaginatedResponse<BienList>>({
    queryKey: ['/api/v1/biens/commissionnaire/'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: demandes, isLoading: demandesLoading } = useQuery<PaginatedResponse<DemandeVisite>>({
    queryKey: ['/api/v1/visites/commissionnaire/demandes/'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: visites, isLoading: visitesLoading } = useQuery<PaginatedResponse<Visite>>({
    queryKey: ['/api/v1/visites/commissionnaire/visites/'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: rapports, isLoading: rapportsLoading } = useQuery<PaginatedResponse<RapportVisite>>({
    queryKey: ['/api/v1/visites/commissionnaire/rapports/'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery<PaginatedResponse<UserList>>({
    queryKey: ['/api/v1/auth/commissionnaire/agents/'],
    refetchInterval: 60000, // Rafraîchir toutes les 60 secondes pour les agents
    refetchOnWindowFocus: true,
  });

  const validateMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/biens/commissionnaire/${id}/valider/`, { 
      statut_validation: 'valide'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/commissionnaire/'] });
      toast({
        title: 'Bien valide',
        description: 'Le bien a ete valide avec succes.',
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

  const rejectPropertyMutation = useMutation({
    mutationFn: ({ id, motif }: { id: number; motif: string }) => 
      api.post(`/api/v1/biens/commissionnaire/${id}/valider/`, { 
        statut_validation: 'rejete',
        motif_rejet: motif 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/commissionnaire/'] });
      setRejectPropertyDialogOpen(false);
      setPropertyRejectReason('');
      toast({
        title: 'Bien rejete',
        description: 'Le bien a ete rejete.',
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

  const processDemandeMutation = useMutation({
    mutationFn: ({ id, statut, motif_rejet }: { id: number; statut: 'acceptee' | 'rejetee'; motif_rejet?: string }) => 
      api.post(`/api/v1/visites/commissionnaire/demandes/${id}/traiter/`, { 
        statut, 
        motif_rejet 
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/commissionnaire/demandes/'] });
      setProcessDemandeDialogOpen(false);
      setDemandeRejectReason('');
      toast({
        title: variables.statut === 'acceptee' ? 'Demande acceptee' : 'Demande rejetee',
        description: variables.statut === 'acceptee' 
          ? 'La demande de visite a ete acceptee. Vous pouvez maintenant planifier la visite.'
          : 'La demande de visite a ete rejetee.',
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

  const createVisiteMutation = useMutation({
    mutationFn: (data: { demande: number; agent?: number; date_visite: string; heure_visite: string }) => 
      api.post('/api/v1/visites/commissionnaire/visites/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/commissionnaire/visites/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/commissionnaire/demandes/'] });
      setCreateVisiteDialogOpen(false);
      setVisiteDate('');
      setVisiteHeure('');
      setSelectedAgentId('');
      toast({
        title: 'Visite planifiee',
        description: 'La visite a ete creee avec succes.',
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

  const reassignAgentMutation = useMutation({
    mutationFn: ({ visiteId, agentId }: { visiteId: number; agentId: number }) => 
      api.post(`/api/v1/visites/commissionnaire/visites/${visiteId}/reassigner/`, { agent: agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/commissionnaire/visites/'] });
      setReassignDialogOpen(false);
      setNewAgentId('');
      toast({
        title: 'Agent reassigne',
        description: "L'agent a ete reassigne a cette visite.",
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


  const deleteAgentMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/auth/commissionnaire/agents/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/commissionnaire/agents/'] });
      setDeleteAgentDialogOpen(false);
      setAgentToDelete(null);
      toast({
        title: 'Agent supprime',
        description: "L'agent a ete supprime avec succes.",
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

  const createAgentMutation = useMutation({
    mutationFn: (data: { username: string; email: string; first_name: string; last_name: string; phone?: string; password: string; password2: string }) => 
      api.post('/api/v1/auth/commissionnaire/agents/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/commissionnaire/agents/'] });
      setCreateAgentDialogOpen(false);
      setNewAgentFirstName('');
      setNewAgentLastName('');
      setNewAgentEmail('');
      setNewAgentPhone('');
      setNewAgentUsername('');
      setNewAgentPassword('');
      setNewAgentPassword2('');
      toast({
        title: 'Agent cree',
        description: "L'agent a ete cree avec succes.",
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

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { email?: string; first_name?: string; last_name?: string; phone?: string } }) => 
      api.patch(`/api/v1/auth/commissionnaire/agents/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/commissionnaire/agents/'] });
      setEditAgentDialogOpen(false);
      setAgentToEdit(null);
      toast({
        title: 'Agent modifie',
        description: "L'agent a ete modifie avec succes.",
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

  const handleRejectProperty = () => {
    if (selectedPropertyId && propertyRejectReason.trim()) {
      rejectPropertyMutation.mutate({ id: selectedPropertyId, motif: propertyRejectReason });
    }
  };

  const handleProcessDemande = () => {
    if (selectedDemande) {
      if (demandeAction === 'rejetee' && !demandeRejectReason.trim()) {
        toast({
          title: 'Motif requis',
          description: 'Veuillez indiquer le motif du rejet.',
          variant: 'destructive',
        });
        return;
      }
      processDemandeMutation.mutate({
        id: selectedDemande.id,
        statut: demandeAction,
        motif_rejet: demandeAction === 'rejetee' ? demandeRejectReason : undefined,
      });
    }
  };

  const handleCreateVisite = () => {
    if (selectedDemandeForVisite && visiteDate && visiteHeure) {
      createVisiteMutation.mutate({
        demande: selectedDemandeForVisite.id,
        agent: selectedAgentId ? parseInt(selectedAgentId) : undefined,
        date_visite: visiteDate,
        heure_visite: visiteHeure,
      });
    }
  };

  const handleReassignAgent = () => {
    if (selectedVisite && newAgentId) {
      reassignAgentMutation.mutate({
        visiteId: selectedVisite.id,
        agentId: parseInt(newAgentId),
      });
    }
  };

  const handleCreateAgent = () => {
    if (newAgentFirstName.trim() && newAgentLastName.trim() && newAgentEmail.trim() && newAgentUsername.trim() && newAgentPassword.trim() && newAgentPassword2.trim()) {
      if (newAgentPassword !== newAgentPassword2) {
        toast({
          title: 'Erreur',
          description: 'Les mots de passe ne correspondent pas',
          variant: 'destructive',
        });
        return;
      }
      createAgentMutation.mutate({
        username: newAgentUsername,
        email: newAgentEmail,
        first_name: newAgentFirstName,
        last_name: newAgentLastName,
        phone: newAgentPhone,
        password: newAgentPassword,
        password2: newAgentPassword2,
      });
    }
  };

  const handleUpdateAgent = () => {
    if (agentToEdit && editAgentFirstName.trim() && editAgentLastName.trim() && editAgentEmail.trim()) {
      updateAgentMutation.mutate({
        id: agentToEdit.id,
        data: {
          email: editAgentEmail,
          first_name: editAgentFirstName,
          last_name: editAgentLastName,
          phone: editAgentPhone,
        },
      });
    }
  };

  const openEditAgentDialog = (agent: UserList) => {
    setAgentToEdit(agent);
    
    // Si first_name et last_name ne sont pas disponibles, extraire depuis full_name
    let firstName = agent.first_name || '';
    let lastName = agent.last_name || '';
    
    if (!firstName && !lastName && agent.full_name) {
      const nameParts = agent.full_name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    setEditAgentFirstName(firstName);
    setEditAgentLastName(lastName);
    setEditAgentEmail(agent.email);
    setEditAgentPhone(agent.phone || '');
    setEditAgentDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadgeVariant = (statut: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (statut) {
      case 'en_attente':
        return 'secondary';
      case 'acceptee':
      case 'valide':
      case 'planifiee':
        return 'default';
      case 'rejetee':
      case 'rejete':
      case 'annulee':
        return 'destructive';
      case 'terminee':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const pendingCount = pendingProperties?.count || 0;
  const totalPropertiesCount = allProperties?.count || 0;
  const availablePropertiesCount = allProperties?.results?.filter(p => p.statut_validation === 'valide' && p.statut_location === 'disponible').length || 0;
  const rentedPropertiesCount = allProperties?.results?.filter(p => p.statut_validation === 'valide' && p.statut_location === 'loue').length || 0;
  const pendingDemandesCount = demandes?.results?.filter(d => d.statut === 'en_attente').length || 0;

  // Count only accepted demandes that don't have a visite scheduled yet
  const acceptedDemandesWithoutVisite = demandes?.results?.filter(d => {
    if (d.statut !== 'acceptee') return false;
    // Check if this demande already has a visite
    const hasVisite = visites?.results?.find(v => 
      (v as any).demande_visite === d.id || (v as any).demande === d.id
    );
    return !hasVisite;
  }).length || 0;

  const activeVisitesCount = visites?.results?.filter(v => v.statut === 'planifiee' || v.statut === 'en_cours').length || 0;
  const rapportsCount = rapports?.count || 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.photo} alt={user?.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user?.first_name?.[0]?.toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-muted-foreground">Commissionnaire</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Gerez les validations de biens, les demandes de visite et les agents
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-total-properties-count">{totalPropertiesCount}</p>
                  <p className="text-xs text-muted-foreground truncate">Total biens</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-available-properties-count">{availablePropertiesCount}</p>
                  <p className="text-xs text-muted-foreground truncate">Disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-rented-properties-count">{rentedPropertiesCount}</p>
                  <p className="text-xs text-muted-foreground truncate">Loués</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-pending-properties-count">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground truncate">A valider</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-pending-demandes-count">{pendingDemandesCount}</p>
                  <p className="text-xs text-muted-foreground truncate">Demandes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-accepted-demandes-count">{acceptedDemandesWithoutVisite}</p>
                  <p className="text-xs text-muted-foreground truncate">A planifier</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-active-visits-count">{activeVisitesCount}</p>
                  <p className="text-xs text-muted-foreground truncate">Visites</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold" data-testid="text-reports-count">{rapportsCount}</p>
                  <p className="text-xs text-muted-foreground truncate">Rapports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="properties" data-testid="tab-properties">
              Biens ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="demandes" data-testid="tab-demandes">
              Demandes ({pendingDemandesCount + acceptedDemandesWithoutVisite})
            </TabsTrigger>
            <TabsTrigger value="visites" data-testid="tab-visites">
              Visites ({visites?.count || 0})
            </TabsTrigger>
            <TabsTrigger value="rapports" data-testid="tab-rapports">
              Rapports ({rapportsCount})
            </TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agents">
              Agents ({agents?.count || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            {propertiesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Skeleton className="w-32 h-24 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingProperties?.results?.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">Aucun bien en attente</h3>
                <p className="text-muted-foreground">
                  Tous les biens ont ete traites
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingProperties?.results?.map((property) => (
                  <Card key={property.id} data-testid={`card-property-${property.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div 
                          className="w-full md:w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80"
                          onClick={() => {
                            setSelectedPropertyFromList(property);
                            setPropertyIdForDetail(property.id);
                            setPropertyDetailDialogOpen(true);
                          }}
                        >
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
                          <div className={`w-full h-full flex items-center justify-center ${property.photo_principale?.image ? 'hidden' : ''}`}>
                            <Home className="w-8 h-8 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold line-clamp-1">
                              {property.titre}
                            </h3>
                            <Badge variant="secondary">{property.type_bien_display}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.quartier}, {getVilleName(property.ville, property.ville_nom, property.ville_detail)}
                          </p>
                          <p className="text-sm font-medium text-primary mb-2">
                            {parseInt(property.prix_mensuel).toLocaleString()} FCFA/mois
                          </p>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={property.proprietaire.photo} />
                              <AvatarFallback className="text-xs">
                                {property.proprietaire.first_name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {property.proprietaire.first_name} {property.proprietaire.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              - {formatDate(property.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedPropertyFromList(property);
                              setPropertyIdForDetail(property.id);
                              setPropertyDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-property-${property.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => validateMutation.mutate(property.id)}
                            disabled={validateMutation.isPending}
                            data-testid={`button-validate-${property.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Valider
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              setSelectedPropertyId(property.id);
                              setRejectPropertyDialogOpen(true);
                            }}
                            data-testid={`button-reject-${property.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="demandes">
            {demandesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (() => {
              // Filter out rejected demandes and those with already scheduled visits
              const filteredDemandes = (demandes?.results || []).filter((demande) => {
                if (demande.statut === 'rejetee') return false;
                if (demande.statut === 'acceptee') {
                  const hasVisite = visites?.results?.find(v => 
                    (v as any).demande_visite === demande.id || (v as any).demande === demande.id
                  );
                  if (hasVisite) return false;
                }
                return true;
              });

              if (filteredDemandes.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Aucune demande à traiter</h3>
                    <p className="text-muted-foreground">
                      Les demandes de visite à traiter apparaitront ici
                    </p>
                  </div>
                );
              }

              const displayedDemandes = filteredDemandes.slice(0, demandesVisible);
              const hasMore = filteredDemandes.length > demandesVisible;

              return (
                <div className="space-y-4">
                  {displayedDemandes.map((demande) => (
                    <Card key={demande.id} data-testid={`card-demande-${demande.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={demande.client.photo} />
                            <AvatarFallback>
                              {demande.client.first_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="font-medium">
                                  {demande.client.full_name || 
                                   (demande.client.first_name && demande.client.last_name 
                                     ? `${demande.client.first_name} ${demande.client.last_name}`
                                     : demande.client.username)}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {demande.client.email}
                                </p>
                              </div>
                              <Badge variant={getStatusBadgeVariant(demande.statut)}>
                                {demande.statut_display}
                              </Badge>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                              <p className="text-sm font-medium mb-1">
                                Bien: {demande.bien_detail?.titre}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {demande.bien_detail?.quartier}, {demande.bien_detail?.ville}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {formatDate(demande.date_souhaitee)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                {demande.heure_souhaitee}
                              </span>
                            </div>
                            {demande.message && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                "{demande.message}"
                              </p>
                            )}
                            {demande.motif_rejet && (
                              <p className="text-sm text-destructive mt-2">
                                Motif de rejet: {demande.motif_rejet}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-row md:flex-col gap-2 justify-end">
                            {demande.statut === 'en_attente' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDemande(demande);
                                    setDemandeAction('acceptee');
                                    setProcessDemandeDialogOpen(true);
                                  }}
                                  data-testid={`button-accept-demande-${demande.id}`}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Accepter
                                </Button>
                                <Button 
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDemande(demande);
                                    setDemandeAction('rejetee');
                                    setProcessDemandeDialogOpen(true);
                                  }}
                                  data-testid={`button-reject-demande-${demande.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                            {demande.statut === 'acceptee' && (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedDemandeForVisite(demande);
                                  setVisiteDate(demande.date_souhaitee);
                                  setVisiteHeure(demande.heure_souhaitee);
                                  setCreateVisiteDialogOpen(true);
                                }}
                                data-testid={`button-schedule-visite-${demande.id}`}
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Planifier visite
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setDemandesVisible(prev => prev + 10)}
                      >
                        Voir plus ({filteredDemandes.length - demandesVisible} restantes)
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="visites">
            {visitesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : visites?.results?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucune visite</h3>
                <p className="text-muted-foreground">
                  Les visites planifiees apparaitront ici
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visites?.results?.map((visite) => (
                  <Card key={visite.id} data-testid={`card-visite-${visite.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium">
                              {visite.demande_detail?.bien_detail?.titre}
                            </h4>
                            <Badge variant={getStatusBadgeVariant(visite.statut)}>
                              {visite.statut_display}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {visite.demande_detail?.bien_detail?.quartier}, {visite.demande_detail?.bien_detail?.ville}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">Client</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={visite.demande_detail?.client?.photo} />
                                  <AvatarFallback className="text-xs">
                                    {visite.demande_detail?.client?.full_name?.[0]?.toUpperCase() || 
                                     visite.demande_detail?.client?.first_name?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium line-clamp-1">
                                    {visite.demande_detail?.client?.full_name || 
                                     (visite.demande_detail?.client?.first_name && visite.demande_detail?.client?.last_name 
                                       ? `${visite.demande_detail.client.first_name} ${visite.demande_detail.client.last_name}`
                                       : visite.demande_detail?.client?.username || 'Client inconnu')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Agent</p>
                              {visite.agent_detail ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={visite.agent_detail.photo} />
                                    <AvatarFallback className="text-xs">
                                      {visite.agent_detail.full_name?.[0]?.toUpperCase() || 
                                       visite.agent_detail.first_name?.[0]?.toUpperCase() || 'A'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium line-clamp-1">
                                      {visite.agent_detail.full_name || 
                                       (visite.agent_detail.first_name && visite.agent_detail.last_name 
                                         ? `${visite.agent_detail.first_name} ${visite.agent_detail.last_name}`
                                         : visite.agent_detail.username || 'Agent inconnu')}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Non assigne</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm mt-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {formatDate(visite.date_visite)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {visite.heure_visite}
                            </span>
                          </div>
                          {visite.notes_commissionnaire && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              Notes: {visite.notes_commissionnaire}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 justify-end">
                          {(visite.statut === 'planifiee' || visite.statut === 'en_cours') && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVisite(visite);
                                setNewAgentId(visite.agent?.toString() || '');
                                setReassignDialogOpen(true);
                              }}
                              data-testid={`button-reassign-${visite.id}`}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              {visite.agent_detail ? 'Reassigner' : 'Assigner agent'}
                            </Button>
                          )}
                          <Link href={`/messages?demande=${(visite as any).demande_visite || (visite as any).demande}`}>
                            <Button variant="outline" size="sm" data-testid={`button-chat-${visite.id}`}>
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Discussion
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

          <TabsContent value="rapports">
            {rapportsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : rapports?.results?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun rapport</h3>
                <p className="text-muted-foreground">
                  Les rapports de visite apparaitront ici
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rapports?.results?.map((rapport) => (
                  <Card key={rapport.id} data-testid={`card-rapport-${rapport.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium">Rapport de visite #{rapport.visite}</h4>
                            <Badge variant={rapport.client_interesse ? 'default' : 'secondary'}>
                              {rapport.client_interesse ? 'Client interesse' : 'Client non interesse'}
                            </Badge>
                          </div>
                          {rapport.agent_detail && (
                            <div className="flex items-center gap-2 mb-3">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={rapport.agent_detail.photo} />
                                <AvatarFallback className="text-xs">
                                  {rapport.agent_detail.first_name?.[0]?.toUpperCase() || 'A'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  Agent: {rapport.agent_detail.first_name} {rapport.agent_detail.last_name}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {rapport.etat_general_display}
                            </Badge>
                            <Badge variant={rapport.conformite_annonce ? 'default' : 'destructive'}>
                              {rapport.conformite_annonce ? 'Conforme' : 'Non conforme'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(rapport.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 justify-end">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(rapport);
                              setReportDialogOpen(true);
                            }}
                            data-testid={`button-view-rapport-${rapport.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="agents">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold">Mes agents</h2>
              <Button 
                onClick={() => setCreateAgentDialogOpen(true)}
                data-testid="button-add-agent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un agent
              </Button>
            </div>
            {agentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex gap-4 items-center">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : agents?.results?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun agent</h3>
                <p className="text-muted-foreground">
                  Vous n'avez pas encore d'agents assignes. Les agents sont crees par l'administrateur.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {agents?.results?.map((agent) => (
                  <Card key={agent.id} data-testid={`card-agent-${agent.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={agent.photo} />
                          <AvatarFallback>
                            {agent.full_name?.[0]?.toUpperCase() || 
                             agent.first_name?.[0]?.toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-base">
                            {agent.full_name || 
                             (agent.first_name && agent.last_name 
                               ? `${agent.first_name} ${agent.last_name}`
                               : agent.username)}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                            <span>{agent.email}</span>
                            {agent.phone && (
                              <span>• {agent.phone}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => {
                              setSelectedAgentForDetail(agent as AgentDetail);
                              setAgentDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-agent-${agent.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => openEditAgentDialog(agent)}
                            data-testid={`button-edit-agent-${agent.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => {
                              setAgentToDelete(agent);
                              setDeleteAgentDialogOpen(true);
                            }}
                            data-testid={`button-delete-agent-${agent.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

        <Dialog open={rejectPropertyDialogOpen} onOpenChange={setRejectPropertyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter le bien</DialogTitle>
              <DialogDescription>
                Veuillez indiquer le motif du rejet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="property-reject-reason">Motif du rejet</Label>
                <Textarea
                  id="property-reject-reason"
                  placeholder="Expliquez pourquoi ce bien ne peut pas etre valide..."
                  value={propertyRejectReason}
                  onChange={(e) => setPropertyRejectReason(e.target.value)}
                  data-testid="input-property-reject-reason"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setRejectPropertyDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleRejectProperty}
                  disabled={!propertyRejectReason.trim() || rejectPropertyMutation.isPending}
                  data-testid="button-confirm-reject-property"
                >
                  Confirmer le rejet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={processDemandeDialogOpen} onOpenChange={setProcessDemandeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {demandeAction === 'acceptee' ? 'Accepter la demande' : 'Rejeter la demande'}
              </DialogTitle>
              <DialogDescription>
                {demandeAction === 'acceptee' 
                  ? 'Confirmez-vous vouloir accepter cette demande de visite ?' 
                  : 'Veuillez indiquer le motif du rejet'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedDemande && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{selectedDemande.bien_detail?.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    Demande de {selectedDemande.client.first_name} {selectedDemande.client.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pour le {formatDate(selectedDemande.date_souhaitee)} a {selectedDemande.heure_souhaitee}
                  </p>
                </div>
              )}
              {demandeAction === 'rejetee' && (
                <div>
                  <Label htmlFor="demande-reject-reason">Motif du rejet</Label>
                  <Textarea
                    id="demande-reject-reason"
                    placeholder="Expliquez pourquoi cette demande est rejetee..."
                    value={demandeRejectReason}
                    onChange={(e) => setDemandeRejectReason(e.target.value)}
                    data-testid="input-demande-reject-reason"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setProcessDemandeDialogOpen(false);
                    setDemandeRejectReason('');
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  variant={demandeAction === 'acceptee' ? 'default' : 'destructive'}
                  className="flex-1"
                  onClick={handleProcessDemande}
                  disabled={processDemandeMutation.isPending}
                  data-testid="button-confirm-process-demande"
                >
                  {demandeAction === 'acceptee' ? 'Accepter' : 'Rejeter'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={createVisiteDialogOpen} onOpenChange={setCreateVisiteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Planifier une visite</DialogTitle>
              <DialogDescription>
                Definissez la date et assignez un agent pour cette visite
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedDemandeForVisite && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{selectedDemandeForVisite.bien_detail?.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    Client: {selectedDemandeForVisite.client.first_name} {selectedDemandeForVisite.client.last_name}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="visite-date">Date de visite</Label>
                  <Input
                    id="visite-date"
                    type="date"
                    value={visiteDate}
                    onChange={(e) => setVisiteDate(e.target.value)}
                    data-testid="input-visite-date"
                  />
                </div>
                <div>
                  <Label htmlFor="visite-heure">Heure</Label>
                  <Input
                    id="visite-heure"
                    type="time"
                    value={visiteHeure}
                    onChange={(e) => setVisiteHeure(e.target.value)}
                    data-testid="input-visite-heure"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="agent-select">Agent (optionnel)</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger data-testid="select-agent">
                    <SelectValue placeholder="Selectionner un agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.results?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.full_name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setCreateVisiteDialogOpen(false);
                    setVisiteDate('');
                    setVisiteHeure('');
                    setSelectedAgentId('');
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreateVisite}
                  disabled={!visiteDate || !visiteHeure || createVisiteMutation.isPending}
                  data-testid="button-confirm-create-visite"
                >
                  Planifier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedVisite?.agent_detail ? 'Reassigner un agent' : 'Assigner un agent'}
              </DialogTitle>
              <DialogDescription>
                Selectionnez un agent pour cette visite
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedVisite && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{selectedVisite.demande_detail?.bien_detail?.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedVisite.date_visite)} a {selectedVisite.heure_visite}
                  </p>
                  {selectedVisite.agent_detail && (
                    <p className="text-sm text-muted-foreground">
                      Agent actuel: {selectedVisite.agent_detail.first_name} {selectedVisite.agent_detail.last_name}
                    </p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="new-agent-select">Nouvel agent</Label>
                <Select value={newAgentId} onValueChange={setNewAgentId}>
                  <SelectTrigger data-testid="select-new-agent">
                    <SelectValue placeholder="Selectionner un agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.results?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.full_name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setReassignDialogOpen(false);
                    setNewAgentId('');
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleReassignAgent}
                  disabled={!newAgentId || reassignAgentMutation.isPending}
                  data-testid="button-confirm-reassign"
                >
                  Confirmer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Details du rapport</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Etat general</h4>
                    <Badge variant="outline">{selectedReport.etat_general_display}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Conformite</h4>
                    <Badge variant={selectedReport.conformite_annonce ? 'default' : 'destructive'}>
                      {selectedReport.conformite_annonce ? 'Conforme a l\'annonce' : 'Non conforme'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedReport.etat_electricite && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Electricite</h4>
                      <p className="text-sm">{selectedReport.etat_electricite}</p>
                    </div>
                  )}
                  {selectedReport.etat_plomberie && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Plomberie</h4>
                      <p className="text-sm">{selectedReport.etat_plomberie}</p>
                    </div>
                  )}
                  {selectedReport.etat_peinture && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Peinture</h4>
                      <p className="text-sm">{selectedReport.etat_peinture}</p>
                    </div>
                  )}
                  {selectedReport.etat_sols && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Sols</h4>
                      <p className="text-sm">{selectedReport.etat_sols}</p>
                    </div>
                  )}
                  {selectedReport.etat_fenetres && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Fenetres</h4>
                      <p className="text-sm">{selectedReport.etat_fenetres}</p>
                    </div>
                  )}
                  {selectedReport.etat_portes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Portes</h4>
                      <p className="text-sm">{selectedReport.etat_portes}</p>
                    </div>
                  )}
                </div>

                {selectedReport.accessibilite && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Accessibilite</h4>
                    <p className="text-sm">{selectedReport.accessibilite}</p>
                  </div>
                )}

                {selectedReport.environnement && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Environnement</h4>
                    <p className="text-sm">{selectedReport.environnement}</p>
                  </div>
                )}

                {selectedReport.points_positifs && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Points positifs</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.points_positifs}</p>
                  </div>
                )}

                {selectedReport.points_negatifs && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Points negatifs</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.points_negatifs}</p>
                  </div>
                )}

                {selectedReport.recommandations && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Recommandations</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.recommandations}</p>
                  </div>
                )}

                {selectedReport.commentaires && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Commentaires</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.commentaires}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-4 border-t">
                  <Badge variant={selectedReport.client_interesse ? 'default' : 'secondary'}>
                    {selectedReport.client_interesse ? 'Client interesse par le bien' : 'Client non interesse'}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={deleteAgentDialogOpen} onOpenChange={setDeleteAgentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer l'agent</DialogTitle>
              <DialogDescription>
                Etes-vous sur de vouloir supprimer cet agent ?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {agentToDelete && (
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={agentToDelete.photo} />
                    <AvatarFallback>
                      {agentToDelete.first_name?.[0]?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{agentToDelete.first_name} {agentToDelete.last_name}</p>
                    <p className="text-sm text-muted-foreground">{agentToDelete.email}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Cette action est irreversible. L'agent ne pourra plus acceder a son compte.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setDeleteAgentDialogOpen(false);
                    setAgentToDelete(null);
                  }}
                  data-testid="button-cancel-delete-agent"
                >
                  Annuler
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={() => agentToDelete && deleteAgentMutation.mutate(agentToDelete.id)}
                  disabled={deleteAgentMutation.isPending}
                  data-testid="button-confirm-delete-agent"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={createAgentDialogOpen} onOpenChange={setCreateAgentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un agent</DialogTitle>
              <DialogDescription>
                Creez un nouveau compte agent pour votre equipe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-agent-first-name">Prenom</Label>
                  <Input
                    id="new-agent-first-name"
                    placeholder="Prenom"
                    value={newAgentFirstName}
                    onChange={(e) => setNewAgentFirstName(e.target.value)}
                    data-testid="input-new-agent-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-agent-last-name">Nom</Label>
                  <Input
                    id="new-agent-last-name"
                    placeholder="Nom"
                    value={newAgentLastName}
                    onChange={(e) => setNewAgentLastName(e.target.value)}
                    data-testid="input-new-agent-last-name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="new-agent-username">Nom d'utilisateur</Label>
                <Input
                  id="new-agent-username"
                  placeholder="nom.utilisateur"
                  value={newAgentUsername}
                  onChange={(e) => setNewAgentUsername(e.target.value)}
                  data-testid="input-new-agent-username"
                />
              </div>
              <div>
                <Label htmlFor="new-agent-email">Email</Label>
                <Input
                  id="new-agent-email"
                  type="email"
                  placeholder="agent@exemple.com"
                  value={newAgentEmail}
                  onChange={(e) => setNewAgentEmail(e.target.value)}
                  data-testid="input-new-agent-email"
                />
              </div>
              <div>
                <Label htmlFor="new-agent-phone">Telephone (optionnel)</Label>
                <Input
                  id="new-agent-phone"
                  type="tel"
                  placeholder="+225 00 00 00 00"
                  value={newAgentPhone}
                  onChange={(e) => setNewAgentPhone(e.target.value)}
                  data-testid="input-new-agent-phone"
                />
              </div>
              <div>
                <Label htmlFor="new-agent-password">Mot de passe</Label>
                <Input
                  id="new-agent-password"
                  type="password"
                  placeholder="Mot de passe"
                  value={newAgentPassword}
                  onChange={(e) => setNewAgentPassword(e.target.value)}
                  data-testid="input-new-agent-password"
                />
              </div>
              <div>
                <Label htmlFor="new-agent-password2">Confirmer le mot de passe</Label>
                <Input
                  id="new-agent-password2"
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={newAgentPassword2}
                  onChange={(e) => setNewAgentPassword2(e.target.value)}
                  data-testid="input-new-agent-password2"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setCreateAgentDialogOpen(false);
                    setNewAgentFirstName('');
                    setNewAgentLastName('');
                    setNewAgentEmail('');
                    setNewAgentPhone('');
                    setNewAgentUsername('');
                    setNewAgentPassword('');
                    setNewAgentPassword2('');
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreateAgent}
                  disabled={!newAgentFirstName.trim() || !newAgentLastName.trim() || !newAgentEmail.trim() || !newAgentUsername.trim() || !newAgentPassword.trim() || !newAgentPassword2.trim() || createAgentMutation.isPending}
                  data-testid="button-confirm-create-agent"
                >
                  Creer l'agent
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editAgentDialogOpen} onOpenChange={setEditAgentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'agent</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'agent
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {agentToEdit && (
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarImage src={agentToEdit.photo} />
                    <AvatarFallback>
                      {agentToEdit.first_name?.[0]?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{agentToEdit.first_name} {agentToEdit.last_name}</p>
                    <p className="text-sm text-muted-foreground">@{agentToEdit.username}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-agent-first-name">Prenom</Label>
                  <Input
                    id="edit-agent-first-name"
                    placeholder="Prenom"
                    value={editAgentFirstName}
                    onChange={(e) => setEditAgentFirstName(e.target.value)}
                    data-testid="input-edit-agent-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-agent-last-name">Nom</Label>
                  <Input
                    id="edit-agent-last-name"
                    placeholder="Nom"
                    value={editAgentLastName}
                    onChange={(e) => setEditAgentLastName(e.target.value)}
                    data-testid="input-edit-agent-last-name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-agent-email">Email</Label>
                <Input
                  id="edit-agent-email"
                  type="email"
                  placeholder="agent@exemple.com"
                  value={editAgentEmail}
                  onChange={(e) => setEditAgentEmail(e.target.value)}
                  data-testid="input-edit-agent-email"
                />
              </div>
              <div>
                <Label htmlFor="edit-agent-phone">Telephone</Label>
                <Input
                  id="edit-agent-phone"
                  type="tel"
                  placeholder="+225 00 00 00 00"
                  value={editAgentPhone}
                  onChange={(e) => setEditAgentPhone(e.target.value)}
                  data-testid="input-edit-agent-phone"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setEditAgentDialogOpen(false);
                    setAgentToEdit(null);
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleUpdateAgent}
                  disabled={!editAgentFirstName?.trim() || !editAgentLastName?.trim() || !editAgentEmail?.trim() || updateAgentMutation.isPending}
                  data-testid="button-confirm-edit-agent"
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={propertyDetailDialogOpen} onOpenChange={(open) => {
          setPropertyDetailDialogOpen(open);
          if (!open) {
            setPropertyIdForDetail(null);
            setSelectedPropertyFromList(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Details du bien</DialogTitle>
              <DialogDescription>
                Informations completes sur le bien a valider
              </DialogDescription>
            </DialogHeader>
            {propertyDetailLoading ? (
              <div className="space-y-6 py-4">
                <Skeleton className="aspect-video rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              </div>
            ) : propertyDetailError && !selectedPropertyFromList ? (
              <div className="py-8 text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">Impossible de charger les details</h3>
                <p className="text-muted-foreground mb-4">
                  Les informations de ce bien n'ont pas pu etre recuperees. Le bien n'existe peut-etre plus.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setPropertyDetailDialogOpen(false)}
                  data-testid="button-close-property-error"
                >
                  Fermer
                </Button>
              </div>
            ) : (propertyDetailData || selectedPropertyFromList) ? (() => {
              const displayProperty = propertyDetailData || selectedPropertyFromList;
              if (!displayProperty) return null;
              return (
              <div className="space-y-6 py-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted relative">
                  {(() => {
                    const mainImage = displayProperty.photo_principale?.image || 
                      ('photos' in displayProperty && (displayProperty as BienDetail).photos?.find(p => p.is_principale)?.image) ||
                      ('photos' in displayProperty && (displayProperty as BienDetail).photos?.[0]?.image);

                    if (mainImage) {
                      return (
                        <img
                          src={getDjangoImageUrl(mainImage) || undefined}
                          alt={displayProperty.titre}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      );
                    }
                    return null;
                  })()}
                  <div className={`image-fallback absolute inset-0 flex items-center justify-center ${
                    displayProperty.photo_principale?.image || 
                    ('photos' in displayProperty && (displayProperty as BienDetail).photos?.length > 0) 
                      ? 'hidden' : ''
                  }`}>
                    <Home className="w-16 h-16 text-muted-foreground" />
                  </div>
                </div>

                {'photos' in displayProperty && (displayProperty as BienDetail).photos && (displayProperty as BienDetail).photos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Galerie photos ({(displayProperty as BienDetail).photos.length})</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(displayProperty as BienDetail).photos.map((photo, index) => (
                        <div key={photo.id || index} className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                          {photo.image ? (
                            <img
                              src={getDjangoImageUrl(photo.image) || undefined}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.gallery-fallback');
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`gallery-fallback absolute inset-0 flex items-center justify-center ${photo.image ? 'hidden' : ''}`}>
                            <Home className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold" data-testid="text-property-detail-title">
                    {displayProperty.titre}
                  </h3>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {displayProperty.quartier}, {displayProperty.ville}
                  </p>
                  <p className="text-2xl font-bold text-primary mt-2" data-testid="text-property-detail-price">
                    {parseInt(displayProperty.prix_mensuel).toLocaleString()} FCFA/mois
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Type de bien</p>
                    <p className="font-medium">{displayProperty.type_bien_display}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Chambres</p>
                    <p className="font-medium">{displayProperty.nombre_chambres}</p>
                  </div>
                  {'nombre_salles_bain' in displayProperty && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Salles de bain</p>
                      <p className="font-medium">{(displayProperty as BienDetail).nombre_salles_bain || 'Non specifie'}</p>
                    </div>
                  )}
                  {'superficie' in displayProperty && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Surface</p>
                      <p className="font-medium">{(displayProperty as BienDetail).superficie ? `${(displayProperty as BienDetail).superficie} m2` : 'Non specifie'}</p>
                    </div>
                  )}
                </div>

                {'eau_courante' in displayProperty && (
                <div>
                  <h4 className="font-medium mb-2">Equipements</h4>
                  <div className="flex flex-wrap gap-2">
                    {(displayProperty as BienDetail).eau_courante && <Badge variant="secondary">Eau courante</Badge>}
                    {(displayProperty as BienDetail).electricite && <Badge variant="secondary">Electricite</Badge>}
                    {(displayProperty as BienDetail).meuble && <Badge variant="secondary">Meuble</Badge>}
                    {(displayProperty as BienDetail).parking && <Badge variant="secondary">Parking</Badge>}
                    {(displayProperty as BienDetail).jardin && <Badge variant="secondary">Jardin</Badge>}
                    {(displayProperty as BienDetail).climatisation && <Badge variant="secondary">Climatisation</Badge>}
                    {(displayProperty as BienDetail).gardien && <Badge variant="secondary">Gardien</Badge>}
                  </div>
                </div>
                )}

                {'description' in displayProperty && (displayProperty as BienDetail).description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground">{(displayProperty as BienDetail).description}</p>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Proprietaire</h4>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={displayProperty.proprietaire.photo} />
                      <AvatarFallback>
                        {displayProperty.proprietaire.first_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {displayProperty.proprietaire.first_name} {displayProperty.proprietaire.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {displayProperty.proprietaire.email}
                      </p>
                      {displayProperty.proprietaire.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {displayProperty.proprietaire.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setPropertyDetailDialogOpen(false)}
                    data-testid="button-close-property-detail"
                  >
                    Fermer
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setPropertyDetailDialogOpen(false);
                      validateMutation.mutate(displayProperty.id);
                    }}
                    disabled={validateMutation.isPending}
                    data-testid="button-validate-from-detail"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Valider
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setPropertyDetailDialogOpen(false);
                      setSelectedPropertyId(displayProperty.id);
                      setRejectPropertyDialogOpen(true);
                    }}
                    data-testid="button-reject-from-detail"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              </div>
              );
            })() : null}
          </DialogContent>
        </Dialog>

        <Dialog open={agentDetailDialogOpen} onOpenChange={setAgentDetailDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Details de l'agent</DialogTitle>
              <DialogDescription>
                Informations completes sur l'agent
              </DialogDescription>
            </DialogHeader>
            {selectedAgentForDetail && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={selectedAgentForDetail.photo} />
                    <AvatarFallback className="text-2xl">
                      {selectedAgentForDetail.full_name?.[0]?.toUpperCase() || 
                       selectedAgentForDetail.first_name?.[0]?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold" data-testid="text-agent-detail-name">
                      {selectedAgentForDetail.full_name || 
                       (selectedAgentForDetail.first_name && selectedAgentForDetail.last_name 
                         ? `${selectedAgentForDetail.first_name} ${selectedAgentForDetail.last_name}`
                         : selectedAgentForDetail.username)}
                    </h3>
                    <Badge variant="secondary" className="mt-2">Agent</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium" data-testid="text-agent-detail-email">{selectedAgentForDetail.email}</p>
                    </div>
                  </div>

                  {selectedAgentForDetail.phone && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Telephone</p>
                        <p className="font-medium" data-testid="text-agent-detail-phone">{selectedAgentForDetail.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nom d'utilisateur</p>
                      <p className="font-medium">{selectedAgentForDetail.username}</p>
                    </div>
                  </div>

                  {selectedAgentForDetail.date_joined && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Membre depuis</p>
                        <p className="font-medium">{formatDate(selectedAgentForDetail.date_joined)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setAgentDetailDialogOpen(false)}
                    data-testid="button-close-agent-detail"
                  >
                    Fermer
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setAgentDetailDialogOpen(false);
                      setAgentToDelete(selectedAgentForDetail);
                      setDeleteAgentDialogOpen(true);
                    }}
                    data-testid="button-delete-from-detail"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}