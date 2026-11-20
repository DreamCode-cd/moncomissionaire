import type { UserRole } from '@shared/schema';
import { t } from '@/i18n';

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
  get client() { return t('role.client'); },
  get proprietaire() { return t('role.proprietaire'); },
  get agence() { return t('role.agence'); },
  get commissionnaire() { return t('role.commissionnaire'); },
  get agent() { return t('role.agent'); },
  get admin() { return t('role.admin'); },
  get moderateur() { return t('role.moderateur'); },
};

// Getter : le libellé se lit au moment de l'affichage, dans la langue active.
export const ROLES = (Object.keys(LIBELLES) as UserRole[]).map((valeur) => ({
  valeur,
  get libelle() {
    return LIBELLES[valeur];
  },
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
  // Le libellé du serveur est en français : seulement pour un rôle inconnu.
  if (estUnRole(valeur)) return LIBELLES[valeur];
  return libelleServeur || valeur || '—';
}
