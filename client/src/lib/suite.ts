/**
 * Revenir là où l'on était après la connexion ou l'inscription.
 *
 * `/login?suite=/property/12?visite=1` : une fois connecté, on retourne sur la
 * fiche, formulaire de visite rouvert. Sans cela, le visiteur qui demandait une
 * visite atterrissait sur l'accueil et sa demande était perdue.
 */

/** La page demandée par `?suite=`, si c'est bien un chemin de ce site :
 *  « //exemple.com » ou « https://… » renverraient vers un autre site. */
export function pageDeSuite(recherche: string = window.location.search): string | null {
  const suite = new URLSearchParams(recherche).get('suite');
  return suite && suite.startsWith('/') && !suite.startsWith('//') ? suite : null;
}

/** `/login` + la page où revenir, prête pour `setLocation`. */
export function versConnexion(suite: string, page: '/login' | '/register' = '/login'): string {
  return `${page}?suite=${encodeURIComponent(suite)}`;
}

// --- Brouillon de demande de visite ------------------------------------------
//
// Gardé le temps de se connecter, dans l'onglet seulement. Rien de sensible :
// une date, une heure, un message. Le stockage peut être refusé (navigation
// privée) : on perd alors le brouillon, pas la page.

export interface BrouillonVisite {
  date: string;
  heure: string;
  message: string;
}

const cle = (bienId: string) => `villago:brouillon-visite:${bienId}`;

export function garderBrouillonVisite(bienId: string, brouillon: BrouillonVisite): void {
  try {
    sessionStorage.setItem(cle(bienId), JSON.stringify(brouillon));
  } catch {
    // Stockage indisponible : le formulaire se rouvrira vide.
  }
}

/** Le brouillon gardé pour ce bien. Il reste en place après lecture : la
 *  connexion recharge la page juste après le retour, et un brouillon effacé
 *  à la première lecture était perdu au rechargement. */
export function reprendreBrouillonVisite(bienId: string): BrouillonVisite | null {
  try {
    const brut = sessionStorage.getItem(cle(bienId));
    return brut ? (JSON.parse(brut) as BrouillonVisite) : null;
  } catch {
    return null;
  }
}

/** À appeler quand la demande est partie ou que la personne y renonce. */
export function oublierBrouillonVisite(bienId: string): void {
  try {
    sessionStorage.removeItem(cle(bienId));
  } catch {
    // Rien à oublier.
  }
}
