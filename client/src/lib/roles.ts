import type { UserRole } from '@shared/schema';

/**
 * Rôles du produit — source unique.
 *
 * Le libellé français d'un rôle était écrit dans une table locale de
 * `AuthContext`, qui ignorait `agence` et `admin` : ces deux rôles
 * s'affichaient donc en brut à l'écran — « agence », « admin ».
 *
 * L'API renvoie `user_type` et `user_type_display` ; le front parle de `role`.
 * La traduction se fait à un seul endroit, ici.
 */

const LIBELLES: Record<UserRole, string> = {
  client: 'Client',
  proprietaire: 'Propriétaire',
  agence: 'Agence',
  commissionnaire: 'Commissionnaire',
  agent: 'Agent',
  admin: 'Administrateur',
  moderateur: 'Modérateur VillaGo',
};

export const ROLES = Object.entries(LIBELLES).map(([valeur, libelle]) => ({
  valeur: valeur as UserRole,
  libelle,
}));

export function estUnRole(valeur?: string | null): valeur is UserRole {
  return Boolean(valeur && valeur in LIBELLES);
}

/**
 * Libellé lisible d'un rôle.
 *
 * `libelleServeur` — le champ `user_type_display` de l'API — fait foi quand il
 * existe : le jour où un libellé change côté Django, le front suit sans qu'on
 * ait à y penser.
 */
export function libelleRole(
  valeur?: string | null,
  libelleServeur?: string | null,
): string {
  if (libelleServeur) return libelleServeur;
  return estUnRole(valeur) ? LIBELLES[valeur] : (valeur ?? '—');
}
