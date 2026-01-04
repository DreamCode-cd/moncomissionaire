import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Phone, Calendar, Shield, LogOut, Bell, BellOff, MapPin, User, Edit, Eye, EyeOff, FileText, CheckCircle } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { usePushNotifications } from '@/hooks/use-push-notifications';

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
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
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
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });
      setIsEditDialogOpen(false);
      form.reset({
        ...data,
        password: '',
        password2: '',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  const getInitials = () => {
    const first = user?.first_name?.[0]?.toUpperCase() || '';
    const last = user?.last_name?.[0]?.toUpperCase() || '';
    return first + last || 'U';
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'client': return 'Locataire';
      case 'proprietaire': return 'Propriétaire';
      case 'commissionnaire': return 'Commissionnaire';
      case 'agent': return 'Agent';
      case 'admin': return 'Administrateur';
      default: return 'Utilisateur';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">Vous devez être connecté pour voir cette page.</p>
          <Button onClick={() => setLocation('/login')}>Se connecter</Button>
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
                  <p className="text-muted-foreground text-sm">@{user.username}</p>
                  <Badge variant="secondary" className="mt-2">
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-edit-profile">
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier le profil
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Modifier mes informations</DialogTitle>
                    <DialogDescription>
                      Modifiez vos informations personnelles ci-dessous
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
                              <FormLabel>Prénom</FormLabel>
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
                              <FormLabel>Nom</FormLabel>
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
                            <FormLabel>Téléphone</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} data-testid="input-edit-phone" />
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
                            <FormLabel>Adresse</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Votre adresse" data-testid="input-edit-address" />
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
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Décrivez-vous en quelques mots..."
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
                                <FormLabel>Disponibilité</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Indiquez si vous êtes disponible pour des visites
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
                          Laissez vide si vous ne souhaitez pas changer le mot de passe
                        </p>
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nouveau mot de passe</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? 'text' : 'password'} 
                                    {...field} 
                                    placeholder="Nouveau mot de passe"
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
                              <FormLabel>Confirmer le mot de passe</FormLabel>
                              <FormControl>
                                <Input 
                                  type={showPassword ? 'text' : 'password'} 
                                  {...field} 
                                  placeholder="Confirmer le mot de passe"
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
                          Annuler
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={form.formState.isSubmitting}
                          data-testid="button-save-profile"
                        >
                          {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
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
            <CardTitle className="text-lg">Informations du compte</CardTitle>
            <CardDescription>Vos informations personnelles et de contact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Nom d'utilisateur</p>
                <p className="font-medium" data-testid="text-user-username">@{user.username}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="text-user-email">{user.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium" data-testid="text-user-phone">{user.phone || 'Non renseigné'}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium" data-testid="text-user-address">{user.address || 'Non renseignée'}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Bio</p>
                <p className="font-medium" data-testid="text-user-bio">{user.bio || 'Non renseignée'}</p>
              </div>
            </div>
            {user.role === 'agent' && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Disponibilité</p>
                    <Badge 
                      variant="secondary"
                      className={user.is_available 
                        ? 'bg-green-500/10 text-green-600' 
                        : 'bg-gray-500/10 text-gray-600'
                      }
                      data-testid="badge-availability"
                    >
                      {user.is_available ? 'Disponible' : 'Indisponible'}
                    </Badge>
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Membre depuis</p>
                <p className="font-medium" data-testid="text-user-member-since">{formatDate(user.created_at || user.date_joined)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isSupported && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>Gérez vos préférences de notifications push</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {permission === 'granted' ? (
                    <Bell className="w-5 h-5 text-green-600" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Notifications push</p>
                    <p className="text-sm text-muted-foreground">
                      {permission === 'granted' 
                        ? 'Activées - Vous recevrez des alertes pour vos messages et visites'
                        : permission === 'denied'
                        ? 'Bloquées - Modifiez les paramètres de votre navigateur'
                        : 'Désactivées - Activez pour recevoir des alertes'}
                    </p>
                  </div>
                </div>
                {permission === 'default' && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const granted = await requestPermission();
                      toast({
                        title: granted ? 'Notifications activées' : 'Notifications non activées',
                        description: granted 
                          ? 'Vous recevrez désormais des alertes push.'
                          : 'Vous pouvez les activer plus tard dans les paramètres.',
                      });
                    }}
                    data-testid="button-enable-notifications-profile"
                  >
                    Activer
                  </Button>
                )}
                {permission === 'granted' && (
                  <Badge variant="secondary" className="text-green-600">
                    <Bell className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 md:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Informations légales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/legal/terms" className="block text-sm text-muted-foreground hover:text-foreground">
              Conditions d'utilisation
            </a>
            <a href="/legal/privacy" className="block text-sm text-muted-foreground hover:text-foreground">
              Politique de confidentialité
            </a>
            <a href="/legal/cookies" className="block text-sm text-muted-foreground hover:text-foreground">
              Politique des cookies
            </a>
            <a href="/legal/legal" className="block text-sm text-muted-foreground hover:text-foreground">
              Mentions légales
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
