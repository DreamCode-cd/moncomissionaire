/**
 * Les erreurs de l'API, telles qu'un utilisateur doit les lire.
 *
 * Le serveur répond avec des messages précis, souvent champ par champ :
 * {"montant": ["Il ne reste que 350 $ à la charge du locataire."]}. Le site
 * affichait ce JSON tel quel dans ses messages d'erreur. Et une coupure de
 * réseau donnait « Failed to fetch », en anglais.
 *
 * Deux sortes d'erreurs, parce qu'elles n'appellent pas la même réponse :
 *
 * - ErreurReseau : le serveur n'a pas été joint. Rien n'a été enregistré ;
 *   l'utilisateur peut réessayer tel quel.
 * - ErreurApi : le serveur a répondu non. Le message dit pourquoi, et
 *   `champs` dit quoi corriger dans le formulaire.
 */

export class ErreurReseau extends Error {
  constructor(message = 'Pas de connexion au serveur. Vérifiez votre réseau, puis réessayez.') {
    super(message);
    this.name = 'ErreurReseau';
  }
}

export class ErreurApi extends Error {
  readonly statut: number;
  /** Premier message de chaque champ en erreur, prêt à poser sous le champ. */
  readonly champs: Record<string, string>;
  /** Ce que le serveur a dit sans viser un champ précis, s'il l'a dit. */
  readonly general: string | null;

  constructor(
    statut: number,
    message: string,
    champs: Record<string, string> = {},
    general: string | null = null,
  ) {
    super(message);
    this.name = 'ErreurApi';
    this.statut = statut;
    this.champs = champs;
    this.general = general;
  }
}

/** Libellés des champs dont le message du serveur serait ambigu seul
 *  (« Ce champ est obligatoire. » ne dit pas lequel). */
const LIBELLES: Record<string, string> = {
  titre: 'Titre',
  description: 'Description',
  prix_mensuel: 'Loyer',
  adresse: 'Adresse',
  ville: 'Ville',
  quartier: 'Quartier',
  commune: 'Commune',
  bailleur: 'Bailleur',
  garantie_mois: 'Garantie',
  frais_visite: 'Frais de visite',
  part_confrere_pourcent: 'Part du confrère',
  montant: 'Montant',
  date: 'Date',
  date_bail: 'Date du bail',
  date_reglement: 'Date',
  date_souhaitee: 'Date souhaitée',
  heure_souhaitee: 'Heure souhaitée',
  locataire_nom: 'Locataire',
  prospect_nom: 'Nom du client',
  email: 'Adresse e-mail',
  username: 'Nom d’utilisateur',
  password: 'Mot de passe',
  phone: 'Téléphone',
  nom: 'Nom',
  motif: 'Motif',
  note: 'Note',
  image: 'Photo',
  photos: 'Photos',
  pieces: 'Pièce',
};

/** Messages génériques de Django REST Framework, qui ne nomment pas le champ. */
const GENERIQUE = /^(ce champ|assurez-vous|un nombre|une valeur|la date|l’heure|l'heure|un entier|sélectionnez|type incorrect|clé primaire|valeur invalide|this field)/i;

const PAR_STATUT: Record<number, string> = {
  400: 'Certaines informations ne sont pas valides.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: 'Vous n’avez pas le droit de faire cette action.',
  404: 'Introuvable. L’élément a peut-être été supprimé ou déplacé.',
  405: 'Cette action n’est pas possible ici.',
  409: 'Cette action entre en conflit avec une autre. Rechargez la page.',
  413: 'Le fichier envoyé est trop lourd : 15 Mo au plus.',
  415: 'Ce format de fichier n’est pas accepté.',
  429: 'Trop de tentatives. Patientez une minute avant de réessayer.',
};

function premierTexte(valeur: unknown): string | null {
  if (typeof valeur === 'string') return valeur;
  if (Array.isArray(valeur)) {
    for (const element of valeur) {
      const texte = premierTexte(element);
      if (texte) return texte;
    }
  }
  if (valeur && typeof valeur === 'object') {
    for (const element of Object.values(valeur)) {
      const texte = premierTexte(element);
      if (texte) return texte;
    }
  }
  return null;
}

/** Transforme une réponse en erreur du serveur en ErreurApi lisible. */
export function erreurDepuisReponse(statut: number, corps: unknown): ErreurApi {
  if (statut >= 500) {
    // Une page d'erreur HTML de nginx ou de Render ne se montre pas.
    return new ErreurApi(
      statut,
      statut === 500
        ? 'Le serveur a rencontré un problème. Réessayez dans un instant ; si cela continue, prévenez l’équipe VillaGo.'
        : 'Le serveur ne répond pas pour le moment. Réessayez dans un instant.',
    );
  }

  const champs: Record<string, string> = {};
  let message: string | null = null;
  let general: string | null = null;

  if (typeof corps === 'string' && corps.trim() && !corps.trim().startsWith('<')) {
    message = corps.trim();
  } else if (corps && typeof corps === 'object' && !Array.isArray(corps)) {
    const donnees = corps as Record<string, unknown>;
    for (const cle of ['detail', 'error', 'message', 'non_field_errors']) {
      if (message === null && donnees[cle] !== undefined) message = premierTexte(donnees[cle]);
    }
    for (const [cle, valeur] of Object.entries(donnees)) {
      if (['detail', 'error', 'message', 'non_field_errors', 'code'].includes(cle)) continue;
      const texte = premierTexte(valeur);
      if (texte) champs[cle] = texte;
    }
    general = message;
    if (message === null) {
      const [cle, texte] = Object.entries(champs)[0] ?? [];
      if (texte) {
        message = GENERIQUE.test(texte) && LIBELLES[cle] ? `${LIBELLES[cle]} : ${texte}` : texte;
      }
    }
  } else if (Array.isArray(corps)) {
    message = premierTexte(corps);
  }

  return new ErreurApi(statut, message || PAR_STATUT[statut] || 'Une erreur est survenue.', champs, general);
}

/** Le message à montrer, quelle que soit l'erreur. */
export function messageErreur(erreur: unknown): string {
  if (erreur instanceof ErreurApi || erreur instanceof ErreurReseau) return erreur.message;
  if (erreur instanceof Error && erreur.message) return erreur.message;
  return 'Une erreur est survenue.';
}

/** Les messages par champ d'une erreur, vides si elle n'en porte pas. */
export function champsErreur(erreur: unknown): Record<string, string> {
  return erreur instanceof ErreurApi ? erreur.champs : {};
}

/** Faut-il réessayer automatiquement ? Seulement si le serveur n'a pas pu
 *  répondre : réessayer un « non » donnerait le même « non ». */
export function erreurPassagere(erreur: unknown): boolean {
  return erreur instanceof ErreurReseau || (erreur instanceof ErreurApi && erreur.statut >= 502);
}

/**
 * Pose sous chaque champ du formulaire le message que le serveur lui a
 * adressé. Renvoie ce qui ne correspond à aucun champ affiché, à montrer en
 * bulle ; null s'il ne reste rien à dire.
 */
export function poserErreursSurChamps<C extends string>(
  erreur: unknown,
  champsDuFormulaire: readonly C[],
  poser: (champ: C, message: string) => void,
): string | null {
  const champs = champsErreur(erreur);
  const restes: string[] = [];
  if (erreur instanceof ErreurApi && erreur.general) restes.push(erreur.general);
  let pose = false;
  for (const [champ, message] of Object.entries(champs)) {
    if ((champsDuFormulaire as readonly string[]).includes(champ)) {
      poser(champ as C, message);
      pose = true;
    } else {
      restes.push(message);
    }
  }
  if (restes.length) return restes.join(' ');
  return pose ? null : messageErreur(erreur);
}
