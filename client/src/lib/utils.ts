import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DJANGO_MEDIA_URL = import.meta.env.VITE_DJANGO_API_URL || 'https://c66a0321-7dd3-4925-af55-66ab9f4fad15-00-2q1pqgvjvdlvv.kirk.replit.dev';

export function getDjangoImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${DJANGO_MEDIA_URL}${imagePath}`;
}

export function getVilleName(ville: string | number | { id?: number; nom?: string } | null | undefined, villeNom?: string, villeDetail?: { id?: number; nom?: string } | null): string {
  if (villeNom) return villeNom;
  if (villeDetail?.nom) return villeDetail.nom;
  if (!ville) return '';
  if (typeof ville === 'string') return ville;
  if (typeof ville === 'number') return '';
  return ville.nom || '';
}

export function getVilleId(ville: string | { id?: number; nom?: string } | null | undefined): string {
  if (!ville) return '';
  if (typeof ville === 'string') return ville;
  return ville.id ? String(ville.id) : '';
}
