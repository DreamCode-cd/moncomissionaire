import { formaterDateLongue } from '@/lib/dates';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Phone, Calendar, Shield, LogOut, Bell, BellOff, MapPin, SquarePen, Eye, EyeOff, FileText, CircleCheck, Heart } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ChampTelephone } from '@/components/ChampTelephone';
import { erreurTelephone } from '@shared/telephone';
import { messageDeconnexionHorsLigne } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { t } from '@/i18n';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  bio: string;
  is_available: boolean;
  password: string;
  password2: string;
}

export default function Profile() {
  const { user, logout, updateProfile, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      bio: user?.bio || '',
      is_available: user?.is_available ?? true,
      password: '',
      password2: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
        is_available: user.is_available ?? true,
        password: '',
        password2: '',
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (data.password && data.password !== data.password2) {
      toast({
        title: t('profil.erreur'),
        description: t('profil.motsPasseNeCorrespondent'),
        variant: 'destructive',
      });
      return;
    }
    const erreurNumero = erreurTelephone(data.phone);
    if (erreurNumero) {
      form.setError('phone', { message: erreurNumero });
      return;
    }

    try {
      const updateData: Record<string, string | boolean> = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        address: data.address,
        bio: data.bio,
      };
      
      // Add agent-specific fields
      if (user?.role === 'agent') {
        updateData.is_available = data.is_available;
      }
      
      if (data.password) {
        updateData.password = data.password;
        updateData.password2 = data.password2;
      }

      await updateProfile(updateData);
      toast({
        title: t('profil.profilMisJour'),
        description: t('profil.vosInformationsOntEte'),
      });
      setIsEditDialogOpen(false);
      form.reset({
        ...data,
        password: '',
        password2: '',
      });
    } catch (error) {
      toast({
        title: t('profil.erreur'),
        description: error instanceof Error ? error.message : t('profil.erreurEstSurvenue'),
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    const revoquee = await logout();
    setLocation('/');
    toast(
      revoquee
        ? { title: t('profil.vousEtesDeconnecte') }
        : { title: t('profil.deconnecteSansReseau'), description: messageDeconnexionHorsLigne() },
    );
  };

  const getInitials = () => {
    const first = user?.first_name?.[0]?.toUpperCase() || '';
    const last = user?.last_name?.[0]?.toUpperCase() || '';
    return first + last || 'U';
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      // Pas « Locataire » : on peut chercher un logement sans louer encore.
      case 'client': return t('role.client');
      case 'proprietaire': return t('role.proprietaire');
      case 'agence': return t('role.agence');
      case 'commissionnaire': return t('role.commissionnaire');
      case 'moderateur': return t('role.moderateur');
      case 'agent': return t('role.agent');
      case 'admin': return t('role.admin');
      default: return t('profil.utilisateur');
    }
  };


  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">{t('profil.chargement')}</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">{t('profil.vousDevezEtreConnecte')}</p>
          <Button onClick={() => setLocation('/login')}>{t('profil.seConnecter')}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.photo} alt={user.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold" data-testid="text-user-name">
                    {user.first_name} {user.last_name}
                  </h1>
                  <Badge variant="secondary" className="mt-2">
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-edit-profile">
                    <SquarePen className="w-4 h-4 mr-2" />
                    {t('profil.modifierProfil')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('profil.modifierMesInformations')}</DialogTitle>
                    <DialogDescription>
                      {t('profil.modifiezVosInformationsPersonnelles')}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('profil.prenom')}</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-firstname" />
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
                              <FormLabel>{t('profil.nom')}</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-lastname" />
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
                            <FormLabel>{t('profil.telephone')}</FormLabel>
                            <FormControl>
                              <ChampTelephone {...field} data-testid="input-edit-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('profil.adresse')}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t('profil.votreAdresse')} data-testid="input-edit-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('profil.bio')}</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder={t('profil.decrivezVousQuelquesMots')}
                                data-testid="input-edit-bio" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {user?.role === 'agent' && (
                        <FormField
                          control={form.control}
                          name="is_available"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>{t('profil.disponibilite')}</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  {t('profil.indiquezSiVousEtes')}
                                </p>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-availability"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {t('profil.laissezVideSiVous')}
                        </p>
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('profil.nouveauMotPasse')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? 'text' : 'password'} 
                                    {...field} 
                                    placeholder={t('profil.nouveauMotPasse')}
                                    data-testid="input-edit-password" 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('profil.confirmerMotPasse')}</FormLabel>
                              <FormControl>
                                <Input 
                                  type={showPassword ? 'text' : 'password'} 
                                  {...field} 
                                  placeholder={t('profil.confirmerMotPasse')}
                                  data-testid="input-edit-password2" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setIsEditDialogOpen(false)}
                          data-testid="button-cancel-edit"
                        >
                          {t('profil.annuler')}
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={form.formState.isSubmitting}
                          data-testid="button-save-profile"
                        >
                          {form.formState.isSubmitting ? t('profil.enregistrement') : t('profil.enregistrer')}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('profil.informationsCompte')}</CardTitle>
            <CardDescription>{t('profil.vosInformationsPersonnellesContact')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('profil.email')}</p>
                <p className="font-medium" data-testid="text-user-email">{user.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('profil.telephone')}</p>
                <p className="font-medium" data-testid="text-user-phone">{user.phone || t('profil.nonRenseigne')}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('profil.adresse')}</p>
                <p className="font-medium" data-testid="text-user-address">{user.address || t('profil.nonRenseignee')}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('profil.bio')}</p>
                <p className="font-medium" data-testid="text-user-bio">{user.bio || t('profil.nonRenseignee')}</p>
              </div>
            </div>
            {user.role === 'agent' && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <CircleCheck className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('profil.disponibilite')}</p>
                    <Badge 
                      variant="secondary"
                      className={user.is_available 
                        ? 'bg-statut-favorable-fond text-statut-favorable' 
                        : 'bg-gray-500/10 text-gray-600'
                      }
                      data-testid="badge-availability"
                    >
                      {user.is_available ? t('profil.disponible') : t('profil.indisponible')}
                    </Badge>
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('profil.membreDepuis')}</p>
                <p className="font-medium" data-testid="text-user-member-since">{formaterDateLongue(user.created_at || user.date_joined)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isSupported && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">{t('profil.notifications')}</CardTitle>
              <CardDescription>{t('profil.gerezVosPreferencesNotifications')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {permission === 'granted' ? (
                    <Bell className="w-5 h-5 text-statut-favorable" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{t('profil.notificationsPush')}</p>
                    <p className="text-sm text-muted-foreground">
                      {permission === 'granted' 
                        ? t('profil.activeesVousRecevrezAlertes')
                        : permission === 'denied'
                        ? t('profil.bloqueesModifiezParametresVotre')
                        : t('profil.desactiveesActivezRecevoirAlertes')}
                    </p>
                  </div>
                </div>
                {permission === 'default' && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const granted = await requestPermission();
                      toast({
                        title: granted ? t('profil.notificationsActivees') : t('profil.notificationsNonActivees'),
                        description: granted 
                          ? t('profil.vousRecevrezDesormaisAlertes')
                          : t('profil.vousPouvezActiverPlus'),
                      });
                    }}
                    data-testid="button-enable-notifications-profile"
                  >
                    {t('profil.activer')}
                  </Button>
                )}
                {permission === 'granted' && (
                  <Badge variant="secondary" className="text-statut-favorable">
                    <Bell className="w-3 h-3 mr-1" />
                    {t('profil.actif')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Sur téléphone, l'en-tête n'a plus de menu de profil : c'est
                d'ici qu'on retrouve ses favoris. */}
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/favoris" data-testid="link-favoris">
                <Heart className="mr-2 h-4 w-4" />
                {t('profil.mesFavoris')}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('profil.seDeconnecter')}
            </Button>
            <Button asChild variant="ghost" className="w-full mt-2 text-muted-foreground">
              <a href="/supprimer-mon-compte" data-testid="link-supprimer-compte">
                {t('profil.supprimerMonCompte')}
              </a>
            </Button>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
