import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

/**
 * Un bandeau quand le téléphone perd le réseau, ce qui arrive plusieurs fois
 * par jour à Lubumbashi. Sans lui, les boutons semblent ne rien faire et les
 * listes ne se mettent plus à jour, sans explication. Au retour du réseau, les
 * données sont rechargées.
 */
export function BandeauHorsLigne() {
  const [horsLigne, setHorsLigne] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const coupe = () => setHorsLigne(true);
    const revenu = () => {
      setHorsLigne(false);
      void queryClient.invalidateQueries();
    };
    window.addEventListener('offline', coupe);
    window.addEventListener('online', revenu);
    return () => {
      window.removeEventListener('offline', coupe);
      window.removeEventListener('online', revenu);
    };
  }, []);

  if (!horsLigne) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-statut-attente-fond px-4 py-2 text-sm text-statut-attente"
      data-testid="bandeau-hors-ligne"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      Pas de connexion. Ce qui est affiché peut dater ; rien ne sera envoyé avant le retour du réseau.
    </div>
  );
}
