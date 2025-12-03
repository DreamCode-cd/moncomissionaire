import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Building, Save, Loader2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import type { PropertyDetail, Amenity, PaginatedResponse } from "@shared/schema";

const propertyTypes = [
  { value: "villa", label: "Villa" },
  { value: "appartement", label: "Appartement" },
  { value: "studio", label: "Studio" },
  { value: "maison", label: "Maison" },
  { value: "duplex", label: "Duplex" },
  { value: "loft", label: "Loft" },
  { value: "penthouse", label: "Penthouse" },
];

const propertyStatuses = [
  { value: "disponible", label: "Disponible" },
  { value: "louee", label: "Louée" },
  { value: "en_attente", label: "En attente" },
  { value: "indisponible", label: "Indisponible" },
];

const formSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().min(1, "La description est requise"),
  property_type: z.string().default("appartement"),
  status: z.string().default("disponible"),
  price_per_month: z.string().min(1, "Le prix est requis"),
  deposit: z.string().optional(),
  surface: z.coerce.number().min(1, "La surface est requise"),
  bedrooms: z.coerce.number().min(0).default(1),
  bathrooms: z.coerce.number().min(0).default(1),
  floors: z.coerce.number().min(0).default(0),
  address: z.string().min(1, "L'adresse est requise"),
  city: z.string().min(1, "La ville est requise"),
  postal_code: z.string().min(1, "Le code postal est requis"),
  country: z.string().default("France"),
  is_furnished: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  has_garden: z.boolean().default(false),
  has_pool: z.boolean().default(false),
  pets_allowed: z.boolean().default(false),
  min_lease_duration: z.coerce.number().min(1).default(1),
  max_lease_duration: z.coerce.number().min(1).default(12),
  available_from: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PropertyEdit() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [property, setProperty] = useState<PropertyDetail | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      property_type: "appartement",
      status: "disponible",
      price_per_month: "",
      deposit: "",
      surface: 0,
      bedrooms: 1,
      bathrooms: 1,
      floors: 0,
      address: "",
      city: "",
      postal_code: "",
      country: "France",
      is_furnished: false,
      has_parking: false,
      has_garden: false,
      has_pool: false,
      pets_allowed: false,
      min_lease_duration: 1,
      max_lease_duration: 12,
      available_from: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propertyData, amenitiesData] = await Promise.all([
          apiGet<PropertyDetail>(`/properties/${propertyId}/`),
          apiGet<PaginatedResponse<Amenity>>("/amenities/"),
        ]);

        setProperty(propertyData);
        setAmenities(amenitiesData.results || []);
        setSelectedAmenities(propertyData.amenities?.map((a) => a.id) || []);

        form.reset({
          title: propertyData.title,
          description: propertyData.description,
          property_type: propertyData.property_type,
          status: propertyData.status,
          price_per_month: propertyData.price_per_month,
          deposit: propertyData.deposit || "",
          surface: propertyData.surface,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          floors: propertyData.floors,
          address: propertyData.address,
          city: propertyData.city,
          postal_code: propertyData.postal_code,
          country: propertyData.country,
          is_furnished: propertyData.is_furnished,
          has_parking: propertyData.has_parking,
          has_garden: propertyData.has_garden,
          has_pool: propertyData.has_pool,
          pets_allowed: propertyData.pets_allowed,
          min_lease_duration: propertyData.min_lease_duration,
          max_lease_duration: propertyData.max_lease_duration,
          available_from: propertyData.available_from || "",
        });
      } catch (error) {
        console.error("Failed to fetch property:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la propriété.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [propertyId, form, toast]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        amenity_ids: selectedAmenities,
      };
      await apiPut(`/properties/${propertyId}/`, payload);
      toast({
        title: "Propriété modifiée",
        description: "Vos modifications ont été enregistrées.",
      });
      setLocation("/dashboard/owner");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiDelete(`/properties/${propertyId}/`);
      toast({
        title: "Propriété supprimée",
        description: "La propriété a été supprimée définitivement.",
      });
      setLocation("/dashboard/owner");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleAmenity = (amenityId: number) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  if (!user || user.role !== "proprietaire") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold" data-testid="text-access-denied">Accès refusé</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous devez être propriétaire pour accéder à cette page.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 lg:px-8">
            <Skeleton className="h-10 w-48 mb-6" data-testid="skeleton-back-button" />
            <Skeleton className="h-8 w-64 mb-2" data-testid="skeleton-title" />
            <Skeleton className="h-6 w-96 mb-8" data-testid="skeleton-subtitle" />
            <div className="space-y-6">
              <Skeleton className="h-64" data-testid="skeleton-form-1" />
              <Skeleton className="h-48" data-testid="skeleton-form-2" />
              <Skeleton className="h-48" data-testid="skeleton-form-3" />
            </div>
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
        <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setLocation("/dashboard/owner")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>

          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-page-title">
                Modifier la propriété
              </h1>
              <p className="text-muted-foreground" data-testid="text-property-name">
                {property?.title}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  data-testid="button-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle data-testid="text-delete-title">Supprimer cette propriété ?</AlertDialogTitle>
                  <AlertDialogDescription data-testid="text-delete-description">
                    Cette action est irréversible. La propriété et toutes ses données
                    seront définitivement supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                    data-testid="button-confirm-delete"
                  >
                    {isDeleting ? "Suppression..." : "Supprimer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-property">
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre de l'annonce</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Bel appartement lumineux en centre-ville"
                            {...field}
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-title" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Décrivez votre propriété en détail..."
                            className="min-h-[120px]"
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-description" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="property_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de bien</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-property-type">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {propertyTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value} data-testid={`option-type-${type.value}`}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage data-testid="error-property-type" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statut</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {propertyStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value} data-testid={`option-status-${status.value}`}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage data-testid="error-status" />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prix et conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price_per_month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loyer mensuel (EUR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 1200"
                              {...field}
                              data-testid="input-price"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-price" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dépôt de garantie (EUR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 2400"
                              {...field}
                              data-testid="input-deposit"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-deposit" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="min_lease_duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durée minimale (mois)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              data-testid="input-min-lease"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-min-lease" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_lease_duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durée maximale (mois)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              data-testid="input-max-lease"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-max-lease" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="available_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disponible à partir du</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-available-from"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-available-from" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Caractéristiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="surface"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surface (m²)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              data-testid="input-surface"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-surface" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chambres</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              data-testid="input-bedrooms"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-bedrooms" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salles de bain</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              data-testid="input-bathrooms"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-bathrooms" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="floors"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Étages</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              data-testid="input-floors"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-floors" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Options</Label>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="is_furnished"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-furnished"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Meublé</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="has_parking"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-parking"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Parking</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="has_garden"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-garden"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Jardin</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="has_pool"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-pool"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Piscine</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pets_allowed"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-pets"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Animaux acceptés</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {amenities.length > 0 && (
                    <div className="space-y-3">
                      <Label>Équipements</Label>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {amenities.map((amenity) => (
                          <div
                            key={amenity.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`amenity-${amenity.id}`}
                              checked={selectedAmenities.includes(amenity.id)}
                              onCheckedChange={() => toggleAmenity(amenity.id)}
                              data-testid={`checkbox-amenity-${amenity.id}`}
                            />
                            <label
                              htmlFor={`amenity-${amenity.id}`}
                              className="text-sm font-normal cursor-pointer"
                              data-testid={`label-amenity-${amenity.id}`}
                            >
                              {amenity.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Localisation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 123 Rue de la Paix"
                            {...field}
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-address" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Paris"
                              {...field}
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-city" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 75001"
                              {...field}
                              data-testid="input-postal-code"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-postal-code" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: France"
                              {...field}
                              data-testid="input-country"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-country" />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/dashboard/owner")}
                  data-testid="button-cancel"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
