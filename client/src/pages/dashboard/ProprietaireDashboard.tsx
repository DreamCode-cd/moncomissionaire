import { EtatVide, ErreurRequete } from '@/components/etats';
import { MotifRefus } from '@/components/confiance/MotifRefus';
import { useConfirmerStatutLocation } from '@/components/property/ConfirmerStatutLocation';
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
import { getDjangoImageUrl, getVilleName, vignetteDe } from '@/lib/utils';
import type { BienList, Commission, PaginatedResponse } from '@shared/schema';
import { formaterLoyer, formaterMontant } from '@/lib/prix';
import { formaterDateCourte } from '@/lib/dates';
import { Expiration } from '@/components/confiance/Expiration';
import { DialogueConfier } from '@/components/confiance/DialogueConfier';
import { DialogueAvis } from '@/components/confiance/DialogueAvis';
import { t } from '@/i18n';

const CLE_MES_BIENS = ['/api/v1/biens/proprietaire/'];
const CLE_BAUX = ['/api/v1/commissions/'];

const locationStatuses = [
  { value: 'disponible', get label() { return t('statut.location.disponible'); } },
  { value: 'en_visite', get label() { return t('editForm.enVisite'); } },
  { value: 'loue', get label() { return t('statut.location.loue'); } },
  { value: 'indisponible', get label() { return t('statut.location.indisponible'); } },
];



export default function ProprietaireDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const { data: myProperties, isLoading, error: erreurBiens, refetch } = useQuery<PaginatedResponse<BienList>>({
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
        title: t('proprio.statutMisJour'),
        description: t('proprio.statutBienEteModifie'),
      });
    },
    onError: (error) => {
      toast({
        title: t('proprio.erreur'),
        description: error instanceof Error ? error.message : t('proprio.erreurEstSurvenue'),
        variant: 'destructive',
      });
    },
  });
  const statutLocation = useConfirmerStatutLocation((id, status) => updateStatusMutation.mutate({ id, status }));

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
                {/* L'agence partage cet espace (décision du 24/10/2026). */}
                <p className="text-sm text-muted-foreground">{user?.role === 'agence' ? t('role.agence') : t('role.proprietaire')}</p>
              </div>
            </div>
            <Link href="/add-property">
              <Button size="sm" data-testid="button-add-property">
                <Plus className="w-4 h-4 mr-2" />
                {t('proprio.ajouter')}
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
                  <p className="text-xs text-muted-foreground truncate">{t('proprio.total')}</p>
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
                  <p className="text-xs text-muted-foreground truncate">{t('proprio.attente')}</p>
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
                  <p className="text-xs text-muted-foreground truncate">{t('proprio.valides')}</p>
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
                  <p className="text-xs text-muted-foreground truncate">{t('proprio.loues')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" data-testid="tab-all" className="text-xs md:text-sm">
              {t('proprio.tous', { a: properties.length })}
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending" className="text-xs md:text-sm">
              {t('proprio.attente2', { a: pendingCount })}
            </TabsTrigger>
            <TabsTrigger value="validated" data-testid="tab-validated" className="text-xs md:text-sm">
              {t('proprio.valides2', { a: validatedCount })}
            </TabsTrigger>
            <TabsTrigger value="rented" data-testid="tab-rented" className="text-xs md:text-sm">
              {t('proprio.loues2', { a: rentedCount })}
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
            ) : erreurBiens && !myProperties ? (
              <ErreurRequete erreur={erreurBiens} titre={t('proprio.vosBiensNOnt')} onReessayer={() => void refetch()} />
            ) : filteredProperties.length === 0 ? (
              <EtatVide
                icone={House}
                titre={t('proprio.aucunBien')}
                description={
                  activeTab === 'all'
                    ? t('proprio.publiezVotrePremierBien')
                    : t('proprio.aucunBienDansCette')
                }
                action={
                  activeTab === 'all' ? (
                    <Link href="/add-property">
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('proprio.ajouterBien')}
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
                            src={vignetteDe(property.photo_principale) || undefined}
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
                      <div className="mb-2"><MotifRefus bien={property} /></div>
                      
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-sm">
                          {formaterLoyer(property.prix_mensuel, property.devise)}
                        </span>
                        {property.statut_validation === 'valide' && (
                          <Select
                            value={property.statut_location}
                            onValueChange={(value) => statutLocation.choisir(property, value)}
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`select-status-${property.id}`}>
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
                        <Button variant="outline" size="sm" className="w-full">
                          <Pencil className="w-3 h-3 mr-1" />
                          {t('proprio.modifier')}
                        </Button>
                      </Link>
                      <div className="mt-2 space-y-2">
                        <Expiration bien={property} routeApi="/api/v1/biens/proprietaire/" cle={CLE_MES_BIENS} />
                        <Mandat bien={property} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <BauxConclus />
      </div>
      {statutLocation.dialogue}
    </Layout>
  );
}

/** À qui le bien est confié, ou le bouton pour le confier. */
function Mandat({ bien }: { bien: BienList }) {
  const { toast } = useToast();
  const [choisir, setChoisir] = useState(false);
  const mandat = bien.mandat_en_cours;
  const reprendre = useMutation({
    mutationFn: () => api.post(`/api/v1/biens/proprietaire/${bien.id}/reprendre/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_MES_BIENS }),
    onError: (e) =>
      toast({ title: t('proprio.erreur'), description: e instanceof Error ? e.message : '', variant: 'destructive' }),
  });

  if (mandat) {
    const nom = mandat.commissionnaire_detail?.full_name;
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {mandat.statut === 'accepte' ? t('proprio.confieA', { nom }) : t('proprio.proposeA', { nom })}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          disabled={reprendre.isPending}
          onClick={() => reprendre.mutate()}
          data-testid={`button-reprendre-${bien.id}`}
        >
          {mandat.statut === 'accepte' ? t('proprio.reprendre') : t('commun.annuler')}
        </Button>
      </div>
    );
  }
  if (bien.statut_validation !== 'valide' || bien.commissionnaire) return null;
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="w-full h-8 text-xs"
        onClick={() => setChoisir(true)}
        data-testid={`button-confier-${bien.id}`}
      >
        {t('proprio.confierCommissionnaire')}
      </Button>
      {choisir && <DialogueConfier bien={bien} onFermer={() => setChoisir(false)} />}
    </>
  );
}

/** Les baux conclus chez le propriétaire par un commissionnaire : il est le
 *  bailleur, il voit ce qui a été signé, et il peut noter le commissionnaire. */
function BauxConclus() {
  const baux = useQuery<PaginatedResponse<Commission>>({ queryKey: CLE_BAUX });
  const [aNoter, setANoter] = useState<Commission | null>(null);
  const liste = (baux.data?.results ?? []).filter((c) => !c.annulee_le);
  if (baux.error && !baux.data) {
    return (
      <section className="mt-8">
        <ErreurRequete erreur={baux.error} titre={t('proprio.bauxConclusNOnt')} onReessayer={() => void baux.refetch()} />
      </section>
    );
  }
  if (!liste.length) return null;
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-lg font-semibold">{t('proprio.bauxConclusChezVous')}</h2>
      {liste.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 text-sm">
              <p className="font-medium">{c.bien_titre}</p>
              <p className="text-muted-foreground">
                {t('proprio.bailLigne', { locataire: c.locataire_nom, date: formaterDateCourte(c.date_bail), nom: c.titulaire_detail?.full_name })}
              </p>
              {c.part_bailleur && parseFloat(c.part_bailleur) > 0 && (
                <p className="text-muted-foreground">{t('proprio.votrePartCommission')} {formaterMontant(c.part_bailleur, c.devise)}</p>
              )}
              <p className="text-muted-foreground">
                {c.bail_enregistre_le
                  ? t('gains.bailEnregistreLe', { date: formaterDateCourte(c.bail_enregistre_le) })
                  : t('proprio.aEnregistrer', { date: formaterDateCourte(c.echeance_enregistrement) })}
              </p>
            </div>
            {!c.avis_proprietaire_donne && (
              <Button size="sm" variant="outline" onClick={() => setANoter(c)} data-testid={`button-noter-bail-${c.id}`}>
                {t('proprio.noter', { a: c.titulaire_detail?.full_name })}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      {aNoter && (
        <DialogueAvis
          cible={{ commission: aNoter.id }}
          nom={aNoter.titulaire_detail?.full_name}
          clesARafraichir={[CLE_BAUX]}
          onFermer={() => setANoter(null)}
        />
      )}
    </section>
  );
}
