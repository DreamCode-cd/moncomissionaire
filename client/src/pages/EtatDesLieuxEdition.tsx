import { useRef, useState } from 'react';
import { useParams, Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, ChevronLeft, Copy, Plus, Send, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { EtatChargement, ErreurRequete } from '@/components/etats';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { formaterDateCourte } from '@/lib/dates';
import { formaterMontant, symboleDevise } from '@/lib/prix';
import { getDjangoImageUrl } from '@/lib/utils';
import { aujourdhui, messageErreur } from '@/components/commission/commun';
import {
  ETATS_PIECE,
  type EtatDesLieux,
  type EtatPiece,
  type PaginatedResponse,
  type PieceEtatDesLieux,
  type TypeEtatDesLieux,
} from '@shared/schema';
import { t } from '@/i18n';

/**
 * L'état des lieux d'entrée, établi par le commissionnaire devant la maison.
 *
 * Loi n° 15/025, article 17 : il doit être contradictoire. Le commissionnaire
 * le remplit pour le bailleur, pièce par pièce, photos à l'appui, puis envoie
 * un lien au locataire (WhatsApp ou SMS). Le locataire le valide, avec ses
 * réserves s'il en a. Ensuite, plus rien ne se modifie : c'est la pièce qu'on
 * ressortira au départ, quand il faudra rendre ou non la garantie.
 *
 * À la sortie (même page, `/sortie` au bout de l'adresse), les pièces
 * reprennent celles de l'entrée, chacune avec son état d'alors et ses photos.
 * Le commissionnaire ne change que ce qui s'est dégradé, puis indique ce qu'il
 * retient de la garantie, avec un motif. Le locataire valide de la même façon,
 * et ses réserves sont le moyen de contester une retenue.
 */

// Des suggestions de noms de pièces, dans la langue de l'écran : une fois
// choisi, le nom est enregistré tel quel (c'est le contenu de l'état des lieux).
const piecesCourantes = () => [
  t('edl.salon'),
  t('edl.chambre1'),
  t('edl.chambre2'),
  t('edl.cuisine'),
  t('edl.doucheWc'),
  t('edl.parcelle'),
];

/** Libellé d'un état de pièce dans la langue de l'écran (le `etat_display`
 *  du serveur est rédigé en français). */
const libelleEtatPiece = (valeur?: string | null, repli?: string | null) =>
  valeur === 'bon' || valeur === 'usage' || valeur === 'mauvais' ? t(`etatPiece.${valeur}`) : (repli ?? '');

export default function EtatDesLieuxEdition() {
  const { commissionId, type: typeDemande } = useParams<{ commissionId: string; type?: string }>();
  const type: TypeEtatDesLieux = typeDemande === 'sortie' ? 'sortie' : 'entree';
  const cle = [`/api/v1/commissions/etats-des-lieux/?commission=${commissionId}&type=${type}`];
  const etats = useQuery<PaginatedResponse<EtatDesLieux>>({ queryKey: cle });
  const etat = etats.data?.results?.[0];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/mon-portefeuille">
            <Button variant="ghost" size="icon" aria-label={t('edl.retour')}><ChevronLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold">{type === 'sortie' ? t('edlPublic.titreSortie') : t('edlPublic.titreEntree')}</h1>
        </div>
        {etats.isLoading ? (
          <EtatChargement texte={t('edl.chargement')} />
        ) : etats.error && !etats.data ? (
          // Surtout pas le formulaire de création : on ne sait pas s'il en
          // existe déjà un, et en recréer un perdrait le travail commencé.
          <ErreurRequete erreur={etats.error} titre={t('edl.etatLieuxNPas')} onReessayer={() => void etats.refetch()} />
        ) : etat ? (
          <Edition etat={etat} cle={cle} />
        ) : (
          <Creation commissionId={Number(commissionId)} type={type} cle={cle} />
        )}
      </div>
    </Layout>
  );
}

function Creation({ commissionId, type, cle }: { commissionId: number; type: TypeEtatDesLieux; cle: string[] }) {
  const { toast } = useToast();
  const [date, setDate] = useState(aujourdhui());
  const [compteurs, setCompteurs] = useState('');
  const [pieces, setPieces] = useState<string[]>(() => piecesCourantes().slice(0, 4));
  const [garantie, setGarantie] = useState('');
  const sortie = type === 'sortie';

  const creer = useMutation({
    mutationFn: () =>
      api.post('/api/v1/commissions/etats-des-lieux/', {
        commission: commissionId,
        type,
        date,
        releves_compteurs: compteurs,
        // À la sortie, le serveur reprend les pièces de l'entrée.
        ...(sortie
          ? garantie.trim() ? { garantie_versee: garantie.replace(',', '.') } : {}
          : { pieces: pieces.map((nom) => ({ nom, etat: 'bon' })) }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cle }),
    onError: (e) => toast({ title: t('edl.nonCree'), description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="edl-date">{t('edl.date')}</Label>
          <Input id="edl-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="edl-compteurs">{t('edl.compteurs')}</Label>
          <Input
            id="edl-compteurs"
            value={compteurs}
            onChange={(e) => setCompteurs(e.target.value)}
            placeholder={t('edl.exSnelPrepaye42')}
          />
        </div>
        {sortie ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="edl-garantie">{t('edl.garantieVerseeEntreeFacultatif')}</Label>
              <Input
                id="edl-garantie"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={garantie}
                onChange={(e) => setGarantie(e.target.value)}
                placeholder={t('edl.videGarantieAnnonce')}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('edl.piecesEtatLieuxEntree')}
            </p>
          </>
        ) : (
        <div className="space-y-2">
          <Label>{t('edl.piecesVisiter')}</Label>
          <div className="flex flex-wrap gap-2">
            {piecesCourantes().map((nom) => {
              const choisie = pieces.includes(nom);
              return (
                <button
                  key={nom}
                  type="button"
                  onClick={() => setPieces((p) => (choisie ? p.filter((x) => x !== nom) : [...p, nom]))}
                  className={`rounded-full border px-3 py-2 text-sm ${choisie ? 'border-primary bg-primary/10' : ''}`}
                  aria-pressed={choisie}
                >
                  {nom}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{t('edl.vousPourrezAjouterAutres')}</p>
        </div>
        )}
        <Button className="w-full" disabled={!date || (!sortie && !pieces.length) || creer.isPending} onClick={() => creer.mutate()}>
          {sortie ? t('edl.commencerSortie') : t('edl.commencer')}
        </Button>
      </CardContent>
    </Card>
  );
}

function Edition({ etat, cle }: { etat: EtatDesLieux; cle: string[] }) {
  const { toast } = useToast();
  const base = `/api/v1/commissions/etats-des-lieux/${etat.id}/`;
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: cle });
  const surErreur = (e: unknown) => toast({ title: t('edl.erreur'), description: messageErreur(e), variant: 'destructive' });
  const [nouvellePiece, setNouvellePiece] = useState('');
  const [lien, setLien] = useState<string | null>(null);
  const [observations, setObservations] = useState(etat.observations);

  const ajouterPiece = useMutation({
    mutationFn: () => api.post(`${base}pieces/`, { nom: nouvellePiece, etat: 'bon' }),
    onSuccess: () => {
      setNouvellePiece('');
      rafraichir();
    },
    onError: surErreur,
  });
  const enregistrerObservations = useMutation({
    mutationFn: () => api.patch(base, { observations }),
    onSuccess: rafraichir,
    onError: surErreur,
  });
  const envoyer = useMutation({
    mutationFn: () => api.post<{ chemin: string }>(`${base}lien/`),
    onSuccess: (reponse) => {
      setLien(`${window.location.origin}${reponse.chemin}`);
      rafraichir();
    },
    onError: surErreur,
  });

  const resume = (
    <Card>
      <CardContent className="p-4 space-y-1 text-sm">
        <p className="font-medium">{etat.bien_titre}</p>
        <p className="text-muted-foreground">
          {etat.locataire_nom} · {formaterDateCourte(etat.date)}
        </p>
        {etat.releves_compteurs && <p>{t('edl.compteurs2')} {etat.releves_compteurs}</p>}
      </CardContent>
    </Card>
  );

  if (etat.est_valide) {
    return (
      <div className="space-y-3">
        {resume}
        <Card>
          <CardContent className="p-4 space-y-1 text-sm">
            <p className="font-medium text-statut-favorable">
              {t('edl.valideB', { a: etat.valide_par_nom, b: formaterDateCourte(etat.valide_le ?? '') })}
            </p>
            {etat.reserves_locataire ? (
              <p>{t('edl.reservesLocataire')} {etat.reserves_locataire}</p>
            ) : (
              <p className="text-muted-foreground">{t('edl.sansReserve')}</p>
            )}
            <p className="text-muted-foreground">{t('edl.ilNeSeModifie')}</p>
          </CardContent>
        </Card>
        {etat.type === 'sortie' && <BilanGarantie etat={etat} />}
        {etat.pieces.map((p) => <PieceLecture key={p.id} piece={p} sortie={etat.type === 'sortie'} />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resume}
      {etat.pieces.map((p) => (
        <PieceEdition key={p.id} piece={p} sortie={etat.type === 'sortie'} base={base} onChange={rafraichir} onErreur={surErreur} />
      ))}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nouvellePiece.trim()) ajouterPiece.mutate();
        }}
      >
        <Input value={nouvellePiece} onChange={(e) => setNouvellePiece(e.target.value)} placeholder={t('edl.ajouterPiece')} />
        <Button type="submit" variant="outline" disabled={!nouvellePiece.trim() || ajouterPiece.isPending}>
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      <div className="space-y-1">
        <Label htmlFor="edl-observations">{t('edl.observationsGenerales')}</Label>
        <Textarea
          id="edl-observations"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          onBlur={() => observations !== etat.observations && enregistrerObservations.mutate()}
        />
      </div>

      {etat.type === 'sortie' && <SaisieGarantie etat={etat} base={base} onChange={rafraichir} onErreur={surErreur} />}

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm">
            {t('edl.quandToutEstNote')}
          </p>
          {lien ? (
            <div className="space-y-2">
              <Input value={lien} readOnly onFocus={(e) => e.currentTarget.select()} data-testid="lien-locataire" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(lien);
                    toast({ title: t('edl.lienCopie') });
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" /> {t('edl.copier')}
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(t(etat.type === 'sortie' ? 'reste.lienSortie' : 'reste.lienEntree', { titre: etat.bien_titre, lien }))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button><Send className="w-4 h-4 mr-1" /> {t('edl.whatsapp')}</Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">{t('edl.ceLienRemplacePrecedent')}</p>
            </div>
          ) : (
            <Button className="w-full" disabled={envoyer.isPending} onClick={() => envoyer.mutate()} data-testid="button-envoyer-locataire">
              <Send className="w-4 h-4 mr-1" /> {etat.lien_envoye ? t('edl.renvoyerLienLocataire') : t('edl.envoyerLocataire')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PieceEdition({
  piece,
  sortie,
  base,
  onChange,
  onErreur,
}: {
  piece: PieceEtatDesLieux;
  sortie: boolean;
  base: string;
  onChange: () => void;
  onErreur: (e: unknown) => void;
}) {
  const fichier = useRef<HTMLInputElement>(null);
  const [observations, setObservations] = useState(piece.observations);
  const chemin = `${base}pieces/${piece.id}/`;

  const modifier = useMutation({
    mutationFn: (donnees: Partial<{ etat: EtatPiece; observations: string }>) => api.patch(chemin, donnees),
    onSuccess: onChange,
    onError: onErreur,
  });
  const supprimer = useMutation({
    mutationFn: () => api.delete(chemin),
    onSuccess: onChange,
    onError: onErreur,
  });
  const ajouterPhoto = useMutation({
    mutationFn: (image: File) => {
      const formulaire = new FormData();
      formulaire.append('image', image);
      return api.post(`${chemin}photos/`, formulaire, true);
    },
    onSuccess: onChange,
    onError: onErreur,
  });
  const retirerPhoto = useMutation({
    mutationFn: (id: number) => api.delete(`${base}photos/${id}/`),
    onSuccess: onChange,
    onError: onErreur,
  });

  return (
    <Card data-testid={`piece-${piece.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{piece.nom}</p>
          <Button size="icon" variant="ghost" aria-label={`Retirer ${piece.nom}`} onClick={() => supprimer.mutate()}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <ComparaisonEntree piece={piece} sortie={sortie} />
        <Select value={piece.etat} onValueChange={(etat) => modifier.mutate({ etat: etat as EtatPiece })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ETATS_PIECE.map((e) => <SelectItem key={e.valeur} value={e.valeur}>{libelleEtatPiece(e.valeur, e.libelle)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          onBlur={() => observations !== piece.observations && modifier.mutate({ observations })}
          placeholder={t('edl.exVitreFeleePrise')}
          className="min-h-[60px]"
        />
        <div className="flex flex-wrap gap-2">
          {piece.photos.map((photo) => (
            <div key={photo.id} className="relative">
              <img src={getDjangoImageUrl(photo.image) || ''} alt="" className="h-20 w-20 rounded-md object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => retirerPhoto.mutate(photo.id)}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background border"
                aria-label={t('edl.retirerPhoto')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {piece.photos.length < 6 && (
            <button
              type="button"
              onClick={() => fichier.current?.click()}
              disabled={ajouterPhoto.isPending}
              className="flex h-20 w-20 flex-col items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground"
            >
              <Camera className="h-5 w-5" />
              {ajouterPhoto.isPending ? t('edl.envoi') : t('edl.photo')}
            </button>
          )}
          <input
            ref={fichier}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const image = e.target.files?.[0];
              if (image) ajouterPhoto.mutate(image);
              e.target.value = '';
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function PieceLecture({ piece, sortie = false }: { piece: PieceEtatDesLieux; sortie?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{piece.nom}</p>
          <span className="text-sm text-muted-foreground">{libelleEtatPiece(piece.etat, piece.etat_display)}</span>
        </div>
        <ComparaisonEntree piece={piece} sortie={sortie} />
        {piece.observations && <p className="text-sm">{piece.observations}</p>}
        {piece.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {piece.photos.map((photo) => (
              <a key={photo.id} href={getDjangoImageUrl(photo.image) || '#'} target="_blank" rel="noreferrer">
                <img src={getDjangoImageUrl(photo.image) || ''} alt={piece.nom} className="h-24 w-24 rounded-md object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** À la sortie : ce qu'était la pièce à l'entrée, photos comprises. C'est
 *  sur cette comparaison que se discute la garantie. */
export function ComparaisonEntree({ piece, sortie }: { piece: PieceEtatDesLieux; sortie: boolean }) {
  if (!sortie) return null;
  if (!piece.a_l_entree) {
    return <p className="text-xs text-muted-foreground">{t('edl.pieceAbsenteEtatLieux')}</p>;
  }
  const avant = piece.a_l_entree;
  return (
    <div
      className={`rounded-md p-2 text-xs space-y-1 ${piece.degradee ? 'bg-statut-defavorable-fond' : 'bg-muted'}`}
      data-testid={`comparaison-${piece.id}`}
    >
      <p>
        {piece.degradee && <span className="font-semibold text-statut-defavorable">{t('edl.degradeeDepuis')}</span>}
        {t('edl.aLEntree', { etat: libelleEtatPiece(avant.etat, avant.etat_display) })}
        {avant.observations ? ` · ${avant.observations}` : ''}
      </p>
      {avant.photos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {avant.photos.map((photo) => (
            <a key={photo.id} href={getDjangoImageUrl(photo.image) || '#'} target="_blank" rel="noreferrer">
              <img src={getDjangoImageUrl(photo.image) || ''} alt={t('reste.aLEntreeAlt', { nom: piece.nom })} className="h-12 w-12 rounded object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** Garantie versée, retenue et somme rendue : ce que le locataire doit lire
 *  avant de valider. */
export function BilanGarantie({ etat }: { etat: EtatDesLieux }) {
  if (etat.garantie_versee == null) return null;
  const retenue = parseFloat(etat.retenue_garantie ?? '0') || 0;
  return (
    <Card>
      <CardContent className="p-4 space-y-1 text-sm" data-testid="bilan-garantie">
        <p className="font-medium">{t('edl.garantie')}</p>
        <p>{t('edl.verseeEntree', { montant: formaterMontant(etat.garantie_versee, etat.devise) })}</p>
        <p>
          {t('edl.retenue', { montant: formaterMontant(retenue, etat.devise) })}
          {retenue > 0 && etat.motif_retenue ? t('edl.pour', { motif: etat.motif_retenue }) : ''}
        </p>
        <p className="font-semibold">{t('edl.aRendre', { montant: formaterMontant(etat.garantie_restituee, etat.devise) })}</p>
      </CardContent>
    </Card>
  );
}

function SaisieGarantie({
  etat,
  base,
  onChange,
  onErreur,
}: {
  etat: EtatDesLieux;
  base: string;
  onChange: () => void;
  onErreur: (e: unknown) => void;
}) {
  const [garantie, setGarantie] = useState(etat.garantie_versee ?? '');
  const [retenue, setRetenue] = useState(String(parseFloat(etat.retenue_garantie ?? '0') || ''));
  const [motif, setMotif] = useState(etat.motif_retenue ?? '');
  const symbole = symboleDevise(etat.devise);
  const degradees = etat.pieces.filter((p) => p.degradee).map((p) => p.nom);
  // Sans état des lieux d'entrée validé par le locataire, rien ne prouve
  // l'état du logement à son arrivée : le serveur refuse toute retenue.
  const retenuePossible = !!etat.entree_validee_le;

  const enregistrer = useMutation({
    mutationFn: () =>
      api.patch(base, {
        garantie_versee: garantie === '' ? null : String(garantie).replace(',', '.'),
        retenue_garantie: !retenuePossible || retenue === '' ? '0' : retenue.replace(',', '.'),
        motif_retenue: retenuePossible ? motif : '',
      }),
    onSuccess: onChange,
    onError: onErreur,
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="font-medium">{t('edl.garantie')}</p>
        {degradees.length > 0 && (
          <p className="text-sm text-statut-defavorable">{t('edl.degradesListe', { pieces: degradees.join(', ') })}</p>
        )}
        <div className={retenuePossible ? 'grid grid-cols-2 gap-3' : 'space-y-1'}>
          <div className="space-y-1">
            <Label htmlFor="garantie-versee">{t('edl.versee', { symbole })}</Label>
            <Input id="garantie-versee" type="number" inputMode="decimal" min="0" step="any" value={garantie} onChange={(e) => setGarantie(e.target.value)} />
          </div>
          {retenuePossible && (
          <div className="space-y-1">
            <Label htmlFor="garantie-retenue">{t('edl.retenueSymbole', { symbole })}</Label>
            <Input id="garantie-retenue" type="number" inputMode="decimal" min="0" step="any" value={retenue} onChange={(e) => setRetenue(e.target.value)} placeholder="0" data-testid="input-retenue" />
          </div>
          )}
        </div>
        {!retenuePossible && (
          <p className="text-sm text-muted-foreground" data-testid="text-retenue-impossible">
            {t('edl.aucuneRetenuePossibleEtat')}
          </p>
        )}
        {retenuePossible && (
        <div className="space-y-1">
          <Label htmlFor="garantie-motif">{t('edl.motifRetenue')}</Label>
          <Textarea
            id="garantie-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder={t('edl.exEvierCuisineCasse')}
          />
          <p className="text-xs text-muted-foreground">
            {t('edl.obligatoireQuIlY')}
          </p>
        </div>
        )}
        <Button variant="outline" disabled={enregistrer.isPending} onClick={() => enregistrer.mutate()} data-testid="button-enregistrer-garantie">
          {t('edl.enregistrerGarantie')}
        </Button>
        <BilanGarantie etat={etat} />
      </CardContent>
    </Card>
  );
}
