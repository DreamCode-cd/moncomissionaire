import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { poserErreursSurChamps } from '@/lib/erreurs';
import { t } from '@/i18n';

const CHEMIN = '/supprimer-mon-compte';

/**
 * Supprimer son compte.
 *
 * Google Play exige que la suppression soit possible depuis l'application
 * ET depuis une page web, pour qui a déjà désinstallé l'application : cette
 * page est l'adresse déclarée dans la console Google Play. Elle s'ouvre donc
 * sans être connecté, explique ce qui se passe, et mène à la connexion.
 *
 * Le serveur anonymise le compte plutôt que de l'effacer : ce qui reste et
 * pourquoi est dit ici, en clair, avant que la personne ne confirme
 * (backendvillago, accounts/suppression.py).
 */
export default function SupprimerCompte() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [compris, setCompris] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');

  const supprimer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (!motDePasse) {
      setErreur(t('supprimer.saisissezVotreMotPasse'));
      return;
    }
    setEnCours(true);
    try {
      await api.post('/api/v1/auth/supprimer-compte/', { mot_de_passe: motDePasse });
      // Les sessions sont déjà révoquées par le serveur : il reste à oublier
      // celle de ce navigateur et les données gardées en cache.
      await logout();
      toast({ title: t('supprimer.votreCompteEteSupprime'), description: t('supprimer.merciAvoirUtiliseVillago') });
      setLocation('/');
    } catch (err) {
      const reste = poserErreursSurChamps(err, ['mot_de_passe'] as const, (_, message) => setErreur(message));
      if (reste) toast({ title: t('supprimer.suppressionImpossible'), description: reste, variant: 'destructive' });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('supprimer.supprimerMonCompteVillago')}</CardTitle>
            <CardDescription>
              {t('supprimer.vousPouvezSupprimerVotre')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold text-base">{t('supprimer.ceQuiDisparait')}</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{t('supprimer.votreNomVotreAdresse')}</li>
                <li>{t('supprimer.vosFavorisVosNotifications')}</li>
                <li>{t('supprimer.vosAnnoncesQuiQuittent')}</li>
                <li>{t('supprimer.vosDemandesVisiteCours')}</li>
                <li>{t('supprimer.siVousEtesCommissionnaire')}</li>
              </ul>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base">{t('supprimer.ceQuiResteSans')}</h2>
              <p className="text-muted-foreground">
                {t('supprimer.commissionsPaiementsEtatsLieux')}
              </p>
            </section>
            <p className="font-medium">{t('supprimer.suppressionEstImmediateDefinitive')}</p>

            {isLoading ? (
              <p className="text-muted-foreground">{t('supprimer.chargement')}</p>
            ) : !user ? (
              <div className="space-y-3 border-t pt-5">
                <p>{t('supprimer.connectezVousAbordAvec')}</p>
                <Button asChild className="w-full">
                  <Link href={`/login?suite=${encodeURIComponent(CHEMIN)}`}>{t('supprimer.seConnecter')}</Link>
                </Button>
                <p className="text-muted-foreground">
                  {t('supprimer.mdpPerdu')}{' '}
                  <Link href="/mot-de-passe-oublie" className="underline">
                    {t('supprimer.recevoirCodeEMail')}
                  </Link>
                  {t('supprimer.puisRevenezCettePage')}
                </p>
              </div>
            ) : (
              <form onSubmit={supprimer} className="space-y-4 border-t pt-5" noValidate>
                <p>
                  Compte : <span className="font-medium">{user.email}</span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="mot-de-passe">{t('supprimer.votreMotPasse')}</Label>
                  <div className="relative">
                    <Input
                      id="mot-de-passe"
                      type={visible ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      aria-invalid={!!erreur}
                      aria-describedby={erreur ? 'erreur-mot-de-passe' : undefined}
                      data-testid="input-mot-de-passe-suppression"
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-muted-foreground"
                      onClick={() => setVisible((v) => !v)}
                      aria-label={visible ? t('supprimer.masquerMotPasse') : t('supprimer.afficherMotPasse')}
                    >
                      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {erreur && (
                    <p id="erreur-mot-de-passe" className="text-destructive">
                      {erreur}
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="compris"
                    checked={compris}
                    onCheckedChange={(v) => setCompris(v === true)}
                    data-testid="checkbox-compris"
                  />
                  <Label htmlFor="compris" className="font-normal leading-snug">
                    {t('supprimer.jAiComprisQue')}
                  </Label>
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full h-auto min-h-11 whitespace-normal"
                  disabled={!compris || enCours}
                  data-testid="button-supprimer-compte"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {enCours ? t('supprimer.suppression') : t('supprimer.supprimerMonCompte')}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/profile">{t('supprimer.annuler')}</Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
