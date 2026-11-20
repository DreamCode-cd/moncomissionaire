import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Flag, Phone } from 'lucide-react';
import { EtatChargement, EtatVide, ErreurRequete } from '@/components/etats';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formaterDateEtHeure } from '@/lib/dates';
import { messageErreur } from '@/lib/erreurs';
import { formaterMontant, estPositif } from '@/lib/prix';
import { lieuAnnonce } from '@/lib/annonce';
import { queryClient } from '@/lib/queryClient';
import type { CompteResume, PaginatedResponse, SignalementEquipe } from '@shared/schema';
import { t } from '@/i18n';
import { lireStatutQuelconque } from '@/lib/statuts';

export const CLE_SIGNALEMENTS = '/api/v1/visites/equipe/signalements/';
const SUITE_MINIMUM = 10;

/**
 * Les signalements des clients, pour l'équipe VillaGo.
 *
 * Avant, un signalement prévenait l'équipe par une notification, puis plus
 * rien : aucune liste, aucune réponse, et le client ne savait jamais si
 * quelqu'un s'en était occupé. Ici, ceux qui attendent passent devant, et
 * chacun se clôt par ce que l'équipe a fait, que le client lira.
 */
export function OngletSignalements() {
  const [vue, setVue] = useState<'false' | 'true'>('false');
  const [page, setPage] = useState(1);
  const requete = useQuery<PaginatedResponse<SignalementEquipe>>({
    queryKey: [CLE_SIGNALEMENTS, { traite: vue, page: String(page) }],
  });

  const changerVue = (v: 'false' | 'true') => {
    setVue(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label={t('signalements.signalements')}>
        <Button size="sm" variant={vue === 'false' ? 'default' : 'outline'} onClick={() => changerVue('false')} data-testid="filtre-signalements-attente">
          {t('signalements.attente')}
        </Button>
        <Button size="sm" variant={vue === 'true' ? 'default' : 'outline'} onClick={() => changerVue('true')} data-testid="filtre-signalements-traites">
          {t('signalements.traites')}
        </Button>
      </div>

      {requete.isLoading ? (
        <EtatChargement texte={t('signalements.chargementSignalements')} />
      ) : requete.error && !requete.data ? (
        <ErreurRequete erreur={requete.error} titre={t('signalements.signalementsNOntPas')} onReessayer={() => void requete.refetch()} />
      ) : !requete.data?.results.length ? (
        <EtatVide
          icone={Flag}
          titre={vue === 'false' ? t('signalements.aucunSignalementAttente') : t('signalements.aucunSignalementTraite')}
          description={
            vue === 'false'
              ? t('signalements.quandClientSignaleProbleme')
              : t('signalements.signalementsClosRestentIci')
          }
        />
      ) : (
        <>
          {requete.data.results.map((s) => (
            <CarteSignalement key={s.id} signalement={s} />
          ))}
          <Pagination
            page={page}
            precedente={!!requete.data.previous}
            suivante={!!requete.data.next}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function CarteSignalement({ signalement: s }: { signalement: SignalementEquipe }) {
  const { toast } = useToast();
  const [suite, setSuite] = useState('');
  const bien = s.bien_detail;
  const traite = !!s.signalement_traite_le;

  const clore = useMutation({
    mutationFn: () => api.post(`${CLE_SIGNALEMENTS}${s.id}/traiter/`, { suite: suite.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLE_SIGNALEMENTS] });
      toast({ title: t('signalements.signalementClos'), description: t('signalements.clientEstPrevenuLit') });
    },
    onError: (e) => toast({ title: t('signalements.signalementNonClos'), description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <Card data-testid={`carte-signalement-${s.id}`} className={traite ? 'opacity-80' : ''}>
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="font-medium leading-tight">{bien?.titre}</p>
          <p className="text-xs text-muted-foreground">
            {t('signalements.signaleB', { a: lieuAnnonce([bien?.quartier, bien?.ville_nom]), b: formaterDateEtHeure(s.signale_le) })}
          </p>
        </div>

        <blockquote className="border-l-2 border-statut-defavorable pl-3 text-sm whitespace-pre-line">
          {s.signalement_motif}
        </blockquote>

        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <Personne role="Client" compte={s.client} />
          {s.gestionnaire ? (
            <Personne role="Commissionnaire du bien" compte={s.gestionnaire} />
          ) : (
            <p className="text-muted-foreground">{t('signalements.bienSuiviEquipeVillago')}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t('signalements.demande', { statut: lireStatutQuelconque(s.statut, s.statut_display).libelle })}
          {s.frais_visite && estPositif(s.frais_visite)
            ? t('signalements.frais', { annonces: formaterMontant(s.frais_visite, s.frais_visite_devise), regles: formaterMontant(s.frais_visite_regles, s.frais_visite_devise) })
            : t('signalements.pasFraisVisiteAnnonces')}
        </p>

        {traite ? (
          <div className="rounded-md bg-muted p-3 text-sm space-y-1" data-testid={`suite-signalement-${s.id}`}>
            <p className="text-xs text-muted-foreground">
              {t('signalements.traite', { a: formaterDateEtHeure(s.signalement_traite_le) })}
              {s.signalement_traite_par_detail ? ` par ${s.signalement_traite_par_detail.full_name}` : ''}
            </p>
            <p className="whitespace-pre-line">{s.signalement_suite}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`suite-${s.id}`}>{t('signalements.ceQueEquipeFait')}</Label>
            <Textarea
              id={`suite-${s.id}`}
              value={suite}
              onChange={(e) => setSuite(e.target.value)}
              placeholder={t('signalements.exAppelCommissionnaire10')}
              maxLength={2000}
              data-testid={`input-suite-${s.id}`}
            />
            <p className="text-xs text-muted-foreground">
              {t('signalements.clientLiraCetteReponse')}
            </p>
            <Button
              size="sm"
              disabled={suite.trim().length < SUITE_MINIMUM || clore.isPending}
              onClick={() => clore.mutate()}
              data-testid={`button-clore-${s.id}`}
            >
              {t('signalements.cloreSignalement')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Personne({ role, compte }: { role: string; compte: CompteResume }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{role}</p>
      <p className="font-medium">{compte.full_name}</p>
      {compte.phone ? (
        <a href={`tel:${compte.phone}`} className="inline-flex min-h-11 items-center gap-1 text-primary">
          <Phone className="h-4 w-4" aria-hidden />
          {compte.phone}
        </a>
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  precedente,
  suivante,
  onChange,
}: {
  page: number;
  precedente: boolean;
  suivante: boolean;
  onChange: (page: number) => void;
}) {
  if (!precedente && !suivante) return null;
  return (
    <div className="flex items-center justify-between">
      <Button size="sm" variant="outline" disabled={!precedente} onClick={() => onChange(page - 1)}>
        {t('signalements.precedents')}
      </Button>
      <span className="text-sm text-muted-foreground">{t('commun.page', { page })}</span>
      <Button size="sm" variant="outline" disabled={!suivante} onClick={() => onChange(page + 1)}>
        {t('signalements.suivants')}
      </Button>
    </div>
  );
}
