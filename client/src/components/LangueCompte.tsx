/**
 * La langue de l'écran et celle du compte restent d'accord.
 *
 * - À la connexion, le site adopte la langue du compte : c'est celle que la
 *   personne a choisie, sur ce poste ou sur un autre.
 * - Quand elle change de langue, connectée, le compte suit : le serveur lui
 *   écrira désormais dans cette langue (notifications, push, e-mails).
 */

import { useEffect, useRef } from 'react';
import { Languages } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { adopterLangue, LANGUES, t, useLangue, type Langue } from '@/i18n';

export function SynchroLangueCompte() {
  const { user } = useAuth();
  const { changerLangue } = useLangue();
  const dejaAdoptee = useRef<number | null>(null);

  useEffect(() => {
    // Une fois par compte : ensuite, c'est le sélecteur qui commande.
    if (!user || dejaAdoptee.current === user.id) return;
    dejaAdoptee.current = user.id;
    adopterLangue(user.langue, changerLangue);
  }, [user, changerLangue]);

  return null;
}

/** Changer de langue, et l'enregistrer sur le compte si l'on est connecté. */
export function useChoisirLangue() {
  const { user, updateProfile } = useAuth();
  const { langue, changerLangue } = useLangue();

  return {
    langue,
    choisir: (nouvelle: Langue) => {
      if (nouvelle === langue) return;
      changerLangue(nouvelle);
      if (user && user.langue !== nouvelle) {
        // Sans réseau, l'écran change quand même ; le compte sera mis à jour
        // au prochain changement.
        updateProfile({ langue: nouvelle }).catch(() => {});
      }
    },
  };
}

/** Bouton « English » / « Français » : propose l'autre langue, dans sa
 *  propre langue — quelqu'un qui ne lit pas la langue affichée doit pouvoir
 *  le trouver. */
export function SelecteurLangue({ className = '' }: { className?: string }) {
  const { langue, choisir } = useChoisirLangue();
  const autre = LANGUES.find((l) => l.code !== langue)!;
  return (
    <button
      type="button"
      onClick={() => choisir(autre.code)}
      lang={autre.code}
      aria-label={t('langue.changer', { langue: autre.nom })}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground ${className}`}
      data-testid="button-langue"
    >
      <Languages className="h-4 w-4" aria-hidden />
      {autre.nom}
    </button>
  );
}
