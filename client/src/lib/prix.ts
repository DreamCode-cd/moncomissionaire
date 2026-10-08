/**
 * Formatage des montants — source unique.
 *
 * Trois implémentations de `formatPrice` coexistaient (PropertyCard, MapView,
 * PropertyDetail), toutes avec `currency: 'USD'` codé en dur. Un loyer en
 * francs s'y affichait donc en dollars : 450 000 FC devenaient « 450 000 $US »,
 * soit environ deux cents fois le montant réel.
 *
 * La locale `fr-CD` donne les bons symboles courts — « $ » et « FC » — là où
 * `fr-FR` rend « $US » et « CDF ».
 */

import type { Devise } from '@shared/schema';

export type { Devise };

export const DEVISES: { valeur: Devise; libelle: string; symbole: string }[] = [
  { valeur: 'USD', libelle: 'Dollar américain', symbole: '$' },
  { valeur: 'CDF', libelle: 'Franc congolais', symbole: 'FC' },
];

const DEVISE_PAR_DEFAUT: Devise = 'USD';

function normaliser(devise?: string | null): Devise {
  return devise === 'CDF' ? 'CDF' : DEVISE_PAR_DEFAUT;
}

/** Symbole court d'une devise, pour les affichages compacts. */
export function symboleDevise(devise?: string | null): string {
  return normaliser(devise) === 'CDF' ? 'FC' : '$';
}

/**
 * Formate un montant dans sa devise.
 *
 * @param montant  chaîne ou nombre ; l'API renvoie des décimales en chaîne
 * @param devise   'USD' ou 'CDF' ; le dollar à défaut, comme côté serveur
 */
export function formaterPrix(
  montant?: string | number | null,
  devise?: string | null,
): string {
  if (montant === null || montant === undefined || montant === '') {
    return '—';
  }

  const valeur = typeof montant === 'number' ? montant : parseFloat(montant);
  if (Number.isNaN(valeur)) {
    return '—';
  }

  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: normaliser(devise),
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valeur);
}

/** Loyer mensuel, avec la mention de périodicité. */
export function formaterLoyer(
  montant?: string | number | null,
  devise?: string | null,
): string {
  const prix = formaterPrix(montant, devise);
  return prix === '—' ? prix : `${prix}/mois`;
}

/**
 * Montant exact, centimes compris quand il y en a : une commission partagée
 * moitié-moitié ou entre confrères tombe rarement sur un compte rond, et un
 * écart d'un dollar affiché sur un reçu suffit à ouvrir une dispute.
 */
export function formaterMontant(
  montant?: string | number | null,
  devise?: string | null,
): string {
  if (montant === null || montant === undefined || montant === '') {
    return '—';
  }
  const valeur = typeof montant === 'number' ? montant : parseFloat(montant);
  if (Number.isNaN(valeur)) {
    return '—';
  }
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: normaliser(devise),
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: Number.isInteger(valeur) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valeur);
}

/** Vrai si le montant renvoyé par l'API vaut plus que zéro. */
export function estPositif(montant?: string | number | null): boolean {
  const valeur = typeof montant === 'number' ? montant : parseFloat(montant ?? '');
  return !Number.isNaN(valeur) && valeur > 0;
}
