import { z } from "zod";

// User types
export const userRoleEnum = z.enum(["admin", "client", "proprietaire"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export interface UserPublic {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  profile_picture?: string;
  role: UserRole;
  bio?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface User extends UserPublic {
  is_active: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_picture?: string;
  role: UserRole;
  bio?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Le nom d'utilisateur est requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit avoir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit avoir au moins 6 caractères"),
  password_confirm: z.string(),
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  phone: z.string().optional(),
  role: userRoleEnum.default("client"),
}).refine((data) => data.password === data.password_confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["password_confirm"],
});
export type RegisterInput = z.infer<typeof registerSchema>;

export interface AuthTokens {
  access: string;
  refresh: string;
}

// Property types
export const propertyTypeEnum = z.enum(["villa", "appartement", "studio", "maison", "duplex", "loft", "penthouse"]);
export type PropertyType = z.infer<typeof propertyTypeEnum>;

export const propertyStatusEnum = z.enum(["disponible", "louee", "en_attente", "indisponible"]);
export type PropertyStatus = z.infer<typeof propertyStatusEnum>;

export interface PropertyImage {
  id: number;
  image: string;
  caption?: string;
  is_main: boolean;
  order: number;
  created_at: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon?: string;
  category?: string;
}

export interface PropertyList {
  id: number;
  owner: UserPublic;
  title: string;
  property_type: PropertyType;
  property_type_display: string;
  status: PropertyStatus;
  status_display: string;
  price_per_month: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  country: string;
  main_image?: PropertyImage;
  is_furnished: boolean;
  has_parking: boolean;
  has_garden: boolean;
  has_pool: boolean;
  average_rating?: string;
  total_reviews?: string;
  available_from?: string;
  created_at: string;
}

export interface PropertyDetail extends PropertyList {
  description: string;
  deposit?: string;
  floors: number;
  address: string;
  postal_code: string;
  latitude?: string;
  longitude?: string;
  amenities: Amenity[];
  pets_allowed: boolean;
  min_lease_duration: number;
  max_lease_duration: number;
  is_active: boolean;
  views_count: number;
  images: PropertyImage[];
  updated_at: string;
}

// Property create/update schema
export const propertyCreateSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().min(1, "La description est requise"),
  property_type: propertyTypeEnum.default("appartement"),
  status: propertyStatusEnum.default("disponible"),
  price_per_month: z.string().min(1, "Le prix est requis"),
  deposit: z.string().optional(),
  surface: z.number().min(1, "La surface est requise"),
  bedrooms: z.number().min(0).default(1),
  bathrooms: z.number().min(0).default(1),
  floors: z.number().min(0).default(0),
  address: z.string().min(1, "L'adresse est requise"),
  city: z.string().min(1, "La ville est requise"),
  postal_code: z.string().min(1, "Le code postal est requis"),
  country: z.string().default("France"),
  amenity_ids: z.array(z.number()).optional(),
  is_furnished: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  has_garden: z.boolean().default(false),
  has_pool: z.boolean().default(false),
  pets_allowed: z.boolean().default(false),
  min_lease_duration: z.number().min(1).default(1),
  max_lease_duration: z.number().min(1).default(12),
  available_from: z.string().optional(),
});
export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;

// Booking types
export const bookingStatusEnum = z.enum(["en_attente", "confirme", "refuse", "annule", "en_cours", "termine"]);
export type BookingStatus = z.infer<typeof bookingStatusEnum>;

export interface RentalBooking {
  id: number;
  house: number;
  house_details: PropertyList;
  client: number;
  client_details: UserPublic;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  status_display: string;
  monthly_rent: string;
  deposit_amount: string;
  total_amount: string;
  duration_months: string;
  message?: string;
  owner_response?: string;
  special_conditions?: string;
  created_at: string;
  updated_at: string;
}

export const rentalBookingCreateSchema = z.object({
  house: z.number(),
  start_date: z.string().min(1, "La date de début est requise"),
  end_date: z.string().min(1, "La date de fin est requise"),
  message: z.string().optional(),
});
export type RentalBookingCreateInput = z.infer<typeof rentalBookingCreateSchema>;

export interface VisitBooking {
  id: number;
  house: number;
  house_details: PropertyList;
  client: number;
  client_details: UserPublic;
  visit_date: string;
  visit_time: string;
  status: BookingStatus;
  status_display: string;
  message?: string;
  owner_response?: string;
  created_at: string;
  updated_at: string;
}

export const visitBookingCreateSchema = z.object({
  house: z.number(),
  visit_date: z.string().min(1, "La date de visite est requise"),
  visit_time: z.string().min(1, "L'heure de visite est requise"),
  message: z.string().optional(),
});
export type VisitBookingCreateInput = z.infer<typeof visitBookingCreateSchema>;

// Availability types
export interface OwnerAvailability {
  id: number;
  day_of_week: number;
  day_of_week_display: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export const availabilityCreateSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, "L'heure de début est requise"),
  end_time: z.string().min(1, "L'heure de fin est requise"),
  is_active: z.boolean().default(true),
});
export type AvailabilityCreateInput = z.infer<typeof availabilityCreateSchema>;

// Review types
export interface PropertyReview {
  id: number;
  house: number;
  house_details: PropertyList;
  client: number;
  client_details: UserPublic;
  rental_booking?: number;
  rating: number;
  comment: string;
  cleanliness_rating?: number;
  location_rating?: number;
  value_rating?: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export const propertyReviewCreateSchema = z.object({
  house: z.number(),
  rental_booking: z.number().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, "Le commentaire est requis"),
  cleanliness_rating: z.number().min(1).max(5).optional(),
  location_rating: z.number().min(1).max(5).optional(),
  value_rating: z.number().min(1).max(5).optional(),
});
export type PropertyReviewCreateInput = z.infer<typeof propertyReviewCreateSchema>;

export interface OwnerReview {
  id: number;
  owner: number;
  owner_details: UserPublic;
  client: number;
  client_details: UserPublic;
  rental_booking?: number;
  rating: number;
  comment: string;
  communication_rating?: number;
  responsiveness_rating?: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Search/Filter types
export interface PropertyFilters {
  property_type?: PropertyType;
  status?: PropertyStatus;
  city?: string;
  country?: string;
  bedrooms__gte?: number;
  bedrooms__lte?: number;
  bathrooms__gte?: number;
  bathrooms__lte?: number;
  price_per_month__gte?: number;
  price_per_month__lte?: number;
  surface__gte?: number;
  surface__lte?: number;
  is_furnished?: boolean;
  has_parking?: boolean;
  has_garden?: boolean;
  has_pool?: boolean;
  pets_allowed?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
}

// API Configuration
export const API_BASE_URL = "https://503ea819-c717-40a8-96f7-c18f9b8757a3-00-2fupo50g28wxz.worf.replit.dev/api";

// Change password schema
export const changePasswordSchema = z.object({
  old_password: z.string().min(1, "L'ancien mot de passe est requis"),
  new_password: z.string().min(6, "Le nouveau mot de passe doit avoir au moins 6 caractères"),
  new_password_confirm: z.string().min(1, "Veuillez confirmer le nouveau mot de passe"),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: "Les nouveaux mots de passe ne correspondent pas",
  path: ["new_password_confirm"],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Profile update schema
export const profileUpdateSchema = z.object({
  email: z.string().email("Email invalide").optional(),
  first_name: z.string().min(1, "Le prénom est requis").optional(),
  last_name: z.string().min(1, "Le nom est requis").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// Owner review create schema
export const ownerReviewCreateSchema = z.object({
  owner: z.number(),
  rental_booking: z.number().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, "Le commentaire est requis"),
  communication_rating: z.number().min(1).max(5).optional(),
  responsiveness_rating: z.number().min(1).max(5).optional(),
});
export type OwnerReviewCreateInput = z.infer<typeof ownerReviewCreateSchema>;

// Local storage keys
export const AUTH_TOKEN_KEY = "villago_auth_tokens";
export const USER_KEY = "villago_user";
