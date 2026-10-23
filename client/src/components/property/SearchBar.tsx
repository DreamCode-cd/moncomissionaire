import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, Droplet, Zap, Car, Trees, Sofa, Snowflake, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DEVISES, formaterPrix, type Devise } from '@/lib/prix';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ville {
  id: number;
  nom: string;
}

interface VillesResponse {
  results?: Ville[];
  count?: number;
}

export interface SearchFilters {
  query: string;
  type_bien?: string;
  ville?: string;
  devise?: Devise;
  min_price?: number;
  max_price?: number;
  min_chambres?: number;
  /** REGIDESO tous les jours, ou forage dans la parcelle. */
  eau_tous_les_jours?: boolean;
  /** SNEL stable, ou solaire / groupe électrogène. */
  courant_sans_coupure?: boolean;
  parking?: boolean;
  jardin?: boolean;
  meuble?: boolean;
  climatisation?: boolean;
  gardien?: boolean;
}

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const propertyTypes = [
  { value: 'all', label: 'Tous les types' },
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'villa', label: 'Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'terrain', label: 'Terrain' },
];


const amenities = [
  { key: 'eau_tous_les_jours' as const, label: 'Eau tous les jours', icon: Droplet },
  { key: 'courant_sans_coupure' as const, label: 'Courant sans coupure', icon: Zap },
  { key: 'parking' as const, label: 'Parking', icon: Car },
  { key: 'jardin' as const, label: 'Jardin', icon: Trees },
  { key: 'meuble' as const, label: 'Meublé', icon: Sofa },
  { key: 'climatisation' as const, label: 'Climatisation', icon: Snowflake },
  { key: 'gardien' as const, label: 'Gardien', icon: ShieldCheck },
];

// Bornes du curseur, par devise. Un loyer de 5 000 $ est un maximum
// raisonnable à Lubumbashi ; 5 000 FC ne paient pas un trajet en taxi.
const ECHELLE: Record<Devise, { max: number; pas: number }> = {
  USD: { max: 5000, pas: 100 },
  CDF: { max: 5000000, pas: 100000 },
};

/** Délai avant de lancer la recherche pendant la frappe. */
const ATTENTE_FRAPPE_MS = 400;

/**
 * Barre de recherche et panneau de filtres.
 *
 * Le panneau travaille sur un brouillon : rien ne part au serveur avant
 * « Appliquer ». Auparavant, le type, la ville et les équipements
 * s'appliquaient dès qu'on y touchait (derrière le panneau, sans qu'on le
 * voie), le prix seulement sur « Appliquer », et le curseur gardait un prix
 * qu'on venait de retirer : le prochain « Appliquer » le remettait.
 */
export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [brouillon, setBrouillon] = useState<SearchFilters>(filters);
  const devise: Devise = brouillon.devise ?? 'USD';
  const echelle = ECHELLE[devise];
  const [priceRange, setPriceRange] = useState<[number, number]>([0, echelle.max]);

  // Le texte part après une courte pause, pas à chaque lettre : sur une
  // connexion lente, chaque lettre lançait une requête et la liste sautait
  // pendant la frappe.
  const [texte, setTexte] = useState(filters.query);
  const filtresCourants = useRef(filters);
  filtresCourants.current = filters;
  const appliquer = useRef(onFiltersChange);
  appliquer.current = onFiltersChange;
  // Le dernier texte envoyé : quand l'adresse se met à jour avec lui, il ne
  // faut pas écraser les lettres tapées entre-temps.
  const dernierEnvoi = useRef(filters.query);
  const envoyerTexte = (valeur: string) => {
    dernierEnvoi.current = valeur;
    appliquer.current({ ...filtresCourants.current, query: valeur });
  };
  useEffect(() => {
    // Changement venu d'ailleurs (lien, retour arrière, « Tout effacer »).
    if (filters.query !== dernierEnvoi.current) {
      dernierEnvoi.current = filters.query;
      setTexte(filters.query);
    }
  }, [filters.query]);
  useEffect(() => {
    if (texte === dernierEnvoi.current) return;
    const minuterie = setTimeout(() => envoyerTexte(texte), ATTENTE_FRAPPE_MS);
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte]);

  const ouvrir = (ouvert: boolean) => {
    if (ouvert) {
      // Le brouillon repart des filtres réellement appliqués.
      const devisePosee = filters.devise ?? 'USD';
      setBrouillon(filters);
      setPriceRange([filters.min_price ?? 0, filters.max_price ?? ECHELLE[devisePosee].max]);
    }
    setIsOpen(ouvert);
  };

  const modifier = (changement: Partial<SearchFilters>) =>
    setBrouillon((actuel) => ({ ...actuel, ...changement }));

  // Changer de devise remet l'intervalle à zéro : conserver « 0 à 5 000 »
  // en passant du dollar au franc produirait un filtre absurde.
  const changerDevise = (nouvelle: Devise) => {
    setPriceRange([0, ECHELLE[nouvelle].max]);
    modifier({ devise: nouvelle, min_price: undefined, max_price: undefined });
  };

  const { data: villesData } = useQuery<VillesResponse | Ville[]>({
    queryKey: ['/api/v1/biens/villes/'],
  });
  
  const villes = Array.isArray(villesData) ? villesData : (villesData?.results || []);

  const activeAmenitiesCount = amenities.filter(a => filters[a.key]).length;
  const activeFiltersCount = [
    filters.type_bien && filters.type_bien !== 'all',
    filters.ville && filters.ville !== 'all',
    filters.min_price,
    filters.max_price,
    filters.min_chambres,
  ].filter(Boolean).length + activeAmenitiesCount;

  const handleApplyFilters = () => {
    onFiltersChange({
      ...brouillon,
      query: texte,
      devise,
      min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
      max_price: priceRange[1] < echelle.max ? priceRange[1] : undefined,
    });
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    onFiltersChange({ query: texte });
    setIsOpen(false);
  };

  const removeFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const deviseAppliquee = filters.devise ?? 'USD';

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        role="search"
        onSubmit={(e) => {
          // « Entrée » ou « Rechercher » du clavier : on n'attend pas.
          e.preventDefault();
          envoyerTexte(texte);
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            enterKeyHint="search"
            placeholder="Quartier, commune, type de bien…"
            aria-label="Rechercher un quartier, une commune ou un type de bien"
            className="pl-10 h-12"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Sheet open={isOpen} onOpenChange={ouvrir}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="lg" className="relative h-12" aria-label="Filtres" data-testid="button-filters">
              <SlidersHorizontal className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85dvh] rounded-t-xl flex flex-col">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 py-6 pr-4">
              <div className="space-y-2">
                <Label>Type de bien</Label>
                <Select
                  value={brouillon.type_bien || 'all'}
                  onValueChange={(value) => modifier({ type_bien: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger data-testid="select-type-bien">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ville</Label>
                <Select
                  value={brouillon.ville || 'all'}
                  onValueChange={(value) => modifier({ ville: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger data-testid="select-ville">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {villes.map((ville) => (
                      <SelectItem key={ville.id} value={ville.id.toString()}>
                        {ville.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={devise} onValueChange={(v) => changerDevise(v as Devise)}>
                  <SelectTrigger data-testid="select-devise-recherche">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVISES.map((d) => (
                      <SelectItem key={d.valeur} value={d.valeur}>
                        {d.libelle} ({d.symbole})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>
                  Loyer par mois : {formaterPrix(priceRange[0], devise)} –{' '}
                  {formaterPrix(priceRange[1], devise)}
                  {priceRange[1] >= echelle.max ? ' et plus' : ''}
                </Label>
                <Slider
                  min={0}
                  max={echelle.max}
                  step={echelle.pas}
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  className="py-4"
                  data-testid="slider-price"
                />
              </div>

              <div className="space-y-2">
                <Label>Chambres minimum</Label>
                <Select
                  value={brouillon.min_chambres?.toString() || 'any'}
                  onValueChange={(value) => modifier({ min_chambres: value === 'any' ? undefined : parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-chambres">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Peu importe</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Équipements</Label>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {amenities.map((amenity) => {
                    const Icon = amenity.icon;
                    return (
                      // Toute la ligne est cliquable, 44 px de haut : la case
                      // seule faisait 16 px sous le doigt.
                      <label
                        key={amenity.key}
                        htmlFor={amenity.key}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-1 text-sm"
                      >
                        <Checkbox
                          id={amenity.key}
                          checked={brouillon[amenity.key] || false}
                          onCheckedChange={(checked) => modifier({ [amenity.key]: checked === true ? true : undefined })}
                          data-testid={`checkbox-${amenity.key}`}
                        />
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {amenity.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={handleResetFilters} data-testid="button-reset-filters">
                Tout effacer
              </Button>
              <Button type="button" className="flex-1" onClick={handleApplyFilters} data-testid="button-apply-filters">
                Appliquer
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </form>

      {activeFiltersCount > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {filters.type_bien && filters.type_bien !== 'all' && (
            <PastilleFiltre libelle={propertyTypes.find(t => t.value === filters.type_bien)?.label ?? filters.type_bien} onRetirer={() => removeFilter('type_bien')} />
          )}
          {filters.ville && filters.ville !== 'all' && (
            <PastilleFiltre libelle={villes.find(v => v.id.toString() === filters.ville)?.nom || filters.ville} onRetirer={() => removeFilter('ville')} />
          )}
          {filters.min_price ? (
            <PastilleFiltre libelle={`À partir de ${formaterPrix(filters.min_price, deviseAppliquee)}`} onRetirer={() => removeFilter('min_price')} />
          ) : null}
          {filters.max_price ? (
            <PastilleFiltre libelle={`Jusqu’à ${formaterPrix(filters.max_price, deviseAppliquee)}`} onRetirer={() => removeFilter('max_price')} />
          ) : null}
          {filters.min_chambres ? (
            <PastilleFiltre libelle={`${filters.min_chambres} ch. et plus`} onRetirer={() => removeFilter('min_chambres')} />
          ) : null}
          {amenities.filter(a => filters[a.key]).map((amenity) => (
            <PastilleFiltre key={amenity.key} libelle={amenity.label} icone={amenity.icon} onRetirer={() => removeFilter(amenity.key)} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Un filtre appliqué. Toute la pastille retire le filtre : la croix seule
 * faisait 12 px, impossible à viser au doigt.
 */
function PastilleFiltre({
  libelle,
  icone: Icone,
  onRetirer,
}: {
  libelle: string;
  icone?: typeof Search;
  onRetirer: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRetirer}
      aria-label={`Retirer le filtre « ${libelle} »`}
      className="flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-medium text-secondary-foreground"
    >
      {Icone ? <Icone className="h-3.5 w-3.5" aria-hidden /> : null}
      {libelle}
      <X className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
