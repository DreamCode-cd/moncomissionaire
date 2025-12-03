import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Heart, Share2, MapPin, Bed, Bath, Maximize2, Calendar,
  Star, Car, Trees, Waves, Dog, Sofa, ChevronLeft, ChevronRight, X,
  Check, User, Clock, MessageCircle
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { PropertyDetail, PropertyReview, PaginatedResponse } from "@shared/schema";
import { apiGet, apiPost } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PropertyDetailPage() {
  const [, params] = useRoute("/properties/:id");
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("");
  const [visitMessage, setVisitMessage] = useState("");
  const [isBookingVisit, setIsBookingVisit] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!params?.id) return;
      
      setIsLoading(true);
      try {
        const [propertyData, reviewsData] = await Promise.all([
          apiGet<PropertyDetail>(`/properties/${params.id}/`),
          apiGet<PaginatedResponse<PropertyReview>>(`/reviews/properties/?house=${params.id}`),
        ]);
        setProperty(propertyData);
        setReviews(reviewsData.results);
      } catch (error) {
        console.error("Failed to fetch property:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails de la propriété",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [params?.id]);

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const handleBookVisit = async () => {
    if (!visitDate || !visitTime || !property) return;

    setIsBookingVisit(true);
    try {
      await apiPost("/bookings/visits/", {
        house: property.id,
        visit_date: format(visitDate, "yyyy-MM-dd"),
        visit_time: visitTime,
        message: visitMessage,
      });
      
      toast({
        title: "Visite réservée",
        description: "Votre demande de visite a été envoyée au propriétaire.",
      });
      
      setVisitDate(undefined);
      setVisitTime("");
      setVisitMessage("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réserver la visite. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsBookingVisit(false);
    }
  };

  const images = property?.images?.length
    ? property.images
    : [{ id: 0, image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop", is_main: true, order: 0, caption: "", created_at: "" }];

  const timeSlots = [
    "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                ))}
              </div>
            </div>
            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-96 rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Propriété non trouvée</h2>
            <p className="mt-2 text-muted-foreground">Cette propriété n'existe pas ou a été supprimée.</p>
            <Link href="/properties">
              <Button className="mt-4">Retour aux propriétés</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Link href="/properties">
              <Button variant="ghost" className="gap-2" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" data-testid="button-share">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" data-testid="button-favorite">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            <div
              className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-l-xl"
              onClick={() => setIsGalleryOpen(true)}
            >
              <img
                src={images[0]?.image}
                alt={property.title}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
              <Badge className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm">
                1 / {images.length}
              </Badge>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-2">
              {images.slice(1, 5).map((image, index) => (
                <div
                  key={image.id}
                  className={`relative aspect-[4/3] cursor-pointer overflow-hidden ${
                    index === 1 ? "rounded-tr-xl" : index === 3 ? "rounded-br-xl" : ""
                  }`}
                  onClick={() => {
                    setSelectedImageIndex(index + 1);
                    setIsGalleryOpen(true);
                  }}
                >
                  <img
                    src={image.image}
                    alt={`${property.title} - ${index + 2}`}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                  {index === 3 && images.length > 5 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-lg font-semibold text-white">
                        +{images.length - 5} photos
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                      {property.title}
                    </h1>
                    <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{property.address}, {property.postal_code} {property.city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {formatPrice(property.price_per_month)}
                      <span className="text-base font-normal text-muted-foreground">/mois</span>
                    </div>
                    {property.deposit && (
                      <p className="text-sm text-muted-foreground">
                        Dépôt: {formatPrice(property.deposit)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4">
                  <Badge variant="outline" className="gap-1 text-base py-1.5 px-3">
                    <Bed className="h-4 w-4" />
                    {property.bedrooms} chambre{property.bedrooms > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-base py-1.5 px-3">
                    <Bath className="h-4 w-4" />
                    {property.bathrooms} salle{property.bathrooms > 1 ? "s" : ""} de bain
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-base py-1.5 px-3">
                    <Maximize2 className="h-4 w-4" />
                    {property.surface} m²
                  </Badge>
                  {property.average_rating && parseFloat(property.average_rating) > 0 && (
                    <Badge variant="outline" className="gap-1 text-base py-1.5 px-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {parseFloat(property.average_rating).toFixed(1)} ({property.total_reviews} avis)
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-semibold mb-4">Description</h2>
                <p className="text-muted-foreground whitespace-pre-line">{property.description}</p>
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-semibold mb-4">Caractéristiques</h2>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {property.is_furnished && (
                    <div className="flex items-center gap-2">
                      <Sofa className="h-5 w-5 text-primary" />
                      <span>Meublé</span>
                    </div>
                  )}
                  {property.has_parking && (
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-primary" />
                      <span>Parking</span>
                    </div>
                  )}
                  {property.has_garden && (
                    <div className="flex items-center gap-2">
                      <Trees className="h-5 w-5 text-primary" />
                      <span>Jardin</span>
                    </div>
                  )}
                  {property.has_pool && (
                    <div className="flex items-center gap-2">
                      <Waves className="h-5 w-5 text-primary" />
                      <span>Piscine</span>
                    </div>
                  )}
                  {property.pets_allowed && (
                    <div className="flex items-center gap-2">
                      <Dog className="h-5 w-5 text-primary" />
                      <span>Animaux acceptés</span>
                    </div>
                  )}
                  {property.floors > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{property.floors} étage{property.floors > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>
              </div>

              {property.amenities?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Équipements</h2>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity) => (
                        <Badge key={amenity.id} variant="secondary">
                          {amenity.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h2 className="text-xl font-semibold mb-4">Avis ({reviews.length})</h2>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar>
                              <AvatarImage src={review.client_details.profile_picture} />
                              <AvatarFallback>
                                {review.client_details.first_name?.[0]}
                                {review.client_details.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">
                                  {review.client_details.first_name} {review.client_details.last_name}
                                </p>
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
                              <p className="mt-2 text-xs text-muted-foreground">
                                {format(new Date(review.created_at), "d MMMM yyyy", { locale: fr })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Aucun avis pour le moment.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Réserver une visite
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isAuthenticated ? (
                    <>
                      <div>
                        <Label className="mb-2 block">Choisir une date</Label>
                        <CalendarComponent
                          mode="single"
                          selected={visitDate}
                          onSelect={setVisitDate}
                          disabled={(date) => date < new Date()}
                          className="rounded-md border"
                        />
                      </div>
                      
                      {visitDate && (
                        <>
                          <div>
                            <Label className="mb-2 block">Choisir un créneau</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {timeSlots.map((time) => (
                                <Button
                                  key={time}
                                  variant={visitTime === time ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setVisitTime(time)}
                                >
                                  {time}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="mb-2 block">Message (optionnel)</Label>
                            <Textarea
                              placeholder="Un message pour le propriétaire..."
                              value={visitMessage}
                              onChange={(e) => setVisitMessage(e.target.value)}
                            />
                          </div>

                          <Button
                            className="w-full"
                            onClick={handleBookVisit}
                            disabled={!visitTime || isBookingVisit}
                            data-testid="button-book-visit"
                          >
                            {isBookingVisit ? "Réservation..." : "Réserver la visite"}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <User className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Connectez-vous pour réserver une visite
                      </p>
                      <Link href="/login">
                        <Button className="mt-4 w-full" data-testid="button-login-to-book">
                          Se connecter
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Propriétaire</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={property.owner.profile_picture} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {property.owner.first_name?.[0]}
                        {property.owner.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {property.owner.first_name} {property.owner.last_name}
                      </p>
                      {property.owner.is_verified && (
                        <Badge variant="secondary" className="mt-1">
                          <Check className="mr-1 h-3 w-3" />
                          Vérifié
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Membre depuis {format(new Date(property.owner.created_at), "MMMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>Temps de réponse: ~2h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-5xl p-0">
          <DialogTitle className="sr-only">Galerie de photos</DialogTitle>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 rounded-full bg-background/80"
              onClick={() => setIsGalleryOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="relative aspect-video">
              <img
                src={images[selectedImageIndex]?.image}
                alt={`${property.title} - ${selectedImageIndex + 1}`}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="absolute inset-y-0 left-0 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 rounded-full bg-background/80"
                onClick={() =>
                  setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)
                }
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>

            <div className="absolute inset-y-0 right-0 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="mr-2 rounded-full bg-background/80"
                onClick={() =>
                  setSelectedImageIndex((prev) => (prev + 1) % images.length)
                }
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="bg-background/80">
                {selectedImageIndex + 1} / {images.length}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
