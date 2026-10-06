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
  libelle: 'Commissionnaire' | 'Propriétaire';
} {
  if (bien.commissionnaire_detail) {
    return { profil: bien.commissionnaire_detail, libelle: 'Commissionnaire' };
  }
  return { profil: bien.proprietaire, libelle: 'Propriétaire' };
}

export function initiale(profil?: ProfilPublic | null): string {
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
