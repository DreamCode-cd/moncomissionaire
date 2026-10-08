/* Clés de cache et petites aides partagées par les écrans d'argent du
 * commissionnaire. Une seule clé par liste : invalider l'une après un
 * règlement doit rafraîchir tous les écrans qui la montrent. */

export const CLE_COMMISSIONS = ['/api/v1/commissions/'];
export const CLE_PARTAGES = ['/api/v1/biens/partages/'];
export const CLE_PRESENTATIONS = ['/api/v1/visites/commissionnaire/presentations/'];
export const CLE_DEMANDES = ['/api/v1/visites/commissionnaire/demandes/'];
export const CLE_VISITES = ['/api/v1/visites/commissionnaire/visites/'];
export const CLE_BIENS = ['/api/v1/biens/commissionnaire/'];

export function messageErreur(erreur: unknown) {
  return erreur instanceof Error ? erreur.message : 'Une erreur est survenue';
}

/** Date du jour au format des champs `date` : AAAA-MM-JJ, heure locale. */
export function aujourdhui(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${jj}`;
}
