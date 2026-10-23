/**
 * Numéros de téléphone — mêmes règles que le serveur (`accounts/telephone.py` du backend).
 *
 * Le champ acceptait n'importe quel texte de neuf caractères. C'est pourtant
 * par ce numéro que bailleurs et clients joignent le commissionnaire : un
 * numéro faux est un contact perdu.
 *
 * Le serveur reste juge : ce contrôle-ci sert à dire l'erreur avant l'envoi,
 * sous le champ, au lieu d'attendre la réponse sur une connexion lente.
 */

export interface Pays {
  indicatif: string;
  nom: string;
  /** Chiffres du numéro national, sans le 0 initial. */
  longueur: number;
}

// La RDC d'abord, puis les voisins de Lubumbashi et la diaspora fréquente.
// Même liste que LONGUEURS_NATIONALES côté serveur.
export const PAYS: Pays[] = [
  { indicatif: '243', nom: 'RD Congo', longueur: 9 },
  { indicatif: '260', nom: 'Zambie', longueur: 9 },
  { indicatif: '244', nom: 'Angola', longueur: 9 },
  { indicatif: '255', nom: 'Tanzanie', longueur: 9 },
  { indicatif: '250', nom: 'Rwanda', longueur: 9 },
  { indicatif: '257', nom: 'Burundi', longueur: 8 },
  { indicatif: '27', nom: 'Afrique du Sud', longueur: 9 },
  { indicatif: '32', nom: 'Belgique', longueur: 9 },
  { indicatif: '33', nom: 'France', longueur: 9 },
];

export const INDICATIF_RDC = '243';

/** Les réseaux congolais commencent par 8 ou 9 (Vodacom, Orange, Airtel, Africell). */
const MOBILE_RDC = /^[89]\d{8}$/;

/** Retire espaces, points, tirets, parenthèses et barres. */
export function chiffresSeuls(saisie: string): string {
  return saisie.replace(/[\s.\-()/]/g, '');
}

/**
 * Sépare un numéro enregistré (« +243812345678 ») en indicatif et numéro
 * national, pour remplir le formulaire.
 */
export function decouper(numero?: string | null): { indicatif: string; national: string } {
  const brut = chiffresSeuls(numero ?? '');
  if (!brut.startsWith('+')) {
    return { indicatif: INDICATIF_RDC, national: brut.replace(/^0/, '') };
  }
  const chiffres = brut.slice(1);
  const pays = PAYS.find((p) => chiffres.startsWith(p.indicatif));
  // « +243 0812345678 » : le serveur retire ce 0, on fait de même.
  return pays
    ? { indicatif: pays.indicatif, national: chiffres.slice(pays.indicatif.length).replace(/^0/, '') }
    : { indicatif: INDICATIF_RDC, national: chiffres };
}

/**
 * « 243 » + « 081 234 56 78 » → « +243812345678 » ; vide si rien n'est saisi.
 *
 * Un numéro collé depuis un contact ou WhatsApp arrive avec son indicatif
 * (« +243 81… », « 00243… », « 243812345678 ») : il prime alors sur la liste,
 * comme côté serveur. Sans cela, le site refusait « +243 81 234 56 78 ».
 */
export function assembler(indicatif: string, national: string): string {
  const chiffres = chiffresSeuls(national);
  if (!chiffres) return '';
  if (chiffres.startsWith('+')) return chiffres;
  if (chiffres.startsWith('00')) return `+${chiffres.slice(2)}`;
  if (indicatif === INDICATIF_RDC && chiffres.length === 12 && chiffres.startsWith(INDICATIF_RDC)) {
    return `+${chiffres}`;
  }
  return `+${indicatif}${chiffres.replace(/^0/, '')}`;
}

/** Le message d'erreur à afficher, ou `null` si le numéro est valable. */
export function erreurTelephone(numero: string): string | null {
  const brut = chiffresSeuls(numero);
  if (!brut) return null;
  if (brut === '+') return 'Numéro incomplet : vérifiez l’indicatif du pays.';
  if (!/^\+?\d+$/.test(brut)) {
    return 'Le numéro ne doit contenir que des chiffres.';
  }
  const international = brut.startsWith('+') ? brut.slice(1) : null;
  if (international !== null && !PAYS.some((p) => international.startsWith(p.indicatif))) {
    // Indicatif hors de la liste : la norme internationale seule (15 chiffres
    // au plus), comme côté serveur.
    return international.length >= 8 && international.length <= 15
      ? null
      : 'Numéro incomplet ou trop long : vérifiez l’indicatif du pays.';
  }
  const { indicatif, national } = decouper(numero);
  const pays = PAYS.find((p) => p.indicatif === indicatif);
  if (!pays) return null;
  if (national.length !== pays.longueur) {
    return `Il faut ${pays.longueur} chiffres après +${indicatif} (vous en avez saisi ${national.length}).`;
  }
  if (indicatif === INDICATIF_RDC && !MOBILE_RDC.test(national)) {
    return 'Un numéro congolais commence par 8 ou 9 après +243 (par exemple 81 234 56 78).';
  }
  return null;
}
