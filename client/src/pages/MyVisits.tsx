import { EtatVide, ErreurRequete } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { formaterDateLongue } from '@/lib/dates';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, Clock, CircleCheck, CircleX, FileText, User, Eye, ArrowLeft, House, Flag, Wallet } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { estPositif, formaterMontant } from '@/lib/prix';
import { DialogueAvis } from '@/components/confiance/DialogueAvis';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDjangoImageUrl } from '@/lib/utils';
import type { DemandeVisite, PaginatedResponse, RapportVisite, Visite } from '@shared/schema';



interface DemandeWithVisite extends DemandeVisite {
  visite_detail?: Visite & { rapport?: RapportVisite };
}

/** L'API renvoie la visite sous `visite` ; ces pages lisaient un champ
 *  `visite_detail` que personne n'envoie : les visites planifiées et faites
 *  n'apparaissaient jamais côté client. */
function avecVisite(page: PaginatedResponse<DemandeWithVisite>): PaginatedResponse<DemandeWithVisite> {
  return {
    ...page,
    results: page.results.map((d) => ({
      ...d,
      visite_detail: d.visite_detail ?? (d.visite as DemandeWithVisite['visite_detail']) ?? undefined,
    })),
  };
}

export default function MyVisits() {
  const [selectedReport, setSelectedReport] = useState<RapportVisite | null>(null);
  const [aSignaler, setASignaler] = useState<DemandeWithVisite | null>(null);
  const [motifSignalement, setMotifSignalement] = useState('');
  const [aNoter, setANoter] = useState<DemandeWithVisite | null>(null);
  const { toast } = useToast();

  // Un abus (frais exigés au-delà de l'annonce, commissionnaire injoignable
  // après paiement) remonte à l'équipe VillaGo, et reste sur la demande.
  const signaler = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/visites/client/demandes/${aSignaler!.id}/signaler/`, { motif: motifSignalement }),
    onSuccess: () => {
      setASignaler(null);
      setMotifSignalement('');
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/client/demandes/'] });
      toast({ title: 'Signalement envoyé', description: 'L’équipe VillaGo va examiner la situation.' });
    },
    onError: (e) =>
      toast({
        title: 'Signalement non envoyé',
        description: e instanceof Error ? e.message : 'Une erreur est survenue',
        variant: 'destructive',
      }),
  });

  const { data: demandes, isLoading, error: erreurDemandes, refetch } = useQuery<PaginatedResponse<DemandeWithVisite>>({
    queryKey: ['/api/v1/visites/client/demandes/'],
    select: avecVisite,
    refetchOnWindowFocus: true,
  });


  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const etatErreur =
    erreurDemandes && !demandes ? (
      <ErreurRequete erreur={erreurDemandes} titre="Vos visites n’ont pas pu être chargées" onReessayer={() => void refetch()} />
    ) : null;
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
                  <House className="w-8 h-8 text-muted-foreground" />
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
              <BadgeStatut valeur={demande.visite_detail?.statut || demande.statut} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Demandée le {formaterDateLongue(demande.created_at)}</span>
              </div>
              {demande.date_souhaitee && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Souhaitée: {formaterDateLongue(demande.date_souhaitee)} à {formatTime(demande.heure_souhaitee)}</span>
                </div>
              )}
              {demande.visite_detail?.date_visite && (
                <div className="flex items-center gap-2 text-primary">
                  <CircleCheck className="w-4 h-4" />
                  <span>Planifiée: {formaterDateLongue(demande.visite_detail.date_visite)} à {formatTime(demande.visite_detail.heure_visite)}</span>
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
            {estPositif(demande.frais_visite) && (
              <p className="flex items-center gap-1 text-sm mt-2" data-testid={`frais-visite-${demande.id}`}>
                <Wallet className="w-4 h-4 text-muted-foreground" />
                {'Frais de visite annoncés : '}
                {formaterMontant(demande.frais_visite, demande.frais_visite_devise)}
                {estPositif(demande.frais_visite_regles) && ' · réglés'}
              </p>
            )}
            {demande.visite?.statut === 'terminee' &&
              !demande.visite.avis_commissionnaire_donne &&
              demande.bien_detail?.commissionnaire && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => setANoter(demande)}
                  data-testid={`button-noter-${demande.id}`}
                >
                  Noter le commissionnaire
                </Button>
              )}
            {demande.signale_le ? (
              <p className="text-xs text-muted-foreground mt-2">
                Vous avez signalé un problème le {formaterDateLongue(demande.signale_le)}. L’équipe VillaGo est prévenue.
              </p>
            ) : (
              demande.statut !== 'en_attente' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0 text-muted-foreground"
                  onClick={() => setASignaler(demande)}
                  data-testid={`button-signaler-${demande.id}`}
                >
                  <Flag className="w-4 h-4 mr-1" /> Signaler un problème
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
            {isLoading ? renderLoadingSkeleton() : etatErreur ? etatErreur : 
              allDemandes.length === 0 ? <EtatVide icone={Calendar} titre="Vous n'avez pas encore fait de demande de visite" /> :
              <div className="space-y-4">{allDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="pending">
            {isLoading ? renderLoadingSkeleton() : etatErreur ? etatErreur :
              pendingDemandes.length === 0 ? <EtatVide icone={Calendar} titre="Aucune demande en attente" /> :
              <div className="space-y-4">{pendingDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="accepted">
            {isLoading ? renderLoadingSkeleton() : etatErreur ? etatErreur :
              acceptedDemandes.length === 0 ? <EtatVide icone={Calendar} titre="Aucune demande acceptée" /> :
              <div className="space-y-4">{acceptedDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="completed">
            {isLoading ? renderLoadingSkeleton() : etatErreur ? etatErreur :
              completedDemandes.length === 0 ? <EtatVide icone={Calendar} titre="Aucune visite terminée" /> :
              <div className="space-y-4">{completedDemandes.map(renderDemandeCard)}</div>
            }
          </TabsContent>

          <TabsContent value="rejected">
            {isLoading ? renderLoadingSkeleton() : etatErreur ? etatErreur :
              rejectedDemandes.length === 0 ? <EtatVide icone={Calendar} titre="Aucune demande rejetée" /> :
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
                {selectedReport && `Visite du ${formaterDateLongue(selectedReport.created_at)}`}
              </DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 pr-4">
                  <div>
                    <Label className="text-muted-foreground">État général du bien</Label>
                    <div className="mt-1">
                      <BadgeStatut famille="appreciation" valeur={selectedReport.etat_general} />
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

        {aNoter?.visite && (
          <DialogueAvis
            cible={{ visite: aNoter.visite.id }}
            nomCommissionnaire={aNoter.bien_detail?.commissionnaire_detail?.full_name}
            clesARafraichir={[['/api/v1/visites/client/demandes/']]}
            onFermer={() => setANoter(null)}
          />
        )}

        <Dialog open={!!aSignaler} onOpenChange={(o) => !o && setASignaler(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Signaler un problème</DialogTitle>
              <DialogDescription>
                Frais demandés au-delà de l’annonce, commissionnaire injoignable… Décrivez ce qui s’est passé : l’équipe VillaGo sera prévenue.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={motifSignalement}
              onChange={(e) => setMotifSignalement(e.target.value)}
              placeholder="Ex : on m’a demandé 20 $ de frais de visite au lieu de 10 $"
              data-testid="textarea-signalement"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setASignaler(null)}>Annuler</Button>
              <Button
                disabled={!motifSignalement.trim() || signaler.isPending}
                onClick={() => signaler.mutate()}
                data-testid="button-envoyer-signalement"
              >
                Envoyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
