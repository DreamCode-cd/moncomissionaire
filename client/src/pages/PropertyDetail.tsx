import { EtatVide } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { useState, useEffect, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useRoute, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  MapPin, Bed, Bath, Maximize, Calendar, User, ChevronLeft, ChevronRight, X,
  Droplets, Zap, Car, Trees, Sofa, Wind, Shield, Star, Share2, Heart,
  Images, SquarePen, Send, ChevronDown, ChevronUp, LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
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
import { getDjangoImageUrl, getVilleName } from '@/lib/utils';
import type { BienDetail, BienList, AvisBien, PaginatedResponse } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LazyImage } from '@/components/ui/lazy-image';
import { formaterPrix } from '@/lib/prix';
import { auteurAnnonce, initiale, libelleGarantie } from '@/lib/annonce';

const villaImage = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80";
const apartmentImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80";
const studioImage = "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80";
const houseImage = "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80";


const defaultImages: Record<string, string> = {
  villa: villaImage,
  appartement: apartmentImage,
  studio: studioImage,
  maison: houseImage,
  terrain: houseImage,
};

const amenities = [
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
  
  const [reviewNote, setReviewNote] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [userReviewId, setUserReviewId] = useState<number | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [allReviewsDialogOpen, setAllReviewsDialogOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

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
    if (!galleryOpen) {
      setIsZoomed(false);
    }
  }, [galleryOpen, carouselApi]);

  useEffect(() => {
    setIsZoomed(false);
  }, [currentPhotoIndex]);

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
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    refetchOnWindowFocus: true,
  });

  const { data: reviews } = useQuery<PaginatedResponse<AvisBien>>({
    queryKey: ['/api/v1/biens/', propertyId, 'avis'],
    enabled: !!propertyId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: isFavorite, refetch: refetchFavorite } = useQuery({
    queryKey: ['/api/v1/biens/favoris/check/', propertyId],
    queryFn: async (): Promise<{ is_favorite: boolean }> => {
      const response = await api.get(`/api/v1/biens/favoris/check/?bien_id=${propertyId}`) as any;
      console.log('Favorite check response:', response);
      let isFav = false;
      if (typeof response === 'boolean') {
        isFav = response;
      } else if (response?.is_favori !== undefined) {
        isFav = response.is_favori;
      } else if (response?.is_favorite !== undefined) {
        isFav = response.is_favorite;
      } else if (response?.is_favoris !== undefined) {
        isFav = response.is_favoris;
      } else if (response?.favorited !== undefined) {
        isFav = response.favorited;
      } else if (response?.favorite !== undefined) {
        isFav = response.favorite;
      } else if (response?.exists !== undefined) {
        isFav = response.exists;
      } else if (response?.result !== undefined) {
        isFav = response.result;
      }
      return { is_favorite: isFav };
    },
    enabled: !!propertyId && isAuthenticated,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['/api/v1/biens/', 'suggestions', propertyId, property?.type_bien],
    queryFn: async (): Promise<PaginatedResponse<BienList>> => {
      const typeBien = property?.type_bien ? `&type_bien=${property.type_bien}` : '';
      const response = await api.get(`/api/v1/biens/?page_size=4&exclude=${propertyId}${typeBien}`);
      return response as PaginatedResponse<BienList>;
    },
    enabled: !!propertyId && !!property?.type_bien,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/biens/favoris/toggle/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ bien_id: parseInt(propertyId!) }),
      });
      const data = await response.json();
      return { status: response.status, data };
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/v1/biens/favoris/check/', propertyId] });
      const previousFavorite = queryClient.getQueryData(['/api/v1/biens/favoris/check/', propertyId]);
      queryClient.setQueryData(['/api/v1/biens/favoris/check/', propertyId], (old: any) => ({
        is_favorite: !old?.is_favorite
      }));
      return { previousFavorite };
    },
    onSuccess: (response) => {
      const isNowFavorite = response.status === 201;
      queryClient.setQueryData(['/api/v1/biens/favoris/check/', propertyId], {
        is_favorite: isNowFavorite
      });
      toast({
        title: isNowFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
        description: isNowFavorite 
          ? 'Ce bien a été ajouté à vos favoris'
          : 'Ce bien a été retiré de vos favoris',
      });
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(['/api/v1/biens/favoris/check/', propertyId], context?.previousFavorite);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (!property) return;
    
    const mainPhoto = property.photos?.find(p => p.is_principale) || property.photos?.[0] || property.photo_principale;
    const imageUrl = mainPhoto?.image || '';
    const propertyType = property.type_bien_display || property.type_bien || 'Propriété';
    const locationParts = [property.quartier, property.commune, getVilleName(property.ville, property.ville_nom, property.ville_detail)].filter(Boolean);
    const location = locationParts.join(', ') || 'Non spécifié';
    const priceNum = property.prix_mensuel ? parseFloat(property.prix_mensuel) : NaN;
    const price = !isNaN(priceNum) ? `${priceNum.toLocaleString('fr-FR')} USD/mois` : '';
    const descParts = [`${propertyType} à louer à ${location}`];
    if (price) descParts.push(price);
    if (property.nombre_chambres) descParts.push(`${property.nombre_chambres} chambre(s)`);
    if (property.superficie) descParts.push(`${property.superficie} m²`);
    const description = descParts.join(' - ') + '.';
    
    const previousTitle = document.title;
    document.title = `${property.titre} - VillaGo`;
    
    const originalValues: Record<string, string | null> = {};
    
    const setMetaTag = (propName: string, content: string) => {
      let element = document.querySelector(`meta[property="${propName}"]`) as HTMLMetaElement;
      if (!element) {
        originalValues[propName] = null;
        element = document.createElement('meta');
        element.setAttribute('property', propName);
        document.head.appendChild(element);
      } else {
        originalValues[propName] = element.getAttribute('content');
      }
      element.setAttribute('content', content);
    };
    
    setMetaTag('og:title', `${property.titre} - VillaGo`);
    setMetaTag('og:description', description);
    if (imageUrl) {
      setMetaTag('og:image', imageUrl);
    }
    setMetaTag('og:url', window.location.href);
    setMetaTag('og:type', 'website');
    setMetaTag('og:locale', 'fr_FR');
    setMetaTag('og:site_name', 'VillaGo');
    
    return () => {
      document.title = previousTitle || 'VillaGo';
      Object.entries(originalValues).forEach(([propName, originalContent]) => {
        const element = document.querySelector(`meta[property="${propName}"]`) as HTMLMetaElement;
        if (element) {
          if (originalContent === null) {
            element.remove();
          } else {
            element.setAttribute('content', originalContent);
          }
        }
      });
    };
  }, [property]);


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

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const handleShare = async () => {
    if (!property) return;
    
    const propertyType = property.type_bien_display || property.type_bien || 'Propriété';
    const locationParts = [property.quartier, property.commune, getVilleName(property.ville, property.ville_nom, property.ville_detail)].filter(Boolean);
    const location = locationParts.join(', ') || 'Non spécifié';
    const priceNum = property.prix_mensuel ? parseFloat(property.prix_mensuel) : NaN;
    const priceText = !isNaN(priceNum) ? ` - ${priceNum.toLocaleString('fr-FR')} USD/mois` : '';
    
    const shareText = `${propertyType} à louer à ${location}${priceText}. Découvrez cette propriété sur VillaGo !`;
    
    const shareData: ShareData = {
      title: `${property.titre} - VillaGo`,
      text: shareText,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: 'Propriété partagée',
          description: 'Merci d\'avoir partagé cette propriété !',
        });
      } else {
        const fullText = `${shareText}\n\n${window.location.href}`;
        await navigator.clipboard.writeText(fullText);
        toast({
          title: 'Lien copié',
          description: 'Le texte et le lien ont été copiés dans le presse-papiers. Vous pouvez maintenant le partager !',
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const fullText = `${shareText}\n\n${window.location.href}`;
        await navigator.clipboard.writeText(fullText);
        toast({
          title: 'Lien copié',
          description: 'Le texte et le lien ont été copiés dans le presse-papiers. Vous pouvez maintenant le partager !',
        });
      }
    }
  };

  const reviewMutation = useMutation({
    mutationFn: async (data: { note: number; commentaire: string }) => {
      if (userReviewId && isEditingReview) {
        return api.patch(`/api/v1/biens/avis-biens/${userReviewId}/`, data);
      } else {
        return api.post('/api/v1/biens/avis-biens/', {
          ...data,
          bien: parseInt(propertyId!),
        });
      }
    },
    onSuccess: () => {
      const wasEditing = isEditingReview;
      toast({
        title: wasEditing ? 'Avis modifié' : 'Avis ajouté',
        description: wasEditing 
          ? 'Votre avis a été modifié avec succès' 
          : 'Votre avis a été ajouté avec succès',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/', propertyId, 'avis'] });
      setIsEditingReview(false);
      setReviewNote(0);
      setReviewComment('');
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    },
  });

  const handleSubmitReview = () => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }

    if (reviewNote < 1 || reviewNote > 5) {
      toast({
        title: 'Erreur',
        description: 'Veuillez donner une note entre 1 et 5',
        variant: 'destructive',
      });
      return;
    }

    reviewMutation.mutate({ note: reviewNote, commentaire: reviewComment });
  };

  const startEditReview = (review: AvisBien) => {
    setUserReviewId(review.id);
    setReviewNote(review.note);
    setReviewComment(review.commentaire);
    setIsEditingReview(true);
  };

  const cancelEditReview = () => {
    setIsEditingReview(false);
    setReviewNote(0);
    setReviewComment('');
  };

  const existingUserReview = reviews?.results?.find(r => r.client.id === user?.id);

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
          <Button variant="ghost" size="icon" onClick={handleShare} data-testid="button-share">
            <Share2 className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggleFavorite}
            disabled={toggleFavoriteMutation.isPending}
            className={isFavorite?.is_favorite ? 'text-favori hover:text-favori/80' : ''}
            data-testid="button-favorite"
          >
            {toggleFavoriteMutation.isPending ? (
              <LoaderCircle className="w-5 h-5 animate-spin" />
            ) : (
              <Heart 
                className={`w-5 h-5 transition-all duration-300 ${
                  isFavorite?.is_favorite 
                    ? 'fill-favori text-favori scale-110' 
                    : 'text-foreground hover:text-favori/80'
                }`} 
              />
            )}
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
            loading="eager"
            decoding="async"
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
              <BadgeStatut
                famille="location"
                valeur={property.statut_location}
                libelle={property.statut_location_display}
              />
            )}
            {property.statut_location === 'loue' && (
              <BadgeStatut
                famille="location"
                valeur={property.statut_location}
                libelle={property.statut_location_display}
              />
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
                className="bg-statut-favorable-fond text-statut-favorable border-transparent backdrop-blur-sm"
                data-testid="badge-validation-valid"
              >
                <Shield className="w-3 h-3 mr-1" />
                {/* « Vérifié » laissait croire à un contrôle du bien ou du
                    bailleur. Il s'agit seulement de la relecture de
                    l'annonce par la modération. */}
                Annonce validée
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
                    {property.quartier}, {property.commune || getVilleName(property.ville, property.ville_nom, property.ville_detail)}
                  </span>
                </div>
              </div>
              {averageRating && (
                <div className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 fill-note text-note" />
                  <span className="font-semibold">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">
                    ({reviews?.count})
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-3xl font-bold text-primary" data-testid="text-property-price">
                {formaterPrix(property.prix_mensuel, property.devise)}
              </span>
              <span className="text-muted-foreground">/mois</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-garantie">
              {property.garantie_mois > 0
                ? `Garantie : ${libelleGarantie(property.garantie_mois)}, soit ${formaterPrix(property.garantie, property.devise)}`
                : 'Aucune garantie demandée'}
            </p>
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
                <span className="text-xl font-bold">{property.superficie ?? '—'}</span>
                <span className="text-xs text-muted-foreground">{property.superficie ? 'm²' : 'Surface non précisée'}</span>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <div className="relative">
              <p 
                className={`text-muted-foreground leading-relaxed break-words whitespace-pre-wrap ${
                  !isDescriptionExpanded && property.description.length > 300 ? 'line-clamp-4' : ''
                }`}
                data-testid="text-property-description"
              >
                {property.description}
              </p>
              {property.description.length > 300 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 gap-1"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  data-testid="button-toggle-description"
                >
                  {isDescriptionExpanded ? (
                    <>
                      Voir moins
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Voir plus
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {(property.eau || property.electricite) && (
            <>
              <Separator />
              <div>
                {/* La première question d'un locataire à Lubumbashi : l'eau
                    et le courant sont-ils réguliers ? */}
                <h2 className="text-lg font-semibold mb-3">Eau et courant</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {property.eau && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg" data-testid="text-eau">
                      <Droplets className="w-5 h-5 text-primary" />
                      <span>{property.eau_display}</span>
                    </div>
                  )}
                  {property.electricite && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg" data-testid="text-electricite">
                      <Zap className="w-5 h-5 text-primary" />
                      <span>{property.electricite_display}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

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
              <span>
                {[property.quartier, property.commune, getVilleName(property.ville, property.ville_nom, property.ville_detail)]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              L’adresse exacte vous est donnée au moment de la visite, une fois votre demande acceptée.
            </p>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{auteurAnnonce(property).libelle}</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const { profil, libelle } = auteurAnnonce(property);
                const nom = profil?.full_name || libelle;
                const avatar = profil?.avatar ? getDjangoImageUrl(profil.avatar) || undefined : undefined;
                return (
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initiale(profil)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold" data-testid="text-owner-name">{nom}</p>
                      {profil?.identite_verifiee && (
                        <p className="flex items-center gap-1 text-sm font-medium text-statut-favorable" data-testid="badge-identite-verifiee">
                          <ShieldCheck className="h-4 w-4" /> Identité vérifiée par l’équipe VillaGo
                        </p>
                      )}
                      {/* Plus de « Propriétaire vérifié » : aucune vérification
                          d'identité n'existe encore, il ne faut pas l'affirmer. */}
                      <p className="text-sm text-muted-foreground">
                        {libelle === 'Commissionnaire'
                          ? 'C’est lui qui reçoit votre demande et vous fait visiter.'
                          : 'Votre demande de visite est suivie par l’équipe VillaGo.'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Separator />
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Avis {reviews?.count ? `(${reviews.count})` : ''}
            </h2>
            
            {isAuthenticated && user?.role === 'client' && (
              <>
                {existingUserReview && !isEditingReview ? (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">Votre avis</h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => startEditReview(existingUserReview)}
                          data-testid="button-edit-my-review"
                        >
                          <SquarePen className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < existingUserReview.note
                                ? 'fill-note text-note'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground text-sm">{existingUserReview.commentaire}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-3">
                        {isEditingReview ? 'Modifier votre avis' : 'Laisser un avis'}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2 block">Votre note</Label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewNote(star)}
                                className="p-1"
                                data-testid={`button-star-${star}`}
                              >
                                <Star
                                  className={`w-6 h-6 transition-colors ${
                                    star <= reviewNote
                                      ? 'fill-note text-note'
                                      : 'text-muted-foreground hover:text-note'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="review-comment">Votre commentaire</Label>
                          <Textarea
                            id="review-comment"
                            placeholder="Partagez votre expérience avec ce bien (optionnel)..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            className="mt-2"
                            data-testid="input-review-comment"
                          />
                        </div>
                        <div className="flex gap-2">
                          {isEditingReview && (
                            <Button 
                              variant="outline"
                              onClick={cancelEditReview}
                              data-testid="button-cancel-review"
                            >
                              Annuler
                            </Button>
                          )}
                          <Button 
                            onClick={handleSubmitReview}
                            disabled={reviewMutation.isPending}
                            data-testid="button-submit-review"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {reviewMutation.isPending 
                              ? 'Envoi...' 
                              : isEditingReview 
                                ? 'Modifier mon avis' 
                                : 'Publier mon avis'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!isAuthenticated && (
              <Card className="mb-4">
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground mb-3">
                    Connectez-vous pour laisser un avis
                  </p>
                  <Button onClick={() => setLocation('/login')} data-testid="button-login-to-review">
                    Se connecter
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {reviews && reviews.results.length > 0 ? (
              <div className="space-y-4">
                {reviews.results
                  .filter(review => review.client.id !== user?.id)
                  .slice(0, 5)
                  .map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={review.client.photo} />
                          <AvatarFallback>
                            {review.client.first_name?.[0]?.toUpperCase() || 'U'}
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
                                    ? 'fill-note text-note'
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
                {reviews.results.filter(review => review.client.id !== user?.id).length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setAllReviewsDialogOpen(true)}
                    data-testid="button-show-all-reviews"
                  >
                    Voir tous les avis ({reviews.results.filter(review => review.client.id !== user?.id).length})
                  </Button>
                )}
                {reviews.results.filter(review => review.client.id !== user?.id).length === 0 && !existingUserReview && (
                  <EtatVide
                    icone={Star}
                    titre="Aucun avis"
                    description="Soyez la première personne à donner son avis sur ce bien."
                    className="py-6"
                  />
                )}
              </div>
            ) : (
              <EtatVide
                icone={Star}
                titre="Aucun avis"
                description="Soyez la première personne à donner son avis sur ce bien."
                className="py-6"
              />
            )}
          </div>

          {suggestions && suggestions.results && suggestions.results.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-4">Biens similaires</h2>
                <div className="grid grid-cols-2 gap-4">
                  {suggestions.results.slice(0, 4).map((bien) => {
                    const image = getDjangoImageUrl(bien.photo_principale?.image) || 
                      defaultImages[bien.type_bien] || houseImage;
                    return (
                      <Link key={bien.id} href={`/property/${bien.id}`}>
                        <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                          <div className="aspect-video relative">
                            <LazyImage 
                              src={image} 
                              alt={bien.titre}
                              className="w-full h-full"
                            />
                            <Badge 
                              className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-xs"
                            >
                              {bien.type_bien_display}
                            </Badge>
                          </div>
                          <CardContent className="p-3">
                            <h3 className="font-medium text-sm line-clamp-1">{bien.titre}</h3>
                            <div className="flex items-center text-muted-foreground text-xs mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="line-clamp-1">{bien.quartier}, {getVilleName(bien.ville, bien.ville_nom, bien.ville_detail)}</span>
                            </div>
                            <p className="text-primary font-semibold text-sm mt-2">
                              {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                              }).format(parseFloat(bien.prix_mensuel))}/mois
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background border-t p-4 flex items-center gap-4">
          <div className="flex-1">
            <span className="text-2xl font-bold text-primary">
              {formaterPrix(property.prix_mensuel, property.devise)}
            </span>
            <span className="text-muted-foreground">/mois</span>
          </div>
          
          {property.statut_location !== 'loue' ? (
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
                  <p className="text-xs text-muted-foreground mb-1">Sélectionnez une date (jj/mm/aaaa)</p>
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
                  <p className="text-xs text-muted-foreground mb-1">Sélectionnez une heure (hh:mm)</p>
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
          ) : (
            <Button size="lg" variant="secondary" disabled>
              Bien loué
            </Button>
          )}
        </div>

        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="w-[95vw] max-w-5xl h-[90vh] p-0 gap-0 bg-black border-none flex flex-col items-center justify-center">
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
            
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <Carousel
                className="w-full flex-1 flex items-center justify-center"
                opts={{
                  loop: true,
                  startIndex: currentPhotoIndex,
                }}
                setApi={setCarouselApi}
              >
                <CarouselContent className="h-full ml-0 items-center justify-center">
                  {property.photos && property.photos.length > 0 ? (
                    property.photos.map((photo, index) => (
                      <CarouselItem key={photo.id} className="h-full pl-0 flex items-center justify-center overflow-hidden">
                        <TransformWrapper
                          initialScale={1}
                          minScale={1}
                          maxScale={4}
                          centerOnInit
                          wheel={{ step: 0.1 }}
                          pinch={{ step: 5 }}
                          doubleClick={{ mode: "reset" }}
                          onTransformed={(ref) => setIsZoomed(ref.state.scale > 1)}
                        >
                          <TransformComponent
                            wrapperClass="!w-full !h-full flex items-center justify-center"
                            contentClass="flex items-center justify-center"
                          >
                            <img
                              src={getDjangoImageUrl(photo.image) || mainImage}
                              alt={`Photo ${index + 1}`}
                              className="max-w-[90vw] max-h-[calc(90vh-140px)] object-contain select-none mx-auto"
                              draggable={false}
                              data-testid={`img-gallery-${index}`}
                            />
                          </TransformComponent>
                        </TransformWrapper>
                      </CarouselItem>
                    ))
                  ) : (
                    <CarouselItem className="h-full pl-0 flex items-center justify-center overflow-hidden">
                      <TransformWrapper
                        initialScale={1}
                        minScale={1}
                        maxScale={4}
                        centerOnInit
                        wheel={{ step: 0.1 }}
                        pinch={{ step: 5 }}
                        doubleClick={{ mode: "reset" }}
                        onTransformed={(ref) => setIsZoomed(ref.state.scale > 1)}
                      >
                        <TransformComponent
                          wrapperClass="!w-full !h-full flex items-center justify-center"
                          contentClass="flex items-center justify-center"
                        >
                          <img
                            src={mainImage}
                            alt="Photo principale"
                            className="max-w-[90vw] max-h-[calc(90vh-140px)] object-contain select-none mx-auto"
                            draggable={false}
                            data-testid="img-gallery-main"
                          />
                        </TransformComponent>
                      </TransformWrapper>
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

        <Dialog open={allReviewsDialogOpen} onOpenChange={setAllReviewsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Tous les avis ({reviews?.results?.filter(review => review.client.id !== user?.id).length || 0})</DialogTitle>
              <DialogDescription>
                Découvrez les avis des autres utilisateurs sur ce bien
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {reviews?.results
                  ?.filter(review => review.client.id !== user?.id)
                  .map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={review.client.photo} />
                          <AvatarFallback>
                            {review.client.first_name?.[0]?.toUpperCase() || 'U'}
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
                                    ? 'fill-note text-note'
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
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
