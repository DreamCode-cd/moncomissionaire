import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ClipboardList, HandCoins, Phone, Stamp, Undo2, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EtatChargement, EtatVide } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { formaterDateCourte } from '@/lib/dates';
import { formaterMontant } from '@/lib/prix';
import type { Commission, PaginatedResponse, Reglement } from '@shared/schema';
import { DialogueReglement } from './DialogueReglement';
import { CLE_COMMISSIONS, aujourdhui, messageErreur } from './commun';

/**
 * Ce que le commissionnaire a gagné, ce qu'on lui doit encore, et la trace
 * de chaque paiement.
 *
 * Rien ne s'efface : un règlement saisi par erreur s'annule avec un motif
 * et reste visible, barré. Le confrère voit la commission partagée et sa
 * part, mais c'est le titulaire qui encaisse et note les paiements.
 */
export function OngletGains() {
  const { user } = useAuth();
  const commissions = useQuery<PaginatedResponse<Commission>>({ queryKey: CLE_COMMISSIONS });
  const [aRegler, setARegler] = useState<Commission | null>(null);
  const [aEnregistrer, setAEnregistrer] = useState<Commission | null>(null);
  const [aAnnuler, setAAnnuler] = useState<
    { type: 'commission'; objet: Commission } | { type: 'reglement'; objet: Reglement } | null
  >(null);

  if (commissions.isLoading) return <EtatChargement texte="Chargement de vos gains…" />;
  const liste = commissions.data?.results ?? [];
  if (!liste.length) {
    return (
      <EtatVide
        icone={HandCoins}
        titre="Aucun bail enregistré"
        description="Quand un bail est signé, enregistrez-le depuis la visite : la commission se calcule toute seule."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Totaux commissions={liste} monId={user?.id} />
      {liste.map((c) => {
        const titulaire = c.titulaire === user?.id;
        const maPart = titulaire ? c.montant_titulaire : c.montant_confrere;
        const actifs = c.reglements.filter((r) => !r.annulee_le);
        return (
          <Card key={c.id} data-testid={`carte-commission-${c.id}`} className={c.annulee_le ? 'opacity-70' : ''}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{c.bien_titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.locataire_nom} · bail du {formaterDateCourte(c.date_bail)}
                  </p>
                </div>
                <BadgeStatut famille="commission" valeur={c.statut} compact />
              </div>

              <div className="text-sm space-y-0.5">
                <p>
                  Commission : <span className="font-semibold">{formaterMontant(c.montant_total, c.devise)}</span>
                  {c.payee_par === 'moitie' && (
                    <span className="text-muted-foreground">
                      {' '}({formaterMontant(c.part_locataire, c.devise)} locataire, {formaterMontant(c.part_bailleur, c.devise)} bailleur)
                    </span>
                  )}
                </p>
                <p>
                  Votre part : <span className="font-semibold text-primary">{formaterMontant(maPart, c.devise)}</span>
                  {c.confrere && (
                    <span className="text-muted-foreground">
                      {titulaire
                        ? ` · ${formaterMontant(c.montant_confrere, c.devise)} pour ${c.confrere_detail?.full_name} (${c.part_confrere_pourcent} %)`
                        : ` · encaissée par ${c.titulaire_detail?.full_name}`}
                    </span>
                  )}
                </p>
                {!c.annulee_le && c.statut !== 'reglee' && (
                  <p className="text-muted-foreground">
                    Reste à recevoir : {formaterMontant(parseFloat(c.reste_locataire) + parseFloat(c.reste_bailleur), c.devise)}
                  </p>
                )}
                {c.annulee_le && <p className="text-muted-foreground">Annulée : {c.motif_annulation}</p>}
                {!c.annulee_le && (
                  <p className="text-muted-foreground">
                    {c.bail_enregistre_le
                      ? `Bail enregistré le ${formaterDateCourte(c.bail_enregistre_le)}`
                      : `Bail à enregistrer avant le ${formaterDateCourte(c.echeance_enregistrement)} (loi n° 15/025, art. 41)`}
                    {' · '}
                    {c.etats_des_lieux.some((e) => e.type === 'entree' && e.valide_le)
                      ? 'état des lieux validé'
                      : c.etats_des_lieux.some((e) => e.type === 'entree')
                        ? 'état des lieux en attente du locataire'
                        : 'pas d’état des lieux'}
                  </p>
                )}
              </div>

              {c.reglements.length > 0 && (
                <ul className="text-xs space-y-1 border-t pt-2">
                  {c.reglements.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className={r.annulee_le ? 'line-through text-muted-foreground' : ''}>
                        {formaterDateCourte(r.date_reglement)} · {formaterMontant(r.montant, r.devise)} · {r.mode_display}
                        {r.payeur === 'bailleur' ? ' · bailleur' : ''}
                        {r.reference ? ` · ${r.reference}` : ''}
                      </span>
                      {titulaire && !r.annulee_le && (
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setAAnnuler({ type: 'reglement', objet: r })}
                          aria-label="Annuler ce règlement"
                          title="Annuler ce règlement"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {titulaire && !c.annulee_le && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {c.statut !== 'reglee' && (
                    <Button size="sm" onClick={() => setARegler(c)} data-testid={`button-encaisser-${c.id}`}>
                      <Wallet className="w-4 h-4 mr-1" /> Paiement reçu
                    </Button>
                  )}
                  {c.locataire_telephone && (
                    <a href={`tel:${c.locataire_telephone.replace(/\s/g, '')}`}>
                      <Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" /> Locataire</Button>
                    </a>
                  )}
                  <Link href={`/etats-des-lieux/bail/${c.id}`}>
                    <Button size="sm" variant="outline" data-testid={`button-etat-des-lieux-${c.id}`}>
                      <ClipboardList className="w-4 h-4 mr-1" /> État des lieux
                    </Button>
                  </Link>
                  {!c.bail_enregistre_le && (
                    <Button size="sm" variant="outline" onClick={() => setAEnregistrer(c)} data-testid={`button-bail-enregistre-${c.id}`}>
                      <Stamp className="w-4 h-4 mr-1" /> Bail enregistré
                    </Button>
                  )}
                  {actifs.length === 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setAAnnuler({ type: 'commission', objet: c })}>
                      Le bail ne s’est pas fait
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {aRegler && (
        <DialogueReglement
          cible={{
            nature: 'commission',
            commission: aRegler.id,
            titre: aRegler.bien_titre,
            devise: aRegler.devise,
            restes: { locataire: aRegler.reste_locataire, bailleur: aRegler.reste_bailleur },
          }}
          onFermer={() => setARegler(null)}
        />
      )}
      {aAnnuler && <DialogueAnnulation cible={aAnnuler} onFermer={() => setAAnnuler(null)} />}
      {aEnregistrer && <DialogueEnregistrement commission={aEnregistrer} onFermer={() => setAEnregistrer(null)} />}
    </div>
  );
}

/** Ce qui revient au commissionnaire, devise par devise : additionner des
 *  dollars et des francs n'aurait aucun sens. */
function Totaux({ commissions, monId }: { commissions: Commission[]; monId?: number }) {
  const parDevise = new Map<string, { gagne: number; attendu: number }>();
  for (const c of commissions) {
    if (c.annulee_le) continue;
    const part = parseFloat(c.titulaire === monId ? c.montant_titulaire : c.montant_confrere) || 0;
    const total = parseFloat(c.montant_total) || 0;
    const regle = parseFloat(c.montant_regle) || 0;
    // Part reçue au prorata de ce qui a été réglé sur la commission.
    const recu = total > 0 ? (part * regle) / total : 0;
    const ligne = parDevise.get(c.devise) ?? { gagne: 0, attendu: 0 };
    ligne.gagne += recu;
    ligne.attendu += part - recu;
    parDevise.set(c.devise, ligne);
  }
  if (!parDevise.size) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from(parDevise.entries()).flatMap(([devise, { gagne, attendu }]) => [
        <Card key={`${devise}-g`}>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Reçu</p>
            <p className="text-lg font-semibold text-primary">{formaterMontant(Math.round(gagne * 100) / 100, devise)}</p>
          </CardContent>
        </Card>,
        <Card key={`${devise}-a`}>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">À recevoir</p>
            <p className="text-lg font-semibold">{formaterMontant(Math.round(attendu * 100) / 100, devise)}</p>
          </CardContent>
        </Card>,
      ])}
    </div>
  );
}

function DialogueAnnulation({
  cible,
  onFermer,
}: {
  cible: { type: 'commission'; objet: Commission } | { type: 'reglement'; objet: Reglement };
  onFermer: () => void;
}) {
  const { toast } = useToast();
  const [motif, setMotif] = useState('');
  const chemin =
    cible.type === 'commission'
      ? `/api/v1/commissions/${cible.objet.id}/annuler/`
      : `/api/v1/commissions/reglements/${cible.objet.id}/annuler/`;
  const annuler = useMutation({
    mutationFn: () => api.post(chemin, { motif }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMMISSIONS });
      onFermer();
    },
    onError: (e) => toast({ title: 'Annulation refusée', description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cible.type === 'commission' ? 'Le bail ne s’est pas fait' : 'Annuler ce règlement'}
          </DialogTitle>
          <DialogDescription>
            Rien n’est effacé : la ligne reste visible, barrée, avec votre motif. C’est votre protection en cas de désaccord.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder={cible.type === 'commission' ? 'Ex : le locataire s’est désisté' : 'Ex : montant mal saisi'}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Retour</Button>
          <Button variant="destructive" disabled={!motif.trim() || annuler.isPending} onClick={() => annuler.mutate()}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Le bail a été enregistré (loi n° 15/025, article 41 : sous trente jours). */
function DialogueEnregistrement({ commission, onFermer }: { commission: Commission; onFermer: () => void }) {
  const { toast } = useToast();
  const [date, setDate] = useState(aujourdhui());
  const noter = useMutation({
    mutationFn: () => api.post(`/api/v1/commissions/${commission.id}/bail-enregistre/`, { date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMMISSIONS });
      onFermer();
    },
    onError: (e) => toast({ title: 'Erreur', description: messageErreur(e), variant: 'destructive' }),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bail enregistré</DialogTitle>
          <DialogDescription>{commission.bien_titre} · à faire avant le {formaterDateCourte(commission.echeance_enregistrement)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="date-enregistrement">Date de l’enregistrement</Label>
          <Input id="date-enregistrement" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button disabled={!date || noter.isPending} onClick={() => noter.mutate()}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
