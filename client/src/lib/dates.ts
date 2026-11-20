/**
 * Formatage des dates — source unique.
 *
 * Treize implémentations coexistaient dans onze fichiers, toutes en `fr-FR`
 * alors que les montants sont formatés en `fr-CD`. Aucune ne traitait les
 * dates absentes ni les chaînes invalides de la même façon : selon l'écran,
 * une date manquante s'affichait « Invalid Date », « N/A » ou rien du tout.
 *
 * La locale suit la langue de l'écran : `fr-CD` en français, `en-GB` en
 * anglais (« Saturday 21 November », décision du 20/11/2026). Une
 * application ne doit pas parler deux langues selon qu'elle affiche un prix
 * ou une échéance.
 */

import { langueActive, localeActive, t } from '@/i18n';

const ABSENT = '—';

function versDate(valeur?: string | Date | null): Date | null {
  if (!valeur) return null;
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** « 25 septembre 2026 » — pour les fiches et les détails. */
export function formaterDateLongue(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return date.toLocaleDateString(localeActive(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** « 25/09/2026 » — pour les listes et les tableaux, où la place manque. */
export function formaterDateCourte(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return date.toLocaleDateString(localeActive(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** « 25 sept. » — pour les fils de discussion et les notifications. */
export function formaterJourEtMois(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return date.toLocaleDateString(localeActive(), { day: 'numeric', month: 'short' });
}

/** « 14:30 » — l'API renvoie souvent « 14:30:00 », les secondes n'apprennent rien. */
/** « 10 h », « 10 h 30 » : comme l'application mobile et les textes du
 *  serveur (audit du 20/11/2026). Espaces insécables : « 10 h » ne se coupe
 *  jamais en fin de ligne. */
export function formaterHeure(valeur?: string | Date | null): string {
  let heures: number;
  let minutes: number;
  if (typeof valeur === 'string' && /^\d{2}:\d{2}/.test(valeur)) {
    heures = Number(valeur.slice(0, 2));
    minutes = Number(valeur.slice(3, 5));
  } else {
    const date = versDate(valeur);
    if (!date) return ABSENT;
    heures = date.getHours();
    minutes = date.getMinutes();
  }
  if (langueActive() === 'en') {
    // « 10 am », « 2:30 pm » : comme les textes du serveur en anglais.
    const suffixe = heures < 12 ? 'am' : 'pm';
    const h = heures % 12 || 12;
    return minutes
      ? `${h}:${String(minutes).padStart(2, '0')}\u00A0${suffixe}`
      : `${h}\u00A0${suffixe}`;
  }
  return minutes ? `${heures}\u00A0h\u00A0${String(minutes).padStart(2, '0')}` : `${heures}\u00A0h`;
}

/** « 25/09/2026 à 14:30 ». */
export function formaterDateEtHeure(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return t('date.dateEtHeure', { date: formaterDateCourte(date), heure: formaterHeure(date) });
}

/**
 * Ancienneté en langage courant : « à l'instant », « il y a 3 h », « hier ».
 *
 * Au-delà d'une semaine, la date exacte devient plus utile qu'un écart :
 * « il y a 47 jours » n'aide personne à situer un événement.
 */
export function formaterAnciennete(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;

  const secondes = Math.floor((Date.now() - date.getTime()) / 1000);

  if (secondes < 0) return formaterJourEtMois(date);
  if (secondes < 60) return t('date.alInstant');

  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return t('date.ilYAMinutes', { n: minutes });

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return t('date.ilYAHeures', { n: heures });

  const jours = Math.floor(heures / 24);
  if (jours === 1) return t('date.hier');
  if (jours < 7) return t('date.ilYAJours', { n: jours });

  return formaterJourEtMois(date);
}

/**
 * Séparateur de jour dans une conversation : « Aujourd'hui », « Hier », sinon
 * le jour et le mois.
 *
 * Rôle distinct de `formaterAnciennete` : ici on situe un groupe de messages
 * dans la journée, pas l'âge d'un événement isolé.
 */
export function formaterSeparateurDeJour(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;

  const aujourdhui = new Date();
  const hier = new Date(aujourdhui);
  hier.setDate(hier.getDate() - 1);

  if (date.toDateString() === aujourdhui.toDateString()) return t('date.aujourdhui');
  if (date.toDateString() === hier.toDateString()) return t('date.hierMajuscule');

  return date.toLocaleDateString(localeActive(), { day: 'numeric', month: 'long' });
}

/** Le jour d'aujourd'hui, à l'heure du navigateur (« 2026-11-17 »), pour le
 *  `min` d'un champ date. `toISOString()` donne le jour UTC : entre minuit et
 *  2 h à Lubumbashi, il proposait encore la veille. Le serveur refuse de
 *  toute façon un créneau passé. */
export function jourLocalIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
