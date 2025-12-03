import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Calendar, Home, Heart, MessageCircle, Star, Clock, MapPin, ChevronRight, Eye } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import type { VisitBooking, RentalBooking, PaginatedResponse } from "@shared/schema";
import { apiGet } from "@/lib/api";
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
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [rentals, setRentals] = useState<RentalBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [visitsData, rentalsData] = await Promise.all([
          apiGet<PaginatedResponse<VisitBooking>>("/bookings/visits/my_visits/"),
          apiGet<PaginatedResponse<RentalBooking>>("/bookings/rentals/my_rentals/"),
        ]);
        setVisits(visitsData.results);
        setRentals(rentalsData.results);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const upcomingVisits = visits.filter((v) => v.status === "confirme" || v.status === "en_attente");
  const activeRentals = rentals.filter((r) => r.status === "en_cours");

  const formatPrice = (price: string) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(parseFloat(price));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              Bonjour, {user?.first_name} !
            </h1>
            <p className="text-muted-foreground">
              Gérez vos réservations et suivez vos locations
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visites à venir</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingVisits.length}</div>
                <p className="text-xs text-muted-foreground">
                  {upcomingVisits.filter((v) => v.status === "en_attente").length} en attente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Locations actives</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeRentals.length}</div>
                <p className="text-xs text-muted-foreground">
                  En cours de location
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total réservations</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visits.length + rentals.length}</div>
                <p className="text-xs text-muted-foreground">
                  Visites et locations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
              <TabsList>
                <TabsTrigger value="visits" data-testid="tab-visits">
                  Visites ({visits.length})
                </TabsTrigger>
                <TabsTrigger value="rentals" data-testid="tab-rentals">
                  Locations ({rentals.length})
                </TabsTrigger>
              </TabsList>

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
                            <Link href={`/properties/${visit.house}`}>
                              <Button variant="ghost" size="icon">
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
                            <Link href={`/properties/${rental.house}`}>
                              <Button variant="ghost" size="icon">
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
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
