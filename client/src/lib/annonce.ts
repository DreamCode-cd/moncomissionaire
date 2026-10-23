import type { BienList, ProfilPublic } from '@shared/schema';

/**
 * Qui a publié l'annonce : le commissionnaire à qui un bailleur a confié sa
 * maison, ou le propriétaire inscrit qui la publie lui-même.
 *
 * Un bien confié n'a pas de propriétaire inscrit : afficher
 * `bien.proprietaire` sans y penser donnerait une case vide, ou pire, un
 * plantage sur `null`.
 */
export function auteurAnnonce(bien: Pick<BienList, 'proprietaire' | 'commissionnaire_detail'>): {
  profil: ProfilPublic | null;
  libelle: 'Commissionnaire' | 'Propriétaire' | 'Agence';
} {
  if (bien.commissionnaire_detail) {
    return { profil: bien.commissionnaire_detail, libelle: 'Commissionnaire' };
  }
  // Une agence publie comme un propriétaire ; le serveur envoie déjà le nom
  // de l'agence dans `full_name`.
  return { profil: bien.proprietaire, libelle: bien.proprietaire?.user_type === 'agence' ? 'Agence' : 'Propriétaire' };
}

/** Ce que l'équipe a vérifié : la pièce d'identité d'une personne, ou le
 *  RCCM et le gérant d'une agence. */
export function libelleVerification(profil?: Pick<ProfilPublic, 'user_type'> | null): string {
  return profil?.user_type === 'agence'
    ? 'Agence vérifiée par l’équipe VillaGo'
    : 'Identité vérifiée par l’équipe VillaGo';
}

/** L'initiale de l'avatar. Sert aussi pour les comptes d'une visite ou d'une
 *  demande (CompteResume), qui ont eux aussi `full_name`. */
export function initiale(profil?: Pick<ProfilPublic, 'full_name'> | null): string {
  return profil?.full_name?.[0]?.toUpperCase() || '?';
}

/** « 3 mois de loyer », « Aucune garantie ». */
export function libelleGarantie(mois: number): string {
  if (!mois) return 'Aucune garantie';
  return `${mois} mois de loyer`;
}

/** Plafond fixé par le serveur (biens/serializers.py). Le formulaire en
 *  acceptait 10 : l'annonce échouait à l'envoi, après le téléversement. */
export const PHOTOS_MAX = 6;

/**
 * « Bel-Air · Kampemba · Lubumbashi », sans répétition.
 *
 * Quartier, commune et ville portent souvent le même nom (le quartier Kenya
 * est dans la commune de Kenya ; la commune de Lubumbashi est dans la ville
 * de Lubumbashi) : les juxtaposer donnait « Kenya, Kenya ».
 */
export function lieuAnnonce(morceaux: (string | null | undefined)[]): string {
  const vus = new Set<string>();
  return morceaux
    .map((m) => (m ?? '').trim())
    .filter((m) => {
      const cle = m.toLowerCase();
      if (!m || vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .join(', ');
}

/** « 400 m² » — ou null quand la surface est inconnue, au lieu de « m² » seul. */
export function formaterSurface(superficie?: string | null): string | null {
  const valeur = parseFloat(superficie ?? '');
  if (!Number.isFinite(valeur) || valeur <= 0) return null;
  return `${Math.round(valeur).toLocaleString('fr-FR')} m²`;
}
