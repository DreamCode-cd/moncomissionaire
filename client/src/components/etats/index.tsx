import { CircleAlert, Inbox, LoaderCircle, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * États d'écran partagés : chargement, vide, erreur, hors ligne.
 *
 * Chaque page réinventait les siens. Douze formulations différentes pour un
 * état vide, treize fichiers en squelettes contre deux en indicateur tournant,
 * et aucune page ne disait ce qu'il fallait faire ensuite.
 *
 * Deux principes, tirés de la pratique courante en conception d'interface :
 *
 *   1. **Un état vide n'est pas une absence, c'est un message.** Il dit
 *      pourquoi c'est vide et ce qu'on peut faire — sinon l'utilisateur
 *      conclut que l'application est cassée.
 *   2. **Une action principale par état.** Solide et contrastée ; tout le
 *      reste reste discret. Deux boutons de même poids ne guident personne.
 */

interface EtatProps {
  titre: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function Cadre({
  icone,
  titre,
  description,
  action,
  className,
  tonIcone,
}: EtatProps & { icone: ReactNode; tonIcone: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <div className={cn('rounded-full p-3', tonIcone)}>{icone}</div>
      <p className="text-base font-semibold text-foreground text-balance">{titre}</p>
      {description ? (
        <p className="max-w-prose text-sm text-muted-foreground text-balance">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Rien à afficher, et c'est normal. */
export function EtatVide({ titre, description, action, className }: EtatProps) {
  return (
    <Cadre
      icone={<Inbox className="h-6 w-6 text-statut-neutre" aria-hidden />}
      tonIcone="bg-statut-neutre-fond"
      titre={titre}
      description={description}
      action={action}
      className={className}
    />
  );
}

/** Quelque chose a échoué, et ce n'est pas la faute de l'utilisateur. */
export function EtatErreur({
  titre = 'Impossible d’afficher cette page',
  description,
  onReessayer,
  className,
}: Partial<EtatProps> & { onReessayer?: () => void }) {
  return (
    <Cadre
      icone={<CircleAlert className="h-6 w-6 text-statut-defavorable" aria-hidden />}
      tonIcone="bg-statut-defavorable-fond"
      titre={titre}
      description={description}
      action={
        onReessayer ? (
          <Button onClick={onReessayer} data-testid="button-reessayer">
            Réessayer
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}

/** Le réseau a coupé. Dire ce qui reste utilisable vaut mieux que le silence. */
export function EtatHorsLigne({
  donneesEnCache = false,
  onReessayer,
  className,
}: {
  donneesEnCache?: boolean;
  onReessayer?: () => void;
  className?: string;
}) {
  return (
    <Cadre
      icone={<WifiOff className="h-6 w-6 text-statut-attente" aria-hidden />}
      tonIcone="bg-statut-attente-fond"
      titre="Pas de connexion"
      description={
        donneesEnCache
          ? 'Voici les dernières données enregistrées. Elles se mettront à jour dès le retour du réseau.'
          : 'Vérifiez votre connexion. Les données s’afficheront dès qu’elle sera rétablie.'
      }
      action={
        onReessayer ? (
          <Button variant="outline" onClick={onReessayer}>
            Réessayer
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}

/**
 * Chargement.
 *
 * Préférer un squelette quand la forme du contenu est connue : il évite le
 * saut de mise en page qui donne l'impression d'une page instable. L'indicateur
 * tournant ne sert que lorsque la forme est imprévisible.
 */
export function EtatChargement({
  texte = 'Chargement…',
  className,
}: {
  texte?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{texte}</p>
    </div>
  );
}
