import { useState } from 'react';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { messageErreur } from '@/lib/erreurs';
import { debloquer, useBlocages } from '@/lib/moderation';
import { t } from '@/i18n';

/**
 * Les personnes que j'ai bloquées, dans mon profil.
 *
 * Rien ne s'affiche tant que je n'ai bloqué personne : une carte vide
 * n'apprendrait rien. Débloquer fait réapparaître tous leurs messages, y
 * compris ceux envoyés pendant le blocage : le serveur les a gardés.
 */
export function PersonnesBloquees() {
  const { toast } = useToast();
  const { data: blocages } = useBlocages(true);
  const [enCours, setEnCours] = useState<number | null>(null);

  if (!blocages?.length) return null;

  const retirer = async (id: number) => {
    setEnCours(id);
    try {
      await debloquer(id);
    } catch (e) {
      toast({ title: t('bloques.impossible'), description: messageErreur(e), variant: 'destructive' });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <Card className="mb-6" data-testid="carte-personnes-bloquees">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Ban className="h-5 w-5" aria-hidden />
          {t('bloques.titre')}
        </CardTitle>
        <CardDescription>{t('bloques.explication')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {blocages.map((b) => (
          <div key={b.utilisateur} className="flex items-center justify-between gap-3 min-h-11">
            <span className="font-medium truncate">{b.utilisateur_detail?.full_name ?? '—'}</span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={enCours === b.utilisateur}
              onClick={() => void retirer(b.utilisateur)}
              data-testid={`debloquer-${b.utilisateur}`}
            >
              {t('bloques.debloquer')}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
