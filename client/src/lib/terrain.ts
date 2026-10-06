import type { Eau, Electricite } from '@shared/schema';

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
  { valeur: 'permanente', libelle: 'Eau REGIDESO tous les jours' },
  { valeur: 'intermittente', libelle: 'Eau REGIDESO par intermittence' },
  { valeur: 'forage', libelle: 'Forage ou puits dans la parcelle' },
  { valeur: 'aucune', libelle: "Pas d'eau dans la parcelle" },
];

export const CHOIX_ELECTRICITE: { valeur: Electricite; libelle: string }[] = [
  { valeur: 'stable', libelle: 'Courant SNEL stable' },
  { valeur: 'delestage', libelle: 'Courant SNEL avec délestages' },
  { valeur: 'autonome', libelle: 'Solaire ou groupe électrogène uniquement' },
  { valeur: 'aucune', libelle: 'Pas de courant' },
];

/** Valeur d'un Select qui représente « non précisé » : Radix refuse une
 *  valeur vide pour un élément de liste. */
export const NON_PRECISE = 'non_precise';

/** Ce que demande un locataire, traduit en filtre d'API. */
export const FILTRE_EAU_TOUS_LES_JOURS = 'permanente,forage';
export const FILTRE_COURANT_SANS_COUPURE = 'stable,autonome';
