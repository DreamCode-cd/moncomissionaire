import { z } from "zod";

/** Devises acceptées pour un loyer. Le dollar domine la location à
 *  Kinshasa et Lubumbashi ; le franc sert les montants plus petits. */
export type Devise = 'USD' | 'CDF';

/** Rôles du produit. `agence` et `admin` existaient côté Django sans être
 *  déclarés ici : un administrateur voyait « admin » brut à l'écran. */
export type UserRole =
  | 'client'
  | 'proprietaire'
  | 'agence'
  | 'commissionnaire'
  | 'agent'
  | 'admin'
  /** L'équipe VillaGo : valide les annonces, traite les demandes des biens
   *  publiés par leur propriétaire. Ce rôle s'appelait « commissionnaire ». */
  | 'moderateur';

export interface UserList {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  /** Champ normalisé par le front. L'API, elle, envoie `user_type`. */
  role: UserRole;
  role_display: string;
  /** Tel que renvoyé par l'API. Voir lib/roles.ts pour la traduction. */
  user_type?: UserRole;
  user_type_display?: string;
  is_active?: boolean;
  is_available?: boolean;
  /** Présent sur la liste d'administration uniquement. */
  created_at?: string;
  phone: string;
  photo?: string;
  avatar?: string | null;
}

/** Ce que l'API publie d'un compte : ni téléphone ni e-mail. La mise en
 *  relation passe par une demande de visite, jamais par un appel direct. */
export interface ProfilPublic {
  id: number;
  full_name: string;
  avatar?: string | null;
  user_type: UserRole;
  user_type_display: string;
}

export interface UserProfile extends UserList {
  date_joined?: string;
  last_login?: string;
  user_type?: UserRole;
  address?: string;
  bio?: string;
  is_available?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TokenObtainPair {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  user?: UserProfile;
}

export interface TokenRefresh {
  refresh: string;
  access?: string;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'client' | 'proprietaire' | 'commissionnaire';
}

export type TypeBien = 'maison' | 'appartement' | 'studio' | 'villa' | 'duplex' | 'terrain';
export type StatutValidation = 'en_attente' | 'valide' | 'rejete';
export type StatutLocation = 'disponible' | 'en_visite' | 'loue' | 'indisponible';

export interface Photo {
  id: number;
  image: string;
  is_principale: boolean;
  ordre: number;
  created_at: string;
}

export interface VilleDetail {
  id: number;
  nom: string;
  pays?: string;
  /** Présentes sur /biens/villes/ uniquement, pas sur une ville imbriquée
   *  dans une annonce. */
  communes?: string[];
  nombre_biens?: number;
}

/** Régularité de l'eau. Une chaîne vide veut dire « non précisé ». */
export type Eau = '' | 'permanente' | 'intermittente' | 'forage' | 'aucune';
/** Régularité du courant. Une chaîne vide veut dire « non précisé ». */
export type Electricite = '' | 'stable' | 'delestage' | 'autonome' | 'aucune';

/** Loi n° 15/025 du 31 décembre 2015, article 18. */
export const GARANTIE_MOIS_MAX = 3;

/** Bailleur sans compte, du carnet d'un commissionnaire. Visible de lui seul. */
export interface Bailleur {
  id: number;
  nom: string;
  telephone: string;
  notes: string;
  nombre_biens: number;
  created_at: string;
  updated_at: string;
}

export interface BienList {
  id: number;
  titre: string;
  type_bien: TypeBien;
  type_bien_display: string;
  devise: Devise;
  devise_display?: string;
  devise_symbole?: string;
  prix_mensuel: string;
  /** Nombre de mois de loyer, trois au plus. */
  garantie_mois: number;
  /** Calculée par le serveur : loyer × garantie_mois. */
  garantie: string;
  superficie: string | null;
  nombre_chambres: number;
  nombre_salles_bain: number;
  ville: number | string;
  ville_nom?: string;
  ville_detail?: VilleDetail;
  commune: string;
  quartier: string;
  eau: Eau;
  eau_display: string;
  electricite: Electricite;
  electricite_display: string;
  statut_validation: StatutValidation;
  statut_validation_display: string;
  statut_location: StatutLocation;
  statut_location_display: string;
  /** Nul quand le bien est confié par un bailleur sans compte. */
  proprietaire: ProfilPublic | null;
  commissionnaire: number | null;
  commissionnaire_detail: ProfilPublic | null;
  photo_principale?: Photo | null;
  created_at: string;
}

export interface BienDetail extends BienList {
  description: string;
  nombre_pieces: number;
  /** Absents de la fiche publique : l'adresse exacte et le GPS ne sont
   *  donnés qu'à l'auteur de l'annonce, à la modération et à la visite. */
  adresse?: string;
  latitude?: string | null;
  longitude?: string | null;
  /** Renseignés pour le seul commissionnaire du bien. */
  bailleur?: number | null;
  bailleur_detail?: Bailleur | null;
  parking: boolean;
  jardin: boolean;
  meuble: boolean;
  climatisation: boolean;
  gardien: boolean;
  photos: Photo[];
  valide_par?: ProfilPublic | null;
  motif_rejet?: string;
  date_validation?: string;
  updated_at: string;
}

export interface BienCreate {
  titre: string;
  description: string;
  type_bien: TypeBien;
  devise: Devise;
  devise_display?: string;
  devise_symbole?: string;
  prix_mensuel: string;
  garantie_mois?: number;
  superficie?: string;
  bailleur?: number;
  nombre_chambres?: number;
  nombre_salles_bain?: number;
  nombre_pieces?: number;
  adresse: string;
  ville: string;
  quartier: string;
  commune?: string;
  latitude?: string;
  longitude?: string;
  eau?: Eau;
  electricite?: Electricite;
  parking?: boolean;
  jardin?: boolean;
  meuble?: boolean;
  climatisation?: boolean;
  gardien?: boolean;
  photo_principale_index?: number;
}

export interface AvisBien {
  id: number;
  bien: number;
  client: UserList;
  note: number;
  commentaire: string;
  created_at: string;
  updated_at: string;
}

export interface AvisBienCreate {
  bien: number;
  note: number;
  commentaire: string;
}

export interface AvisAgent {
  id: number;
  agent: UserList;
  client: UserList;
  visite: number;
  note: number;
  commentaire: string;
  created_at: string;
  updated_at: string;
}

export interface AvisAgentCreate {
  visite: number;
  note: number;
  commentaire: string;
}

export type StatutDemande = 'en_attente' | 'acceptee' | 'rejetee' | 'annulee';

export interface DemandeVisite {
  id: number;
  client: UserList;
  bien: number;
  bien_detail: BienList;
  date_souhaitee: string;
  heure_souhaitee: string;
  message: string;
  statut: StatutDemande;
  statut_display: string;
  traitee_par?: number;
  traitee_par_detail?: UserList;
  motif_rejet?: string;
  created_at: string;
}

export interface DemandeVisiteCreate {
  bien: number;
  date_souhaitee: string;
  heure_souhaitee: string;
  message?: string;
}

export type StatutVisite = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';

export interface Visite {
  id: number;
  demande: number;
  demande_detail?: DemandeVisite;
  agent?: number;
  agent_detail?: UserList;
  commissionnaire?: number;
  commissionnaire_detail?: UserList;
  date_visite: string;
  heure_visite: string;
  statut: StatutVisite;
  statut_display: string;
  notes_commissionnaire?: string;
  rapport?: string;
  created_at: string;
  updated_at: string;
}

export interface VisiteCreate {
  demande_visite: number;
  agent?: number;
  date_visite: string;
  heure_visite: string;
  notes_commissionnaire?: string;
}

export interface DemandeVisiteTraitement {
  statut: 'acceptee' | 'rejetee';
  motif_rejet?: string;
}

export interface VisiteAssignation {
  demande: number;
  agent?: number;
  date_visite: string;
  heure_visite: string;
}

export interface VisiteUpdate {
  statut?: StatutVisite | 'reportee';
  notes_commissionnaire?: string;
}

export interface VisiteReassignment {
  agent: number;
}

export type EtatGeneral = 'tres_interessant' | 'interessant' | 'moyen' | 'peu_interessant' | 'non_recommande';

export interface RapportVisite {
  id: number;
  visite: number;
  agent?: number;
  agent_detail?: UserList;
  etat_general: EtatGeneral;
  etat_general_display: string;
  conformite_annonce: boolean;
  etat_electricite?: string;
  etat_plomberie?: string;
  etat_peinture?: string;
  etat_sols?: string;
  etat_fenetres?: string;
  etat_portes?: string;
  accessibilite?: string;
  environnement?: string;
  points_positifs?: string;
  points_negatifs?: string;
  recommandations?: string;
  commentaires?: string;
  client_interesse: boolean;
  created_at: string;
  updated_at: string;
}

export interface RapportVisiteCreate {
  etat_general: EtatGeneral;
  conformite_annonce?: boolean;
  etat_electricite?: string;
  etat_plomberie?: string;
  etat_peinture?: string;
  etat_sols?: string;
  etat_fenetres?: string;
  etat_portes?: string;
  accessibilite?: string;
  environnement?: string;
  points_positifs?: string;
  points_negatifs?: string;
  recommandations?: string;
  commentaires?: string;
  client_interesse?: boolean;
}

export interface Message {
  id: number;
  chatroom: number;
  sender: number;
  sender_detail: UserList;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: number;
  demande_visite: number;
  client: number;
  client_detail: UserList;
  commissionnaire?: number;
  commissionnaire_detail?: UserList;
  agent?: number;
  agent_detail?: UserList;
  is_active: boolean;
  last_message?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatRoomDetail extends ChatRoom {
  messages: Message[];
}

export type NotificationType = 
  | 'bien_valide' 
  | 'bien_rejete' 
  | 'nouvelle_demande' 
  | 'demande_acceptee' 
  | 'demande_rejetee' 
  | 'visite_assignee' 
  | 'visite_terminee' 
  | 'nouveau_message' 
  | 'rapport_disponible' 
  | 'agent_ajoute_chat';

export interface Notification {
  id: number;
  type_notification: NotificationType;
  type_display: string;
  titre: string;
  message: string;
  is_read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const loginSchema = z.object({
  login: z.string().min(1, "Nom d'utilisateur ou email requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Minimum 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
  password2: z.string().min(6, "Minimum 6 caractères"),
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  address: z.string().min(3, "Adresse requise"),
  user_type: z.enum(['client', 'proprietaire', 'commissionnaire']),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions d'utilisation",
  }),
}).refine((data) => data.password === data.password2, {
  message: "Les mots de passe ne correspondent pas",
  path: ["password2"],
});

export const bienCreateSchema = z.object({
  titre: z.string().min(5, "Minimum 5 caractères"),
  description: z.string().min(20, "Minimum 20 caractères"),
  type_bien: z.enum(['maison', 'appartement', 'studio', 'villa', 'duplex', 'terrain']),
  devise: z.enum(['USD', 'CDF']).default('USD'),
  prix_mensuel: z.string().min(1, "Prix requis"),
  garantie_mois: z.coerce.number().int().min(0).max(GARANTIE_MOIS_MAX,
    "Trois mois de loyer au plus (loi n° 15/025, article 18)").default(3),
  // Facultative : un bailleur ne connaît presque jamais la surface de sa maison.
  superficie: z.string().optional(),
  bailleur: z.string().optional(),
  nombre_chambres: z.number().min(0).optional(),
  nombre_salles_bain: z.number().min(0).optional(),
  nombre_pieces: z.number().min(0).optional(),
  adresse: z.string().min(5, "Adresse requise"),
  ville: z.string().min(1, "Ville requise"),
  quartier: z.string().min(2, "Quartier requis"),
  commune: z.string().optional(),
  eau: z.enum(['', 'permanente', 'intermittente', 'forage', 'aucune']).default(''),
  electricite: z.enum(['', 'stable', 'delestage', 'autonome', 'aucune']).default(''),
  parking: z.boolean().optional(),
  jardin: z.boolean().optional(),
  meuble: z.boolean().optional(),
  climatisation: z.boolean().optional(),
  gardien: z.boolean().optional(),
});

export const demandeVisiteSchema = z.object({
  bien: z.number(),
  date_souhaitee: z.string().min(1, "Date requise"),
  heure_souhaitee: z.string().min(1, "Heure requise"),
  message: z.string().optional(),
});

export const avisSchema = z.object({
  note: z.number().min(1).max(5),
  commentaire: z.string().optional().default(""),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BienCreateInput = z.infer<typeof bienCreateSchema>;
export type DemandeVisiteInput = z.infer<typeof demandeVisiteSchema>;
export type AvisInput = z.infer<typeof avisSchema>;
