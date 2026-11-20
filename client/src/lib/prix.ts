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
import { langueActive, localeActive, t } from '@/i18n';

export type { Devise };

export const DEVISES: { valeur: Devise; libelle: string; symbole: string }[] = [
  { valeur: 'USD', get libelle() { return t('devise.usd'); }, symbole: '$' },
  { valeur: 'CDF', get libelle() { return t('devise.cdf'); }, symbole: 'FC' },
];

/**
 * Un montant dans sa devise, selon la langue de l'écran : « 450 $ » et
 * « 460 000 FC » en français, « $450 » et « 460,000 FC » en anglais.
 * `en-GB` écrirait « CDF 460,000 » : le franc s'écrit à la main.
 */
function formater(valeur: number, devise: Devise, decimales: number): string {
  if (devise === 'CDF' && langueActive() === 'en') {
    return `${new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: Math.max(decimales, 0),
    }).format(valeur)}\u00A0FC`;
  }
  return new Intl.NumberFormat(localeActive(), {
    style: 'currency',
    currency: devise,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur);
}

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

  return formater(valeur, normaliser(devise), 0);
}

/** Loyer mensuel, avec la mention de périodicité. */
export function formaterLoyer(
  montant?: string | number | null,
  devise?: string | null,
): string {
  const prix = formaterPrix(montant, devise);
  // « par mois » et non « /mois » : la même écriture que la fiche, les
  // annonces et le mobile (audit du 20/11/2026).
  return prix === '—' ? prix : t('prix.parMois', { prix });
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
  return formater(valeur, normaliser(devise), Number.isInteger(valeur) ? 0 : 2);
}

/** Vrai si le montant renvoyé par l'API vaut plus que zéro. */
export function estPositif(montant?: string | number | null): boolean {
  const valeur = typeof montant === 'number' ? montant : parseFloat(montant ?? '');
  return !Number.isNaN(valeur) && valeur > 0;
}

/** Moyen de règlement dans la langue de l'écran ; les marques (M-Pesa,
 *  Airtel Money, Orange Money) ne se traduisent pas. */
export function libelleModeReglement(mode?: string | null, repli?: string | null): string {
  if (mode === 'especes') return t('reglement.especes');
  if (mode === 'virement') return t('reglement.virement');
  return repli || mode || '';
}

/** « le locataire » / « le bailleur », pour « payé par … ». */
export function libellePayeur(payeur?: string | null, repli?: string | null): string {
  if (payeur === 'locataire') return t('reglement.payeurLocataire');
  if (payeur === 'bailleur') return t('reglement.payeurBailleur');
  return (repli || payeur || '').toLowerCase();
}
