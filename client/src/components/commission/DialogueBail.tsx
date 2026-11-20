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
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { formaterMontant } from '@/lib/prix';
import type { DemandeVisite } from '@shared/schema';
import { CLE_BIENS, CLE_COMMISSIONS, aujourdhui, messageErreur } from './commun';
import { t } from '@/i18n';

/**
 * Le bail est signé : le commissionnaire le déclare depuis la demande de
 * visite qui y a mené. La commission se calcule toute seule (un mois de
 * loyer, la part du confrère figée) ; on ne saisit que le locataire et la
 * date. Le bien passe à « loué ».
 */
export function DialogueBail({ demande, onFermer }: { demande: DemandeVisite; onFermer: () => void }) {
  const { toast } = useToast();
  const bien = demande.bien_detail;
  const parConfrere = demande.part_confrere_pourcent != null;
  const nomClient = parConfrere
    ? demande.prospect_nom ?? ''
    : demande.client?.full_name || demande.client?.username || '';
  const [locataire, setLocataire] = useState(nomClient);
  const [telephone, setTelephone] = useState(
    parConfrere ? demande.prospect_telephone ?? '' : demande.client?.phone ?? '',
  );
  const [date, setDate] = useState(aujourdhui());

  const commissionTotale =
    (parseFloat(bien?.commission_locataire ?? '0') || 0) + (parseFloat(bien?.commission_bailleur ?? '0') || 0);
  const partConfrere = parConfrere ? (commissionTotale * (demande.part_confrere_pourcent ?? 0)) / 100 : 0;

  const declarer = useMutation({
    mutationFn: () =>
      api.post('/api/v1/commissions/', {
        bien: demande.bien,
        demande: demande.id,
        locataire_nom: locataire,
        locataire_telephone: telephone,
        date_bail: date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMMISSIONS });
      queryClient.invalidateQueries({ queryKey: CLE_BIENS });
      toast({ title: t('bail.bailEnregistre'), description: t('bail.bienEstMarqueLoue') });
      onFermer();
    },
    onError: (e) => toast({ title: t('bail.bailNonEnregistre'), description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bail.bailSigne')}</DialogTitle>
          <DialogDescription>{bien?.titre}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted p-3 text-sm space-y-1">
          <p>
            Commission : <span className="font-semibold">{formaterMontant(commissionTotale, bien?.devise)}</span>
            {bien?.commission_payee_par === 'moitie' ? t('bail.moitieLocataireMoitieBailleur') : t('bail.payeeLocataire')}
          </p>
          {parConfrere && (
            <p>
              Part de {demande.client?.full_name || demande.client?.username} ({demande.part_confrere_pourcent} %) :{' '}
              <span className="font-semibold">{formaterMontant(partConfrere, bien?.devise)}</span> environ
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="bail-locataire">{t('bail.locataire')}</Label>
            <Input id="bail-locataire" value={locataire} onChange={(e) => setLocataire(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bail-telephone">{t('bail.telephone')}</Label>
              <Input
                id="bail-telephone"
                type="tel"
                inputMode="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bail-date">{t('bail.dateBail')}</Label>
              <Input id="bail-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('bail.loiDemandeBailEcrit')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>{t('bail.annuler')}</Button>
          <Button
            disabled={!locataire.trim() || !date || declarer.isPending}
            onClick={() => declarer.mutate()}
            data-testid="button-declarer-bail"
          >
            {t('bail.enregistrerBail')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
