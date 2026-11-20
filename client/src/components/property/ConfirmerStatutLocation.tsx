import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { t } from '@/i18n';

/** Ces statuts sortent la maison des annonces : on confirme, comme sur le mobile. */
const STATUTS_QUI_RETIRENT: Record<string, () => string> = {
  loue: () => t('statutLocation.loue'),
  indisponible: () => t('statutLocation.indisponible'),
};

interface BienConcerne {
  id: number;
  titre: string;
  statut_location?: string | null;
}

/**
 * Changer le statut de location depuis une liste. Un choix partait aussitôt :
 * un mauvais clic sortait une maison des annonces sans prévenir. « Loué » et
 * « Indisponible » demandent donc confirmation ; « Disponible » et « En
 * visite » partent tout de suite, ils remettent la maison en ligne.
 *
 * `choisir` se branche sur `onValueChange` ; `dialogue` se rend une fois.
 */
export function useConfirmerStatutLocation(changer: (id: number, statut: string) => void) {
  const [enAttente, setEnAttente] = useState<{ bien: BienConcerne; statut: string } | null>(null);

  const choisir = (bien: BienConcerne, statut: string) => {
    if (statut === bien.statut_location) return;
    if (statut in STATUTS_QUI_RETIRENT) setEnAttente({ bien, statut });
    else changer(bien.id, statut);
  };

  const libelle = enAttente ? STATUTS_QUI_RETIRENT[enAttente.statut]() : '';
  const dialogue = (
    <AlertDialog open={!!enAttente} onOpenChange={(ouvert) => !ouvert && setEnAttente(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('statutLocation.marquerComme', { titre: enAttente?.bien.titre, statut: libelle })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('statutLocation.sortDesAnnonces')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('statutLocation.garderEnLigne')}</AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirmer-statut-location"
            onClick={() => {
              if (enAttente) changer(enAttente.bien.id, enAttente.statut);
              setEnAttente(null);
            }}
          >
            {t('statutLocation.oui', { statut: libelle })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { choisir, dialogue };
}
