import { useState, useRef, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, X, Star, ImagePlus, Trash2, Loader2 } from 'lucide-react';

interface Ville {
  id: number;
  nom: string;
}

interface VillesResponse {
  results?: Ville[];
  count?: number;
}
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { getDjangoImageUrl, getVilleId } from '@/lib/utils';
import { bienCreateSchema, type BienCreateInput, type BienDetail } from '@shared/schema';

const propertyTypes = [
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'villa', label: 'Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'terrain', label: 'Terrain' },
];

const locationStatuses = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_visite', label: 'En visite' },
  { value: 'loue', label: 'Loué' },
  { value: 'indisponible', label: 'Indisponible' },
];

interface PhotoPreview {
  id?: number;
  file?: File;
  preview: string;
  isExisting: boolean;
  isPrincipal: boolean;
}

export default function EditProperty() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [principalIndex, setPrincipalIndex] = useState(0);
  const [photosToDelete, setPhotosToDelete] = useState<number[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [locationStatus, setLocationStatus] = useState('disponible');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: property, isLoading } = useQuery<BienDetail>({
    queryKey: ['/api/v1/biens/proprietaire/', propertyId],
    enabled: !!propertyId,
  });

  const { data: villesData } = useQuery<VillesResponse | Ville[]>({
    queryKey: ['/api/v1/biens/villes/'],
  });
  
  const villes = Array.isArray(villesData) ? villesData : (villesData?.results || []);

  const form = useForm<BienCreateInput>({
    resolver: zodResolver(bienCreateSchema),
    defaultValues: {
      titre: '',
      description: '',
      type_bien: 'appartement',
      prix_mensuel: '',
      garantie: '',
      superficie: '',
      nombre_chambres: 1,
      nombre_salles_bain: 1,
      nombre_pieces: 2,
      adresse: '',
      ville: '',
      quartier: '',
      commune: '',
      eau_courante: true,
      electricite: true,
      parking: false,
      jardin: false,
      meuble: false,
      climatisation: false,
      gardien: false,
    },
  });

  useEffect(() => {
    if (property) {
      form.reset({
        titre: property.titre || '',
        description: property.description || '',
        type_bien: property.type_bien || 'appartement',
        prix_mensuel: property.prix_mensuel || '',
        garantie: property.garantie || '',
        superficie: property.superficie || '',
        nombre_chambres: property.nombre_chambres || 1,
        nombre_salles_bain: property.nombre_salles_bain || 1,
        nombre_pieces: property.nombre_pieces || 2,
        adresse: property.adresse || '',
        ville: typeof property.ville === 'number' ? String(property.ville) : (getVilleId(property.ville) || ''),
        quartier: property.quartier || '',
        commune: property.commune || '',
        eau_courante: property.eau_courante ?? true,
        electricite: property.electricite ?? true,
        parking: property.parking ?? false,
        jardin: property.jardin ?? false,
        meuble: property.meuble ?? false,
        climatisation: property.climatisation ?? false,
        gardien: property.gardien ?? false,
      });

      if (property.photos && property.photos.length > 0) {
        const existingPhotos: PhotoPreview[] = property.photos.map((photo, index) => ({
          id: photo.id,
          preview: getDjangoImageUrl(photo.image) || '',
          isExisting: true,
          isPrincipal: photo.is_principale || false,
        }));
        setPhotos(existingPhotos);
        const principalIdx = existingPhotos.findIndex(p => p.isPrincipal);
        if (principalIdx >= 0) setPrincipalIndex(principalIdx);
      }

      if (property.statut_location) {
        setLocationStatus(property.statut_location);
      }
    }
  }, [property, form]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 10 - photos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    const newPhotosPreviews: PhotoPreview[] = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isExisting: false,
      isPrincipal: false,
    }));

    setPhotos(prev => [...prev, ...newPhotosPreviews]);
    setNewPhotos(prev => [...prev, ...filesToAdd]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    
    if (photo.isExisting && photo.id) {
      setPhotosToDelete(prev => [...prev, photo.id!]);
    } else if (photo.file) {
      setNewPhotos(prev => prev.filter(f => f !== photo.file));
      URL.revokeObjectURL(photo.preview);
    }
    
    setPhotos(prev => prev.filter((_, i) => i !== index));
    
    if (principalIndex === index) {
      setPrincipalIndex(0);
    } else if (principalIndex > index) {
      setPrincipalIndex(prev => prev - 1);
    }
  };

  const setPrincipal = (index: number) => {
    setPrincipalIndex(index);
    setPhotos(prev => prev.map((p, i) => ({ ...p, isPrincipal: i === index })));
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/v1/biens/proprietaire/${propertyId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/proprietaire/'] });
      toast({
        title: 'Bien supprimé',
        description: 'Votre bien a été supprimé avec succès.',
      });
      setLocation('/my-properties');
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: BienCreateInput) => {
    setIsSubmitting(true);
    try {
      for (const photoId of photosToDelete) {
        try {
          // « photo » au singulier : c'est ce qu'expose le backend et ce que
          // déclare swagger.json. Le pluriel renvoyait 404 en silence.
          await api.delete(`/api/v1/biens/proprietaire/${propertyId}/photo/${photoId}/`);
        } catch (err) {
          console.error('Error deleting photo:', err);
        }
      }

      if (newPhotos.length > 0) {
        const formData = new FormData();
        
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            formData.append(key, String(value));
          }
        });

        formData.append('statut_location', locationStatus);

        newPhotos.forEach((file) => {
          formData.append('photos', file);
        });

        const currentPrincipalPhoto = photos[principalIndex];
        if (currentPrincipalPhoto?.isExisting && currentPrincipalPhoto?.id) {
          formData.append('photo_principale_id', String(currentPrincipalPhoto.id));
        } else {
          const newPhotoIndex = photos.slice(0, principalIndex + 1).filter(p => !p.isExisting).length - 1;
          if (newPhotoIndex >= 0) {
            formData.append('photo_principale_index', String(newPhotoIndex));
          }
        }

        await api.request(`/api/v1/biens/proprietaire/${propertyId}/`, {
          method: 'PATCH',
          body: formData,
          isFormData: true,
        });
      } else {
        const jsonData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            jsonData[key] = value;
          }
        });
        jsonData.statut_location = locationStatus;

        const currentPrincipalPhoto = photos[principalIndex];
        if (currentPrincipalPhoto?.isExisting && currentPrincipalPhoto?.id) {
          jsonData.photo_principale_id = currentPrincipalPhoto.id;
        }

        await api.patch(`/api/v1/biens/proprietaire/${propertyId}/`, jsonData);
      }

      newPhotos.forEach(file => {
        const photo = photos.find(p => p.file === file);
        if (photo) URL.revokeObjectURL(photo.preview);
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/proprietaire/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/biens/proprietaire/', propertyId] });

      toast({
        title: 'Bien modifié',
        description: 'Vos modifications ont été enregistrées.',
      });
      setLocation('/my-properties');
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
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-8 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <h1 className="text-xl font-bold mb-4">Bien non trouvé</h1>
          <Button onClick={() => setLocation('/my-properties')}>
            Retour à mes biens
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/my-properties')}
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Modifier le bien</h1>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" data-testid="button-delete-property">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le bien et toutes ses photos seront supprimés définitivement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground"
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photos du bien</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Gérez les photos de votre bien. Cliquez sur l'étoile pour définir la photo principale.
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id || index}
                      className="relative aspect-square rounded-md overflow-hidden border border-border group"
                    >
                      <img
                        src={photo.preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => setPrincipal(index)}
                          className={principalIndex === index ? 'bg-yellow-500 text-black' : ''}
                          data-testid={`button-principal-${index}`}
                        >
                          <Star className="w-4 h-4" fill={principalIndex === index ? 'currentColor' : 'none'} />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => removePhoto(index)}
                          data-testid={`button-remove-photo-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {principalIndex === index && (
                        <div className="absolute top-1 left-1 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded">
                          Principale
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {photos.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-md border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 hover-elevate cursor-pointer"
                      data-testid="button-add-photo"
                    >
                      <ImagePlus className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Ajouter</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  data-testid="input-photos"
                />
              </CardContent>
            </Card>

            {property.statut_validation === 'valide' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statut de location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">État du bien</label>
                    <Select value={locationStatus} onValueChange={setLocationStatus}>
                      <SelectTrigger data-testid="select-location-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locationStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choisissez le statut actuel de votre bien
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations de base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="titre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre de l'annonce</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Bel appartement 3 pièces avec vue" 
                          {...field}
                          data-testid="input-titre"
                        />
                      </FormControl>
                      <FormMessage />
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
                          placeholder="Décrivez votre bien en détail..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type_bien"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de bien</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {propertyTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prix et caractéristiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prix_mensuel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix mensuel ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Ex: 500"
                            {...field}
                            data-testid="input-prix"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="garantie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garantie ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Ex: 1000"
                            {...field}
                            data-testid="input-garantie"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="superficie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Superficie (m²)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Ex: 80"
                          {...field}
                          data-testid="input-superficie"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre_pieces"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pièces</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-pieces"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nombre_chambres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chambres</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-chambres"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nombre_salles_bain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salles de bain</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-sdb"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Localisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="adresse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Numéro et nom de rue"
                          {...field}
                          data-testid="input-adresse"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quartier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quartier</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Gombe"
                            {...field}
                            data-testid="input-quartier"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commune"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commune</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Ngaliema"
                            {...field}
                            data-testid="input-commune"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ville"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ville">
                            <SelectValue placeholder="Sélectionner une ville" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {villes.map((ville) => (
                            <SelectItem key={ville.id} value={String(ville.id)}>
                              {ville.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Équipements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="eau_courante"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Eau courante</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-eau"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="electricite"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Électricité</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-electricite"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parking"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Parking</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-parking"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jardin"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Jardin</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-jardin"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meuble"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Meublé</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-meuble"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="climatisation"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Climatisation</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-climatisation"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gardien"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Gardien</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-gardien"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isSubmitting}
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
