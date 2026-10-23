import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { EtatChargement, EtatVide, ErreurRequete } from '@/components/etats';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { ErreurApi, messageErreur } from '@/lib/erreurs';
import { formaterDateCourte } from '@/lib/dates';
import type { EtatDesLieux } from '@shared/schema';
import { BilanGarantie, PieceLecture } from './EtatDesLieuxEdition';

/**
 * Ce que le locataire ouvre depuis le lien reçu par WhatsApp : l'état des
 * lieux de sa future maison, à relire et valider. Pas de compte à créer.
 *
 * Valider ne veut pas dire tout accepter : il écrit ses réserves, et elles
 * restent attachées à l'état des lieux. C'est sa protection au départ, quand
 * il faudra parler de la garantie.
 */
const CHEMIN = '/api/v1/commissions/etat-des-lieux-public/';

export default function EtatDesLieuxPublic() {
  const { jeton: jetonDansLeChemin } = useParams<{ jeton?: string }>();
  // Après « # » : un navigateur n'envoie jamais cette partie de l'adresse, ni
  // au site ni à l'API. Le jeton voyage ensuite dans le corps des requêtes.
  const [jeton] = useState(() => jetonDansLeChemin ?? decodeURIComponent(window.location.hash.slice(1)));

  // Ancien lien (jeton dans le chemin) : on remet l'adresse dans la forme
  // nouvelle, pour que le locataire garde et repartage la bonne.
  useEffect(() => {
    if (jetonDansLeChemin) window.history.replaceState(null, '', `/etat-des-lieux#${jetonDansLeChemin}`);
  }, [jetonDansLeChemin]);

  const etat = useQuery<EtatDesLieux>({
    queryKey: [CHEMIN, 'jeton', jeton],
    queryFn: () => api.post<EtatDesLieux>(CHEMIN, { jeton }),
    enabled: Boolean(jeton),
  });
  // Seul un 404 veut dire que le lien n'est plus bon. Une coupure de réseau
  // ne doit pas faire croire au locataire qu'il faut un nouveau lien.
  const lienInvalide = etat.error instanceof ErreurApi && etat.error.statut === 404;
  const [nom, setNom] = useState('');
  const [reserves, setReserves] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = useMutation({
    mutationFn: () => api.post<EtatDesLieux>(`${CHEMIN}valider/`, { jeton, nom, reserves }),
    onSuccess: () => etat.refetch(),
    onError: (e) => setErreur(messageErreur(e)),
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">
          État des lieux {etat.data?.type === 'sortie' ? 'de sortie' : etat.data ? 'd’entrée' : ''}
        </h1>
        {!jeton ? (
          <EtatVide
            titre="Lien incomplet"
            description="Il manque la fin du lien. Ouvrez le message du commissionnaire et touchez le lien entier, ou demandez-lui de vous le renvoyer."
          />
        ) : etat.isLoading ? (
          <EtatChargement texte="Chargement…" />
        ) : etat.error && !etat.data && !lienInvalide ? (
          <ErreurRequete erreur={etat.error} onReessayer={() => void etat.refetch()} />
        ) : !etat.data ? (
          <EtatVide
            titre="Lien plus valable"
            description="Le commissionnaire a peut-être envoyé un lien plus récent. Demandez-lui de vous le renvoyer."
          />
        ) : (
          <>
            <Card>
              <CardContent className="p-4 space-y-1 text-sm">
                <p className="font-medium">{etat.data.bien_titre}</p>
                <p className="text-muted-foreground">
                  {etat.data.bien_quartier} · {formaterDateCourte(etat.data.date)} · établi par {etat.data.etabli_par_detail?.full_name}
                </p>
                <p>Locataire : {etat.data.locataire_nom}</p>
                {etat.data.releves_compteurs && <p>Compteurs : {etat.data.releves_compteurs}</p>}
                {etat.data.observations && <p>{etat.data.observations}</p>}
              </CardContent>
            </Card>

            {etat.data.type === 'sortie' && (
              <p className="text-sm text-muted-foreground">
                Chaque pièce est comparée à l’état des lieux d’entrée. Vérifiez surtout celles marquées « dégradée », et la retenue sur la garantie plus bas.
              </p>
            )}
            {etat.data.pieces.map((p) => <PieceLecture key={p.id} piece={p} sortie={etat.data.type === 'sortie'} />)}
            {etat.data.type === 'sortie' && <BilanGarantie etat={etat.data} />}

            {etat.data.est_valide ? (
              <Card>
                <CardContent className="p-4 space-y-1 text-sm">
                  <p className="font-medium text-statut-favorable">
                    Validé par {etat.data.valide_par_nom} le {formaterDateCourte(etat.data.valide_le ?? '')}
                  </p>
                  {etat.data.reserves_locataire && <p>Vos réserves : {etat.data.reserves_locataire}</p>}
                  <p className="text-muted-foreground">Gardez ce lien : c’est votre copie.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm">
                    Relisez chaque pièce. Si quelque chose ne correspond pas à ce que vous voyez{etat.data.type === 'sortie' ? ', ou si vous contestez la retenue' : ''}, écrivez-le ci-dessous : vos réserves resteront jointes à l’état des lieux.
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="reserves">Vos réserves (facultatif)</Label>
                    <Textarea
                      id="reserves"
                      value={reserves}
                      onChange={(e) => setReserves(e.target.value)}
                      placeholder="Ex : la porte de la cuisine ferme mal"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nom">Votre nom, en guise de signature</Label>
                    <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" />
                  </div>
                  {erreur && <p className="text-sm text-destructive">{erreur}</p>}
                  <Button className="w-full" disabled={!nom.trim() || valider.isPending} onClick={() => valider.mutate()} data-testid="button-valider-edl">
                    Je valide cet état des lieux
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
