import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { poserErreursSurChamps } from '@/lib/erreurs';
import { t } from '@/i18n';

/** Les champs que l'API peut désigner dans une erreur (swagger.json :
 *  DemandeCode et NouveauMotDePasse). */
const CHAMPS = ['email', 'code', 'new_password'] as const;
type Champ = (typeof CHAMPS)[number];

/**
 * Mot de passe oublié, en deux temps : l'adresse, puis le code reçu par
 * e-mail avec le nouveau mot de passe.
 *
 * L'API existait, mais aucun écran n'y menait : un utilisateur qui oubliait
 * son mot de passe perdait son compte (vérification du 16 octobre 2026).
 *
 * La réponse à la première étape est la même que l'adresse soit inscrite ou
 * non : l'écran ne doit pas servir à savoir qui a un compte. Il passe donc
 * toujours à la seconde étape.
 */
export default function MotDePasseOublie() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [etape, setEtape] = useState<'adresse' | 'code'>('adresse');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [annonce, setAnnonce] = useState('');
  const [erreurs, setErreurs] = useState<Partial<Record<Champ | 'confirmation', string>>>({});

  const signaler = (erreur: unknown) => {
    const recues: Partial<Record<Champ, string>> = {};
    const reste = poserErreursSurChamps(erreur, CHAMPS, (champ, message) => {
      recues[champ] = message;
    });
    setErreurs(recues);
    if (reste) toast({ title: t('mdp.impossible'), description: reste, variant: 'destructive' });
  };

  const demanderCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setErreurs({});
    if (!email.trim()) {
      setErreurs({ email: t('mdp.indiquezEmail') });
      return;
    }
    setEnCours(true);
    try {
      const reponse = await api.post<{ message: string }>('/api/v1/auth/password-reset/', { email: email.trim() });
      setAnnonce(reponse.message);
      setCode('');
      setEtape('code');
    } catch (erreur) {
      signaler(erreur);
    } finally {
      setEnCours(false);
    }
  };

  const changer = async (e: FormEvent) => {
    e.preventDefault();
    setErreurs({});
    if (motDePasse !== confirmation) {
      setErreurs({ confirmation: t('mdp.differents') });
      return;
    }
    setEnCours(true);
    try {
      await api.post('/api/v1/auth/password-reset/confirm/', {
        email: email.trim(),
        code: code.trim(),
        new_password: motDePasse,
      });
      toast({
        title: t('mdp.change'),
        description: t('mdp.changeTexte'),
      });
      setLocation('/login');
    } catch (erreur) {
      signaler(erreur);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Layout hideNav>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/logo.png" alt="" className="w-12 h-12 rounded-xl mx-auto mb-4 object-cover" />
            <CardTitle className="text-2xl">{t('mdp.titre')}</CardTitle>
            <CardDescription>
              {etape === 'adresse'
                ? t('mdp.intro')
                : annonce}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {etape === 'adresse' ? (
              <form onSubmit={demanderCode} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="mdp-email">{t('connexion.email')}</Label>
                  <Input
                    id="mdp-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!erreurs.email}
                    data-testid="input-email-oubli"
                  />
                  {erreurs.email && <p className="text-sm text-destructive">{erreurs.email}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={enCours} data-testid="button-envoyer-code">
                  <Mail className="mr-2 h-4 w-4" />
                  {enCours ? t('commun.envoi') : t('mdp.recevoirCode')}
                </Button>
              </form>
            ) : (
              <form onSubmit={changer} className="space-y-4" noValidate>
                <p className="text-sm text-muted-foreground">
                  {t('mdp.codeValable')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="mdp-code">{t('mdp.codeRecu')}</Label>
                  <Input
                    id="mdp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    aria-invalid={!!erreurs.code}
                    className="tracking-[0.4em] text-lg"
                    data-testid="input-code"
                  />
                  {erreurs.code && <p className="text-sm text-destructive">{erreurs.code}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdp-nouveau">{t('mdp.nouveau')}</Label>
                  <div className="relative">
                    <Input
                      id="mdp-nouveau"
                      type={visible ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-12"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      aria-invalid={!!erreurs.new_password}
                      data-testid="input-nouveau-mot-de-passe"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground"
                      onClick={() => setVisible((v) => !v)}
                      aria-label={visible ? t('mdp.masquer') : t('mdp.afficher')}
                    >
                      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('mdp.8CaracteresMoinsPas')}</p>
                  {erreurs.new_password && <p className="text-sm text-destructive">{erreurs.new_password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdp-confirmation">{t('mdp.confirmez')}</Label>
                  <Input
                    id="mdp-confirmation"
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    aria-invalid={!!erreurs.confirmation}
                    data-testid="input-confirmation-mot-de-passe"
                  />
                  {erreurs.confirmation && <p className="text-sm text-destructive">{erreurs.confirmation}</p>}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={enCours || code.length !== 6 || !motDePasse}
                  data-testid="button-changer-mot-de-passe"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {enCours ? t('commun.enregistrement') : t('mdp.changer')}
                </Button>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <button type="button" className="text-primary font-medium min-h-11" onClick={() => demanderCode()} disabled={enCours}>
                    {t('mdp.renvoyer')}
                  </button>
                  <button type="button" className="text-muted-foreground min-h-11" onClick={() => setEtape('adresse')}>
                    {t('mdp.changerAdresse')}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <Link href="/login">
                <span className="text-primary font-medium cursor-pointer">{t('mdp.retourConnexion')}</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
