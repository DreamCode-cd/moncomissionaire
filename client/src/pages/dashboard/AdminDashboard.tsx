import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Building2,
  CircleCheck,
  Clock,
  House,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { Layout } from '@/components/layout/Layout';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formaterAnciennete, formaterDateCourte } from '@/lib/dates';
import { ROLES, libelleRole } from '@/lib/roles';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import type { PaginatedResponse, UserList } from '@shared/schema';

/**
 * Tableau de bord de l'administrateur de plateforme.
 *
 * Deux choix de forme, pris avant d'écrire une ligne de rendu :
 *
 * 1. **Des tuiles, pas des graphiques.** Les données sont des effectifs à un
 *    instant donné : « combien de biens attendent une validation ». Un
 *    graphique n'apporte rien à un nombre unique, et l'API n'expose aucune
 *    série temporelle qui justifierait une courbe.
 *
 * 2. **Ce qui demande une action passe en premier.** Un tableau de bord qui
 *    ouvre sur des totaux flatteurs se consulte une fois par mois. Celui qui
 *    ouvre sur « trois biens attendent votre validation » se consulte le
 *    matin.
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
  };
}

const FILTRES_ROLE = [
  { valeur: 'tous', libelle: 'Tous les rôles' },
  ...ROLES,
];

export default function AdminDashboard() {
  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Administration de la plateforme
        </h1>

        <Tabs defaultValue="apercu" className="mt-6">
          <TabsList>
            <TabsTrigger value="apercu">Vue d’ensemble</TabsTrigger>
            <TabsTrigger value="utilisateurs">Comptes</TabsTrigger>
          </TabsList>

          <TabsContent value="apercu" className="mt-6">
            <VueDEnsemble />
          </TabsContent>

          <TabsContent value="utilisateurs" className="mt-6">
            <GestionDesComptes />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function VueDEnsemble() {
  const { data, isPending, error, refetch } = useQuery<Apercu>({
    queryKey: ['/api/v1/administration/apercu/'],
  });

  if (isPending) return <EtatChargement texte="Chargement des chiffres…" />;
  if (error) {
    return (
      <EtatErreur
        description={(error as Error).message}
        onReessayer={() => void refetch()}
      />
    );
  }

  const { a_traiter: aTraiter } = data;
  const rienATraiter = Object.values(aTraiter).every((n) => n === 0);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          À traiter
        </h2>

        {rienATraiter ? (
          <EtatVide
            icone={CircleCheck}
            ton="favorable"
            titre="Rien n’attend"
            description="Aucune validation, aucune demande et aucune agence en attente."
            className="rounded-lg border border-card-border bg-card py-8"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tuile
              icone={House}
              libelle="Biens à valider"
              valeur={aTraiter.biens_en_attente}
              ton={aTraiter.biens_en_attente > 0 ? 'attente' : 'neutre'}
            />
            <Tuile
              icone={Clock}
              libelle="Demandes en attente"
              valeur={aTraiter.demandes_en_attente}
              ton={aTraiter.demandes_en_attente > 0 ? 'attente' : 'neutre'}
            />
            <Tuile
              icone={Building2}
              libelle="Agences à vérifier"
              valeur={aTraiter.agences_non_verifiees}
              ton={aTraiter.agences_non_verifiees > 0 ? 'attente' : 'neutre'}
            />
            <Tuile
              icone={UserCheck}
              libelle="Agents indisponibles"
              valeur={aTraiter.agents_indisponibles}
              ton="neutre"
            />
          </div>
        )}
      </section>

      <Repartition
        titre="Comptes par rôle"
        total={data.utilisateurs.total}
        lignes={[
          { libelle: 'Clients', valeur: data.utilisateurs.clients },
          { libelle: 'Propriétaires', valeur: data.utilisateurs.proprietaires },
          { libelle: 'Agences', valeur: data.utilisateurs.agences },
          { libelle: 'Commissionnaires', valeur: data.utilisateurs.commissionnaires },
          { libelle: 'Agents', valeur: data.utilisateurs.agents },
        ]}
        pied={`${data.utilisateurs.nouveaux_30_jours} inscription(s) sur 30 jours · ${data.utilisateurs.actifs} compte(s) actif(s)`}
      />

      <Repartition
        titre="Biens par statut"
        total={data.biens.total}
        lignes={[
          { libelle: 'Validés', valeur: data.biens.valides },
          { libelle: 'En attente', valeur: data.biens.en_attente },
          { libelle: 'Rejetés', valeur: data.biens.rejetes },
        ]}
        pied={`${data.biens.disponibles} bien(s) actuellement disponible(s) · ${data.biens.nouveaux_30_jours} publié(s) sur 30 jours`}
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
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
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
          <p className="truncate text-sm text-muted-foreground">{libelle}</p>
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
          <div key={libelle} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
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

function GestionDesComptes() {
  const { toast } = useToast();
  const [recherche, setRecherche] = useState('');
  const [role, setRole] = useState('tous');

  const parametres: Record<string, string> = {};
  if (recherche.trim()) parametres.search = recherche.trim();
  if (role !== 'tous') parametres.user_type = role;

  const chemin = '/api/v1/administration/utilisateurs/';
  const { data, isPending, error, refetch } = useQuery<PaginatedResponse<UserList>>({
    queryKey: [chemin, parametres],
  });

  const basculer = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      api.post(`${chemin}${id}/${actif ? 'desactiver' : 'activer'}/`),
    onSuccess: (_, { actif }) => {
      void queryClient.invalidateQueries({ queryKey: [chemin] });
      void queryClient.invalidateQueries({
        queryKey: ['/api/v1/administration/apercu/'],
      });
      toast({
        title: actif ? 'Compte désactivé' : 'Compte activé',
      });
    },
    onError: (erreur: Error) => {
      // Le serveur refuse pour de bonnes raisons — un agent en mission, son
      // propre compte — et son message explique laquelle.
      toast({
        title: 'Action impossible',
        description: erreur.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un nom, un e-mail, un téléphone…"
          className="sm:max-w-sm"
          data-testid="input-recherche-comptes"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="sm:w-56" data-testid="select-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTRES_ROLE.map((r) => (
              <SelectItem key={r.valeur} value={r.valeur}>
                {r.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <EtatChargement texte="Chargement des comptes…" />
      ) : error ? (
        <EtatErreur
          description={(error as Error).message}
          onReessayer={() => void refetch()}
        />
      ) : !data?.results?.length ? (
        <EtatVide
          icone={Users}
          titre="Aucun compte"
          description="Aucun compte ne correspond à cette recherche."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {data.results.map((compte) => (
              <LigneCompte
                key={compte.id}
                compte={compte}
                enCours={basculer.isPending}
                onBasculer={() =>
                  basculer.mutate({ id: compte.id, actif: compte.is_active !== false })
                }
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LigneCompte({
  compte,
  onBasculer,
  enCours,
}: {
  compte: UserList;
  onBasculer: () => void;
  enCours: boolean;
}) {
  // Le champ est optionnel au contrat : absent, on considère le compte actif,
  // ce qui est le défaut côté Django.
  const actif = compte.is_active !== false;

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {compte.full_name || compte.username}
        </p>
        <p className="truncate text-sm text-muted-foreground">{compte.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {libelleRole(compte.user_type ?? compte.role, compte.user_type_display)}
          {compte.created_at
            ? ` · inscrit ${formaterAnciennete(compte.created_at)} (${formaterDateCourte(compte.created_at)})`
            : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <BadgeStatut
          valeur={actif ? 'valide' : 'rejete'}
          libelle={actif ? 'Actif' : 'Désactivé'}
          famille="validation"
        />
        <Button
          variant={actif ? 'outline' : 'default'}
          size="sm"
          onClick={onBasculer}
          disabled={enCours}
          data-testid={`bouton-basculer-${compte.id}`}
        >
          {actif ? 'Désactiver' : 'Activer'}
        </Button>
      </div>
    </div>
  );
}
