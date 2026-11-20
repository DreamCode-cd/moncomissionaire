import {
  Calendar,
  CircleCheck,
  CircleX,
  Clock,
  Play,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/i18n';

/**
 * Statuts du produit — source unique.
 *
 * Le libellé et la couleur d'un statut étaient décidés dans chaque composant,
 * avec des primitives Tailwind écrites en dur (`green-500`, `yellow-500`,
 * `red-500`). Trois conséquences :
 *
 *   - changer la teinte du « validé » demandait de fouiller tout le front ;
 *   - le mode sombre était traité au cas par cas, donc de façon inégale ;
 *   - le même statut pouvait s'afficher différemment d'un écran à l'autre.
 *
 * Cinq TONS couvrent tout le produit. Un ton dit ce que la
 * situation vaut pour l'utilisateur, pas de quelle couleur elle est — c'est
 * ce qui permet de changer la palette sans toucher au métier.
 */

export type Ton =
  | 'favorable'
  | 'attente'
  | 'defavorable'
  /** Ni bon ni mauvais, mais notable : un message reçu, un agent ajouté. */
  | 'information'
  | 'neutre';

export interface Statut {
  libelle: string;
  ton: Ton;
  /** Icône facultative. Les badges existants en portaient : unifier ne doit
   *  pas appauvrir l'interface. */
  icone?: LucideIcon;
}

/** Validation d'un bien par le commissionnaire. */
const VALIDATION: Record<string, Statut> = {
  valide: { get libelle() { return t('statut.validation.valide'); }, ton: 'favorable', icone: CircleCheck },
  en_attente: { get libelle() { return t('statut.validation.en_attente'); }, ton: 'attente', icone: Clock },
  rejete: { get libelle() { return t('statut.validation.rejete'); }, ton: 'defavorable', icone: CircleX },
};

/** Disponibilité locative d'un bien. */
const LOCATION: Record<string, Statut> = {
  disponible: { get libelle() { return t('statut.location.disponible'); }, ton: 'favorable' },
  en_visite: { get libelle() { return t('statut.location.en_visite'); }, ton: 'attente' },
  loue: { get libelle() { return t('statut.location.loue'); }, ton: 'neutre' },
  indisponible: { get libelle() { return t('statut.location.indisponible'); }, ton: 'neutre' },
};

/** Déroulé d'une visite. */
const VISITE: Record<string, Statut> = {
  planifiee: { get libelle() { return t('statut.visite.planifiee'); }, ton: 'attente', icone: Calendar },
  en_cours: { get libelle() { return t('statut.visite.en_cours'); }, ton: 'information', icone: Play },
  terminee: { get libelle() { return t('statut.visite.terminee'); }, ton: 'favorable', icone: CircleCheck },
  reportee: { get libelle() { return t('statut.visite.reportee'); }, ton: 'attente', icone: Clock },
  annulee: { get libelle() { return t('statut.annulee'); }, ton: 'defavorable', icone: CircleX },
  non_faite: { get libelle() { return t('statut.visite.non_faite'); }, ton: 'neutre', icone: CircleX },
};

/** Traitement d'une demande de visite. */
const DEMANDE: Record<string, Statut> = {
  en_attente: { get libelle() { return t('statut.demande.en_attente'); }, ton: 'attente', icone: Clock },
  acceptee: { get libelle() { return t('statut.demande.acceptee'); }, ton: 'favorable', icone: CircleCheck },
  rejetee: { get libelle() { return t('statut.demande.rejetee'); }, ton: 'defavorable', icone: CircleX },
  annulee: { get libelle() { return t('statut.annulee'); }, ton: 'neutre', icone: CircleX },
  expiree: { get libelle() { return t('statut.demande.expiree'); }, ton: 'neutre', icone: Clock },
};

/**
 * Appréciation portée par un rapport de visite.
 *
 * Cinq degrés, donc deux nuances de favorable : le très intéressant doit se
 * distinguer de l'intéressant, sinon l'échelle ne sert à rien. On le marque
 * par l'emphase du badge, pas par une sixième couleur.
 */
const APPRECIATION: Record<string, Statut> = {
  tres_interessant: { get libelle() { return t('statut.appreciation.tres_interessant'); }, ton: 'favorable' },
  interessant: { get libelle() { return t('statut.appreciation.interessant'); }, ton: 'favorable' },
  moyen: { get libelle() { return t('statut.appreciation.moyen'); }, ton: 'attente' },
  peu_interessant: { get libelle() { return t('statut.appreciation.peu_interessant'); }, ton: 'attente' },
  non_recommande: { get libelle() { return t('statut.appreciation.non_recommande'); }, ton: 'defavorable' },
};

/** Règlement d'une commission, du point de vue de celui qui l'attend. */
const COMMISSION: Record<string, Statut> = {
  due: { get libelle() { return t('statut.commission.due'); }, ton: 'attente', icone: Clock },
  partiellement_reglee: { get libelle() { return t('statut.commission.partiellement_reglee'); }, ton: 'information', icone: Clock },
  reglee: { get libelle() { return t('statut.commission.reglee'); }, ton: 'favorable', icone: CircleCheck },
  annulee: { get libelle() { return t('statut.annulee'); }, ton: 'neutre', icone: CircleX },
};

const FAMILLES = {
  validation: VALIDATION,
  location: LOCATION,
  visite: VISITE,
  demande: DEMANDE,
  appreciation: APPRECIATION,
  commission: COMMISSION,
} as const;

/**
 * Ordre de recherche quand la famille n'est pas connue du composant.
 *
 * Plusieurs pages affichent côte à côte des statuts de demande et de visite :
 * leur `switch` d'origine mélangeait les deux. Seul `en_attente` est ambigu —
 * entre validation et demande — et les deux portent le même ton, la recherche
 * est donc sans risque.
 */
const ORDRE_RECHERCHE: Famille[] = [
  'demande',
  'visite',
  'validation',
  'location',
  'appreciation',
  'commission',
];

export type Famille = keyof typeof FAMILLES;

const INCONNU: Statut = { libelle: '—', ton: 'neutre' };

/**
 * Traduit une valeur d'API en libellé et en ton.
 *
 * L'API renvoie souvent un champ `*_display` déjà traduit : le passer en
 * `libelleServeur` évite que le front et le serveur divergent le jour où un
 * libellé change côté Django.
 */
export function lireStatut(
  famille: Famille,
  valeur?: string | null,
  libelleServeur?: string | null,
): Statut {
  const connu = valeur ? FAMILLES[famille][valeur] : undefined;
  if (!connu) {
    return libelleServeur ? { libelle: libelleServeur, ton: 'neutre' } : INCONNU;
  }
  // Le libellé du serveur est rédigé en français : on ne s'en sert que pour
  // une valeur inconnue du site. Les connues suivent la langue de l'écran.
  return connu;
}

/**
 * Classes du badge pour un ton donné.
 *
 * Passe par les jetons `statut-*`, jamais par les primitives : le mode sombre
 * est alors géré une seule fois, dans le thème.
 */
/**
 * Cherche un statut dans toutes les familles.
 *
 * À réserver aux écrans qui affichent des statuts d'origines mêlées. Quand la
 * famille est connue, la préciser : c'est plus sûr et plus lisible.
 */
export function lireStatutQuelconque(
  valeur?: string | null,
  libelleServeur?: string | null,
): Statut {
  for (const famille of ORDRE_RECHERCHE) {
    const trouve = valeur ? FAMILLES[famille][valeur] : undefined;
    if (trouve) {
      return trouve;
    }
  }
  return libelleServeur ? { libelle: libelleServeur, ton: 'neutre' } : INCONNU;
}

export function classesDuTon(ton: Ton): string {
  const table: Record<Ton, string> = {
    favorable: 'bg-statut-favorable-fond text-statut-favorable',
    attente: 'bg-statut-attente-fond text-statut-attente',
    defavorable: 'bg-statut-defavorable-fond text-statut-defavorable',
    information: 'bg-statut-information-fond text-statut-information',
    neutre: 'bg-statut-neutre-fond text-statut-neutre',
  };
  return table[ton];
}
