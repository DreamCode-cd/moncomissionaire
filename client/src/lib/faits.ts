import type { BienList } from '@shared/schema';

/*
 * Les faits qui décident une visite, en mots de locataire — mêmes règles que
 * l'application mobile (`villagomobile/src/theme/annonce.ts`). Les libellés
 * du serveur (`eau_display`…) sont écrits pour celui qui publie (« Courant
 * SNEL avec délestages ») ; ceux-ci sont courts, pour une ligne d'annonce.
 */

const EAU: Record<string, string> = {
  permanente: 'Eau tous les jours',
  intermittente: 'Eau par intermittence',
  forage: 'Forage ou puits',
  aucune: 'Pas d’eau',
};

const COURANT: Record<string, string> = {
  stable: 'Courant stable',
  delestage: 'Délestages',
  autonome: 'Solaire ou groupe',
  aucune: 'Pas de courant',
};

/**
 * L'état d'un fait, pour sa couleur : bon (vert), partiel (ambre), absent
 * (rouge). Un forage dans la parcelle, c'est de l'eau tous les jours ; le
 * solaire ou le groupe seuls, c'est du courant compté.
 */
export type EtatFait = 'bon' | 'partiel' | 'absent';

const ETAT_EAU: Record<string, EtatFait> = {
  permanente: 'bon',
  forage: 'bon',
  intermittente: 'partiel',
  aucune: 'absent',
};

const ETAT_COURANT: Record<string, EtatFait> = {
  stable: 'bon',
  delestage: 'partiel',
  autonome: 'partiel',
  aucune: 'absent',
};

/** Classes de couleur d'un état, sur les jetons de statut du thème. */
export const TEXTE_ETAT: Record<EtatFait, string> = {
  bon: 'text-statut-favorable',
  partiel: 'text-statut-attente',
  absent: 'text-statut-defavorable',
};

export const FOND_ETAT: Record<EtatFait, string> = {
  bon: 'bg-statut-favorable',
  partiel: 'bg-statut-attente',
  absent: 'bg-statut-defavorable',
};

export function libelleEau(eau?: string | null): string | null {
  return (eau && EAU[eau]) || null;
}

export function libelleCourant(courant?: string | null): string | null {
  return (courant && COURANT[courant]) || null;
}

export function etatEau(eau?: string | null): EtatFait | null {
  return (eau && ETAT_EAU[eau]) || null;
}

export function etatCourant(courant?: string | null): EtatFait | null {
  return (courant && ETAT_COURANT[courant]) || null;
}

/** « 1 chambre », « 3 chambres » ; rien pour un terrain. */
export function libelleChambres(nombre?: number | null): string | null {
  if (!nombre) return null;
  return nombre === 1 ? '1 chambre' : `${nombre} chambres`;
}

/**
 * Qui garantit l'annonce, quand l'équipe VillaGo a vérifié son identité :
 * le commissionnaire, ou l'agence qui publie elle-même. Rien sinon : on ne
 * marque pas d'un défaut l'annonce d'un intermédiaire pas encore vérifié,
 * la fiche le dit.
 */
export function garantVerifie(
  bien: Pick<BienList, 'commissionnaire_detail' | 'proprietaire'>,
): 'commissionnaire' | 'agence' | null {
  if (bien.commissionnaire_detail?.identite_verifiee) return 'commissionnaire';
  if (bien.proprietaire?.user_type === 'agence' && bien.proprietaire.identite_verifiee) return 'agence';
  return null;
}
