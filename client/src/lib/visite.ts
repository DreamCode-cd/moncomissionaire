import type { Visite } from '@shared/schema';
import { getVilleName } from '@/lib/utils';

export interface LieuVisite {
  /** Rue et numéro, vide si l'API ne les envoie pas à ce compte. */
  adresse: string;
  /** « Quartier, commune, ville » : ce qu'on peut dire sans l'adresse. */
  secteur: string;
  latitude: number | null;
  longitude: number | null;
}

function nombre(valeur: string | number | null | undefined): number | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const n = typeof valeur === 'number' ? valeur : parseFloat(valeur);
  return Number.isFinite(n) ? n : null;
}

/** Où a lieu une visite.
 *
 *  L'adresse exacte et la position arrivent dans `visite.localisation`, que
 *  l'API réserve à l'agent affecté et au gestionnaire de la demande. Le
 *  `bien_detail` d'une visite est la version publique de l'annonce : il
 *  s'arrête au quartier, et sa `ville` est un identifiant. Lire l'adresse
 *  dans `bien_detail` donnait un écran sans adresse et une ville « 1 ».
 */
export function lieuVisite(visite: Visite): LieuVisite {
  const loc = visite.localisation;
  const bien = visite.demande_detail?.bien_detail;
  const ville = loc?.ville || getVilleName(bien?.ville, bien?.ville_nom, bien?.ville_detail);
  const secteur = [loc?.quartier || bien?.quartier, loc?.commune || bien?.commune, ville]
    .filter(Boolean)
    .join(', ');
  return {
    adresse: loc?.adresse?.trim() ?? '',
    secteur,
    latitude: nombre(loc?.latitude),
    longitude: nombre(loc?.longitude),
  };
}
