import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  FilePenLine,
  Handshake,
  Inbox,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { EtatChargement, EtatVide } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { DialogueNouveauBailleur, CLE_BAILLEURS } from '@/components/property/ChampsTerrain';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { queryClient } from '@/lib/queryClient';
import { estPositif, formaterLoyer, formaterMontant } from '@/lib/prix';
import { OngletGains } from '@/components/commission/OngletGains';
import { Expiration } from '@/components/confiance/Expiration';
import { PropositionsMandat } from '@/components/confiance/PropositionsMandat';
import { OngletPartages } from '@/components/commission/OngletPartages';
import { DialogueBail } from '@/components/commission/DialogueBail';
import { DialogueReglement } from '@/components/commission/DialogueReglement';
import {
  CLE_BIENS,
  CLE_COMMISSIONS,
  CLE_DEMANDES,
  CLE_VISITES,
} from '@/components/commission/commun';
import { lieuAnnonce } from '@/lib/annonce';
import { formaterDateCourte } from '@/lib/dates';
import { getDjangoImageUrl, getVilleName } from '@/lib/utils';
import type {
  Bailleur,
  BienList,
  Commission,
  DemandeVisite,
  PaginatedResponse,
  Visite,
} from '@shared/schema';

/**
 * Le tableau de bord du commissionnaire indépendant.
 *
 * Tout ce qui est ici lui appartient : ses biens, son carnet de bailleurs,
 * les demandes de visite sur ses biens. L'API ne lui montre rien d'autre —
 * pas plus qu'elle ne montre son carnet à un confrère ou à VillaGo.
 *
 * Pensé pour un téléphone, dehors : quatre onglets, des actions directes, un
 * appel au bailleur ou au client en un geste.
 */


const STATUTS_LOCATION = [
  { valeur: 'disponible', libelle: 'Disponible' },
  { valeur: 'en_visite', libelle: 'En visite' },
  { valeur: 'loue', libelle: 'Loué' },
  { valeur: 'indisponible', libelle: 'Indisponible' },
];

function messageErreur(erreur: unknown) {
  return erreur instanceof Error ? erreur.message : 'Une erreur est survenue';
}

function LienTelephone({ numero }: { numero?: string | null }) {
  if (!numero) return null;
  return (
    <a href={`tel:${numero.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-primary">
      <Phone className="w-3 h-3" /> {numero}
    </a>
  );
}

export default function CommissionnaireDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [onglet, setOnglet] = useState('biens');

  const biens = useQuery<PaginatedResponse<BienList>>({ queryKey: CLE_BIENS });
  const bailleurs = useQuery<PaginatedResponse<Bailleur>>({ queryKey: CLE_BAILLEURS });
  const demandes = useQuery<PaginatedResponse<DemandeVisite>>({
    queryKey: CLE_DEMANDES,
    refetchInterval: 30000,
  });
  const visites = useQuery<PaginatedResponse<Visite>>({
    queryKey: CLE_VISITES,
    refetchInterval: 30000,
  });

  const demandesAvecVisite = useMemo(
    () => new Set((visites.data?.results ?? []).map((v) => v.demande)),
    [visites.data],
  );
  const demandesATraiter = (demandes.data?.results ?? []).filter(
    (d) => d.statut === 'en_attente' || (d.statut === 'acceptee' && !demandesAvecVisite.has(d.id)),
  );
  const visitesAVenir = (visites.data?.results ?? []).filter((v) => v.statut === 'planifiee');

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Mon portefeuille</h1>
            <p className="text-sm text-muted-foreground">
              {user?.first_name} {user?.last_name} · Commissionnaire
            </p>
          </div>
          <Link href="/add-property">
            <Button size="sm" data-testid="button-add-property">
              <Plus className="w-4 h-4 mr-1" /> Ajouter un bien
            </Button>
          </Link>
        </div>

        <Tabs value={onglet} onValueChange={setOnglet}>
          {/* Six onglets : sur un téléphone, la barre défile plutôt que
              d'écraser les libellés. */}
          <TabsList className="mb-4 flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="biens" data-testid="tab-biens">
              Biens ({biens.data?.count ?? 0})
            </TabsTrigger>
            <TabsTrigger value="bailleurs" data-testid="tab-bailleurs">
              Bailleurs ({bailleurs.data?.count ?? 0})
            </TabsTrigger>
            <TabsTrigger value="demandes" data-testid="tab-demandes">
              Demandes ({demandesATraiter.length})
            </TabsTrigger>
            <TabsTrigger value="visites" data-testid="tab-visites">
              Visites ({visitesAVenir.length})
            </TabsTrigger>
            <TabsTrigger value="gains" data-testid="tab-gains">
              Gains
            </TabsTrigger>
            <TabsTrigger value="partages" data-testid="tab-partages">
              Partages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="biens">
            <PropositionsMandat cleBiens={CLE_BIENS} />
            <OngletBiens biens={biens.data?.results} chargement={biens.isLoading} />
          </TabsContent>
          <TabsContent value="bailleurs">
            <OngletBailleurs bailleurs={bailleurs.data?.results} chargement={bailleurs.isLoading} />
          </TabsContent>
          <TabsContent value="demandes">
            <OngletDemandes
              demandes={demandesATraiter}
              chargement={demandes.isLoading}
              demandesAvecVisite={demandesAvecVisite}
              onErreur={(e) => toast({ title: 'Erreur', description: messageErreur(e), variant: 'destructive' })}
            />
          </TabsContent>
          <TabsContent value="visites">
            <OngletVisites visites={visites.data?.results} chargement={visites.isLoading} />
          </TabsContent>
          <TabsContent value="gains">
            <OngletGains />
          </TabsContent>
          <TabsContent value="partages">
            <OngletPartages />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function OngletBiens({ biens, chargement }: { biens?: BienList[]; chargement: boolean }) {
  const { toast } = useToast();
  const changerStatut = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      api.patch(`/api/v1/biens/commissionnaire/${id}/`, { statut_location: statut }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_BIENS }),
    onError: (e) => toast({ title: 'Statut non modifié', description: messageErreur(e), variant: 'destructive' }),
  });

  if (chargement) return <EtatChargement texte="Chargement de vos biens…" />;
  if (!biens?.length) {
    return (
      <EtatVide
        icone={Building2}
        titre="Aucun bien dans votre portefeuille"
        description="Ajoutez la première maison qu’un bailleur vous a confiée. Elle sera visible des clients après validation par VillaGo."
        action={
          <Link href="/add-property">
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter un bien</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {biens.map((bien) => (
        <Card key={bien.id} data-testid={`carte-bien-${bien.id}`}>
          <CardContent className="p-3 flex gap-3">
            {bien.photo_principale?.image ? (
              <img
                src={getDjangoImageUrl(bien.photo_principale.image) || ''}
                alt=""
                loading="lazy"
                className="w-20 h-20 rounded-md object-cover bg-muted shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-md bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
                <Building2 className="w-6 h-6" aria-label="Pas encore de photo" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/property/${bien.id}`} className="font-medium leading-tight hover:underline">
                  {bien.titre}
                </Link>
                <BadgeStatut
                  famille="validation"
                  valeur={bien.statut_validation}
                  libelle={bien.statut_validation_display}
                  compact
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {lieuAnnonce([bien.quartier, bien.commune, getVilleName(bien.ville, bien.ville_nom, bien.ville_detail)])}
              </p>
              <p className="text-sm font-semibold text-primary">
                {formaterLoyer(bien.prix_mensuel, bien.devise)}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Select
                  value={bien.statut_location}
                  onValueChange={(statut) => changerStatut.mutate({ id: bien.id, statut })}
                >
                  <SelectTrigger className="h-8 w-36 text-xs" data-testid={`select-location-${bien.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_LOCATION.map((s) => (
                      <SelectItem key={s.valeur} value={s.valeur}>{s.libelle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link href={`/property/${bien.id}/edit`}>
                  <Button variant="outline" size="sm" className="h-8">
                    <Pencil className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                </Link>
              </div>
              {bien.proprietaire && (
                <p className="text-xs text-muted-foreground">Confié par {bien.proprietaire.full_name}, propriétaire inscrit</p>
              )}
              <Expiration bien={bien} routeApi="/api/v1/biens/commissionnaire/" cle={CLE_BIENS} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OngletBailleurs({ bailleurs, chargement }: { bailleurs?: Bailleur[]; chargement: boolean }) {
  const { toast } = useToast();
  const [creation, setCreation] = useState(false);
  const [enEdition, setEnEdition] = useState<Bailleur | null>(null);

  const supprimer = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/biens/bailleurs/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_BAILLEURS }),
    onError: (e) => toast({ title: 'Bailleur conservé', description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Votre carnet. Ni les clients, ni vos confrères, ni la modération VillaGo ne le voient.
        </p>
        <Button size="sm" variant="outline" onClick={() => setCreation(true)} data-testid="button-ajouter-bailleur">
          <Plus className="w-4 h-4 mr-1" /> Bailleur
        </Button>
      </div>

      {chargement ? (
        <EtatChargement texte="Chargement de votre carnet…" />
      ) : !bailleurs?.length ? (
        <EtatVide
          icone={UserRound}
          titre="Votre carnet est vide"
          description="Enregistrez les bailleurs qui vous confient leur maison. Vous les choisirez en publiant une annonce."
        />
      ) : (
        bailleurs.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{b.nom}</p>
                <p className="text-sm"><LienTelephone numero={b.telephone} /></p>
                <p className="text-xs text-muted-foreground">
                  {b.nombre_biens} bien{b.nombre_biens > 1 ? 's' : ''}
                  {b.notes ? ` · ${b.notes}` : ''}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setEnEdition(b)} aria-label="Modifier">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => supprimer.mutate(b.id)}
                  disabled={b.nombre_biens > 0 || supprimer.isPending}
                  title={b.nombre_biens > 0 ? 'Ce bailleur a encore des biens dans votre portefeuille' : 'Supprimer'}
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <DialogueNouveauBailleur ouvert={creation} onFermer={() => setCreation(false)} />
      {enEdition && (
        <DialogueNouveauBailleur
          key={enEdition.id}
          ouvert
          bailleur={enEdition}
          onFermer={() => setEnEdition(null)}
        />
      )}
    </div>
  );
}

function OngletDemandes({
  demandes,
  chargement,
  demandesAvecVisite,
  onErreur,
}: {
  demandes: DemandeVisite[];
  chargement: boolean;
  demandesAvecVisite: Set<number>;
  onErreur: (e: unknown) => void;
}) {
  const [aRefuser, setARefuser] = useState<DemandeVisite | null>(null);
  const [motif, setMotif] = useState('');
  const [aPlanifier, setAPlanifier] = useState<DemandeVisite | null>(null);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: CLE_DEMANDES });
    queryClient.invalidateQueries({ queryKey: CLE_VISITES });
  };

  const traiter = useMutation({
    mutationFn: ({ id, statut, motif_rejet }: { id: number; statut: 'acceptee' | 'rejetee'; motif_rejet?: string }) =>
      api.post(`/api/v1/visites/commissionnaire/demandes/${id}/traiter/`, { statut, motif_rejet }),
    onSuccess: () => {
      setARefuser(null);
      setMotif('');
      rafraichir();
    },
    onError: onErreur,
  });

  // Le commissionnaire fait visiter lui-même : pas d'agent à choisir, le
  // serveur l'inscrit comme accompagnateur de sa propre visite.
  const planifier = useMutation({
    mutationFn: () =>
      api.post('/api/v1/visites/commissionnaire/visites/', {
        demande: aPlanifier!.id,
        date_visite: date,
        heure_visite: heure,
      }),
    onSuccess: () => {
      setAPlanifier(null);
      rafraichir();
    },
    onError: onErreur,
  });

  if (chargement) return <EtatChargement texte="Chargement des demandes…" />;
  if (!demandes.length) {
    return (
      <EtatVide
        icone={Inbox}
        ton="favorable"
        titre="Aucune demande en attente"
        description="Les demandes de visite sur vos biens arrivent ici, et à vous seul."
      />
    );
  }

  return (
    <div className="space-y-3">
      {demandes.map((d) => (
        <Card key={d.id} data-testid={`carte-demande-${d.id}`}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-tight">{d.bien_detail?.titre}</p>
                <p className="text-xs text-muted-foreground">
                  {d.client?.full_name || `${d.client?.first_name ?? ''} ${d.client?.last_name ?? ''}`.trim()}
                  {' · souhaitée le '}
                  {formaterDateCourte(d.date_souhaitee)} à {d.heure_souhaitee?.slice(0, 5)}
                </p>
              </div>
              <BadgeStatut famille="demande" valeur={d.statut} libelle={d.statut_display} compact />
            </div>
            <InfosDemande demande={d} />
            {d.message && <p className="text-sm text-muted-foreground italic">« {d.message} »</p>}
            {d.statut === 'acceptee' && (
              <p className="text-sm"><LienTelephone numero={d.client?.phone} /></p>
            )}
            <div className="flex gap-2">
              {d.statut === 'en_attente' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => traiter.mutate({ id: d.id, statut: 'acceptee' })}
                    disabled={traiter.isPending}
                    data-testid={`button-accepter-${d.id}`}
                  >
                    Accepter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setARefuser(d)}>
                    Refuser
                  </Button>
                </>
              )}
              {d.statut === 'acceptee' && !demandesAvecVisite.has(d.id) && (
                <Button
                  size="sm"
                  onClick={() => {
                    setAPlanifier(d);
                    setDate(d.date_souhaitee);
                    setHeure(d.heure_souhaitee?.slice(0, 5) ?? '');
                  }}
                  data-testid={`button-planifier-${d.id}`}
                >
                  <CalendarClock className="w-4 h-4 mr-1" /> Planifier la visite
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!aRefuser} onOpenChange={(o) => !o && setARefuser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
            <DialogDescription>Le client recevra ce motif. Soyez clair : il pourra chercher autre chose.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : la maison vient d’être louée"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setARefuser(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={!motif.trim() || traiter.isPending}
              onClick={() => aRefuser && traiter.mutate({ id: aRefuser.id, statut: 'rejetee', motif_rejet: motif })}
            >
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aPlanifier} onOpenChange={(o) => !o && setAPlanifier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier la visite</DialogTitle>
            <DialogDescription>
              Vous accompagnerez le client vous-même. Il est prévenu dans la messagerie.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="visite-date">Date</Label>
              <Input id="visite-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="visite-heure">Heure</Label>
              <Input id="visite-heure" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAPlanifier(null)}>Annuler</Button>
            <Button disabled={!date || !heure || planifier.isPending} onClick={() => planifier.mutate()}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OngletVisites({ visites, chargement }: { visites?: Visite[]; chargement: boolean }) {
  const { toast } = useToast();
  const terminer = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/v1/visites/commissionnaire/visites/${id}/`, { statut: 'terminee' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_VISITES }),
    onError: (e) => toast({ title: 'Erreur', description: messageErreur(e), variant: 'destructive' }),
  });

  if (chargement) return <EtatChargement texte="Chargement des visites…" />;
  if (!visites?.length) {
    return (
      <EtatVide
        icone={CalendarCheck}
        titre="Aucune visite planifiée"
        description="Acceptez une demande, puis planifiez la visite : elle apparaîtra ici."
      />
    );
  }

  return (
    <div className="space-y-3">
      {visites.map((v) => {
        const demande = v.demande_detail;
        return (
          <Card key={v.id}>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-tight">{demande?.bien_detail?.titre ?? `Visite n° ${v.id}`}</p>
                <BadgeStatut famille="visite" valeur={v.statut} libelle={v.statut_display} compact />
              </div>
              <p className="text-sm">
                {formaterDateCourte(v.date_visite)} à {v.heure_visite?.slice(0, 5)}
              </p>
              {demande?.client && (
                <p className="text-sm text-muted-foreground">
                  {demande.client.full_name || demande.client.username} · <LienTelephone numero={demande.client.phone} />
                </p>
              )}
              {demande && <InfosDemande demande={demande} />}
              <div className="flex flex-wrap gap-2 pt-1">
                {v.statut === 'planifiee' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => terminer.mutate(v.id)}
                    disabled={terminer.isPending}
                  >
                    Visite faite
                  </Button>
                )}
                {demande && <ActionsArgent demande={demande} />}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** Ce que le commissionnaire doit savoir d'une demande avant de la traiter :
 *  qui l'amène, quelle part revient au confrère, quels frais ont été
 *  annoncés au client. */
function InfosDemande({ demande }: { demande: DemandeVisite }) {
  const parConfrere = demande.part_confrere_pourcent != null;
  if (!parConfrere && !estPositif(demande.frais_visite)) return null;
  return (
    <div className="text-xs space-y-0.5">
      {parConfrere && (
        <p className="flex items-center gap-1">
          <Handshake className="w-3 h-3" />
          Client présenté par un confrère : {demande.prospect_nom}
          {demande.prospect_telephone ? <> · <LienTelephone numero={demande.prospect_telephone} /></> : null}
          {` · part du confrère ${demande.part_confrere_pourcent} %`}
        </p>
      )}
      {estPositif(demande.frais_visite) && (
        <p className="flex items-center gap-1 text-muted-foreground">
          <Wallet className="w-3 h-3" />
          Frais de visite annoncés : {formaterMontant(demande.frais_visite, demande.frais_visite_devise)}
          {estPositif(demande.frais_visite_regles) ? ' · reçus' : ''}
        </p>
      )}
      {demande.signale_le && (
        <p className="text-destructive">Le client a signalé un problème : {demande.signalement_motif}</p>
      )}
    </div>
  );
}

/** Noter les frais de visite reçus, puis déclarer le bail une fois signé. */
function ActionsArgent({ demande }: { demande: DemandeVisite }) {
  const commissions = useQuery<PaginatedResponse<Commission>>({ queryKey: CLE_COMMISSIONS });
  const [fraisOuvert, setFraisOuvert] = useState(false);
  const [bailOuvert, setBailOuvert] = useState(false);

  if (demande.statut !== 'acceptee') return null;
  const resteFrais =
    (parseFloat(demande.frais_visite ?? '0') || 0) - (parseFloat(demande.frais_visite_regles ?? '0') || 0);
  const bailDeclare = (commissions.data?.results ?? []).some(
    (c) => c.demande === demande.id && !c.annulee_le,
  );

  return (
    <>
      {resteFrais > 0 && (
        <Button size="sm" variant="outline" onClick={() => setFraisOuvert(true)} data-testid={`button-frais-recus-${demande.id}`}>
          <Wallet className="w-4 h-4 mr-1" /> Frais reçus
        </Button>
      )}
      {!bailDeclare && !commissions.isLoading && (
        <Button size="sm" onClick={() => setBailOuvert(true)} data-testid={`button-bail-${demande.id}`}>
          <FilePenLine className="w-4 h-4 mr-1" /> Bail signé
        </Button>
      )}
      {fraisOuvert && (
        <DialogueReglement
          cible={{
            nature: 'frais_visite',
            demande: demande.id,
            titre: demande.bien_detail?.titre ?? 'Visite',
            devise: demande.frais_visite_devise || demande.bien_detail?.devise || 'USD',
            reste: String(resteFrais),
          }}
          onFermer={() => setFraisOuvert(false)}
        />
      )}
      {bailOuvert && <DialogueBail demande={demande} onFermer={() => setBailOuvert(false)} />}
    </>
  );
}
