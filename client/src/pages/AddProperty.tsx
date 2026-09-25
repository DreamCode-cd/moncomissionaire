import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Upload, X, Star, ImagePlus } from 'lucide-react';
import heic2any from 'heic2any';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { bienCreateSchema, type BienCreateInput } from '@shared/schema';
import { DEVISES } from '@/lib/prix';

interface Ville {
  id: number;
  nom: string;
}

interface VillesResponse {
  results?: Ville[];
  count?: number;
}

const propertyTypes = [
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'villa', label: 'Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'terrain', label: 'Terrain' },
];

interface PhotoPreview {
  file: File;
  preview: string;
}

export default function AddProperty() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [principalIndex, setPrincipalIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const convertHeicToJpg = async (file: File): Promise<File> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'heic' || fileExtension === 'heif') {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9,
        });
        
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        return new File([blob], newFileName, { type: 'image/jpeg' });
      } catch (error) {
        console.error('Erreur lors de la conversion HEIC:', error);
        toast({
          title: 'Erreur de conversion',
          description: 'Impossible de convertir l\'image HEIC. Veuillez utiliser un autre format.',
          variant: 'destructive',
        });
        throw error;
      }
    }
    
    return file;
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 10 - photos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    try {
      const convertedFiles = await Promise.all(
        filesToAdd.map(file => convertHeicToJpg(file))
      );

      const newPhotos: PhotoPreview[] = convertedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (error) {
      console.error('Erreur lors du traitement des images:', error);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].preview);
      return newPhotos;
    });
    
    if (principalIndex === index) {
      setPrincipalIndex(0);
    } else if (principalIndex > index) {
      setPrincipalIndex(prev => prev - 1);
    }
  };

  const setPrincipal = (index: number) => {
    setPrincipalIndex(index);
  };

  const onSubmit = async (data: BienCreateInput) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });

      photos.forEach((photo, index) => {
        formData.append(`photos`, photo.file);
      });

      formData.append('photo_principale_index', String(principalIndex));

      await api.post('/api/v1/biens/proprietaire/', formData, true);

      photos.forEach(photo => URL.revokeObjectURL(photo.preview));

      toast({
        title: 'Bien ajouté',
        description: 'Votre bien a été soumis pour validation.',
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/my-properties')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Ajouter un bien</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photos du bien</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ajoutez jusqu'à 10 photos. Cliquez sur l'étoile pour définir la photo principale.
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
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
                          className={principalIndex === index ? 'bg-note text-background' : ''}
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
                        <div className="absolute top-1 left-1 bg-note text-background text-xs px-2 py-0.5 rounded">
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
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  data-testid="input-photos"
                />

                {photos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune photo ajoutée. Les biens avec photos attirent plus de visiteurs.
                  </p>
                )}
              </CardContent>
            </Card>

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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <FormField
                  control={form.control}
                  name="devise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise du loyer et de la garantie</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-devise">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEVISES.map((d) => (
                            <SelectItem key={d.valeur} value={d.valeur}>
                              {d.libelle} ({d.symbole})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prix_mensuel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix mensuel</FormLabel>
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
                        <FormLabel>Garantie</FormLabel>
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
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
              {isSubmitting ? 'Publication...' : 'Publier le bien'}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
