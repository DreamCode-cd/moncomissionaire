/**
 * Joindre l'équipe VillaGo — mêmes coordonnées que l'application mobile
 * (`villagomobile/src/composants/AideContact.tsx`).
 *
 * Le numéro est public : il s'affiche en clair pour qu'on puisse le noter ou
 * le dicter. L'e-mail viendra quand l'adresse du projet existera : on
 * n'affiche pas une adresse qui ne répond pas.
 */

import { t } from '@/i18n';
export const CONTACT_VILLAGO = {
  telephone: '+243828215264',
  whatsapp: '+243828215264',
  email: '',
} as const;

/** « +243828215264 » → « +243 828 215 264 », avec des espaces insécables. */
export function numeroLisible(numero: string): string {
  const m = /^\+243(\d{3})(\d{3})(\d{3})$/.exec(numero);
  return m ? `+243 ${m[1]} ${m[2]} ${m[3]}` : numero;
}

/** wa.me ouvre WhatsApp s'il est installé, sa page web sinon. */
/** Le message commence par une salutation dans la langue de l'écran. */
export const lienWhatsapp = () =>
  `https://wa.me/${CONTACT_VILLAGO.whatsapp.replace('+', '')}?text=${encodeURIComponent(t('contact.bonjour'))}`;
