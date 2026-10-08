import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { formaterMontant, symboleDevise } from '@/lib/prix';
import { MODES_REGLEMENT, type ModeReglement, type Payeur } from '@shared/schema';
import {
  CLE_COMMISSIONS,
  CLE_DEMANDES,
  CLE_VISITES,
  aujourdhui,
  messageErreur,
} from './commun';

/**
 * Le commissionnaire note un paiement qu'il vient de recevoir.
 *
 * Le montant est proposé (le reste dû) mais modifiable : un locataire paie
 * souvent en deux fois. Le serveur refuse tout dépassement. La référence
 * mobile money est demandée parce que c'est elle qui tranchera un désaccord.
 */
export function DialogueReglement({
  cible,
  onFermer,
}: {
  cible:
    | {
        nature: 'commission';
        commission: number;
        titre: string;
        devise: string;
        restes: { locataire: string; bailleur: string };
      }
    | { nature: 'frais_visite'; demande: number; titre: string; devise: string; reste: string };
  onFermer: () => void;
}) {
  const { toast } = useToast();
  const estCommission = cible.nature === 'commission';
  const payeurInitial: Payeur =
    estCommission && parseFloat(cible.restes.locataire) <= 0 ? 'bailleur' : 'locataire';
  const [payeur, setPayeur] = useState<Payeur>(payeurInitial);
  const resteDu = estCommission ? cible.restes[payeur] : cible.reste;
  const [montant, setMontant] = useState(String(parseFloat(resteDu) || ''));
  const [mode, setMode] = useState<ModeReglement>('especes');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(aujourdhui());

  const enregistrer = useMutation({
    mutationFn: () =>
      api.post('/api/v1/commissions/reglements/', {
        nature: cible.nature,
        ...(estCommission ? { commission: cible.commission } : { demande: cible.demande }),
        payeur,
        montant,
        mode,
        reference,
        date_reglement: date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMMISSIONS });
      queryClient.invalidateQueries({ queryKey: CLE_DEMANDES });
      queryClient.invalidateQueries({ queryKey: CLE_VISITES });
      toast({ title: 'Règlement enregistré', description: `${formaterMontant(montant, cible.devise)} reçus.` });
      onFermer();
    },
    onError: (e) => toast({ title: 'Règlement non enregistré', description: messageErreur(e), variant: 'destructive' }),
  });

  const mobileMoney = mode !== 'especes';

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{estCommission ? 'Commission reçue' : 'Frais de visite reçus'}</DialogTitle>
          <DialogDescription>
            {cible.titre} · reste dû : {formaterMontant(resteDu, cible.devise)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {estCommission && (
            <div className="space-y-1">
              <Label>Payé par</Label>
              <Select
                value={payeur}
                onValueChange={(v) => {
                  setPayeur(v as Payeur);
                  setMontant(String(parseFloat(cible.restes[v as Payeur]) || ''));
                }}
              >
                <SelectTrigger data-testid="select-payeur"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="locataire">Le locataire</SelectItem>
                  {parseFloat(cible.restes.bailleur) > 0 && <SelectItem value="bailleur">Le bailleur</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="reglement-montant">Montant ({symboleDevise(cible.devise)})</Label>
              <Input
                id="reglement-montant"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                data-testid="input-montant-reglement"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reglement-date">Date</Label>
              <Input id="reglement-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Moyen</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ModeReglement)}>
              <SelectTrigger data-testid="select-mode-reglement"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODES_REGLEMENT.map((m) => (
                  <SelectItem key={m.valeur} value={m.valeur}>{m.libelle}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="reglement-reference">
              {mobileMoney ? 'Référence de la transaction' : 'Numéro de reçu (facultatif)'}
            </Label>
            <Input
              id="reglement-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={mobileMoney ? 'Ex : le code reçu par SMS' : ''}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button
            disabled={!(parseFloat(montant) > 0) || !date || enregistrer.isPending}
            onClick={() => enregistrer.mutate()}
            data-testid="button-enregistrer-reglement"
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
