import { useState } from 'react';
import { ChoixCreneau } from '@/components/confiance/ChoixCreneau';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, Handshake, MapPin, Search } from 'lucide-react';
import { EtatChargement, EtatVide, ErreurRequete } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { lieuAnnonce } from '@/lib/annonce';
import { formaterDateCourte } from '@/lib/dates';
import { formaterLoyer, formaterMontant } from '@/lib/prix';
import { getDjangoImageUrl, getVilleName, vignetteDe } from '@/lib/utils';
import type { BienPartage, DemandeVisite, PaginatedResponse } from '@shared/schema';
import { CLE_PARTAGES, CLE_PRESENTATIONS, aujourdhui, messageErreur } from './commun';
import { t } from '@/i18n';

/**
 * Travailler avec ses confrères sans leur livrer son carnet.
 *
 * Ici, le commissionnaire voit les maisons que d'autres ont ouvertes au
 * partage, avec la part qu'ils cèdent, et leur présente son client. La part
 * est figée à la présentation. Il ne voit jamais le bailleur ni l'adresse
 * exacte : la visite reste conduite par le commissionnaire du bien.
 */
export function OngletPartages() {
  const [recherche, setRecherche] = useState('');
  const partages = useQuery<PaginatedResponse<BienPartage>>({
    queryKey: [...CLE_PARTAGES, recherche],
    queryFn: () =>
      api.get(`${CLE_PARTAGES[0]}${recherche.trim() ? `?search=${encodeURIComponent(recherche.trim())}` : ''}`),
  });
  const presentations = useQuery<PaginatedResponse<DemandeVisite>>({ queryKey: CLE_PRESENTATIONS });
  const [aPresenter, setAPresenter] = useState<BienPartage | null>(null);

  const mesPresentations = presentations.data?.results ?? [];

  return (
    <div className="space-y-4">
      {mesPresentations.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t('partages.mesClientsPresentes')}</h2>
          {mesPresentations.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-tight">{p.bien_detail?.titre}</p>
                  <BadgeStatut famille="demande" valeur={p.statut} libelle={p.statut_display} compact />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('partages.bVotrePartC', { a: p.prospect_nom, b: formaterDateCourte(p.date_souhaitee), c: p.part_confrere_pourcent })}
                </p>
                {p.statut === 'rejetee' && p.motif_rejet && (
                  <p className="text-xs text-muted-foreground">{t('partages.motif')} {p.motif_rejet}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t('partages.maisonsOuvertesVosConfreres')}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t('partages.quartierCommuneVille')}
            className="pl-9"
            data-testid="input-recherche-partages"
          />
        </div>

        {partages.isLoading ? (
          <EtatChargement texte={t('partages.chargementMaisonsPartagees')} />
        ) : partages.error && !partages.data ? (
          <ErreurRequete erreur={partages.error} onReessayer={() => void partages.refetch()} />
        ) : !partages.data?.results?.length ? (
          <EtatVide
            icone={Handshake}
            titre={t('partages.aucuneMaisonPartageeMoment')}
            description={t('partages.quandConfrereOuvreMaison')}
          />
        ) : (
          partages.data.results.map((bien) => (
            <Card key={bien.id} data-testid={`carte-partage-${bien.id}`}>
              <CardContent className="p-3 flex gap-3">
                {bien.photo_principale?.image ? (
                  <img
                    src={vignetteDe(bien.photo_principale) || ''}
                    alt=""
                    loading="lazy"
                    className="w-20 h-20 rounded-md object-cover bg-muted shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-md bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
                    <Building2 className="w-6 h-6" aria-label={t('partages.pasEncorePhoto')} />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium leading-tight">{bien.titre}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {lieuAnnonce([bien.quartier, bien.commune, getVilleName(bien.ville, bien.ville_nom, bien.ville_detail)])}
                  </p>
                  <p className="text-sm font-semibold text-primary">{formaterLoyer(bien.prix_mensuel, bien.devise)}</p>
                  <p className="text-xs">
                    {t('partages.votrePart')}{' '}
                    <span className="font-semibold">{bien.part_confrere_pourcent} %</span>
                    {bien.commission_locataire != null && (
                      <> {t('partages.environ')} {formaterMontant(
                        ((parseFloat(bien.commission_locataire) + parseFloat(bien.commission_bailleur ?? '0')) *
                          bien.part_confrere_pourcent) / 100,
                        bien.devise,
                      )}</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('partages.chez', { nom: bien.commissionnaire_detail?.full_name })}
                    {bien.commissionnaire_detail?.identite_verifiee ? t('partages.identiteVerifiee') : ''}
                  </p>
                  <Button size="sm" className="mt-1" onClick={() => setAPresenter(bien)} data-testid={`button-presenter-${bien.id}`}>
                    {t('partages.presenterClient')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {aPresenter && <DialoguePresentation bien={aPresenter} onFermer={() => setAPresenter(null)} />}
    </div>
  );
}

function DialoguePresentation({ bien, onFermer }: { bien: BienPartage; onFermer: () => void }) {
  const { toast } = useToast();
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [date, setDate] = useState(aujourdhui());
  const [heure, setHeure] = useState('10:00');
  const [message, setMessage] = useState('');

  const presenter = useMutation({
    mutationFn: () =>
      api.post('/api/v1/visites/commissionnaire/presentations/', {
        bien: bien.id,
        prospect_nom: nom,
        prospect_telephone: telephone,
        date_souhaitee: date,
        heure_souhaitee: heure,
        message,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_PRESENTATIONS });
      toast({
        title: t('partages.clientPresente'),
        description: t('partages.prevenu', { nom: bien.commissionnaire_detail?.full_name ?? t('partages.votreConfrere'), part: bien.part_confrere_pourcent }),
      });
      onFermer();
    },
    onError: (e) => toast({ title: t('partages.presentationRefusee'), description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('partages.presenterClient')}</DialogTitle>
          <DialogDescription>
            {t('partages.votrePartBFigee', { a: bien.titre, b: bien.part_confrere_pourcent })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="prospect-nom">{t('partages.nomClient')}</Label>
            <Input id="prospect-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prospect-telephone">{t('partages.sonTelephoneFacultatif')}</Label>
            <Input
              id="prospect-telephone"
              type="tel"
              inputMode="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </div>
          <ChoixCreneau jour={date || null} heure={heure || null} onJour={setDate} onHeure={(h) => setHeure(h ?? '')} />
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('partages.motVotreConfrereFacultatif')}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>{t('partages.annuler')}</Button>
          <Button
            disabled={!nom.trim() || !date || !heure || presenter.isPending}
            onClick={() => presenter.mutate()}
            data-testid="button-confirmer-presentation"
          >
            {t('partages.presenter')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
