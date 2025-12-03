import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Building, Calendar, Eye, Euro, Plus, MoreHorizontal, MapPin,
  TrendingUp, Users, Clock, Check, X, Star, Settings, CalendarClock
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { PropertyList, VisitBooking, RentalBooking, OwnerReview, PaginatedResponse } from "@shared/schema";
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
  disponible: "bg-green-500/10 text-green-600 dark:text-green-400",
  louee: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  indisponible: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function OwnerDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<PropertyList[]>([]);
  const [pendingVisits, setPendingVisits] = useState<VisitBooking[]>([]);
  const [allVisits, setAllVisits] = useState<VisitBooking[]>([]);
  const [pendingRentals, setPendingRentals] = useState<RentalBooking[]>([]);
  const [allRentals, setAllRentals] = useState<RentalBooking[]>([]);
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoadError("Vous devez être connecté pour accéder à cette page.");
        setIsLoading(false);
        return;
      }

      try {
        setLoadError(null);
        const [
          propertiesData,
          pendingVisitsData,
          allVisitsData,
          pendingRentalsData,
          allRentalsData,
          reviewsData,
        ] = await Promise.all([
          apiGet<PaginatedResponse<PropertyList>>("/properties/my_properties/", true),
          apiGet<PaginatedResponse<VisitBooking>>("/bookings/visits/pending/", true),
          apiGet<PaginatedResponse<VisitBooking>>("/bookings/visits/", true),
          apiGet<PaginatedResponse<RentalBooking>>("/bookings/rentals/pending/", true),
          apiGet<PaginatedResponse<RentalBooking>>("/bookings/rentals/", true),
          apiGet<PaginatedResponse<OwnerReview>>(`/reviews/owners/by_owner/?owner=${user?.id}`, true),
        ]);
        setProperties(propertiesData.results || []);
        setPendingVisits(pendingVisitsData.results || []);
        setAllVisits(allVisitsData.results || []);
        setPendingRentals(pendingRentalsData.results || []);
        setAllRentals(allRentalsData.results || []);
        setReviews(reviewsData.results || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        const errorMessage = error instanceof Error ? error.message : "Impossible de charger les données";
        setLoadError(errorMessage);
        toast({
          title: "Erreur de chargement",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, toast]);

  const handleVisitAction = async (visitId: number, status: "confirme" | "refuse") => {
    try {
      await apiPatch(`/bookings/visits/${visitId}/`, { status });
      setPendingVisits((prev) => prev.filter((v) => v.id !== visitId));
      setAllVisits((prev) =>
        prev.map((v) => (v.id === visitId ? { ...v, status, status_display: status === "confirme" ? "Confirmée" : "Refusée" } : v))
      );
      toast({
        title: status === "confirme" ? "Visite confirmée" : "Visite refusée",
        description: "La demande a été traitée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de traiter la demande.",
        variant: "destructive",
      });
    }
  };

  const handleRentalAction = async (rentalId: number, status: "confirme" | "refuse") => {
    try {
      await apiPatch(`/bookings/rentals/${rentalId}/`, { status });
      setPendingRentals((prev) => prev.filter((r) => r.id !== rentalId));
      setAllRentals((prev) =>
        prev.map((r) => (r.id === rentalId ? { ...r, status, status_display: status === "confirme" ? "Confirmée" : "Refusée" } : r))
      );
      toast({
        title: status === "confirme" ? "Location confirmée" : "Location refusée",
        description: "La demande a été traitée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de traiter la demande.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: string) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(parseFloat(price));

  const activeRentals = allRentals.filter((r) => r.status === "confirme" || r.status === "en_cours");
  const totalRevenue = activeRentals.reduce((acc, r) => acc + parseFloat(r.monthly_rent || "0"), 0);
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                Tableau de bord propriétaire
              </h1>
              <p className="text-muted-foreground">
                Gérez vos propriétés et vos réservations
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/owner/availabilities">
                <Button variant="outline" className="gap-2" data-testid="button-availabilities">
                  <CalendarClock className="h-4 w-4" />
                  Disponibilités
                </Button>
              </Link>
              <Link href="/dashboard/owner/profile">
                <Button variant="outline" className="gap-2" data-testid="button-profile">
                  <Settings className="h-4 w-4" />
                  Profil
                </Button>
              </Link>
              <Link href="/dashboard/owner/properties/new">
                <Button className="gap-2" data-testid="button-add-property">
                  <Plus className="h-4 w-4" />
                  Ajouter une propriété
                </Button>
              </Link>
            </div>
          </div>

          {loadError && (
            <Card className="mb-6 border-destructive/50 bg-destructive/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <X className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive" data-testid="text-load-error">
                      Erreur de chargement
                    </p>
                    <p className="text-sm text-muted-foreground">{loadError}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => window.location.reload()}
                    data-testid="button-retry-load"
                  >
                    Réessayer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mes propriétés</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{properties.length}</div>
                <p className="text-xs text-muted-foreground">
                  {properties.filter((p) => p.status === "disponible").length} disponible(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Demandes en attente</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingVisits.length + pendingRentals.length}</div>
                <p className="text-xs text-muted-foreground">
                  {pendingVisits.length} visite(s), {pendingRentals.length} location(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(String(totalRevenue))}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  {activeRentals.length} location(s) active(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageRating}</div>
                <p className="text-xs text-muted-foreground">
                  {reviews.length} avis reçu(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vues totales</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {properties.reduce((acc, p) => acc + ((p as unknown as PropertyList & { views_count?: number }).views_count || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sur toutes vos propriétés
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Tabs defaultValue="properties">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-auto">
                  <TabsTrigger value="properties" data-testid="tab-properties">
                    Propriétés ({properties.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending-visits" data-testid="tab-pending-visits">
                    Visites en attente ({pendingVisits.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending-rentals" data-testid="tab-pending-rentals">
                    Locations en attente ({pendingRentals.length})
                  </TabsTrigger>
                  <TabsTrigger value="all-visits" data-testid="tab-all-visits">
                    Historique visites ({allVisits.length})
                  </TabsTrigger>
                  <TabsTrigger value="all-rentals" data-testid="tab-all-rentals">
                    Historique locations ({allRentals.length})
                  </TabsTrigger>
                  <TabsTrigger value="reviews" data-testid="tab-reviews">
                    Avis ({reviews.length})
                  </TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="properties" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : properties.length > 0 ? (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <Card key={property.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex-shrink-0">
                              <img
                                src={property.main_image?.image || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop"}
                                alt={property.title}
                                className="h-20 w-28 rounded-lg object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold">{property.title}</h3>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {property.city}
                                  </p>
                                </div>
                                <Badge className={statusColors[property.status]}>
                                  {property.status_display}
                                </Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                                <span className="font-medium text-primary">
                                  {formatPrice(property.price_per_month)}/mois
                                </span>
                                <span className="text-muted-foreground">
                                  {property.bedrooms} ch. · {property.surface} m²
                                </span>
                                {property.average_rating && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {property.average_rating}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/properties/${property.id}`}>
                                <Button variant="outline" size="sm" data-testid={`button-view-property-${property.id}`}>
                                  Voir
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-menu-property-${property.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setLocation(`/dashboard/owner/properties/${property.id}/edit`)}
                                  >
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setLocation("/dashboard/owner/availabilities")}
                                  >
                                    Gérer les disponibilités
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucune propriété</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Commencez par ajouter votre première propriété.
                    </p>
                    <Link href="/dashboard/owner/properties/new">
                      <Button className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter une propriété
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pending-visits" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : pendingVisits.length > 0 ? (
                  <div className="space-y-4">
                    {pendingVisits.map((visit) => (
                      <Card key={visit.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {visit.client_details.first_name} {visit.client_details.last_name}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                souhaite visiter <strong>{visit.house_details.title}</strong>
                              </p>
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
                                <p className="mt-2 text-sm text-muted-foreground italic">
                                  "{visit.message}"
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleVisitAction(visit.id, "confirme")}
                                data-testid={`button-confirm-visit-${visit.id}`}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                Confirmer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVisitAction(visit.id, "refuse")}
                                data-testid={`button-refuse-visit-${visit.id}`}
                              >
                                <X className="mr-1 h-4 w-4" />
                                Refuser
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucune demande de visite</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Vous n'avez pas de demande de visite en attente.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pending-rentals" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : pendingRentals.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRentals.map((rental) => (
                      <Card key={rental.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {rental.client_details.first_name} {rental.client_details.last_name}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                souhaite louer <strong>{rental.house_details.title}</strong>
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  {format(new Date(rental.start_date), "d MMM yyyy", { locale: fr })} -{" "}
                                  {format(new Date(rental.end_date), "d MMM yyyy", { locale: fr })}
                                </span>
                                <span className="font-medium text-primary">
                                  {formatPrice(rental.monthly_rent)}/mois
                                </span>
                                <span className="text-muted-foreground">
                                  ({rental.duration_months} mois)
                                </span>
                              </div>
                              {rental.message && (
                                <p className="mt-2 text-sm text-muted-foreground italic">
                                  "{rental.message}"
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRentalAction(rental.id, "confirme")}
                                data-testid={`button-confirm-rental-${rental.id}`}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                Confirmer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRentalAction(rental.id, "refuse")}
                                data-testid={`button-refuse-rental-${rental.id}`}
                              >
                                <X className="mr-1 h-4 w-4" />
                                Refuser
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucune demande de location</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Vous n'avez pas de demande de location en attente.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all-visits" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : allVisits.length > 0 ? (
                  <div className="space-y-4">
                    {allVisits.map((visit) => (
                      <Card key={visit.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  {visit.client_details.first_name} {visit.client_details.last_name}
                                </span>
                                <Badge className={statusColors[visit.status]}>
                                  {visit.status_display}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {visit.house_details.title}
                              </p>
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun historique de visite</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Vous n'avez pas encore reçu de demandes de visite.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all-rentals" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : allRentals.length > 0 ? (
                  <div className="space-y-4">
                    {allRentals.map((rental) => (
                      <Card key={rental.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  {rental.client_details.first_name} {rental.client_details.last_name}
                                </span>
                                <Badge className={statusColors[rental.status]}>
                                  {rental.status_display}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {rental.house_details.title}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  {format(new Date(rental.start_date), "d MMM yyyy", { locale: fr })} -{" "}
                                  {format(new Date(rental.end_date), "d MMM yyyy", { locale: fr })}
                                </span>
                                <span className="font-medium text-primary">
                                  {formatPrice(rental.monthly_rent)}/mois
                                </span>
                                <span className="text-muted-foreground">
                                  Total: {formatPrice(rental.total_amount)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun historique de location</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Vous n'avez pas encore reçu de demandes de location.
                    </p>
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
                          <div className="flex gap-4">
                            <Avatar>
                              <AvatarImage src={review.client_details.profile_picture} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {review.client_details.first_name?.[0]}
                                {review.client_details.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium">
                                    {review.client_details.first_name} {review.client_details.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(review.created_at), "d MMMM yyyy", { locale: fr })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-muted-foreground/30"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {review.comment}
                              </p>
                              {(review.communication_rating || review.responsiveness_rating) && (
                                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  {review.communication_rating && (
                                    <span>Communication: {review.communication_rating}/5</span>
                                  )}
                                  {review.responsiveness_rating && (
                                    <span>Réactivité: {review.responsiveness_rating}/5</span>
                                  )}
                                </div>
                              )}
                            </div>
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
                      Vous n'avez pas encore reçu d'avis de vos locataires.
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
