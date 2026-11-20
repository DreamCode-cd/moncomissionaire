import { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Building2, Eye, EyeOff, House, Search, UserPlus } from 'lucide-react';
import { pageDeSuite, versConnexion } from '@/lib/suite';
import { ChampTelephone } from '@/components/ChampTelephone';
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
import { poserErreursSurChamps } from '@/lib/erreurs';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterInput } from '@shared/schema';
import { t } from '@/i18n';

type Role = RegisterInput['user_type'];

/**
 * Le rôle vient en premier : c'est lui qui dit à quoi servira le compte. Il
 * était au milieu du formulaire, dans une liste dont le libellé était coupé
 * sur téléphone (« Commissionnaire - Des bailleurs me… »).
 */
const ROLES: { valeur: Role; titre: string; detail: string; icone: typeof House }[] = [
  {
    valeur: 'client',
    get titre() { return t('inscription.roleClient'); },
    get detail() { return t('inscription.roleClientDetail'); },
    icone: Search,
  },
  {
    valeur: 'commissionnaire',
    get titre() { return t('inscription.roleCommissionnaire'); },
    get detail() { return t('inscription.roleCommissionnaireDetail'); },
    icone: Briefcase,
  },
  {
    valeur: 'proprietaire',
    get titre() { return t('inscription.roleProprietaire'); },
    get detail() { return t('inscription.roleProprietaireDetail'); },
    icone: House,
  },
  {
    valeur: 'agence',
    get titre() { return t('inscription.roleAgence'); },
    get detail() { return t('inscription.roleAgenceDetail'); },
    icone: Building2,
  },
];

const CHAMPS_DU_FORMULAIRE: (keyof RegisterInput)[] = [
  'user_type',
  'nom_agence',
  'first_name',
  'last_name',
  'phone',
  'email',
  'password',
  'password2',
  'terms_accepted',
  'consentement_donnees',
];

/**
 * Le nom d'agence dépend du rôle choisi : c'est un `.refine` sur l'objet, que
 * Zod n'exécute qu'une fois tous les autres champs valides. Sur un formulaire
 * vide, l'erreur n'arrivait qu'après toutes les autres. On l'ajoute ici, en
 * même temps qu'elles.
 */
const resoudre: Resolver<RegisterInput> = async (valeurs, contexte, options) => {
  const resultat = await zodResolver(registerSchema)(valeurs, contexte, options);
  const erreurs = resultat.errors as FieldErrors<RegisterInput>;
  if (valeurs.user_type === 'agence' && !valeurs.nom_agence?.trim() && !erreurs.nom_agence) {
    return {
      values: {},
      errors: { ...erreurs, nom_agence: { type: 'required', message: t('inscription.indiquezNomAgence') } },
    };
  }
  return resultat;
};

/** Les messages du serveur vont sous le champ concerné ; le reste en bulle. */
function repartirErreurs(
  erreur: unknown,
  poser: (champ: keyof RegisterInput, message: string) => void,
): string | null {
  return poserErreursSurChamps(erreur, CHAMPS_DU_FORMULAIRE, poser);
}

export default function Register() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const roleDemande = new URLSearchParams(searchParams).get('role');
  const roleParDefaut: Role =
    roleDemande === 'proprietaire' || roleDemande === 'commissionnaire' || roleDemande === 'agence' ? roleDemande : 'client';

  const form = useForm<RegisterInput>({
    resolver: resoudre,
    defaultValues: {
      user_type: roleParDefaut,
      nom_agence: '',
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
      password2: '',
      terms_accepted: false,
      consentement_donnees: false,
    },
  });
  const role = form.watch('user_type');

  const onSubmit = async (data: RegisterInput) => {
    try {
      await register(data);
      toast({ title: t('inscription.compteCree'), description: t('inscription.bienvenueVillago') });
      // Venu d'une page (une demande de visite, par exemple) : on y retourne.
      // Sinon, le commissionnaire vient pour travailler : droit à son
      // portefeuille ; l'agence, à ses biens, pour publier.
      const accueil =
        data.user_type === 'commissionnaire' ? '/dashboard' : data.user_type === 'agence' ? '/my-properties' : '/';
      setLocation(pageDeSuite(searchParams) ?? accueil);
    } catch (erreur) {
      const reste = repartirErreurs(erreur, (champ, message) => form.setError(champ, { message }));
      if (reste) {
        toast({ title: t('inscription.inscriptionImpossible'), description: reste, variant: 'destructive' });
      }
    }
  };

  return (
    <Layout hideNav>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/logo.png" alt="" className="mx-auto mb-4 h-12 w-12 rounded-xl object-cover" />
            <CardTitle className="text-2xl">{t('inscription.creerCompte')}</CardTitle>
            <CardDescription>{t('inscription.quelquesInformationsVousPourrez')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inscription.vousEtes')}</FormLabel>
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

                {role === 'agence' && (
                  <FormField
                    control={form.control}
                    name="nom_agence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inscription.nomAgence')}</FormLabel>
                        <FormControl>
                          <Input autoComplete="organization" {...field} data-testid="input-nom-agence" />
                        </FormControl>
                        <FormDescription>
                          {t('inscription.cEstLuiQui')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inscription.prenom')}</FormLabel>
                        <FormControl>
                          <Input autoComplete="given-name" {...field} data-testid="input-firstname" />
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
                        <FormLabel>{t('inscription.nom')}</FormLabel>
                        <FormControl>
                          <Input autoComplete="family-name" {...field} data-testid="input-lastname" />
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
                      <FormLabel>{t('inscription.telephone')}</FormLabel>
                      <FormControl>
                        <ChampTelephone {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormDescription>
                        {/* Le format en aide, pas dans le champ : un faux numéro
                            dans le champ se lisait comme déjà rempli. */}
                        {t('inscription.exemple8123456')}
                        {role === 'commissionnaire'
                          ? t('inscription.cEstCeNumero')
                          : role === 'client'
                            ? t('inscription.communiqueCommissionnaireSeulementQuand')
                            : role === 'agence'
                              ? t('inscription.numeroAgenceQueEquipe')
                              : t('inscription.queEquipeVillagoPuisse')}
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
                      <FormLabel>{t('connexion.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormDescription>{t('inscription.cEstAvecLui')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inscription.motPasse')}</FormLabel>
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
                          aria-label={motDePasseVisible ? t('inscription.masquerMotPasse') : t('inscription.afficherMotPasse')}
                          data-testid="bouton-voir-mot-de-passe"
                        >
                          {motDePasseVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FormDescription>{t('inscription.8CaracteresMoinsPas')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inscription.confirmezMotPasse')}</FormLabel>
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
                          {/* Nouvel onglet : un lien interne quittait la page et
                              effaçait tout ce qui avait été saisi. */}
                          {t('inscription.jAccepteLes')}{' '}
                          <a href="/legal/terms" target="_blank" rel="noopener" className="text-primary hover:underline">
                            {t('inscription.conditionsUtilisation')}
                          </a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consentement_donnees"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-consentement-donnees" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        {/* Une case à part, comme l'exige l'article 196 du Code du
                            numérique : on consent aux données séparément. */}
                        <FormLabel className="cursor-pointer text-sm font-normal leading-relaxed">
                          {t('inscription.jAccepteDonnees')}{' '}
                          <a href="/legal/privacy" target="_blank" rel="noopener" className="text-primary hover:underline">
                            {t('inscription.politiqueConfidentialite')}
                          </a>
                          {t('inscription.jePeuxRetirerCet')}
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
                    t('inscription.creationCompte')
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {t('inscription.creerMonCompte')}
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('inscription.dejaUnCompte')}</span>
              <Link href={pageDeSuite(searchParams) ? versConnexion(pageDeSuite(searchParams)!) : "/login"}>
                <span className="cursor-pointer font-medium text-primary" data-testid="link-login">
                  {t('inscription.seConnecter')}
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
