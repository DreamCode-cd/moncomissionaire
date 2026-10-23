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
      <div className="flex gap-2" role="tablist" aria-label="Signalements">
        <Button size="sm" variant={vue === 'false' ? 'default' : 'outline'} onClick={() => changerVue('false')} data-testid="filtre-signalements-attente">
          En attente
        </Button>
        <Button size="sm" variant={vue === 'true' ? 'default' : 'outline'} onClick={() => changerVue('true')} data-testid="filtre-signalements-traites">
          Traités
        </Button>
      </div>

      {requete.isLoading ? (
        <EtatChargement texte="Chargement des signalements…" />
      ) : requete.error && !requete.data ? (
        <ErreurRequete erreur={requete.error} titre="Les signalements n’ont pas pu être chargés" onReessayer={() => void requete.refetch()} />
      ) : !requete.data?.results.length ? (
        <EtatVide
          icone={Flag}
          titre={vue === 'false' ? 'Aucun signalement en attente' : 'Aucun signalement traité'}
          description={
            vue === 'false'
              ? 'Quand un client signale un problème sur une visite (frais exigés en trop, commissionnaire injoignable…), il arrive ici.'
              : 'Les signalements clos restent ici, avec la réponse donnée au client.'
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
      toast({ title: 'Signalement clos', description: 'Le client est prévenu et lit votre réponse sous sa demande.' });
    },
    onError: (e) => toast({ title: 'Signalement non clos', description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <Card data-testid={`carte-signalement-${s.id}`} className={traite ? 'opacity-80' : ''}>
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="font-medium leading-tight">{bien?.titre}</p>
          <p className="text-xs text-muted-foreground">
            {lieuAnnonce([bien?.quartier, bien?.ville_nom])} · signalé le {formaterDateEtHeure(s.signale_le)}
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
            <p className="text-muted-foreground">Bien suivi par l’équipe VillaGo (publié par son propriétaire).</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Demande : {s.statut_display}
          {s.frais_visite && estPositif(s.frais_visite)
            ? ` · frais de visite annoncés ${formaterMontant(s.frais_visite, s.frais_visite_devise)}, réglés ${formaterMontant(s.frais_visite_regles, s.frais_visite_devise)}`
            : ' · pas de frais de visite annoncés'}
        </p>

        {traite ? (
          <div className="rounded-md bg-muted p-3 text-sm space-y-1" data-testid={`suite-signalement-${s.id}`}>
            <p className="text-xs text-muted-foreground">
              Traité le {formaterDateEtHeure(s.signalement_traite_le)}
              {s.signalement_traite_par_detail ? ` par ${s.signalement_traite_par_detail.full_name}` : ''}
            </p>
            <p className="whitespace-pre-line">{s.signalement_suite}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`suite-${s.id}`}>Ce que l’équipe a fait</Label>
            <Textarea
              id={`suite-${s.id}`}
              value={suite}
              onChange={(e) => setSuite(e.target.value)}
              placeholder="Ex : appel au commissionnaire, les 10 $ en trop ont été rendus au client."
              maxLength={2000}
              data-testid={`input-suite-${s.id}`}
            />
            <p className="text-xs text-muted-foreground">
              Le client lira cette réponse sous sa demande. Un signalement clos ne se rouvre pas.
            </p>
            <Button
              size="sm"
              disabled={suite.trim().length < SUITE_MINIMUM || clore.isPending}
              onClick={() => clore.mutate()}
              data-testid={`button-clore-${s.id}`}
            >
              Clore le signalement
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
        Précédents
      </Button>
      <span className="text-sm text-muted-foreground">Page {page}</span>
      <Button size="sm" variant="outline" disabled={!suivante} onClick={() => onChange(page + 1)}>
        Suivants
      </Button>
    </div>
  );
}
