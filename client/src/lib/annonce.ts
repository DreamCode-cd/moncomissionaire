import type { BienList, ProfilPublic } from '@shared/schema';
import { localeActive, t } from '@/i18n';

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
  libelle: string;
} {
  if (bien.commissionnaire_detail) {
    return { profil: bien.commissionnaire_detail, libelle: t('role.commissionnaire') };
  }
  // Une agence publie comme un propriétaire ; le serveur envoie déjà le nom
  // de l'agence dans `full_name`.
  return { profil: bien.proprietaire, libelle: bien.proprietaire?.user_type === 'agence' ? t('role.agence') : t('role.proprietaire') };
}

/** Ce que l'équipe a vérifié : la pièce d'identité d'une personne, ou le
 *  RCCM et le gérant d'une agence. */
export function libelleVerification(profil?: Pick<ProfilPublic, 'user_type'> | null): string {
  return profil?.user_type === 'agence'
    ? t('annonce.agenceVerifiee')
    : t('annonce.identiteVerifiee');
}

/** L'initiale de l'avatar. Sert aussi pour les comptes d'une visite ou d'une
 *  demande (CompteResume), qui ont eux aussi `full_name`. */
export function initiale(profil?: Pick<ProfilPublic, 'full_name'> | null): string {
  return profil?.full_name?.[0]?.toUpperCase() || '?';
}

/** « 3 mois de loyer », « Aucune garantie ». */
export function libelleGarantie(mois: number): string {
  if (!mois) return t('annonce.aucuneGarantie');
  return t('annonce.moisDeLoyer', { n: mois });
}

/** Plafonds fixés par le serveur (biens/medias.py) : 20 photos, 2 vidéos
 *  d'une minute, 100 Mo chacune avant réencodage (décision de David du
 *  20/11/2026). */
export const PHOTOS_MAX = 20;
export const VIDEOS_MAX = 2;
export const VIDEO_DUREE_MAX = 60;
export const VIDEO_TAILLE_MAX = 100 * 1024 * 1024;

/** « 45 s », « 1 min ». */
export function dureeLisible(secondes?: number | null): string {
  if (!secondes) return '';
  return secondes >= 60
    ? t('annonce.minutes', { n: Math.round(secondes / 60) })
    : t('annonce.secondes', { n: secondes });
}

/** « 850 Ko », « 4,2 Mo », « 23 Mo ». */
export function poidsLisible(octets?: number | null): string {
  if (!octets) return '';
  const mo = octets / (1024 * 1024);
  if (mo < 1) return t('annonce.ko', { n: Math.max(1, Math.round(octets / 1024)) });
  const valeur = mo < 10 ? Number(mo.toFixed(1)) : Math.round(mo);
  return t('annonce.mo', { n: valeur.toLocaleString(localeActive()) });
}

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

const TYPES_DE_BIEN: Record<string, () => string> = {
  maison: () => t('typeBien.maison'),
  appartement: () => t('typeBien.appartement'),
  studio: () => t('typeBien.studio'),
  villa: () => t('typeBien.villa'),
  duplex: () => t('typeBien.duplex'),
  terrain: () => t('typeBien.terrain'),
};

/** « Maison », « Flat »… dans la langue de l'écran. Le `type_bien_display`
 *  du serveur est rédigé en français : on ne l'affiche plus. */
export function libelleTypeBien(type?: string | null): string {
  return (type && TYPES_DE_BIEN[type]?.()) || t('typeBien.propriete');
}
