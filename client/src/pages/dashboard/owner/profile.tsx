import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, User, Save, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPut } from "@/lib/api";
import type { UserProfile } from "@shared/schema";

const profileSchema = z.object({
  email: z.string().email("Email invalide"),
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  old_password: z.string().min(1, "L'ancien mot de passe est requis"),
  new_password: z.string().min(6, "Le nouveau mot de passe doit avoir au moins 6 caractères"),
  new_password_confirm: z.string(),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["new_password_confirm"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      bio: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      new_password_confirm: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiGet<UserProfile>("/auth/profile/", true);
        setProfile(data);
        profileForm.reset({
          email: data.email || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          bio: data.bio || "",
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger le profil.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [profileForm, toast]);

  const onSubmitProfile = async (values: ProfileFormData) => {
    setIsSubmittingProfile(true);
    try {
      await apiPut("/auth/profile/", values);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées.",
      });
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const onSubmitPassword = async (values: PasswordFormData) => {
    setIsSubmittingPassword(true);
    try {
      await apiPut("/auth/change-password/", values);
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });
      passwordForm.reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold" data-testid="text-not-logged-in">Non connecté</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Veuillez vous connecter pour accéder à votre profil.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setLocation("/dashboard/owner")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>

          <div className="mb-8">
            <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-page-title">
              Mon profil
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-subtitle">
              Gérez vos informations personnelles et vos paramètres de compte
            </p>
          </div>

          <div className="space-y-6">
            {isLoadingProfile ? (
              <Card data-testid="card-profile-loading">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" data-testid="skeleton-avatar" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" data-testid="skeleton-name" />
                      <Skeleton className="h-4 w-24" data-testid="skeleton-username" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ) : (
              <Card data-testid="card-profile-header">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16" data-testid="avatar-profile">
                      <AvatarImage src={profile?.profile_picture} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {profile?.first_name?.[0]}
                        {profile?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle data-testid="text-full-name">
                        {profile?.first_name} {profile?.last_name}
                      </CardTitle>
                      <CardDescription data-testid="text-username">@{profile?.username}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            <Card data-testid="card-profile-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
                <CardDescription>
                  Mettez à jour vos informations de contact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form
                    onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                    className="space-y-4"
                    data-testid="form-profile"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prénom</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Votre prénom"
                                {...field}
                                data-testid="input-first-name"
                              />
                            </FormControl>
                            <FormMessage data-testid="error-first-name" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Votre nom"
                                {...field}
                                data-testid="input-last-name"
                              />
                            </FormControl>
                            <FormMessage data-testid="error-last-name" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="votre@email.com"
                              {...field}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-email" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+33 6 00 00 00 00"
                              {...field}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-phone" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Parlez-nous de vous..."
                              className="min-h-[100px]"
                              {...field}
                              data-testid="input-bio"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-bio" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmittingProfile}
                        data-testid="button-save-profile"
                      >
                        {isSubmittingProfile ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Enregistrer
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card data-testid="card-password-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Changer le mot de passe
                </CardTitle>
                <CardDescription>
                  Mettez à jour votre mot de passe pour sécuriser votre compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                    className="space-y-4"
                    data-testid="form-password"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="old_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe actuel</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showOldPassword ? "text" : "password"}
                                placeholder="Votre mot de passe actuel"
                                {...field}
                                data-testid="input-old-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                data-testid="button-toggle-old-password"
                              >
                                {showOldPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage data-testid="error-old-password" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouveau mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Votre nouveau mot de passe"
                                {...field}
                                data-testid="input-new-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                data-testid="button-toggle-new-password"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage data-testid="error-new-password" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="new_password_confirm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirmez le nouveau mot de passe"
                              {...field}
                              data-testid="input-new-password-confirm"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-new-password-confirm" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmittingPassword}
                        data-testid="button-change-password"
                      >
                        {isSubmittingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Modification...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Changer le mot de passe
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
