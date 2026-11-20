import { EtatVide, ErreurRequete } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { formaterDateLongue } from '@/lib/dates';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, ChevronDown, ChevronUp, Clock, CircleCheck, CircleX, FileText, User, Eye, House, Flag, Wallet } from 'lucide-react';
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
import { heureLisible } from '@/components/confiance/ChoixCreneau';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDjangoImageUrl, nomAffiche, vignetteDe } from '@/lib/utils';
import type { DemandeVisite, PaginatedResponse, RapportVisite, Visite } from '@shared/schema';
import { t } from '@/i18n';



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

/** Combien de demandes closes restent visibles avant « Voir les plus anciennes ». */
const CLOSES_VISIBLES = 5;

export default function MyVisits() {
  const [selectedReport, setSelectedReport] = useState<RapportVisite | null>(null);
  const [toutesCloses, setToutesCloses] = useState(false);
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
      toast({ title: t('mesVisites.signalementEnvoye'), description: t('mesVisites.equipeVillagoVaExaminer') });
    },
    onError: (e) =>
      toast({
        title: t('mesVisites.signalementNonEnvoye'),
        description: e instanceof Error ? e.message : t('mesVisites.erreurEstSurvenue'),
        variant: 'destructive',
      }),
  });

  const annuler = useMutation({
    mutationFn: (demande: DemandeWithVisite) =>
      api.post(`/api/v1/visites/client/demandes/${demande.id}/annuler/`, {}),
    onSuccess: () => {
      setAAnnuler(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/visites/client/demandes/'] });
      toast({ title: t('mesVisites.demandeAnnulee'), description: t('mesVisites.commissionnaireEstPrevenu') });
    },
    onError: (e) => {
      setAAnnuler(null);
      toast({
        title: t('mesVisites.annulationImpossible'),
        description: e instanceof Error ? e.message : t('mesVisites.erreurEstSurvenue'),
        variant: 'destructive',
      });
    },
  });

  const { data: demandes, isLoading, error: erreurDemandes, refetch } = useQuery<PaginatedResponse<DemandeWithVisite>>({
    queryKey: ['/api/v1/visites/client/demandes/'],
    select: avecVisite,
    refetchOnWindowFocus: true,
  });


  // « 16 h », comme sur le mobile.
  const formatTime = (timeString: string | undefined) => (timeString ? heureLisible(timeString.slice(0, 5)) : '');

  const etatErreur =
    erreurDemandes && !demandes ? (
      <ErreurRequete erreur={erreurDemandes} titre={t('mesVisites.vosVisitesNOnt')} onReessayer={() => void refetch()} />
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

  // Comme sur le mobile : ce qui court encore (une visite « à confirmer »
  // reste sous les yeux), les visites faites, puis ce qui est clos — les
  // cinq plus récentes, le reste à un clic.
  const enCours = allDemandes.filter((d) => pendingDemandes.includes(d) || acceptedDemandes.includes(d));
  const closesTriees = [...rejectedDemandes].sort((x, y) => (y.id ?? 0) - (x.id ?? 0));

  // Comme sur le mobile (« Choisir une autre date ») : une demande close sans
  // faute du client — expirée, visite non faite, ou annulée par le
  // commissionnaire avec un motif — se redemande en un geste, sauf si une
  // autre demande court déjà pour ce bien.
  const bienDe = (d: DemandeVisite) => d.bien_detail?.id ?? d.bien;
  const peutRedemander = (d: DemandeVisite) =>
    (d.statut === 'expiree' ||
      d.visite?.statut === 'non_faite' ||
      (d.visite?.statut === 'annulee' && Boolean(d.visite.motif_annulation))) &&
    !enCours.some((e) => bienDe(e) === bienDe(d));
  const closesCachees = Math.max(0, closesTriees.length - CLOSES_VISIBLES);
  const sections = [
    { cle: 'en-cours', titre: t('mesVisites.cours'), demandes: enCours },
    { cle: 'faites', titre: t('mesVisites.visitesFaites'), demandes: completedDemandes },
    { cle: 'closes', titre: t('mesVisites.closes'), demandes: toutesCloses ? closesTriees : closesTriees.slice(0, CLOSES_VISIBLES) },
  ].filter((section) => section.demandes.length > 0);

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
                <span>{t('mesVisites.demandee')} {formaterDateLongue(demande.created_at)}</span>
              </div>
              {demande.date_souhaitee && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{t('mesVisites.souhaitee', { quand: t('date.dateEtHeure', { date: formaterDateLongue(demande.date_souhaitee), heure: formatTime(demande.heure_souhaitee) }) })}</span>
                </div>
              )}
              {demande.visite_detail?.date_visite &&
                ['planifiee', 'reportee', 'en_cours'].includes(demande.visite_detail.statut) && (
                <div className="flex items-center gap-2 text-primary">
                  <CircleCheck className="w-4 h-4" />
                  <span>
                    {t(demande.visite_detail.statut === 'reportee' ? 'reste.deplaceeAu' : 'reste.planifiee', {
                      quand: t('date.dateEtHeure', { date: formaterDateLongue(demande.visite_detail.date_visite), heure: formatTime(demande.visite_detail.heure_visite) }),
                    })}
                  </span>
                </div>
              )}
              {/* Annulée par le commissionnaire : il dit pourquoi, et le
                  client peut redemander une visite. */}
              {demande.visite?.statut === 'annulee' && demande.visite.motif_annulation && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CircleX className="w-4 h-4" />
                  <span>{t('mesVisites.visiteAnnuleeCommissionnaireMotif')} {demande.visite.motif_annulation}</span>
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
                      ? t('mesVisites.agentVillagoQuiVous')
                      : t('mesVisites.vousAccompagnePendantVisite')}
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
                {t('mesVisites.voirRapport')}
              </Button>
            )}
            {estPositif(demande.frais_visite) && (
              <p className="flex items-center gap-1 text-sm mt-2" data-testid={`frais-visite-${demande.id}`}>
                <Wallet className="w-4 h-4 text-muted-foreground" />
                {t('mesVisites.fraisVisiteAnnonces')}
                {formaterMontant(demande.frais_visite, demande.frais_visite_devise)}
                {estPositif(demande.frais_visite_regles) && t('mesVisites.regles')}
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
                    {t('mesVisites.noterBien')}
                  </Button>
                )}
                {!demande.visite.avis_commissionnaire_donne && demande.bien_detail?.commissionnaire && (
                  <Button
                    size="sm"
                    variant={demande.visite.avis_bien_donne ? 'default' : 'outline'}
                    onClick={() => setANoter({ demande, sujet: 'commissionnaire' })}
                    data-testid={`button-noter-${demande.id}`}
                  >
                    {t('mesVisites.noterCommissionnaire')}
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
                    {t('mesVisites.noterAgent')}
                  </Button>
                )}
              </div>
            )}
            {peutRedemander(demande) && (
              <Button asChild size="sm" className="mt-2 mr-4" data-testid={`button-redemander-${demande.id}`}>
                <Link href={`/property/${bienDe(demande)}`}>{t('mesVisites.choisirAutreDate')}</Link>
              </Button>
            )}
            {annulable(demande) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 mr-4 px-0 text-muted-foreground"
                onClick={() => setAAnnuler(demande)}
                data-testid={`button-annuler-${demande.id}`}
              >
                <CircleX className="w-4 h-4 mr-1" /> {demande.visite ? t('mesVisites.annulerVisite2') : t('mesVisites.annulerMaDemande')}
              </Button>
            )}
            {demande.signale_le ? (
              demande.signalement_traite_le ? (
                <div className="mt-2 rounded-md bg-muted p-3 text-sm" data-testid={`reponse-signalement-${demande.id}`}>
                  <p className="text-xs text-muted-foreground">
                    {t('mesVisites.reponseEquipeVillago', { a: formaterDateLongue(demande.signalement_traite_le) })}
                  </p>
                  <p className="whitespace-pre-line">{demande.signalement_suite}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('mesVisites.vousAvezSignaleProbleme', { a: formaterDateLongue(demande.signale_le) })}
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
                  <Flag className="w-4 h-4 mr-1" /> {t('mesVisites.signalerProbleme')}
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
        {/* La page d'arrivée du client, comme l'onglet « Mes visites » du
            mobile : trois sections plutôt que cinq onglets, que le téléphone
            coupait (« Term… »). Le tableau de bord qui la précédait (quatre
            tuiles de chiffres, des recommandations répétant l'accueil) a
            disparu à la demande de David, le 19/11/2026. */}
        <h1 className="mb-6 text-2xl font-bold">{t('mesVisites.mesVisites')}</h1>

        {isLoading ? (
          renderLoadingSkeleton()
        ) : etatErreur ? (
          etatErreur
        ) : allDemandes.length === 0 ? (
          <EtatVide
            icone={Calendar}
            titre={t('mesVisites.vousNAvezEncore')}
            description={t('mesVisites.choisissezMaisonPuisVisiter')}
            action={
              <Link href="/search">
                <Button size="sm">{t('mesVisites.voirAnnonces')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.titre} aria-labelledby={`section-${section.cle}`}>
                <h2 id={`section-${section.cle}`} className="mb-3 text-lg font-semibold">
                  {section.titre}
                </h2>
                <div className="space-y-4">{section.demandes.map(renderDemandeCard)}</div>
                {section.cle === 'closes' && closesCachees > 0 && (
                  <Button
                    variant="ghost"
                    className="mt-2 w-full text-primary"
                    aria-expanded={toutesCloses}
                    onClick={() => setToutesCloses((o) => !o)}
                    data-testid="replier-closes"
                  >
                    {toutesCloses
                      ? t('mesVisites.masquerAnciennes', { n: closesCachees })
                      : t('mesVisites.voirAnciennes', { n: closesCachees })}
                    {toutesCloses ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                  </Button>
                )}
              </section>
            ))}
          </div>
        )}

        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('mesVisites.rapportVisite')}
              </DialogTitle>
              <DialogDescription>
                {selectedReport && t('mesVisites.visiteDu', { date: formaterDateLongue(selectedReport.created_at) })}
              </DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 pr-4">
                  <div>
                    <Label className="text-muted-foreground">{t('mesVisites.appreciationGenerale')}</Label>
                    <div className="mt-1">
                      <BadgeStatut famille="appreciation" valeur={selectedReport.etat_general} />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">{t('mesVisites.pointsPositifs')}</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.points_positifs || t('mesVisites.aucunPointPositifMentionne')}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">{t('mesVisites.pointsNegatifs')}</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.points_negatifs || t('mesVisites.aucunPointNegatifMentionne')}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">{t('mesVisites.recommandations')}</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.recommandations || t('mesVisites.aucuneRecommandation')}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">{t('mesVisites.commentaires')}</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedReport.commentaires || t('mesVisites.aucunCommentaire')}
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
              <DialogTitle>{t('mesVisites.signalerProbleme')}</DialogTitle>
              <DialogDescription>
                {t('mesVisites.fraisDemandesDelaAnnonce')}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={motifSignalement}
              onChange={(e) => setMotifSignalement(e.target.value)}
              placeholder={t('mesVisites.exOnMDemande')}
              data-testid="textarea-signalement"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setASignaler(null)}>{t('mesVisites.annuler')}</Button>
              <Button
                disabled={!motifSignalement.trim() || signaler.isPending}
                onClick={() => signaler.mutate()}
                data-testid="button-envoyer-signalement"
              >
                {t('mesVisites.envoyer')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <AlertDialog open={aAnnuler !== null} onOpenChange={(ouvert) => !ouvert && setAAnnuler(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{aAnnuler?.visite ? t('mesVisites.annulerVisite') : t('mesVisites.annulerDemande')}</AlertDialogTitle>
            <AlertDialogDescription>
              {aAnnuler?.visite
                ? t('mesVisites.commissionnairePersonneQuiDevait')
                : t('mesVisites.commissionnaireSeraPrevenuVous')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('mesVisites.garder')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => aAnnuler && annuler.mutate(aAnnuler)}
              disabled={annuler.isPending}
              data-testid="confirmer-annulation"
            >
              {aAnnuler?.visite ? t('mesVisites.annulerVisite2') : t('mesVisites.annulerDemande2')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
