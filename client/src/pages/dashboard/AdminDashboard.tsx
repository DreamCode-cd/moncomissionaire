import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  BadgeCheck,
  Building2,
  CircleCheck,
  Clock,
  EllipsisVertical,
  House,
  Phone,
  ScrollText,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { Layout } from '@/components/layout/Layout';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formaterAnciennete, formaterDateCourte, formaterDateEtHeure } from '@/lib/dates';
import { ROLES, libelleRole } from '@/lib/roles';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import type { PaginatedResponse, UserList, UserRole } from '@shared/schema';

/**
 * Espace d'administration de l'équipe VillaGo.
 *
 * Trois administrateurs, qui interviennent à toute heure depuis leur
 * téléphone : tout tient dans une colonne, chaque action est à un pouce, et
 * rien ne demande un écran large.
 *
 * Deux choix de forme :
 *
 * 1. **Ce qui demande une action passe en premier.** Le tableau de bord ouvre
 *    sur « trois annonces à valider, deux commissionnaires à vérifier », pas
 *    sur des totaux flatteurs.
 *
 * 2. **Les actions qui donnent du pouvoir redemandent le mot de passe.**
 *    Nommer un modérateur ou créer un administrateur depuis un téléphone
 *    volé ne doit pas tenir en deux pressions. Le serveur l'exige ; l'écran
 *    le dit avant qu'on se heurte au refus.
 */

interface Apercu {
  utilisateurs: Record<string, number>;
  biens: Record<string, number>;
  demandes: Record<string, number>;
  visites: Record<string, number>;
  a_traiter: {
    biens_en_attente: number;
    demandes_en_attente: number;
    agences_non_verifiees: number;
    agents_indisponibles: number;
    commissionnaires_a_verifier: number;
  };
}

interface CompteAdmin extends UserList {
  identite_verifiee_le?: string | null;
  identite_verifiee_par_nom?: string | null;
  identite_verification_note?: string;
}

interface EntreeJournal {
  id: number;
  user_detail: UserList | null;
  action: string;
  action_display: string;
  description: string;
  created_at: string;
}

const CHEMIN_COMPTES = '/api/v1/administration/utilisateurs/';
const CHEMIN_APERCU = '/api/v1/administration/apercu/';
const CHEMIN_JOURNAL = '/api/v1/administration/journal/';

const ROLES_D_EQUIPE: { valeur: UserRole; libelle: string }[] = [
  { valeur: 'moderateur', libelle: 'Modérateur VillaGo' },
  { valeur: 'agent', libelle: 'Agent' },
  { valeur: 'admin', libelle: 'Administrateur' },
];

const FILTRES_COMPTES = [
  { valeur: 'tous', libelle: 'Tous les rôles' },
  { valeur: 'a_verifier', libelle: 'Identités à vérifier' },
  ...ROLES,
];

const FILTRES_JOURNAL = [
  { valeur: 'tout', libelle: 'Toute l’activité', actions: '' },
  { valeur: 'equipe', libelle: 'Rôles et comptes d’équipe', actions: 'changement_role,creation_compte' },
  { valeur: 'identite', libelle: 'Vérifications d’identité', actions: 'verification_identite' },
  { valeur: 'annonces', libelle: 'Validations d’annonces', actions: 'validation_bien,rejet_bien' },
  { valeur: 'comptes', libelle: 'Activations et désactivations', actions: 'modification_profil' },
  { valeur: 'securite', libelle: 'Mots de passe refusés', actions: 'confirmation_refusee' },
];

function invaliderAdministration() {
  void queryClient.invalidateQueries({ queryKey: [CHEMIN_COMPTES] });
  void queryClient.invalidateQueries({ queryKey: [CHEMIN_APERCU] });
  void queryClient.invalidateQueries({ queryKey: [CHEMIN_JOURNAL] });
}

/** Les erreurs du serveur arrivent parfois en JSON brut (« {"mot_de_passe":
 *  ["Mot de passe incorrect."]} ») : on en extrait la phrase. */
function messageLisible(erreur: Error): string {
  try {
    const donnees = JSON.parse(erreur.message);
    const premiere = Object.values(donnees)[0];
    return Array.isArray(premiere) ? String(premiere[0]) : String(premiere);
  } catch {
    return erreur.message;
  }
}

export default function AdminDashboard() {
  const [onglet, setOnglet] = useState('apercu');
  const [filtreComptes, setFiltreComptes] = useState('tous');

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">Administration</h1>

        <Tabs value={onglet} onValueChange={setOnglet} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="apercu" data-testid="onglet-apercu">À traiter</TabsTrigger>
            <TabsTrigger value="comptes" data-testid="onglet-comptes">Comptes</TabsTrigger>
            <TabsTrigger value="journal" data-testid="onglet-journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="apercu" className="mt-4">
            <VueDEnsemble
              onVoirIdentites={() => {
                setFiltreComptes('a_verifier');
                setOnglet('comptes');
              }}
            />
          </TabsContent>

          <TabsContent value="comptes" className="mt-4">
            <GestionDesComptes filtre={filtreComptes} onFiltre={setFiltreComptes} />
          </TabsContent>

          <TabsContent value="journal" className="mt-4">
            <Journal />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function VueDEnsemble({ onVoirIdentites }: { onVoirIdentites: () => void }) {
  const { data, isPending, error, refetch } = useQuery<Apercu>({
    queryKey: [CHEMIN_APERCU],
    refetchInterval: 60000,
  });

  if (isPending) return <EtatChargement texte="Chargement des chiffres…" />;
  if (error) {
    return <EtatErreur description={(error as Error).message} onReessayer={() => void refetch()} />;
  }

  const { a_traiter: aTraiter } = data;
  const rienATraiter = Object.values(aTraiter).every((n) => n === 0);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          À traiter
        </h2>

        {rienATraiter ? (
          <EtatVide
            icone={CircleCheck}
            ton="favorable"
            titre="Rien n’attend"
            description="Aucune annonce, aucune demande, aucune identité ni aucune agence en attente."
            className="rounded-lg border border-card-border bg-card py-8"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/moderation">
              <Tuile
                icone={House}
                libelle="Annonces à valider"
                valeur={aTraiter.biens_en_attente}
                ton={aTraiter.biens_en_attente > 0 ? 'attente' : 'neutre'}
              />
            </Link>
            <button type="button" className="text-left" onClick={onVoirIdentites} data-testid="tuile-identites">
              <Tuile
                icone={BadgeCheck}
                libelle="Identités à vérifier"
                valeur={aTraiter.commissionnaires_a_verifier}
                ton={aTraiter.commissionnaires_a_verifier > 0 ? 'attente' : 'neutre'}
              />
            </button>
            <Link href="/moderation">
              <Tuile
                icone={Clock}
                libelle="Demandes à traiter"
                valeur={aTraiter.demandes_en_attente}
                ton={aTraiter.demandes_en_attente > 0 ? 'attente' : 'neutre'}
              />
            </Link>
            <Tuile
              icone={Building2}
              libelle="Agences à vérifier"
              valeur={aTraiter.agences_non_verifiees}
              ton={aTraiter.agences_non_verifiees > 0 ? 'attente' : 'neutre'}
            />
          </div>
        )}
      </section>

      <Repartition
        titre="Comptes par rôle"
        total={data.utilisateurs.total}
        lignes={[
          { libelle: 'Clients', valeur: data.utilisateurs.clients },
          { libelle: 'Commissionnaires', valeur: data.utilisateurs.commissionnaires },
          { libelle: 'Propriétaires', valeur: data.utilisateurs.proprietaires },
          { libelle: 'Agences', valeur: data.utilisateurs.agences },
          { libelle: 'Modérateurs', valeur: data.utilisateurs.moderateurs },
          { libelle: 'Agents', valeur: data.utilisateurs.agents },
        ]}
        pied={`${data.utilisateurs.nouveaux_30_jours} inscription(s) sur 30 jours · ${data.utilisateurs.actifs} compte(s) actif(s)`}
      />

      <Repartition
        titre="Annonces par statut"
        total={data.biens.total}
        lignes={[
          { libelle: 'Validées', valeur: data.biens.valides },
          { libelle: 'En attente', valeur: data.biens.en_attente },
          { libelle: 'Rejetées', valeur: data.biens.rejetes },
        ]}
        pied={`${data.biens.disponibles} annonce(s) disponible(s) · ${data.biens.nouveaux_30_jours} publiée(s) sur 30 jours`}
      />

      <Repartition
        titre="Visites"
        total={data.visites.total}
        lignes={[
          { libelle: 'Planifiées', valeur: data.visites.planifiees },
          { libelle: 'Terminées', valeur: data.visites.terminees },
          { libelle: 'Avec rapport', valeur: data.visites.avec_rapport },
        ]}
        pied={`${data.demandes.en_attente} demande(s) de visite en attente sur ${data.demandes.total}`}
      />
    </div>
  );
}

function GestionDesComptes({ filtre, onFiltre }: { filtre: string; onFiltre: (f: string) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [recherche, setRecherche] = useState('');
  const [creation, setCreation] = useState(false);
  const [aChangerDeRole, setAChangerDeRole] = useState<CompteAdmin | null>(null);
  const [aVerifier, setAVerifier] = useState<CompteAdmin | null>(null);

  const parametres: Record<string, string> = {};
  if (recherche.trim()) parametres.search = recherche.trim();
  if (filtre === 'a_verifier') parametres.identite = 'a_verifier';
  else if (filtre !== 'tous') parametres.user_type = filtre;

  const { data, isPending, error, refetch } = useQuery<PaginatedResponse<CompteAdmin>>({
    queryKey: [CHEMIN_COMPTES, parametres],
  });

  const action = useMutation({
    mutationFn: ({ id, chemin }: { id: number; chemin: string }) =>
      api.post(`${CHEMIN_COMPTES}${id}/${chemin}/`),
    onSuccess: (_, { chemin }) => {
      invaliderAdministration();
      const titres: Record<string, string> = {
        activer: 'Compte activé',
        desactiver: 'Compte désactivé',
        'retirer-verification': 'Vérification retirée',
      };
      toast({ title: titres[chemin] ?? 'Fait' });
    },
    // Le serveur refuse pour de bonnes raisons — un agent en mission, son
    // propre compte — et son message explique laquelle.
    onError: (erreur: Error) =>
      toast({ title: 'Action impossible', description: messageLisible(erreur), variant: 'destructive' }),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom, e-mail, téléphone…"
          data-testid="input-recherche-comptes"
        />
        <Button onClick={() => setCreation(true)} data-testid="bouton-nouveau-compte" className="shrink-0">
          <UserPlus className="mr-1 h-4 w-4" /> Nouveau
        </Button>
      </div>
      <Select value={filtre} onValueChange={onFiltre}>
        <SelectTrigger data-testid="select-filtre-comptes">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTRES_COMPTES.map((r) => (
            <SelectItem key={r.valeur} value={r.valeur}>{r.libelle}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending ? (
        <EtatChargement texte="Chargement des comptes…" />
      ) : error ? (
        <EtatErreur description={(error as Error).message} onReessayer={() => void refetch()} />
      ) : !data?.results?.length ? (
        <EtatVide
          icone={filtre === 'a_verifier' ? CircleCheck : Users}
          ton={filtre === 'a_verifier' ? 'favorable' : undefined}
          titre={filtre === 'a_verifier' ? 'Toutes les identités sont vérifiées' : 'Aucun compte'}
          description={
            filtre === 'a_verifier'
              ? 'Aucun commissionnaire actif n’attend de vérification.'
              : 'Aucun compte ne correspond à cette recherche.'
          }
        />
      ) : (
        <div className="space-y-2">
          {data.results.map((compte) => (
            <CarteCompte
              key={compte.id}
              compte={compte}
              estMoi={compte.id === user?.id}
              enCours={action.isPending}
              onAction={(chemin) => action.mutate({ id: compte.id, chemin })}
              onChangerRole={() => setAChangerDeRole(compte)}
              onVerifier={() => setAVerifier(compte)}
            />
          ))}
        </div>
      )}

      <DialogueNouveauCompte ouvert={creation} onFermer={() => setCreation(false)} />
      {aChangerDeRole && (
        <DialogueChangerRole compte={aChangerDeRole} onFermer={() => setAChangerDeRole(null)} />
      )}
      {aVerifier && <DialogueVerifierIdentite compte={aVerifier} onFermer={() => setAVerifier(null)} />}
    </div>
  );
}

function CarteCompte({
  compte,
  estMoi,
  enCours,
  onAction,
  onChangerRole,
  onVerifier,
}: {
  compte: CompteAdmin;
  estMoi: boolean;
  enCours: boolean;
  onAction: (chemin: string) => void;
  onChangerRole: () => void;
  onVerifier: () => void;
}) {
  // Le champ est optionnel au contrat : absent, on considère le compte actif,
  // ce qui est le défaut côté Django.
  const actif = compte.is_active !== false;
  const estCommissionnaire = compte.user_type === 'commissionnaire';
  const verifie = Boolean(compte.identite_verifiee_le);

  return (
    <Card data-testid={`carte-compte-${compte.id}`}>
      <CardContent className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-foreground">
            {compte.full_name || compte.username}
            {estMoi ? <span className="text-muted-foreground"> · vous</span> : null}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{libelleRole(compte.user_type ?? compte.role, compte.user_type_display)}</Badge>
            {!actif && <BadgeStatut valeur="rejete" libelle="Désactivé" famille="validation" compact />}
            {estCommissionnaire &&
              (verifie ? (
                <Badge variant="outline" className="gap-1 border-transparent bg-statut-favorable-fond text-statut-favorable">
                  <BadgeCheck className="h-3 w-3" /> Identité vérifiée
                </Badge>
              ) : (
                <Badge variant="outline" className="border-transparent bg-statut-attente-fond text-statut-attente">
                  Identité à vérifier
                </Badge>
              ))}
          </div>
          {compte.phone ? (
            <a href={`tel:${compte.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-sm text-primary">
              <Phone className="h-3 w-3" /> {compte.phone}
            </a>
          ) : null}
          <p className="truncate text-xs text-muted-foreground">
            {compte.email}
            {compte.created_at ? ` · inscrit ${formaterAnciennete(compte.created_at)}` : ''}
          </p>
          {verifie && (
            <p className="text-xs text-muted-foreground">
              Vérifiée par {compte.identite_verifiee_par_nom ?? '—'} le {formaterDateCourte(compte.identite_verifiee_le)}
              {compte.identite_verification_note ? ` — ${compte.identite_verification_note}` : ''}
            </p>
          )}
        </div>

        {!estMoi && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Actions" disabled={enCours} data-testid={`actions-compte-${compte.id}`}>
                <EllipsisVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {estCommissionnaire &&
                (verifie ? (
                  <DropdownMenuItem onClick={() => onAction('retirer-verification')}>
                    Retirer la vérification
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onVerifier} data-testid={`verifier-${compte.id}`}>
                    Vérifier l’identité
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem onClick={onChangerRole} data-testid={`changer-role-${compte.id}`}>
                Changer le rôle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onAction(actif ? 'desactiver' : 'activer')}
                className={actif ? 'text-destructive' : undefined}
              >
                {actif ? 'Désactiver le compte' : 'Réactiver le compte'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}

/** Le mot de passe de l'administrateur qui agit, ressaisi. */
function ChampConfirmation({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/40 p-3">
      <Label htmlFor="confirmation-mot-de-passe">Votre mot de passe</Label>
      <Input
        id="confirmation-mot-de-passe"
        type="password"
        autoComplete="current-password"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        data-testid="input-confirmation"
      />
      <p className="text-xs text-muted-foreground">
        Cette action donne ou retire du pouvoir sur la plateforme. Elle est inscrite au journal à votre nom.
      </p>
    </div>
  );
}

function DialogueChangerRole({ compte, onFermer }: { compte: CompteAdmin; onFermer: () => void }) {
  const { toast } = useToast();
  const [role, setRole] = useState<string>(compte.user_type ?? 'client');
  const [motDePasse, setMotDePasse] = useState('');

  const changer = useMutation({
    mutationFn: () =>
      api.post(`${CHEMIN_COMPTES}${compte.id}/changer-role/`, { user_type: role, mot_de_passe: motDePasse }),
    onSuccess: () => {
      invaliderAdministration();
      toast({ title: 'Rôle modifié', description: `${compte.full_name || compte.username} a désormais le rôle « ${libelleRole(role)} ».` });
      onFermer();
    },
    onError: (erreur: Error) =>
      toast({ title: 'Rôle inchangé', description: messageLisible(erreur), variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le rôle</DialogTitle>
          <DialogDescription>{compte.full_name || compte.username}</DialogDescription>
        </DialogHeader>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger data-testid="select-nouveau-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.valeur} value={r.valeur}>{r.libelle}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ChampConfirmation valeur={motDePasse} onChange={setMotDePasse} />
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button
            onClick={() => changer.mutate()}
            disabled={!motDePasse || role === compte.user_type || changer.isPending}
            data-testid="bouton-confirmer-role"
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueVerifierIdentite({ compte, onFermer }: { compte: CompteAdmin; onFermer: () => void }) {
  const { toast } = useToast();
  const [note, setNote] = useState('');

  const verifier = useMutation({
    mutationFn: () => api.post(`${CHEMIN_COMPTES}${compte.id}/verifier-identite/`, { note }),
    onSuccess: () => {
      invaliderAdministration();
      toast({ title: 'Identité vérifiée', description: 'Le badge apparaît désormais sur ses annonces.' });
      onFermer();
    },
    onError: (erreur: Error) =>
      toast({ title: 'Vérification non enregistrée', description: messageLisible(erreur), variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vérifier l’identité</DialogTitle>
          <DialogDescription>
            {compte.full_name || compte.username}. Ne validez que si vous avez vu sa pièce d’identité, en personne ou en appel vidéo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="note-identite">Comment l’avez-vous vérifiée ?</Label>
          <Input
            id="note-identite"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex : carte d’électeur vue au bureau"
            maxLength={200}
            data-testid="input-note-identite"
          />
          <p className="text-xs text-muted-foreground">N’écrivez jamais le numéro de la pièce : VillaGo n’a pas à le conserver.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button onClick={() => verifier.mutate()} disabled={!note.trim() || verifier.isPending} data-testid="bouton-confirmer-identite">
            Identité vérifiée
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueNouveauCompte({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const { toast } = useToast();
  const vide = { first_name: '', last_name: '', username: '', email: '', phone: '', password: '' };
  const [champs, setChamps] = useState(vide);
  const [role, setRole] = useState<string>('moderateur');
  const [motDePasse, setMotDePasse] = useState('');
  const modifier = (cle: keyof typeof vide) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setChamps((c) => ({ ...c, [cle]: e.target.value }));

  const creer = useMutation({
    mutationFn: () => api.post(CHEMIN_COMPTES, { ...champs, user_type: role, mot_de_passe: motDePasse }),
    onSuccess: () => {
      invaliderAdministration();
      toast({
        title: 'Compte créé',
        description: 'Transmettez le mot de passe initial de vive voix, jamais par SMS ou WhatsApp.',
      });
      setChamps(vide);
      setMotDePasse('');
      onFermer();
    },
    onError: (erreur: Error) =>
      toast({ title: 'Compte non créé', description: messageLisible(erreur), variant: 'destructive' }),
  });

  const complet = Object.values(champs).every((v) => v.trim()) && motDePasse;

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau compte d’équipe</DialogTitle>
          <DialogDescription>
            Modérateur, agent ou administrateur. Les commissionnaires, eux, s’inscrivent seuls.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger data-testid="select-role-equipe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES_D_EQUIPE.map((r) => (
                <SelectItem key={r.valeur} value={r.valeur}>{r.libelle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Prénom" value={champs.first_name} onChange={modifier('first_name')} data-testid="input-equipe-prenom" />
            <Input placeholder="Nom" value={champs.last_name} onChange={modifier('last_name')} data-testid="input-equipe-nom" />
          </div>
          <Input placeholder="Nom d’utilisateur" autoCapitalize="none" value={champs.username} onChange={modifier('username')} data-testid="input-equipe-username" />
          <Input placeholder="E-mail" type="email" value={champs.email} onChange={modifier('email')} data-testid="input-equipe-email" />
          <Input placeholder="Téléphone (+243 …)" type="tel" inputMode="tel" value={champs.phone} onChange={modifier('phone')} data-testid="input-equipe-telephone" />
          <Input
            placeholder="Mot de passe initial"
            type="password"
            autoComplete="new-password"
            value={champs.password}
            onChange={modifier('password')}
            data-testid="input-equipe-mot-de-passe"
          />
          <ChampConfirmation valeur={motDePasse} onChange={setMotDePasse} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button onClick={() => creer.mutate()} disabled={!complet || creer.isPending} data-testid="bouton-creer-compte">
            Créer le compte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Journal() {
  const [filtre, setFiltre] = useState('tout');
  const [recherche, setRecherche] = useState('');
  const actions = FILTRES_JOURNAL.find((f) => f.valeur === filtre)?.actions ?? '';

  const parametres: Record<string, string> = {};
  if (actions) parametres.action = actions;
  if (recherche.trim()) parametres.search = recherche.trim();

  const { data, isPending, error, refetch } = useQuery<PaginatedResponse<EntreeJournal>>({
    queryKey: [CHEMIN_JOURNAL, parametres],
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Qui a fait quoi, et quand. À trois, c’est ce qui permet de ne jamais se demander lequel a désactivé un compte.
      </p>
      <Select value={filtre} onValueChange={setFiltre}>
        <SelectTrigger data-testid="select-filtre-journal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTRES_JOURNAL.map((f) => (
            <SelectItem key={f.valeur} value={f.valeur}>{f.libelle}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un nom, une annonce…" />

      {isPending ? (
        <EtatChargement texte="Chargement du journal…" />
      ) : error ? (
        <EtatErreur description={(error as Error).message} onReessayer={() => void refetch()} />
      ) : !data?.results?.length ? (
        <EtatVide icone={ScrollText} titre="Rien dans le journal" description="Aucune action ne correspond à ce filtre." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {data.results.map((entree) => (
              <div key={entree.id} className="space-y-0.5 p-3" data-testid="entree-journal">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{entree.action_display}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formaterDateEtHeure(entree.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{entree.description}</p>
                <p className="text-xs text-muted-foreground">
                  par {entree.user_detail?.full_name || entree.user_detail?.username || 'un visiteur'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Tuile de chiffre.
 *
 * Le nombre porte la hiérarchie par sa taille et son poids, pas par une
 * couleur criarde : le ton ne teinte que l'icône et sa pastille.
 */
function Tuile({
  icone: Icone,
  libelle,
  valeur,
  ton,
}: {
  icone: typeof House;
  libelle: string;
  valeur: number;
  ton: 'attente' | 'neutre';
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full items-center gap-3 p-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            ton === 'attente' ? 'bg-statut-attente-fond' : 'bg-statut-neutre-fond',
          )}
        >
          <Icone
            className={cn(
              'h-5 w-5',
              ton === 'attente' ? 'text-statut-attente' : 'text-statut-neutre',
            )}
            aria-hidden
          />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {valeur}
          </p>
          {/* Pas de troncature : sur un téléphone, « Identités à … » ne dit
              plus rien. Le libellé passe à la ligne. */}
          <p className="text-sm leading-tight text-muted-foreground">{libelle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Répartition : des barres proportionnelles, une seule teinte.
 *
 * Comparer des effectifs entre catégories est une question de grandeur, pas
 * d'identité : une couleur par ligne n'apporterait rien et obligerait à une
 * légende. L'identité est portée par le libellé, à gauche de sa barre.
 */
function Repartition({
  titre,
  total,
  lignes,
  pied,
}: {
  titre: string;
  total: number;
  lignes: { libelle: string; valeur: number }[];
  pied?: string;
}) {
  const maximum = Math.max(...lignes.map((l) => l.valeur), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-baseline justify-between text-base">
          <span>{titre}</span>
          <span className="text-sm font-normal tabular-nums text-muted-foreground">
            {total} au total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lignes.map(({ libelle, valeur }) => (
          <div key={libelle} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3">
            <span className="truncate text-sm text-muted-foreground">{libelle}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round((valeur / maximum) * 100)}%` }}
              />
            </div>
            <span className="text-right text-sm font-medium tabular-nums text-foreground">
              {valeur}
            </span>
          </div>
        ))}
        {pied ? (
          <p className="pt-1 text-xs text-muted-foreground">{pied}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

