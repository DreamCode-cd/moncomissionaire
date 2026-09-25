/**
 * Formatage des dates — source unique.
 *
 * Treize implémentations coexistaient dans onze fichiers, toutes en `fr-FR`
 * alors que les montants sont formatés en `fr-CD`. Aucune ne traitait les
 * dates absentes ni les chaînes invalides de la même façon : selon l'écran,
 * une date manquante s'affichait « Invalid Date », « N/A » ou rien du tout.
 *
 * La locale est `fr-CD` partout. Sur les dates, l'écart avec `fr-FR` est
 * minime, mais une application ne doit pas parler deux langues selon qu'elle
 * affiche un prix ou une échéance.
 */

const LOCALE = 'fr-CD';
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
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** « 25/09/2026 » — pour les listes et les tableaux, où la place manque. */
export function formaterDateCourte(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return date.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** « 25 sept. » — pour les fils de discussion et les notifications. */
export function formaterJourEtMois(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

/** « 14:30 » — l'API renvoie souvent « 14:30:00 », les secondes n'apprennent rien. */
export function formaterHeure(valeur?: string | Date | null): string {
  if (typeof valeur === 'string' && /^\d{2}:\d{2}/.test(valeur)) {
    return valeur.slice(0, 5);
  }
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

/** « 25/09/2026 à 14:30 ». */
export function formaterDateEtHeure(valeur?: string | Date | null): string {
  const date = versDate(valeur);
  if (!date) return ABSENT;
  return `${formaterDateCourte(date)} à ${formaterHeure(date)}`;
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
  if (secondes < 60) return "à l'instant";

  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;

  const jours = Math.floor(heures / 24);
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;

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

  if (date.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === hier.toDateString()) return 'Hier';

  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });
}
