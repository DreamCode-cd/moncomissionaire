import { useState } from 'react';
import { useFormContext, type Control } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FormControl,
  FormDescription,
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
import { CHOIX_EAU, CHOIX_ELECTRICITE, NON_PRECISE } from '@/lib/terrain';
import { GARANTIE_MOIS_MAX, type Bailleur, type PaginatedResponse } from '@shared/schema';

/* Champs partagés par l'ajout et la modification d'une annonce. Ils portent
 * ce qui distingue la location à Lubumbashi d'un formulaire générique. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Controle = Control<any>;

export const CLE_BAILLEURS = ['/api/v1/biens/bailleurs/'];

/** Le bailleur qui a confié la maison au commissionnaire. Il n'a pas de
 *  compte : c'est une fiche du carnet, qu'on peut créer sans quitter le
 *  formulaire — sur le terrain, le commissionnaire saisit souvent l'annonce
 *  devant la maison, juste après avoir rencontré le bailleur. */
export function ChampBailleur({ control }: { control: Controle }) {
  const { setValue } = useFormContext();
  const { data } = useQuery<PaginatedResponse<Bailleur>>({ queryKey: CLE_BAILLEURS });
  const bailleurs = data?.results ?? [];
  const [creationOuverte, setCreationOuverte] = useState(false);

  return (
    <FormField
      control={control}
      name="bailleur"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bailleur</FormLabel>
          <div className="flex gap-2">
            <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-bailleur">
                  <SelectValue placeholder="Qui vous a confié ce bien ?" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {bailleurs.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nom} — {b.telephone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreationOuverte(true)}
              data-testid="button-nouveau-bailleur"
            >
              <Plus className="w-4 h-4 mr-1" /> Nouveau
            </Button>
          </div>
          <FormDescription>
            {/* Pas « ni VillaGo » : l'application cache bien cette fiche à la
                modération, mais un administrateur technique peut toujours
                lire la base. Promettre davantage serait mentir. */}
            Ni les clients, ni les autres commissionnaires, ni l’équipe de modération ne voient cette fiche.
          </FormDescription>
          <FormMessage />
          <DialogueNouveauBailleur
            ouvert={creationOuverte}
            onFermer={() => setCreationOuverte(false)}
            onCree={(bailleur) => setValue('bailleur', String(bailleur.id), { shouldValidate: true })}
          />
        </FormItem>
      )}
    />
  );
}

export function DialogueNouveauBailleur({
  ouvert,
  onFermer,
  onCree,
  bailleur,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onCree?: (bailleur: Bailleur) => void;
  /** Fourni pour modifier une fiche existante. */
  bailleur?: Bailleur | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nom, setNom] = useState(bailleur?.nom ?? '');
  const [telephone, setTelephone] = useState(bailleur?.telephone ?? '');
  const [notes, setNotes] = useState(bailleur?.notes ?? '');

  const enregistrer = useMutation({
    mutationFn: () =>
      bailleur
        ? api.patch<Bailleur>(`/api/v1/biens/bailleurs/${bailleur.id}/`, { nom, telephone, notes })
        : api.post<Bailleur>('/api/v1/biens/bailleurs/', { nom, telephone, notes }),
    onSuccess: (resultat) => {
      // La fiche entre dans le cache AVANT d'être sélectionnée : un Select
      // dont la valeur ne correspond à aucune option l'ignore, et le
      // rafraîchissement de la liste arrive trop tard. Le commissionnaire
      // voyait sa fiche créée mais non choisie, et l'annonce ne partait pas.
      queryClient.setQueryData<PaginatedResponse<Bailleur>>(CLE_BAILLEURS, (avant) => {
        const autres = (avant?.results ?? []).filter((b) => b.id !== resultat.id);
        const results = [...autres, resultat].sort((a, b) => a.nom.localeCompare(b.nom));
        return { count: results.length, next: null, previous: null, ...avant, results };
      });
      queryClient.invalidateQueries({ queryKey: CLE_BAILLEURS });
      onCree?.(resultat);
      if (!bailleur) {
        setNom('');
        setTelephone('');
        setNotes('');
      }
      onFermer();
    },
    onError: (erreur: Error) =>
      toast({ title: 'Fiche non enregistrée', description: erreur.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bailleur ? 'Modifier le bailleur' : 'Nouveau bailleur'}</DialogTitle>
          <DialogDescription>
            Le bailleur n’a pas besoin de compte VillaGo. Sa fiche reste dans votre carnet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="bailleur-nom">Nom</Label>
            <Input id="bailleur-nom" value={nom} onChange={(e) => setNom(e.target.value)} data-testid="input-bailleur-nom" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bailleur-telephone">Téléphone</Label>
            <Input
              id="bailleur-telephone"
              type="tel"
              inputMode="tel"
              placeholder="+243 …"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              data-testid="input-bailleur-telephone"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bailleur-notes">Notes privées (facultatif)</Label>
            <Input
              id="bailleur-notes"
              placeholder="Ex : préfère être appelé le soir"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button
            onClick={() => enregistrer.mutate()}
            disabled={!nom.trim() || !telephone.trim() || enregistrer.isPending}
            data-testid="button-enregistrer-bailleur"
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Garantie en mois de loyer, trois au plus : loi n° 15/025 du
 *  31 décembre 2015, article 18. Un montant libre finissait par dépasser le
 *  plafond sans que personne ne le remarque. */
export function ChampGarantie({ control }: { control: Controle }) {
  const choix = Array.from({ length: GARANTIE_MOIS_MAX + 1 }, (_, i) => i);
  return (
    <FormField
      control={control}
      name="garantie_mois"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Garantie</FormLabel>
          <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value ?? 0)}>
            <FormControl>
              <SelectTrigger data-testid="select-garantie-mois">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {choix.map((mois) => (
                <SelectItem key={mois} value={String(mois)}>
                  {mois === 0 ? 'Aucune garantie' : `${mois} mois de loyer`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>Trois mois au maximum, selon la loi sur les baux (n° 15/025, article 18).</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** La commune, choisie dans la liste de la ville quand elle est connue :
 *  sinon chacun l'orthographie à sa façon et la recherche ne retrouve rien. */
export function ChampCommune({ control, communes }: { control: Controle; communes: string[] }) {
  return (
    <FormField
      control={control}
      name="commune"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Commune</FormLabel>
          {communes.length > 0 ? (
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-commune">
                  <SelectValue placeholder="Choisir la commune" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {communes.map((commune) => (
                  <SelectItem key={commune} value={commune}>{commune}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <FormControl>
              <Input placeholder="Ex : Kampemba" {...field} data-testid="input-commune" />
            </FormControl>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectRegularite({
  control,
  nom,
  libelle,
  choix,
}: {
  control: Controle;
  nom: 'eau' | 'electricite';
  libelle: string;
  choix: { valeur: string; libelle: string }[];
}) {
  return (
    <FormField
      control={control}
      name={nom}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{libelle}</FormLabel>
          <Select
            onValueChange={(v) => field.onChange(v === NON_PRECISE ? '' : v)}
            value={field.value || NON_PRECISE}
          >
            <FormControl>
              <SelectTrigger data-testid={`select-${nom}`}>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NON_PRECISE}>Non précisé</SelectItem>
              {choix.map((c) => (
                <SelectItem key={c.valeur} value={c.valeur}>{c.libelle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** L'eau et le courant, par leur régularité : c'est la première question
 *  d'un locataire à Lubumbashi, bien avant le parking ou le jardin. */
export function ChampsEauElectricite({ control }: { control: Controle }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectRegularite
        control={control}
        nom="eau"
        libelle="Eau"
        choix={CHOIX_EAU.map((c) => ({ valeur: c.valeur, libelle: c.libelle }))}
      />
      <SelectRegularite
        control={control}
        nom="electricite"
        libelle="Électricité"
        choix={CHOIX_ELECTRICITE.map((c) => ({ valeur: c.valeur, libelle: c.libelle }))}
      />
    </div>
  );
}

/** Ce que le client paiera, et ce que le commissionnaire partage.
 *
 *  - La commission vaut un mois de loyer, jamais plus (loi n° 15/025,
 *    article 10) : on ne choisit que qui la paie.
 *  - Les frais de visite restent sous le plafond fixé par VillaGo pour la
 *    ville, dans la devise du bien. Le serveur le vérifie ; on l'affiche ici
 *    pour que le commissionnaire n'ait pas à deviner.
 *  - Ouvrir le bien au partage le montre aux confrères, avec la part cédée
 *    à celui qui amènera le locataire.
 */
export function ChampsCommission({
  control,
  plafondUsd,
  plafondCdf,
}: {
  control: Controle;
  plafondUsd?: string;
  plafondCdf?: string;
}) {
  const { watch } = useFormContext();
  const devise = watch('devise') === 'CDF' ? 'CDF' : 'USD';
  const partageOuvert = !!watch('partage_ouvert');
  const plafond = parseFloat((devise === 'CDF' ? plafondCdf : plafondUsd) ?? '0') || 0;
  const symbole = devise === 'CDF' ? 'FC' : '$';

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="commission_payee_par"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Commission (un mois de loyer)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? 'locataire'}>
              <FormControl>
                <SelectTrigger data-testid="select-commission-payee-par">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="locataire">Payée par le locataire</SelectItem>
                <SelectItem value="moitie">Moitié locataire, moitié bailleur</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              La loi la fixe à un mois de loyer (n° 15/025, article 10). Le client la voit avant de demander la visite.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="frais_visite"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Frais de visite ({symbole})</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                disabled={plafond <= 0}
                {...field}
                value={field.value ?? ''}
                data-testid="input-frais-visite"
              />
            </FormControl>
            <FormDescription>
              {plafond > 0
                ? `${plafond.toLocaleString('fr-CD')} ${symbole} au plus dans cette ville. Ils ne sont dus qu’une fois par client, et seulement si votre identité a été vérifiée par VillaGo.`
                : 'VillaGo n’autorise pas encore de frais de visite dans cette ville.'}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="partage_ouvert"
        render={({ field }) => (
          <FormItem className="flex items-start gap-3 space-y-0">
            <FormControl>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[hsl(var(--primary))]"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                data-testid="checkbox-partage-ouvert"
              />
            </FormControl>
            <div className="space-y-1">
              <FormLabel>Ouvrir aux confrères</FormLabel>
              <FormDescription>
                Les autres commissionnaires voient ce bien et peuvent vous présenter leur client. Vous gardez le bailleur et la visite.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {partageOuvert && (
        <FormField
          control={control}
          name="part_confrere_pourcent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Part cédée au confrère (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="99"
                  {...field}
                  value={field.value ?? 50}
                  data-testid="input-part-confrere"
                />
              </FormControl>
              <FormDescription>
                Figée au moment où le confrère présente son client : la changer ensuite ne touche pas aux clients déjà présentés.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
