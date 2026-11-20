import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Ce qu'on montre quand une annonce n'a pas encore de photo.
 *
 * Elle affichait une photo d'illustration choisie selon le type de bien — une
 * villa méditerranéenne, une maison en bois de Nouvelle-Angleterre — comme si
 * c'était la maison. Pour un client, c'est une promesse fausse ; pour la
 * plateforme, une perte de confiance le jour de la visite. Une vignette
 * honnête vaut mieux qu'une belle image qui ment.
 */
export function VignetteSansPhoto({ className, compacte = false }: { className?: string; compacte?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground',
        className,
      )}
      role="img"
      aria-label={t('vignette.pasDePhoto')}
    >
      <ImageOff className={compacte ? 'h-5 w-5' : 'h-8 w-8'} aria-hidden />
      {!compacte && <span className="text-xs">{t('vignette.pasDePhoto')}</span>}
    </div>
  );
}
