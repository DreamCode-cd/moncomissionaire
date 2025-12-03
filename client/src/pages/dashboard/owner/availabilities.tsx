import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Plus, Trash2, Loader2, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { availabilityCreateSchema, type AvailabilityCreateInput, type OwnerAvailability, type PaginatedResponse } from "@shared/schema";

const daysOfWeek = [
  { value: 0, label: "Lundi" },
  { value: 1, label: "Mardi" },
  { value: 2, label: "Mercredi" },
  { value: 3, label: "Jeudi" },
  { value: 4, label: "Vendredi" },
  { value: 5, label: "Samedi" },
  { value: 6, label: "Dimanche" },
];

export default function Availabilities() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [availabilities, setAvailabilities] = useState<OwnerAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<AvailabilityCreateInput>({
    resolver: zodResolver(availabilityCreateSchema),
    defaultValues: {
      day_of_week: 0,
      start_time: "09:00",
      end_time: "18:00",
      is_active: true,
    },
  });

  useEffect(() => {
    fetchAvailabilities();
  }, []);

  const fetchAvailabilities = async () => {
    try {
      const data = await apiGet<PaginatedResponse<OwnerAvailability>>("/availabilities/by_owner/");
      setAvailabilities(data.results || []);
    } catch (error) {
      console.error("Failed to fetch availabilities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const trimSecondsFromTime = (time: string) => {
    if (time && time.length >= 5) {
      return time.slice(0, 5);
    }
    return time;
  };

  const handleOpenDialog = (availability?: OwnerAvailability) => {
    if (availability) {
      setEditingId(availability.id);
      form.reset({
        day_of_week: availability.day_of_week,
        start_time: trimSecondsFromTime(availability.start_time),
        end_time: trimSecondsFromTime(availability.end_time),
        is_active: availability.is_active,
      });
    } else {
      setEditingId(null);
      form.reset({
        day_of_week: 0,
        start_time: "09:00",
        end_time: "18:00",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const formatTimeForApi = (time: string) => {
    if (time && time.length === 5) {
      return `${time}:00`;
    }
    return time;
  };

  const onSubmit = async (values: AvailabilityCreateInput) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        start_time: formatTimeForApi(values.start_time),
        end_time: formatTimeForApi(values.end_time),
      };

      if (editingId) {
        await apiPatch(`/availabilities/${editingId}/`, payload);
        toast({
          title: "Disponibilité modifiée",
          description: "Votre créneau a été mis à jour.",
        });
      } else {
        await apiPost<OwnerAvailability>("/availabilities/", payload);
        toast({
          title: "Disponibilité ajoutée",
          description: "Votre nouveau créneau a été créé.",
        });
      }
      setIsDialogOpen(false);
      await fetchAvailabilities();
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
    if (!deleteId) return;

    try {
      await apiDelete(`/availabilities/${deleteId}/`);
      setAvailabilities((prev) => prev.filter((a) => a.id !== deleteId));
      toast({
        title: "Disponibilité supprimée",
        description: "Le créneau a été supprimé.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (availability: OwnerAvailability) => {
    try {
      await apiPatch(`/availabilities/${availability.id}/`, {
        day_of_week: availability.day_of_week,
        start_time: availability.start_time,
        end_time: availability.end_time,
        is_active: !availability.is_active,
      });
      setAvailabilities((prev) =>
        prev.map((a) =>
          a.id === availability.id ? { ...a, is_active: !a.is_active } : a
        )
      );
      toast({
        title: availability.is_active ? "Créneau désactivé" : "Créneau activé",
        description: `Le créneau de ${availability.day_of_week_display} a été ${
          availability.is_active ? "désactivé" : "activé"
        }.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le créneau.",
        variant: "destructive",
      });
    }
  };

  const groupedAvailabilities = daysOfWeek.map((day) => ({
    ...day,
    slots: availabilities.filter((a) => a.day_of_week === day.value),
  }));

  if (!user || user.role !== "proprietaire") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
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
                Mes disponibilités
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-subtitle">
                Gérez vos créneaux de disponibilité pour les visites
              </p>
            </div>

            <Button
              onClick={() => handleOpenDialog()}
              data-testid="button-add-availability"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un créneau
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" data-testid={`skeleton-day-${i}`} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedAvailabilities.map((day) => (
                <Card key={day.value} data-testid={`card-day-${day.value}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      <span data-testid={`text-day-name-${day.value}`}>{day.label}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {day.slots.length > 0 ? (
                      <div className="space-y-3">
                        {day.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                            data-testid={`slot-${slot.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium" data-testid={`text-slot-time-${slot.id}`}>
                                  {slot.start_time} - {slot.end_time}
                                </span>
                              </div>
                              <Switch
                                checked={slot.is_active}
                                onCheckedChange={() => handleToggleActive(slot)}
                                data-testid={`switch-availability-${slot.id}`}
                              />
                              <span className="text-sm text-muted-foreground" data-testid={`text-slot-status-${slot.id}`}>
                                {slot.is_active ? "Actif" : "Inactif"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(slot)}
                                data-testid={`button-edit-availability-${slot.id}`}
                              >
                                Modifier
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(slot.id)}
                                data-testid={`button-delete-availability-${slot.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid={`text-no-slots-${day.value}`}>
                        Aucun créneau défini pour ce jour
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {availabilities.length === 0 && !isLoading && (
            <Card className="mt-8" data-testid="card-empty-state">
              <CardContent className="py-12 text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold" data-testid="text-empty-title">Aucune disponibilité</h3>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="text-empty-description">
                  Ajoutez vos créneaux de disponibilité pour recevoir des demandes de visite.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => handleOpenDialog()}
                  data-testid="button-add-first-availability"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un créneau
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-availability">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingId ? "Modifier le créneau" : "Ajouter un créneau"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4" data-testid="form-availability">
              <FormField
                control={form.control}
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jour de la semaine</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-day">
                          <SelectValue placeholder="Sélectionner un jour" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)} data-testid={`option-day-${day.value}`}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="error-day" />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de début</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="input-start-time"
                        />
                      </FormControl>
                      <FormMessage data-testid="error-start-time" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de fin</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="input-end-time"
                        />
                      </FormControl>
                      <FormMessage data-testid="error-end-time" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Créneau actif</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-dialog"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-save-availability"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">Supprimer ce créneau ?</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              Cette action est irréversible. Le créneau de disponibilité sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
