import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HandCoins, Search } from 'lucide-react';
import { EtatChargement, EtatVide, ErreurRequete } from '@/components/etats';
import { BadgeStatut } from '@/components/statut/BadgeStatut';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formaterDateCourte } from '@/lib/dates';
import { formaterMontant } from '@/lib/prix';
import type { Commission, PaginatedResponse } from '@shared/schema';
import { Pagination } from './OngletSignalements';
import { t } from '@/i18n';
import { libelleModeReglement, libellePayeur } from '@/lib/prix';

const CLE = '/api/v1/commissions/';

/** Un bail non enregistré au-delà du délai légal : à surveiller. */
function enregistrementEnRetard(c: Commission): boolean {
  if (c.annulee_le || c.bail_enregistre_le) return false;
  return new Date(c.echeance_enregistrement) < new Date(new Date().toDateString());
}

/**
 * Toutes les commissions, en lecture, pour l'équipe VillaGo.
 *
 * L'équipe n'en crée ni n'en annule aucune : ce sont les affaires des
 * commissionnaires. Elle les lit pour arbitrer un litige, d'où la recherche
 * par maison, locataire ou commissionnaire, et la trace complète des
 * règlements, annulés compris.
 */
export function OngletCommissions() {
  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);

  // Une requête après une courte pause, pas à chaque lettre.
  useEffect(() => {
    const minuterie = setTimeout(() => {
      setRecherche(saisie.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(minuterie);
  }, [saisie]);

  const requete = useQuery<PaginatedResponse<Commission>>({
    queryKey: [CLE, { search: recherche, page: String(page) }],
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={t('commissionsEquipe.rechercherBail')}
          aria-label={t('commissionsEquipe.rechercherCommissionMaisonQuartier')}
          className="pl-9"
          data-testid="input-recherche-commissions"
        />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t('commissionsEquipe.maisonQuartierLocataireOu')}</p>

      {requete.isLoading ? (
        <EtatChargement texte={t('commissionsEquipe.chargementCommissions')} />
      ) : requete.error && !requete.data ? (
        <ErreurRequete erreur={requete.error} titre={t('commissionsEquipe.commissionsNOntPas')} onReessayer={() => void requete.refetch()} />
      ) : !requete.data?.results.length ? (
        <EtatVide
          icone={HandCoins}
          titre={recherche ? t('commissionsEquipe.aucuneCommissionNeCorrespond') : t('commissionsEquipe.aucuneCommission')}
          description={recherche ? t('commissionsEquipe.essayezNomLocataireTitre') : t('commissionsEquipe.chaqueBailDeclareCommissionnaire')}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{requete.data.count} commission{requete.data.count > 1 ? 's' : ''}</p>
          {requete.data.results.map((c) => (
            <CarteCommission key={c.id} commission={c} />
          ))}
          <Pagination page={page} precedente={!!requete.data.previous} suivante={!!requete.data.next} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function CarteCommission({ commission: c }: { commission: Commission }) {
  const enRetard = enregistrementEnRetard(c);
  return (
    <Card data-testid={`carte-commission-equipe-${c.id}`} className={c.annulee_le ? 'opacity-70' : ''}>
      <CardContent className="p-4 space-y-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium leading-tight">{c.bien_titre}</p>
            <p className="text-xs text-muted-foreground">
              {t('commissionsEquipe.bailB', { a: c.locataire_nom, b: formaterDateCourte(c.date_bail) })}
            </p>
          </div>
          <BadgeStatut famille="commission" valeur={c.statut} compact />
        </div>

        <p>
          {t('commissionsEquipe.commissionnaire', { nom: c.titulaire_detail.full_name })}
          {c.confrere_detail ? t('commissionsEquipe.avec', { nom: c.confrere_detail.full_name, part: c.part_confrere_pourcent }) : ''}
        </p>
        <p>
          {t('commissionsEquipe.montants', { total: formaterMontant(c.montant_total, c.devise), regle: formaterMontant(c.montant_regle, c.devise) })}
        </p>

        {c.annulee_le ? (
          <p className="text-muted-foreground">{t('commissionsEquipe.annuleeLe', { date: formaterDateCourte(c.annulee_le), motif: c.motif_annulation })}</p>
        ) : c.bail_enregistre_le ? (
          <p className="text-muted-foreground">{t('gains.bailEnregistreLe', { date: formaterDateCourte(c.bail_enregistre_le) })}</p>
        ) : (
          <p className={enRetard ? 'font-medium text-statut-defavorable' : 'text-muted-foreground'}>
            {enRetard
              ? t('commissionsEquipe.enRetard', { date: formaterDateCourte(c.echeance_enregistrement) })
              : t('gains.bailAEnregistrer', { date: formaterDateCourte(c.echeance_enregistrement) })}
          </p>
        )}

        {c.reglements.length > 0 && (
          <ul className="space-y-1 border-t pt-2">
            {c.reglements.map((r) => (
              <li key={r.id} className={r.annulee_le ? 'text-muted-foreground' : ''}>
                <span className={r.annulee_le ? 'line-through' : ''}>
                  {formaterDateCourte(r.date_reglement)} · {formaterMontant(r.montant, r.devise)} {t('reglement.parLe', { payeur: libellePayeur(r.payeur, r.payeur_display) })} · {libelleModeReglement(r.mode, r.mode_display)}
                </span>
                {r.annulee_le ? t('reste.annuleMotif', { motif: r.motif_annulation }) : ''}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
