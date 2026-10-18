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
      setErreur('Saisissez votre mot de passe.');
      return;
    }
    setEnCours(true);
    try {
      await api.post('/api/v1/auth/supprimer-compte/', { mot_de_passe: motDePasse });
      // Les sessions sont déjà révoquées par le serveur : il reste à oublier
      // celle de ce navigateur et les données gardées en cache.
      await logout();
      toast({ title: 'Votre compte a été supprimé', description: 'Merci d’avoir utilisé VillaGo.' });
      setLocation('/');
    } catch (err) {
      const reste = poserErreursSurChamps(err, ['mot_de_passe'] as const, (_, message) => setErreur(message));
      if (reste) toast({ title: 'Suppression impossible', description: reste, variant: 'destructive' });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Supprimer mon compte VillaGo</CardTitle>
            <CardDescription>
              Vous pouvez supprimer votre compte à tout moment, depuis ce site ou depuis l’application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold text-base">Ce qui disparaît</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Votre nom, votre adresse e-mail, votre téléphone, votre photo et votre présentation.</li>
                <li>Vos favoris et vos notifications.</li>
                <li>Vos annonces, qui quittent la recherche.</li>
                <li>Vos demandes de visite en cours. Les personnes concernées sont prévenues.</li>
                <li>Si vous êtes commissionnaire : les numéros et les notes de votre carnet de bailleurs.</li>
              </ul>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base">Ce qui reste, sans votre nom</h2>
              <p className="text-muted-foreground">
                Les commissions, les paiements et les états des lieux déjà enregistrés, ainsi que vos avis et vos
                messages. Ils concernent aussi d’autres personnes (un locataire, un bailleur, un confrère) et
                servent de preuve en cas de désaccord. Ils sont rattachés à « Compte supprimé ».
              </p>
            </section>
            <p className="font-medium">La suppression est immédiate et définitive.</p>

            {isLoading ? (
              <p className="text-muted-foreground">Chargement…</p>
            ) : !user ? (
              <div className="space-y-3 border-t pt-5">
                <p>Connectez-vous d’abord avec le compte à supprimer.</p>
                <Button asChild className="w-full">
                  <Link href={`/login?suite=${encodeURIComponent(CHEMIN)}`}>Se connecter</Link>
                </Button>
                <p className="text-muted-foreground">
                  Mot de passe perdu ?{' '}
                  <Link href="/mot-de-passe-oublie" className="underline">
                    Recevoir un code par e-mail
                  </Link>
                  , puis revenez sur cette page.
                </p>
              </div>
            ) : (
              <form onSubmit={supprimer} className="space-y-4 border-t pt-5" noValidate>
                <p>
                  Compte : <span className="font-medium">{user.email}</span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="mot-de-passe">Votre mot de passe</Label>
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
                      aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
                    J’ai compris que mon compte sera supprimé tout de suite, sans retour en arrière possible.
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
                  {enCours ? 'Suppression…' : 'Supprimer mon compte'}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/profile">Annuler</Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
