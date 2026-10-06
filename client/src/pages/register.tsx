import { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Eye, EyeOff, House, Search, UserPlus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterInput } from '@shared/schema';

type Role = RegisterInput['user_type'];

/**
 * Le rôle vient en premier : c'est lui qui dit à quoi servira le compte. Il
 * était au milieu du formulaire, dans une liste dont le libellé était coupé
 * sur téléphone (« Commissionnaire - Des bailleurs me… »).
 */
const ROLES: { valeur: Role; titre: string; detail: string; icone: typeof House }[] = [
  {
    valeur: 'client',
    titre: 'Je cherche un logement',
    detail: 'Trouver une maison et demander une visite.',
    icone: Search,
  },
  {
    valeur: 'commissionnaire',
    titre: 'Je suis commissionnaire',
    detail: 'Des bailleurs me confient leurs maisons ; je trouve les locataires.',
    icone: Briefcase,
  },
  {
    valeur: 'proprietaire',
    titre: 'Je suis propriétaire',
    detail: 'Je publie moi-même la maison que je mets en location.',
    icone: House,
  },
];

const CHAMPS_DU_FORMULAIRE: (keyof RegisterInput)[] = [
  'user_type',
  'first_name',
  'last_name',
  'phone',
  'email',
  'username',
  'password',
  'password2',
  'terms_accepted',
];

/**
 * Le serveur répond {"password": ["Ce mot de passe est trop courant."]} : ces
 * messages s'affichaient en JSON brut dans une bulle. On les remet sous le
 * champ concerné ; ce qui ne correspond à aucun champ est renvoyé tel quel.
 */
function repartirErreurs(
  erreur: unknown,
  poser: (champ: keyof RegisterInput, message: string) => void,
): string | null {
  const brut = erreur instanceof Error ? erreur.message : '';
  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    return brut || 'Une erreur est survenue';
  }
  // Une phrase seule ou une liste de phrases : rien à placer sous un champ.
  if (typeof donnees === 'string') return donnees;
  if (Array.isArray(donnees)) return donnees.join(' ');
  if (!donnees || typeof donnees !== 'object') return 'Une erreur est survenue';

  const restes: string[] = [];
  for (const [champ, messages] of Object.entries(donnees as Record<string, unknown>)) {
    const message = Array.isArray(messages) ? messages.join(' ') : String(messages);
    if ((CHAMPS_DU_FORMULAIRE as string[]).includes(champ)) {
      poser(champ as keyof RegisterInput, message);
    } else {
      restes.push(message);
    }
  }
  return restes.length ? restes.join(' ') : null;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const roleDemande = new URLSearchParams(searchParams).get('role');
  const roleParDefaut: Role =
    roleDemande === 'proprietaire' || roleDemande === 'commissionnaire' ? roleDemande : 'client';

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      user_type: roleParDefaut,
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      password2: '',
      terms_accepted: false,
    },
  });
  const role = form.watch('user_type');

  const onSubmit = async (data: RegisterInput) => {
    try {
      await register(data);
      toast({ title: 'Compte créé', description: 'Bienvenue sur VillaGo.' });
      // Le commissionnaire vient pour travailler : droit à son portefeuille.
      setLocation(data.user_type === 'commissionnaire' ? '/dashboard' : '/');
    } catch (erreur) {
      const reste = repartirErreurs(erreur, (champ, message) => form.setError(champ, { message }));
      if (reste) {
        toast({ title: 'Inscription impossible', description: reste, variant: 'destructive' });
      }
    }
  };

  return (
    <Layout hideNav>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/logo.png" alt="" className="mx-auto mb-4 h-12 w-12 rounded-xl object-cover" />
            <CardTitle className="text-2xl">Créer un compte</CardTitle>
            <CardDescription>Quelques informations, et vous pourrez commencer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vous êtes…</FormLabel>
                      <div role="radiogroup" className="grid gap-2">
                        {ROLES.map(({ valeur, titre, detail, icone: Icone }) => {
                          const choisi = field.value === valeur;
                          return (
                            <button
                              key={valeur}
                              type="button"
                              role="radio"
                              aria-checked={choisi}
                              onClick={() => field.onChange(valeur)}
                              className={cn(
                                'flex min-h-[44px] items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                                choisi
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                  : 'border-border bg-background hover:bg-muted/50',
                              )}
                              data-testid={`role-${valeur}`}
                            >
                              <Icone className={cn('mt-0.5 h-5 w-5 shrink-0', choisi ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                              <span>
                                <span className="block font-medium text-foreground">{titre}</span>
                                <span className="block text-sm text-muted-foreground">{detail}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="Grâce" autoComplete="given-name" {...field} data-testid="input-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Mbuyi" autoComplete="family-name" {...field} data-testid="input-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+243 99 123 4567"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormDescription>
                        {role === 'commissionnaire'
                          ? 'C’est par ce numéro que bailleurs et clients vous joindront.'
                          : role === 'client'
                            ? 'Communiqué au commissionnaire seulement quand il accepte votre demande de visite.'
                            : 'Pour que l’équipe VillaGo puisse vous joindre au sujet de vos annonces.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="grace.mbuyi@exemple.cd"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom d’utilisateur</FormLabel>
                      <FormControl>
                        <Input
                          autoCapitalize="none"
                          autoComplete="username"
                          placeholder="grace.mbuyi"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormDescription>Pour vous connecter, avec votre e-mail. 5 caractères au moins.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={motDePasseVisible ? 'text' : 'password'}
                            autoComplete="new-password"
                            className="pr-12"
                            {...field}
                            data-testid="input-password"
                          />
                        </FormControl>
                        {/* Un simple <button> : le composant Button porte la classe
                            hover-elevate, qui impose une position relative et
                            renvoyait l'œil sous le champ au lieu de dedans. */}
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground"
                          onClick={() => setMotDePasseVisible((v) => !v)}
                          aria-label={motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          data-testid="bouton-voir-mot-de-passe"
                        >
                          {motDePasseVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FormDescription>8 caractères au moins, pas uniquement des chiffres.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmez le mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type={motDePasseVisible ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...field}
                          data-testid="input-password2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms_accepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-accept-terms" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer text-sm font-normal leading-relaxed">
                          J’accepte les{' '}
                          <Link href="/legal/terms">
                            <span className="text-primary hover:underline">conditions d’utilisation</span>
                          </Link>{' '}
                          et la{' '}
                          <Link href="/legal/privacy">
                            <span className="text-primary hover:underline">politique de confidentialité</span>
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={form.formState.isSubmitting}
                  data-testid="button-submit-register"
                >
                  {form.formState.isSubmitting ? (
                    'Création du compte…'
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Créer mon compte
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Déjà un compte ? </span>
              <Link href="/login">
                <span className="cursor-pointer font-medium text-primary" data-testid="link-login">
                  Se connecter
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
