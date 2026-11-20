import type { Eau, Electricite } from '@shared/schema';
import { t } from '@/i18n';

/**
 * Le vocabulaire du terrain, à Lubumbashi.
 *
 * Les libellés reprennent ceux de l'API (`eau_display`, `electricite_display`).
 * Ils sont recopiés ici parce qu'un formulaire doit proposer les choix avant
 * que le serveur n'ait rien renvoyé ; swagger.json fait foi sur les valeurs.
 */

/** « Eau courante : oui » ne disait rien : la vraie question est la
 *  régularité. Un robinet REGIDESO sec trois jours sur sept n'est pas une
 *  parcelle avec forage. */
export const CHOIX_EAU: { valeur: Eau; libelle: string }[] = [
  { valeur: 'permanente', get libelle() { return t('terrain.eau.permanente'); } },
  { valeur: 'intermittente', get libelle() { return t('terrain.eau.intermittente'); } },
  { valeur: 'forage', get libelle() { return t('terrain.eau.forage'); } },
  { valeur: 'aucune', get libelle() { return t('terrain.eau.aucune'); } },
];

export const CHOIX_ELECTRICITE: { valeur: Electricite; libelle: string }[] = [
  { valeur: 'stable', get libelle() { return t('terrain.courant.stable'); } },
  { valeur: 'delestage', get libelle() { return t('terrain.courant.delestage'); } },
  { valeur: 'autonome', get libelle() { return t('terrain.courant.autonome'); } },
  { valeur: 'aucune', get libelle() { return t('terrain.courant.aucune'); } },
];

/** Valeur d'un Select qui représente « non précisé » : Radix refuse une
 *  valeur vide pour un élément de liste. */
export const NON_PRECISE = 'non_precise';

/** Ce que demande un locataire, traduit en filtre d'API. */
export const FILTRE_EAU_TOUS_LES_JOURS = 'permanente,forage';
export const FILTRE_COURANT_SANS_COUPURE = 'stable,autonome';

/** Libellé complet d'une valeur d'eau ou de courant, dans la langue de
 *  l'écran (le `*_display` du serveur est rédigé en français). */
export function libelleChoixEau(valeur: string): string | undefined {
  return CHOIX_EAU.find((c) => c.valeur === valeur)?.libelle;
}

export function libelleChoixCourant(valeur: string): string | undefined {
  return CHOIX_ELECTRICITE.find((c) => c.valeur === valeur)?.libelle;
}
