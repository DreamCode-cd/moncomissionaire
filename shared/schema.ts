import { z } from "zod";

export type UserRole = 'client' | 'proprietaire' | 'commissionnaire' | 'agent';

export interface UserList {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: UserRole;
  role_display: string;
  phone: string;
  photo?: string;
  avatar?: string | null;
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
  role: 'client' | 'proprietaire';
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
  code_postal?: string;
  pays?: string;
  nombre_biens?: number;
}

export interface BienList {
  id: number;
  titre: string;
  type_bien: TypeBien;
  type_bien_display: string;
  prix_mensuel: string;
  garantie: string;
  superficie: string;
  nombre_chambres: number;
  nombre_salles_bain: number;
  ville: number | string;
  ville_nom?: string;
  ville_detail?: VilleDetail;
  quartier: string;
  statut_validation: StatutValidation;
  statut_validation_display: string;
  statut_location: StatutLocation;
  statut_location_display: string;
  proprietaire: UserList;
  photo_principale?: Photo | null;
  latitude?: string;
  longitude?: string;
  created_at: string;
}

export interface BienDetail extends BienList {
  description: string;
  nombre_pieces: number;
  adresse: string;
  commune: string;
  latitude?: string;
  longitude?: string;
  eau_courante: boolean;
  electricite: boolean;
  parking: boolean;
  jardin: boolean;
  meuble: boolean;
  climatisation: boolean;
  gardien: boolean;
  photos: Photo[];
  valide_par?: UserList;
  motif_rejet?: string;
  date_validation?: string;
  updated_at: string;
}

export interface BienCreate {
  titre: string;
  description: string;
  type_bien: TypeBien;
  prix_mensuel: string;
  garantie?: string;
  superficie: string;
  nombre_chambres?: number;
  nombre_salles_bain?: number;
  nombre_pieces?: number;
  adresse: string;
  ville: string;
  quartier: string;
  commune?: string;
  latitude?: string;
  longitude?: string;
  eau_courante?: boolean;
  electricite?: boolean;
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
  user_type: z.enum(['client', 'proprietaire']),
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
  prix_mensuel: z.string().min(1, "Prix requis"),
  garantie: z.string().optional(),
  superficie: z.string().min(1, "Superficie requise"),
  nombre_chambres: z.number().min(0).optional(),
  nombre_salles_bain: z.number().min(0).optional(),
  nombre_pieces: z.number().min(0).optional(),
  adresse: z.string().min(5, "Adresse requise"),
  ville: z.string().min(1, "Ville requise"),
  quartier: z.string().min(2, "Quartier requis"),
  commune: z.string().optional(),
  eau_courante: z.boolean().optional(),
  electricite: z.boolean().optional(),
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
