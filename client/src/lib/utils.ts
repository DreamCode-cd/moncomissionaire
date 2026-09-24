import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Vite fige cette valeur AU MOMENT DU BUILD, pas au démarrage : la définir
// dans docker-compose n'a aucun effet, il faut la passer en ARG au Dockerfile.
// Le repli précédent était une URL Replit morte codée en dur — les images
// étaient toutes cassées, sans la moindre erreur pour le signaler.
const DJANGO_MEDIA_URL = import.meta.env.VITE_DJANGO_API_URL ?? '';

if (!DJANGO_MEDIA_URL && import.meta.env.PROD) {
  throw new Error(
    "VITE_DJANGO_API_URL est absente du build de production. " +
      "Les images des biens seraient toutes cassées. " +
      "Passez-la en argument de build (voir Dockerfile).",
  );
}

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
