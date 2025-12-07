import { useState, useEffect, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, Bed, Bath, Maximize, Calendar, User, ChevronLeft, ChevronRight, X,
  Droplets, Zap, Car, Trees, Sofa, Wind, Shield, Star, Share2, Heart, Navigation,
  Images
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { MapView } from '@/components/property/MapView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getDjangoImageUrl } from '@/lib/utils';
import type { BienDetail, AvisBien, PaginatedResponse } from '@shared/schema';

import villaImage from '@assets/generated_images/luxury_villa_hero_image.png';
import apartmentImage from '@assets/generated_images/modern_apartment_interior.png';
import studioImage from '@assets/generated_images/cozy_studio_apartment.png';
import houseImage from '@assets/generated_images/family_house_with_garden.png';
import duplexImage from '@assets/generated_images/duplex_penthouse_terrace.png';

const defaultImages: Record<string, string> = {
  villa: villaImage,
  appartement: apartmentImage,
  studio: studioImage,
  maison: houseImage,
  duplex: duplexImage,
  terrain: houseImage,
};

const amenities = [
  { key: 'eau_courante', icon: Droplets, label: 'Eau courante' },
  { key: 'electricite', icon: Zap, label: 'Électricité' },
  { key: 'parking', icon: Car, label: 'Parking' },
  { key: 'jardin', icon: Trees, label: 'Jardin' },
  { key: 'meuble', icon: Sofa, label: 'Meublé' },
  { key: 'climatisation', icon: Wind, label: 'Climatisation' },
  { key: 'gardien', icon: Shield, label: 'Gardien' },
];

export default function PropertyDetail() {
  const [, params] = useRoute('/property/:id');
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitMessage, setVisitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const propertyId = params?.id;

  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      setCurrentPhotoIndex(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (galleryOpen && carouselApi) {
      carouselApi.scrollTo(currentPhotoIndex, true);
    }
  }, [galleryOpen, carouselApi]);

  const openGalleryAt = useCallback((index: number) => {
    setCurrentPhotoIndex(index);
    setGalleryOpen(true);
  }, []);

  const scrollPrev = useCallback(() => {
    carouselApi?.scrollPrev();
  }, [carouselApi]);

  const scrollNext = useCallback(() => {
    carouselApi?.scrollNext();
  }, [carouselApi]);

  const { data: property, isLoading } = useQuery<BienDetail>({
    queryKey: ['/api/v1/biens/', propertyId],
    enabled: !!propertyId,
  });

  const { data: reviews } = useQuery<PaginatedResponse<AvisBien>>({
    queryKey: ['/api/v1/biens/', propertyId, 'avis'],
    enabled: !!propertyId,
  });

  const formatPrice = (price?: string) => {
    if (!price) return 'N/A';
    const num = parseFloat(price);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleRequestVisit = async () => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }

    if (!visitDate || !visitTime) {
      toast({
        title: 'Erreur',
        description: 'Veuillez renseigner la date et l\'heure souhaitées',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/v1/visites/client/demandes/', {
        bien: propertyId,
        date_souhaitee: visitDate,
        heure_souhaitee: visitTime,
        message: visitMessage,
      });
      toast({
        title: 'Demande envoyée',
        description: 'Votre demande de visite a été envoyée avec succès.',
      });
      setVisitDialogOpen(false);
      setVisitDate('');
      setVisitTime('');
      setVisitMessage('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
          <Skeleton className="w-full aspect-[16/9] rounded-lg" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">Bien non trouvé</p>
          <Button onClick={() => setLocation('/search')}>Retour à la recherche</Button>
        </div>
      </Layout>
    );
  }

  const mainImage = getDjangoImageUrl(property.photo_principale?.image) || 
    getDjangoImageUrl(property.photos?.[0]?.image) || 
    defaultImages[property.type_bien] || 
    houseImage;

  const availableAmenities = amenities.filter(
    a => property[a.key as keyof BienDetail]
  );

  const averageRating = reviews?.results?.length 
    ? reviews.results.reduce((acc, r) => acc + r.note, 0) / reviews.results.length
    : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-24">
        <div className="sticky top-14 z-30 bg-background border-b px-4 py-2 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/search')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium flex-1 line-clamp-1">{property.titre}</span>
          <Button variant="ghost" size="icon" data-testid="button-share">
            <Share2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-favorite">
            <Heart className="w-5 h-5" />
          </Button>
        </div>

        <div 
          className="relative aspect-[4/3] md:aspect-[16/9] cursor-pointer group"
          onClick={() => openGalleryAt(0)}
          data-testid="container-main-image"
        >
          <img
            src={mainImage}
            alt={property.titre}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
          
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
            <Badge 
              variant="secondary" 
              className="bg-background/90 backdrop-blur-sm"
              data-testid="badge-property-type"
            >
              {property.type_bien_display}
            </Badge>
            {property.statut_location === 'disponible' && (
              <Badge 
                className="bg-green-600 text-white"
                data-testid="badge-status-available"
              >
                {property.statut_location_display}
              </Badge>
            )}
            {property.statut_location === 'loue' && (
              <Badge 
                className="bg-red-600 text-white"
                data-testid="badge-status-rented"
              >
                {property.statut_location_display}
              </Badge>
            )}
            {property.statut_location === 'en_visite' && (
              <Badge 
                className="bg-amber-500 text-white"
                data-testid="badge-status-visiting"
              >
                {property.statut_location_display}
              </Badge>
            )}
            {property.statut_location === 'indisponible' && (
              <Badge 
                variant="secondary"
                data-testid="badge-status-unavailable"
              >
                {property.statut_location_display}
              </Badge>
            )}
          </div>

          <div className="absolute top-4 right-4 pointer-events-none">
            {property.statut_validation === 'valide' && (
              <Badge 
                className="bg-green-600/90 text-white backdrop-blur-sm"
                data-testid="badge-validation-valid"
              >
                <Shield className="w-3 h-3 mr-1" />
                Vérifié
              </Badge>
            )}
            {property.statut_validation === 'en_attente' && (
              <Badge 
                className="bg-amber-500/90 text-white backdrop-blur-sm"
                data-testid="badge-validation-pending"
              >
                En attente
              </Badge>
            )}
          </div>
          
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            {property.photos && property.photos.length > 1 && (
              <Badge 
                variant="secondary" 
                className="bg-background/90 backdrop-blur-sm"
              >
                <Images className="w-3 h-3 mr-1" />
                {property.photos.length} photos
              </Badge>
            )}
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
              <Images className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2" data-testid="text-property-title">
                  {property.titre}
                </h1>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span data-testid="text-property-location">
                    {property.quartier}, {property.commune || property.ville}
                  </span>
                </div>
              </div>
              {averageRating && (
                <div className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">
                    ({reviews?.count})
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-3xl font-bold text-primary" data-testid="text-property-price">
                {formatPrice(property.prix_mensuel)}
              </span>
              <span className="text-muted-foreground">/mois</span>
            </div>
            {property.garantie && (
              <p className="text-sm text-muted-foreground mt-1">
                Garantie: {formatPrice(property.garantie)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <Bed className="w-6 h-6 mb-2 text-muted-foreground" />
                <span className="text-xl font-bold">{property.nombre_chambres}</span>
                <span className="text-xs text-muted-foreground">Chambres</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <Bath className="w-6 h-6 mb-2 text-muted-foreground" />
                <span className="text-xl font-bold">{property.nombre_salles_bain}</span>
                <span className="text-xs text-muted-foreground">Salles de bain</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <Maximize className="w-6 h-6 mb-2 text-muted-foreground" />
                <span className="text-xl font-bold">{property.superficie}</span>
                <span className="text-xs text-muted-foreground">m²</span>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-property-description">
              {property.description}
            </p>
          </div>

          {availableAmenities.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-3">Équipements</h2>
                <div className="grid grid-cols-2 gap-3">
                  {availableAmenities.map(({ key, icon: Icon, label }) => (
                    <div 
                      key={key} 
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                      data-testid={`amenity-${key}`}
                    >
                      <Icon className="w-5 h-5 text-primary" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h2 className="text-lg font-semibold mb-3">Localisation</h2>
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{property.adresse}, {property.quartier}, {property.commune || property.ville}</span>
            </div>
            <MapView 
              singleProperty={property}
              height="250px"
            />
            {property.latitude && property.longitude && (
              <Button 
                variant="outline" 
                className="mt-3 w-full"
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`,
                    '_blank'
                  );
                }}
                data-testid="button-directions"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Obtenir l'itinéraire
              </Button>
            )}
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Propriétaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={property.proprietaire.photo} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {property.proprietaire.first_name?.[0]}
                    {property.proprietaire.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">
                    {property.proprietaire.first_name} {property.proprietaire.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">Propriétaire vérifié</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {reviews && reviews.results.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Avis ({reviews.count})
                </h2>
                <div className="space-y-4">
                  {reviews.results.slice(0, 3).map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={review.client.photo} />
                            <AvatarFallback>
                              {review.client.first_name?.[0]}
                              {review.client.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {review.client.first_name} {review.client.last_name}
                            </p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < review.note
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {review.commentaire}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background border-t p-4 flex items-center gap-4">
          <div className="flex-1">
            <span className="text-2xl font-bold text-primary">
              {formatPrice(property.prix_mensuel)}
            </span>
            <span className="text-muted-foreground">/mois</span>
          </div>
          
          <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" data-testid="button-request-visit">
                <Calendar className="mr-2 h-5 w-5" />
                Visiter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Demander une visite</DialogTitle>
                <DialogDescription>
                  Remplissez le formulaire pour demander une visite de ce bien.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="visit-date">Date souhaitée</Label>
                  <Input
                    id="visit-date"
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="input-visit-date"
                  />
                </div>
                <div>
                  <Label htmlFor="visit-time">Heure souhaitée</Label>
                  <Input
                    id="visit-time"
                    type="time"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    data-testid="input-visit-time"
                  />
                </div>
                <div>
                  <Label htmlFor="visit-message">Message (optionnel)</Label>
                  <Textarea
                    id="visit-message"
                    placeholder="Précisez vos disponibilités ou questions..."
                    value={visitMessage}
                    onChange={(e) => setVisitMessage(e.target.value)}
                    data-testid="input-visit-message"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleRequestVisit}
                  disabled={isSubmitting}
                  data-testid="button-submit-visit"
                >
                  {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-5xl w-full h-[90vh] p-0 gap-0 bg-black border-none">
            <DialogHeader className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-white font-medium">
                  {currentPhotoIndex + 1} / {property.photos?.length || 1}
                </DialogTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setGalleryOpen(false)}
                  className="text-white hover:bg-white/20 no-default-hover-elevate"
                  data-testid="button-close-gallery"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <DialogDescription className="sr-only">
                Galerie photos du bien - Swipez pour naviguer
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative h-full flex flex-col">
              <Carousel
                className="flex-1 h-full"
                opts={{
                  loop: true,
                  startIndex: currentPhotoIndex,
                }}
                setApi={setCarouselApi}
              >
                <CarouselContent className="h-full ml-0">
                  {property.photos && property.photos.length > 0 ? (
                    property.photos.map((photo, index) => (
                      <CarouselItem key={photo.id} className="h-full pl-0 flex items-center justify-center">
                        <img
                          src={getDjangoImageUrl(photo.image) || mainImage}
                          alt={`Photo ${index + 1}`}
                          className="max-w-full max-h-[calc(90vh-120px)] object-contain select-none"
                          draggable={false}
                          data-testid={`img-gallery-${index}`}
                        />
                      </CarouselItem>
                    ))
                  ) : (
                    <CarouselItem className="h-full pl-0 flex items-center justify-center">
                      <img
                        src={mainImage}
                        alt="Photo principale"
                        className="max-w-full max-h-[calc(90vh-120px)] object-contain select-none"
                        draggable={false}
                        data-testid="img-gallery-main"
                      />
                    </CarouselItem>
                  )}
                </CarouselContent>
              </Carousel>

              {property.photos && property.photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full h-12 w-12 no-default-hover-elevate"
                    onClick={scrollPrev}
                    data-testid="button-gallery-prev"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full h-12 w-12 no-default-hover-elevate"
                    onClick={scrollNext}
                    data-testid="button-gallery-next"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </Button>
                </>
              )}
            </div>
            
            {property.photos && property.photos.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex gap-2 overflow-x-auto justify-center py-2 scrollbar-hide">
                  {property.photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setCurrentPhotoIndex(index);
                        carouselApi?.scrollTo(index);
                      }}
                      className={`w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        index === currentPhotoIndex 
                          ? 'border-white scale-110 shadow-lg' 
                          : 'border-transparent opacity-50 hover:opacity-100 hover:border-white/50'
                      }`}
                      data-testid={`button-gallery-thumb-${index}`}
                    >
                      <img
                        src={getDjangoImageUrl(photo.image) || defaultImages[property.type_bien] || houseImage}
                        alt={`Miniature ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5 mt-3">
                  {property.photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentPhotoIndex(index);
                        carouselApi?.scrollTo(index);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        index === currentPhotoIndex 
                          ? 'w-6 bg-white' 
                          : 'w-1.5 bg-white/40 hover:bg-white/60'
                      }`}
                      data-testid={`button-gallery-dot-${index}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
