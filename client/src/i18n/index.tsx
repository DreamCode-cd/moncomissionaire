/**
 * Langues de l'interface : français (source) et anglais britannique.
 *
 * Décisions de David (20/11/2026) : l'anglais d'abord (le swahili viendra
 * plus tard), « commissionnaire » ne se traduit pas, anglais britannique.
 * Glossaire : villago-docs/traduction/glossaire.md.
 *
 * Pourquoi pas i18next : deux langues, des textes simples, et un budget de
 * poids serré (3G facturée au mégaoctet). Ce module tient en une page, et le
 * typage fait le travail d'un outil d'extraction : une clé absente du
 * dictionnaire anglais, ou une clé mal orthographiée dans un composant, est
 * une erreur de compilation (`npm run check`).
 *
 * `t()` est une fonction ordinaire, utilisable hors des composants (toasts,
 * lib/). Changer de langue remonte l'arbre React (voir LangueProvider) : tous
 * les textes se recalculent, sans qu'aucun composant ait à s'abonner.
 */

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fr, type Cle } from './fr';

export type Langue = 'fr' | 'en';
export const LANGUES: { code: Langue; nom: string }[] = [
  { code: 'fr', nom: 'Français' },
  { code: 'en', nom: 'English' },
];

const CLE_STOCKAGE = 'villago.langue';
// L'anglais se charge à la demande : un visiteur francophone ne télécharge
// pas un dictionnaire qu'il ne lira pas (3G facturée au mégaoctet).
// État partagé par globalThis : en développement, le serveur sert main.tsx
// avec un paramètre de version, et ce module peut être chargé deux fois
// (deux URL). Sans cela, le dictionnaire chargé par main.tsx n'était pas
// celui que lisaient les composants.
type EtatLangue = { langue: Langue; dictionnaires: Record<Langue, Record<Cle, string> | null> };
const ETAT: EtatLangue = ((globalThis as { __villagoLangue?: EtatLangue }).__villagoLangue ??= {
  langue: langueInitiale(),
  dictionnaires: { fr, en: null },
});
const DICTIONNAIRES = ETAT.dictionnaires;

/** Charge le dictionnaire d'une langue s'il ne l'est pas encore. */
export async function chargerLangue(langue: Langue): Promise<void> {
  if (DICTIONNAIRES[langue]) return;
  if (langue === 'en') DICTIONNAIRES.en = (await import('./en')).en;
}
/** Locale Intl de chaque langue : `fr-CD` donne « $ » et « FC », `en-GB` les
 *  dates « Saturday 21 November ». */
export const LOCALES: Record<Langue, string> = { fr: 'fr-CD', en: 'en-GB' };

function langueInitiale(): Langue {
  try {
    const enregistree = localStorage.getItem(CLE_STOCKAGE);
    if (enregistree === 'fr' || enregistree === 'en') return enregistree;
  } catch {
    // Stockage indisponible (navigation privée stricte) : on devine.
  }
  const navigateur = typeof navigator !== 'undefined' ? navigator.language : 'fr';
  return navigateur?.toLowerCase().startsWith('en') ? 'en' : 'fr';
}


/** La langue active, pour le code qui n'est pas un composant. */
export function langueActive(): Langue {
  return ETAT.langue;
}

export function localeActive(): string {
  return LOCALES[ETAT.langue];
}

type Variables = Record<string, string | number | null | undefined>;

/**
 * Le texte d'une clé dans la langue active.
 *
 * - `{nom}` est remplacé par `variables.nom` ;
 * - si `variables.n` est un nombre et que `cle_one` / `cle_other` existent,
 *   la forme plurielle est choisie selon les règles de la langue (en
 *   français, 0 et 1 sont au singulier ; en anglais, seul 1 l'est).
 */
export function t(cle: Cle | ClePlurielle, variables?: Variables): string {
  // Tant que l'anglais n'est pas chargé, le français sert de repli.
  const dictionnaire = (DICTIONNAIRES[ETAT.langue] ?? fr) as Record<string, string>;
  let texte: string | undefined;
  if (variables && typeof variables.n === 'number') {
    const forme = new Intl.PluralRules(LOCALES[ETAT.langue]).select(variables.n);
    texte = dictionnaire[`${cle}_${forme}`] ?? dictionnaire[`${cle}_other`];
  }
  texte ??= dictionnaire[cle] ?? (fr as Record<string, string>)[cle] ?? cle;
  if (!variables) return texte;
  return texte.replace(/\{(\w+)\}/g, (tout, nom: string) => {
    const valeur = variables[nom];
    return valeur === undefined || valeur === null ? tout : String(valeur);
  });
}

/** Les clés plurielles s'appellent sans leur suffixe : t('x', { n }). */
type ClePlurielle = Cle extends infer K
  ? K extends `${infer Base}_one` | `${infer Base}_other`
    ? Base
    : never
  : never;

type ContexteLangue = { langue: Langue; changerLangue: (langue: Langue) => void };

const Contexte = createContext<ContexteLangue>({
  langue: ETAT.langue,
  changerLangue: () => {},
});

/**
 * Fournit la langue (voir aussi RemonterSurLangue).
 *
 * `surChangement` laisse l'application faire le reste : vider le cache des
 * requêtes (les textes rédigés par le serveur suivent l'en-tête
 * Accept-Language), enregistrer la langue sur le compte.
 */
export function LangueProvider({
  children,
  surChangement,
}: {
  children: ReactNode;
  surChangement?: (langue: Langue) => void;
}) {
  const [langue, setLangue] = useState<Langue>(ETAT.langue);

  const changerLangue = useCallback(
    async (nouvelle: Langue) => {
      if (nouvelle === ETAT.langue) return;
      try {
        await chargerLangue(nouvelle);
      } catch {
        // Sans réseau, le dictionnaire n'arrive pas : on reste dans la langue actuelle.
        return;
      }
      ETAT.langue = nouvelle;
      try {
        localStorage.setItem(CLE_STOCKAGE, nouvelle);
      } catch {
        // Sans stockage, la langue tiendra jusqu'au rechargement.
      }
      document.documentElement.lang = nouvelle;
      surChangement?.(nouvelle);
      setLangue(nouvelle);
    },
    [surChangement],
  );

  const valeur = useMemo(() => ({ langue, changerLangue }), [langue, changerLangue]);

  if (typeof document !== 'undefined' && document.documentElement.lang !== langue) {
    document.documentElement.lang = langue;
  }

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/**
 * Remonte ses enfants quand la langue change : tous les `t()` se recalculent.
 * À placer SOUS les fournisseurs de session et de cache, qu'il ne faut pas
 * remonter (la session se rechargerait, l'écran clignoterait).
 */
export function RemonterSurLangue({ children }: { children: ReactNode }) {
  const { langue } = useLangue();
  return <Fragment key={langue}>{children}</Fragment>;
}

export function useLangue(): ContexteLangue {
  return useContext(Contexte);
}

/** Appliquer une langue venue d'ailleurs (le compte, à la connexion) sans
 *  passer par un composant. Renvoie vrai si elle a changé. */
export function adopterLangue(langue: string | null | undefined, changer: (l: Langue) => void) {
  if ((langue === 'fr' || langue === 'en') && langue !== ETAT.langue) {
    changer(langue);
    return true;
  }
  return false;
}

/**
 * Traduit un message qui est peut-être une clé : les schémas de validation
 * (shared/schema.ts) et la vérification du téléphone (shared/telephone.ts),
 * partagés avec le serveur Express, renvoient des clés plutôt que du texte.
 * Forme « cle|nom=valeur|… » pour les variables. Un texte ordinaire (message
 * du serveur, par exemple) passe tel quel.
 */
export function traduireSiCle(message: string | null | undefined): string {
  if (!message) return '';
  const [cle, ...morceaux] = message.split('|');
  if (!(cle in fr)) return message;
  const variables = Object.fromEntries(
    morceaux.map((m) => {
      const [nom, ...reste] = m.split('=');
      const valeur = reste.join('=');
      return [nom, /^\d+$/.test(valeur) ? Number(valeur) : valeur];
    }),
  );
  return t(cle as Cle, morceaux.length ? variables : undefined);
}
