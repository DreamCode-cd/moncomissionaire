import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Calendar, Home, Heart, MessageCircle, Star, Clock, MapPin,
  ChevronRight, Eye, X, Settings, Loader2
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import type { VisitBooking, RentalBooking, PropertyReview, PaginatedResponse } from "@shared/schema";
import { apiGet, apiPatch } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusColors: Record<string, string> = {
  en_attente: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  confirme: "bg-green-500/10 text-green-600 dark:text-green-400",
  refuse: "bg-red-500/10 text-red-600 dark:text-red-400",
  annule: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  en_cours: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  termine: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [rentals, setRentals] = useState<RentalBooking[]>([]);
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingVisitId, setCancellingVisitId] = useState<number | null>(null);
  const [cancellingRentalId, setCancellingRentalId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [visitsData, rentalsData, reviewsData] = await Promise.all([
          apiGet<PaginatedResponse<VisitBooking>>("/bookings/visits/my_visits/", true),
          apiGet<PaginatedResponse<RentalBooking>>("/bookings/rentals/my_rentals/", true),
          apiGet<PaginatedResponse<PropertyReview>>("/reviews/properties/my_reviews/", true),
        ]);
        setVisits(visitsData.results || []);
        setRentals(rentalsData.results || []);
        setReviews(reviewsData.results || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCancelVisit = async (visitId: number) => {
    setCancellingVisitId(visitId);
    try {
      await apiPatch(`/bookings/visits/${visitId}/`, { status: "annule" }, true);
      setVisits((prev) =>
        prev.map((v) =>
          v.id === visitId ? { ...v, status: "annule", status_display: "Annulée" } : v
        )
      );
      toast({
        title: "Visite annulée",
        description: "Votre demande de visite a été annulée.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la visite.",
        variant: "destructive",
      });
    } finally {
      setCancellingVisitId(null);
    }
  };

  const handleCancelRental = async (rentalId: number) => {
    setCancellingRentalId(rentalId);
    try {
      await apiPatch(`/bookings/rentals/${rentalId}/`, { status: "annule" }, true);
      setRentals((prev) =>
        prev.map((r) =>
          r.id === rentalId ? { ...r, status: "annule", status_display: "Annulée" } : r
        )
      );
      toast({
        title: "Location annulée",
        description: "Votre demande de location a été annulée.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la location.",
        variant: "destructive",
      });
    } finally {
      setCancellingRentalId(null);
    }
  };

  const upcomingVisits = visits.filter((v) => v.status === "confirme" || v.status === "en_attente");
  const activeRentals = rentals.filter((r) => r.status === "en_cours");

  const formatPrice = (price: string) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(parseFloat(price));

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
      />
    ));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                Bonjour, {user?.first_name} !
              </h1>
              <p className="text-muted-foreground">
                Gérez vos réservations et suivez vos locations
              </p>
            </div>
            <Link href="/dashboard/client/profile">
              <Button variant="outline" className="gap-2" data-testid="button-profile">
                <Settings className="h-4 w-4" />
                Mon profil
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visites à venir</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-upcoming-visits">
                  {upcomingVisits.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {upcomingVisits.filter((v) => v.status === "en_attente").length} en attente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Locations actives</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-rentals">
                  {activeRentals.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  En cours de location
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mes avis</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-reviews-count">
                  {reviews.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avis laissés
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favoris</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Propriétés sauvegardées
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Tabs defaultValue="visits">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-auto">
                  <TabsTrigger value="visits" data-testid="tab-visits">
                    Visites ({visits.length})
                  </TabsTrigger>
                  <TabsTrigger value="rentals" data-testid="tab-rentals">
                    Locations ({rentals.length})
                  </TabsTrigger>
                  <TabsTrigger value="reviews" data-testid="tab-reviews">
                    Mes avis ({reviews.length})
                  </TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="visits" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : visits.length > 0 ? (
                  <div className="space-y-4">
                    {visits.map((visit) => (
                      <Card key={visit.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex-shrink-0">
                              <img
                                src={visit.house_details.main_image?.image || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop"}
                                alt={visit.house_details.title}
                                className="h-24 w-32 rounded-lg object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold">{visit.house_details.title}</h3>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {visit.house_details.city}
                                  </p>
                                </div>
                                <Badge className={statusColors[visit.status]}>
                                  {visit.status_display}
                                </Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(visit.visit_date), "d MMMM yyyy", { locale: fr })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {visit.visit_time}
                                </span>
                              </div>
                              {visit.message && (
                                <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                                  <MessageCircle className="mr-1 inline h-3 w-3" />
                                  {visit.message}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(visit.status === "en_attente" || visit.status === "confirme") && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      disabled={cancellingVisitId === visit.id}
                                      data-testid={`button-cancel-visit-${visit.id}`}
                                    >
                                      {cancellingVisitId === visit.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Annuler cette visite ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir annuler cette visite ? Cette action est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Non, garder</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleCancelVisit(visit.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Oui, annuler
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <Link href={`/properties/${visit.house}`}>
                                <Button variant="ghost" size="icon" data-testid={`button-view-property-${visit.id}`}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Eye className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucune visite</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Vous n'avez pas encore réservé de visite.
                    </p>
                    <Link href="/properties">
                      <Button className="mt-4" data-testid="button-browse-properties">
                        Parcourir les propriétés
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rentals" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : rentals.length > 0 ? (
                  <div className="space-y-4">
                    {rentals.map((rental) => (
                      <Card key={rental.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex-shrink-0">
                              <img
                                src={rental.house_details.main_image?.image || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop"}
                                alt={rental.house_details.title}
                                className="h-24 w-32 rounded-lg object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold">{rental.house_details.title}</h3>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {rental.house_details.city}
                                  </p>
                                </div>
                                <Badge className={statusColors[rental.status]}>
                                  {rental.status_display}
                                </Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  {format(new Date(rental.start_date), "d MMM yyyy", { locale: fr })} -{" "}
                                  {format(new Date(rental.end_date), "d MMM yyyy", { locale: fr })}
                                </span>
                                <span className="font-medium text-primary">
                                  {formatPrice(rental.monthly_rent)}/mois
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Durée: {rental.duration_months} mois
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {rental.status === "en_attente" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      disabled={cancellingRentalId === rental.id}
                                      data-testid={`button-cancel-rental-${rental.id}`}
                                    >
                                      {cancellingRentalId === rental.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Annuler cette demande ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir annuler cette demande de location ? Cette action est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Non, garder</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleCancelRental(rental.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Oui, annuler
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              {rental.status === "termine" && (
                                <Link href={`/properties/${rental.house}#reviews`}>
                                  <Button variant="outline" size="sm" className="gap-1" data-testid={`button-leave-review-${rental.id}`}>
                                    <Star className="h-4 w-4" />
                                    Avis
                                  </Button>
                                </Link>
                              )}
                              <Link href={`/properties/${rental.house}`}>
                                <Button variant="ghost" size="icon" data-testid={`button-view-rental-${rental.id}`}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucune location</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Vous n'avez pas encore de location en cours.
                    </p>
                    <Link href="/properties">
                      <Button className="mt-4">
                        Trouver un logement
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div className="flex-shrink-0">
                              <img
                                src={review.house_details?.main_image?.image || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop"}
                                alt={review.house_details?.title || "Propriété"}
                                className="h-24 w-32 rounded-lg object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold">{review.house_details?.title || "Propriété"}</h3>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {review.house_details?.city || "Ville"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {renderStars(review.rating)}
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                {review.comment}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Publié le {format(new Date(review.created_at), "d MMMM yyyy", { locale: fr })}
                              </p>
                            </div>
                            <Link href={`/properties/${review.house}`}>
                              <Button variant="ghost" size="icon" data-testid={`button-view-review-property-${review.id}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Star className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun avis</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Vous n'avez pas encore laissé d'avis sur les propriétés.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
