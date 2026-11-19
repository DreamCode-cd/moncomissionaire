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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { estPositif, formaterMontant } from '@/lib/prix';
import { DialogueAvis } from '@/components/confiance/DialogueAvis';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDjangoImageUrl, nomAffiche, vignetteDe } from '@/lib/utils';
import type { DemandeVisite, PaginatedResponse, RapportVisite, Visite } from '@shared/schema';



interface DemandeWithVisite extends DemandeVisite {
  visite_detail?: Visite & { rapport?: RapportVisite };
}

/** Le client annule jusqu'à la visite : en attente, acceptée, ou visite
 *  fixée dont l'heure n'est pas passée. Même règle que le serveur
 *  (visites/views.py, `annuler`). */
function annulable(d: DemandeVisite): boolean {
  if (d.statut === 'en_attente') return true;
  if (d.statut !== 'acceptee') return false;
  const v = d.visite;
  if (!v) return true;
  return (v.statut === 'planifiee' || v.statut === 'reportee') && !v.a_confirmer;
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
  const [aAnnuler, setAAnnuler] = useState<DemandeWithVisite | null>(null);
  const [motifSignalement, setMotifSignalement] = useState('');
  const [aNoter, setANoter] = useState<{ demande: DemandeWithVisite; sujet: 'commissionnaire' | 'agent' | 'bien' } | null>(null);
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

  const annuler = useMutation({
    mutationFn: (demande: DemandeWithVisite) =>
      api.post(`/api/v1/visites/client/demandes/${demande.id}/annuler/`, {}),
    onSuccess: () => {
      setAAnnuler(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/client/demandes/'] });
      toast({ title: 'Demande annulée', description: 'Le commissionnaire est prévenu.' });
    },
    onError: (e) => {
      setAAnnuler(null);
      toast({
        title: 'Annulation impossible',
        description: e instanceof Error ? e.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    },
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
  // Acceptées et pas encore closes : une visite annulée, non faite ou faite
  // n'a plus rien à attendre.
  const acceptedDemandes = allDemandes.filter(
    (d) => d.statut === 'acceptee' && !['annulee', 'non_faite', 'terminee'].includes(d.visite?.statut ?? ''),
  );
  const completedDemandes = allDemandes.filter(d => d.visite_detail?.statut === 'terminee');
  // Closes sans visite faite : refusées, annulées, expirées (le créneau est
  // passé sans réponse), ou visite qui n'a pas eu lieu.
  const rejectedDemandes = allDemandes.filter(
    (d) =>
      d.statut === 'rejetee' ||
      d.statut === 'annulee' ||
      d.statut === 'expiree' ||
      d.visite?.statut === 'non_faite' ||
      d.visite?.statut === 'annulee',
  );

  const renderDemandeCard = (demande: DemandeWithVisite) => (
    <Card key={demande.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Link href={`/property/${demande.bien}`}>
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer">
              {demande.bien_detail?.photo_principale?.image ? (
                <img
                  src={vignetteDe(demande.bien_detail.photo_principale) || undefined}
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
                  <span>Souhaitée : {formaterDateLongue(demande.date_souhaitee)} à {formatTime(demande.heure_souhaitee)}</span>
                </div>
              )}
              {demande.visite_detail?.date_visite &&
                ['planifiee', 'reportee', 'en_cours'].includes(demande.visite_detail.statut) && (
                <div className="flex items-center gap-2 text-primary">
                  <CircleCheck className="w-4 h-4" />
                  <span>
                    {demande.visite_detail.statut === 'reportee' ? 'Déplacée au' : 'Planifiée :'}{' '}
                    {formaterDateLongue(demande.visite_detail.date_visite)} à {formatTime(demande.visite_detail.heure_visite)}
                  </span>
                </div>
              )}
              {/* Annulée par le commissionnaire : il dit pourquoi, et le
                  client peut redemander une visite. */}
              {demande.visite?.statut === 'annulee' && demande.visite.motif_annulation && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CircleX className="w-4 h-4" />
                  <span>Visite annulée par le commissionnaire. Motif : {demande.visite.motif_annulation}</span>
                </div>
              )}
            </div>
            {demande.visite_detail?.agent_detail &&
              ['planifiee', 'reportee', 'en_cours'].includes(demande.visite_detail.statut) && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getDjangoImageUrl(demande.visite_detail.agent_detail.avatar) || undefined} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">{nomAffiche(demande.visite_detail.agent_detail)}</p>
                  {/* Un commissionnaire indépendant fait visiter lui-même : c'est
                      lui qui figure comme accompagnateur de la visite. */}
                  <p className="text-muted-foreground">
                    {demande.visite_detail.agent_detail.user_type === 'agent'
                      ? 'Agent VillaGo qui vous accompagne'
                      : 'Vous accompagne pendant la visite'}
                  </p>
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
            {demande.visite?.statut === 'terminee' && (
              // Après la visite, et seulement après : c'est elle qui donne le
              // droit de noter le bien, le commissionnaire et l'agent.
              <div className="flex flex-wrap gap-2 mt-2">
                {!demande.visite.avis_bien_donne && (
                  <Button
                    size="sm"
                    onClick={() => setANoter({ demande, sujet: 'bien' })}
                    data-testid={`button-noter-bien-${demande.id}`}
                  >
                    Noter le bien
                  </Button>
                )}
                {!demande.visite.avis_commissionnaire_donne && demande.bien_detail?.commissionnaire && (
                  <Button
                    size="sm"
                    variant={demande.visite.avis_bien_donne ? 'default' : 'outline'}
                    onClick={() => setANoter({ demande, sujet: 'commissionnaire' })}
                    data-testid={`button-noter-${demande.id}`}
                  >
                    Noter le commissionnaire
                  </Button>
                )}
                {/* Seulement quand un agent, et non le commissionnaire
                    lui-même, a fait visiter : le serveur le dit. */}
                {demande.visite.agent_a_noter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setANoter({ demande, sujet: 'agent' })}
                    data-testid={`button-noter-agent-${demande.id}`}
                  >
                    Noter l’agent
                  </Button>
                )}
              </div>
            )}
            {annulable(demande) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 mr-4 px-0 text-muted-foreground"
                onClick={() => setAAnnuler(demande)}
                data-testid={`button-annuler-${demande.id}`}
              >
                <CircleX className="w-4 h-4 mr-1" /> {demande.visite ? 'Annuler la visite' : 'Annuler ma demande'}
              </Button>
            )}
            {demande.signale_le ? (
              demande.signalement_traite_le ? (
                <div className="mt-2 rounded-md bg-muted p-3 text-sm" data-testid={`reponse-signalement-${demande.id}`}>
                  <p className="text-xs text-muted-foreground">
                    Réponse de l’équipe VillaGo, le {formaterDateLongue(demande.signalement_traite_le)}
                  </p>
                  <p className="whitespace-pre-line">{demande.signalement_suite}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Vous avez signalé un problème le {formaterDateLongue(demande.signale_le)}. L’équipe VillaGo est prévenue et vous répondra ici.
                </p>
              )
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
              <TabsTrigger value="all" className="whitespace-nowrap px-3">
                Toutes ({allDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="whitespace-nowrap px-3">
                En attente ({pendingDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="accepted" className="whitespace-nowrap px-3">
                Acceptées ({acceptedDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="whitespace-nowrap px-3">
                Terminées ({completedDemandes.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="whitespace-nowrap px-3">
                Closes ({rejectedDemandes.length})
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
              rejectedDemandes.length === 0 ? <EtatVide icone={Calendar} titre="Aucune demande close" /> :
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
                    <Label className="text-muted-foreground">Appréciation générale</Label>
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

        {aNoter?.demande.visite && (
          <DialogueAvis
            sujet={aNoter.sujet}
            cible={{ visite: aNoter.demande.visite.id }}
            nom={
              aNoter.sujet === 'bien'
                ? aNoter.demande.bien_detail?.titre
                : aNoter.sujet === 'agent'
                  ? aNoter.demande.visite.agent_detail?.full_name
                  : aNoter.demande.bien_detail?.commissionnaire_detail?.full_name
            }
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
      <AlertDialog open={aAnnuler !== null} onOpenChange={(ouvert) => !ouvert && setAAnnuler(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{aAnnuler?.visite ? 'Annuler la visite ?' : 'Annuler la demande ?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {aAnnuler?.visite
                ? 'Le commissionnaire et la personne qui devait vous accompagner seront prévenus.'
                : 'Le commissionnaire sera prévenu. Vous pourrez en envoyer une autre plus tard.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => aAnnuler && annuler.mutate(aAnnuler)}
              disabled={annuler.isPending}
              data-testid="confirmer-annulation"
            >
              {aAnnuler?.visite ? 'Annuler la visite' : 'Annuler la demande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
