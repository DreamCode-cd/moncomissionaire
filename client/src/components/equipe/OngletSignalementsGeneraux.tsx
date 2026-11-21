import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Flag, Phone, Users } from 'lucide-react';
import { EtatChargement, EtatVide, ErreurRequete } from '@/components/etats';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formaterDateEtHeure } from '@/lib/dates';
import { messageErreur } from '@/lib/erreurs';
import { CLE_SIGNALEMENTS_GENERAUX, libelleMotif } from '@/lib/moderation';
import { queryClient } from '@/lib/queryClient';
import type { CompteResume, PaginatedResponse, SignalementGeneralEquipe } from '@shared/schema';
import { t } from '@/i18n';
import { Pagination } from './OngletSignalements';

const SUITE_MINIMUM = 10;

/**
 * Les signalements d'annonces, de messages et de personnes, pour l'équipe.
 *
 * L'annonce signalée reste en ligne : c'est à l'équipe de décider (choix de
 * David, 21/11/2026). Pour l'aider, chaque carte dit combien d'autres
 * personnes ont signalé la même chose : un signalement isolé n'a pas le
 * poids de dix. L'auteur est remercié à la clôture ; la note reste interne.
 */
export function OngletSignalementsGeneraux() {
  const [vue, setVue] = useState<'false' | 'true'>('false');
  const [page, setPage] = useState(1);
  const requete = useQuery<PaginatedResponse<SignalementGeneralEquipe>>({
    queryKey: [CLE_SIGNALEMENTS_GENERAUX, { traite: vue, page: String(page) }],
  });

  const changerVue = (v: 'false' | 'true') => {
    setVue(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label={t('signalementsGeneraux.titre')}>
        <Button size="sm" variant={vue === 'false' ? 'default' : 'outline'} onClick={() => changerVue('false')} data-testid="filtre-generaux-attente">
          {t('signalements.attente')}
        </Button>
        <Button size="sm" variant={vue === 'true' ? 'default' : 'outline'} onClick={() => changerVue('true')} data-testid="filtre-generaux-traites">
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
          description={vue === 'false' ? t('signalementsGeneraux.quandQuelquUnSignale') : t('signalementsGeneraux.closRestentIci')}
        />
      ) : (
        <>
          {requete.data.results.map((s) => (
            <CarteSignalement key={s.id} signalement={s} />
          ))}
          <Pagination page={page} precedente={!!requete.data.previous} suivante={!!requete.data.next} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function CarteSignalement({ signalement: s }: { signalement: SignalementGeneralEquipe }) {
  const { toast } = useToast();
  const [suite, setSuite] = useState('');
  const traite = !!s.traite_le;

  const clore = useMutation({
    mutationFn: () => api.post(`${CLE_SIGNALEMENTS_GENERAUX}${s.id}/traiter/`, { suite: suite.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLE_SIGNALEMENTS_GENERAUX] });
      toast({ title: t('signalements.signalementClos'), description: t('signalementsGeneraux.auteurRemercie') });
    },
    onError: (e) => toast({ title: t('signalements.signalementNonClos'), description: messageErreur(e), variant: 'destructive' }),
  });

  const quoi = {
    annonce: t('signalementsGeneraux.cibleAnnonce'),
    message: t('signalementsGeneraux.cibleMessage'),
    utilisateur: t('signalementsGeneraux.ciblePersonne'),
  }[s.cible];

  return (
    <Card data-testid={`carte-signalement-general-${s.id}`} className={traite ? 'opacity-80' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{quoi}</Badge>
          <Badge variant="secondary">{libelleMotif(s.motif)}</Badge>
          {s.autres_signalements > 0 ? (
            <Badge className="gap-1" data-testid={`autres-signalements-${s.id}`}>
              <Users className="h-3 w-3" aria-hidden />
              {t('signalementsGeneraux.autres', { n: s.autres_signalements })}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{formaterDateEtHeure(s.created_at)}</span>
        </div>

        {s.cible === 'annonce' && s.bien ? (
          <Link href={`/property/${s.bien}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {s.bien_titre ?? t('signalementsGeneraux.annonceRetiree')}
          </Link>
        ) : null}

        {s.contenu_signale ? (
          <blockquote className="border-l-2 border-statut-defavorable pl-3 text-sm whitespace-pre-line">
            {s.contenu_signale}
          </blockquote>
        ) : null}

        {s.details ? <p className="text-sm whitespace-pre-line">{s.details}</p> : null}

        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <Personne role={t('signalementsGeneraux.signalePar')} compte={s.auteur_detail} />
          {s.utilisateur_detail ? <Personne role={t('signalementsGeneraux.personneSignalee')} compte={s.utilisateur_detail} /> : null}
        </div>

        {traite ? (
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p className="text-xs text-muted-foreground">
              {s.traite_par_detail
                ? t('signalementsGeneraux.traitePar', { date: formaterDateEtHeure(s.traite_le!), nom: s.traite_par_detail.full_name })
                : t('signalements.traite', { a: formaterDateEtHeure(s.traite_le!) })}
            </p>
            <p className="whitespace-pre-line">{s.suite}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`suite-generale-${s.id}`}>{t('signalements.ceQueEquipeFait')}</Label>
            <Textarea
              id={`suite-generale-${s.id}`}
              value={suite}
              onChange={(e) => setSuite(e.target.value)}
              placeholder={t('signalementsGeneraux.exempleSuite')}
              maxLength={2000}
              data-testid={`input-suite-generale-${s.id}`}
            />
            <p className="text-xs text-muted-foreground">{t('signalementsGeneraux.noteInterne')}</p>
            <Button
              size="sm"
              disabled={suite.trim().length < SUITE_MINIMUM || clore.isPending}
              onClick={() => clore.mutate()}
              data-testid={`button-clore-general-${s.id}`}
            >
              {t('signalements.cloreSignalement')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Personne({ role, compte }: { role: string; compte: CompteResume | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{role}</p>
      <p className="font-medium">{compte?.full_name ?? t('signalementsGeneraux.compteSupprime')}</p>
      {compte?.phone ? (
        <a href={`tel:${compte.phone}`} className="inline-flex min-h-11 items-center gap-1 text-primary">
          <Phone className="h-4 w-4" aria-hidden />
          {compte.phone}
        </a>
      ) : null}
    </div>
  );
}
