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

const PIECES_COURANTES = ['Salon', 'Chambre 1', 'Chambre 2', 'Cuisine', 'Douche et WC', 'Parcelle et clôture'];

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
            <Button variant="ghost" size="icon" aria-label="Retour"><ChevronLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold">État des lieux {type === 'sortie' ? 'de sortie' : 'd’entrée'}</h1>
        </div>
        {etats.isLoading ? (
          <EtatChargement texte="Chargement…" />
        ) : etats.error && !etats.data ? (
          // Surtout pas le formulaire de création : on ne sait pas s'il en
          // existe déjà un, et en recréer un perdrait le travail commencé.
          <ErreurRequete erreur={etats.error} titre="L’état des lieux n’a pas pu être chargé" onReessayer={() => void etats.refetch()} />
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
  const [pieces, setPieces] = useState<string[]>(PIECES_COURANTES.slice(0, 4));
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
    onError: (e) => toast({ title: 'Non créé', description: messageErreur(e), variant: 'destructive' }),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="edl-date">Date</Label>
          <Input id="edl-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="edl-compteurs">Compteurs</Label>
          <Input
            id="edl-compteurs"
            value={compteurs}
            onChange={(e) => setCompteurs(e.target.value)}
            placeholder="Ex : SNEL prépayé, 42 kWh restants ; REGIDESO index 1 204"
          />
        </div>
        {sortie ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="edl-garantie">Garantie versée à l’entrée (facultatif)</Label>
              <Input
                id="edl-garantie"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={garantie}
                onChange={(e) => setGarantie(e.target.value)}
                placeholder="Vide : la garantie de l’annonce"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Les pièces de l’état des lieux d’entrée sont reprises, chacune dans l’état où elle était. Vous n’aurez qu’à changer ce qui s’est dégradé.
            </p>
          </>
        ) : (
        <div className="space-y-2">
          <Label>Pièces à visiter</Label>
          <div className="flex flex-wrap gap-2">
            {PIECES_COURANTES.map((nom) => {
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
          <p className="text-xs text-muted-foreground">Vous pourrez en ajouter d’autres ensuite.</p>
        </div>
        )}
        <Button className="w-full" disabled={!date || (!sortie && !pieces.length) || creer.isPending} onClick={() => creer.mutate()}>
          Commencer l’état des lieux {sortie ? 'de sortie' : ''}
        </Button>
      </CardContent>
    </Card>
  );
}

function Edition({ etat, cle }: { etat: EtatDesLieux; cle: string[] }) {
  const { toast } = useToast();
  const base = `/api/v1/commissions/etats-des-lieux/${etat.id}/`;
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: cle });
  const surErreur = (e: unknown) => toast({ title: 'Erreur', description: messageErreur(e), variant: 'destructive' });
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
        {etat.releves_compteurs && <p>Compteurs : {etat.releves_compteurs}</p>}
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
              Validé par {etat.valide_par_nom} le {formaterDateCourte(etat.valide_le ?? '')}
            </p>
            {etat.reserves_locataire ? (
              <p>Réserves du locataire : {etat.reserves_locataire}</p>
            ) : (
              <p className="text-muted-foreground">Sans réserve.</p>
            )}
            <p className="text-muted-foreground">Il ne se modifie plus.</p>
          </CardContent>
        </Card>
        {etat.type === 'sortie' && <BilanGarantie etat={etat} />}
        {etat.pieces.map((p) => <PieceLecture key={p.id} piece={p} />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resume}
      {etat.pieces.map((p) => (
        <PieceEdition key={p.id} piece={p} base={base} onChange={rafraichir} onErreur={surErreur} />
      ))}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nouvellePiece.trim()) ajouterPiece.mutate();
        }}
      >
        <Input value={nouvellePiece} onChange={(e) => setNouvellePiece(e.target.value)} placeholder="Ajouter une pièce" />
        <Button type="submit" variant="outline" disabled={!nouvellePiece.trim() || ajouterPiece.isPending}>
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      <div className="space-y-1">
        <Label htmlFor="edl-observations">Observations générales</Label>
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
            Quand tout est noté, envoyez le lien au locataire. Il le lit sur son téléphone et le valide, avec ses réserves s’il en a. Il n’a pas besoin de compte.
          </p>
          {lien ? (
            <div className="space-y-2">
              <Input value={lien} readOnly onFocus={(e) => e.currentTarget.select()} data-testid="lien-locataire" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(lien);
                    toast({ title: 'Lien copié' });
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" /> Copier
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`État des lieux ${etat.type === 'sortie' ? 'de sortie' : 'd’entrée'} de « ${etat.bien_titre} » à valider : ${lien}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button><Send className="w-4 h-4 mr-1" /> WhatsApp</Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">Ce lien remplace le précédent, s’il y en avait un.</p>
            </div>
          ) : (
            <Button className="w-full" disabled={envoyer.isPending} onClick={() => envoyer.mutate()} data-testid="button-envoyer-locataire">
              <Send className="w-4 h-4 mr-1" /> {etat.lien_envoye ? 'Renvoyer un lien au locataire' : 'Envoyer au locataire'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PieceEdition({
  piece,
  base,
  onChange,
  onErreur,
}: {
  piece: PieceEtatDesLieux;
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
        <ComparaisonEntree piece={piece} />
        <Select value={piece.etat} onValueChange={(etat) => modifier.mutate({ etat: etat as EtatPiece })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ETATS_PIECE.map((e) => <SelectItem key={e.valeur} value={e.valeur}>{e.libelle}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          onBlur={() => observations !== piece.observations && modifier.mutate({ observations })}
          placeholder="Ex : vitre fêlée, prise murale arrachée"
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
                aria-label="Retirer la photo"
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
              {ajouterPhoto.isPending ? 'Envoi…' : 'Photo'}
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

export function PieceLecture({ piece }: { piece: PieceEtatDesLieux }) {
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{piece.nom}</p>
          <span className="text-sm text-muted-foreground">{piece.etat_display}</span>
        </div>
        <ComparaisonEntree piece={piece} />
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
export function ComparaisonEntree({ piece }: { piece: PieceEtatDesLieux }) {
  if (piece.a_l_entree === undefined) return null;
  if (piece.a_l_entree === null) {
    return <p className="text-xs text-muted-foreground">Pièce absente de l’état des lieux d’entrée.</p>;
  }
  const avant = piece.a_l_entree;
  return (
    <div
      className={`rounded-md p-2 text-xs space-y-1 ${piece.degradee ? 'bg-statut-defavorable-fond' : 'bg-muted'}`}
      data-testid={`comparaison-${piece.id}`}
    >
      <p>
        {piece.degradee && <span className="font-semibold text-statut-defavorable">Dégradée depuis l’entrée · </span>}
        À l’entrée : {avant.etat_display}
        {avant.observations ? ` · ${avant.observations}` : ''}
      </p>
      {avant.photos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {avant.photos.map((photo) => (
            <a key={photo.id} href={getDjangoImageUrl(photo.image) || '#'} target="_blank" rel="noreferrer">
              <img src={getDjangoImageUrl(photo.image) || ''} alt={`${piece.nom} à l’entrée`} className="h-12 w-12 rounded object-cover" loading="lazy" />
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
        <p className="font-medium">Garantie</p>
        <p>Versée à l’entrée : {formaterMontant(etat.garantie_versee, etat.devise)}</p>
        <p>
          Retenue : {formaterMontant(retenue, etat.devise)}
          {retenue > 0 && etat.motif_retenue ? `, pour : ${etat.motif_retenue}` : ''}
        </p>
        <p className="font-semibold">À rendre au locataire : {formaterMontant(etat.garantie_restituee, etat.devise)}</p>
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

  const enregistrer = useMutation({
    mutationFn: () =>
      api.patch(base, {
        garantie_versee: garantie === '' ? null : String(garantie).replace(',', '.'),
        retenue_garantie: retenue === '' ? '0' : retenue.replace(',', '.'),
        motif_retenue: motif,
      }),
    onSuccess: onChange,
    onError: onErreur,
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="font-medium">Garantie</p>
        {degradees.length > 0 && (
          <p className="text-sm text-statut-defavorable">Dégradé depuis l’entrée : {degradees.join(', ')}.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="garantie-versee">Versée ({symbole})</Label>
            <Input id="garantie-versee" type="number" inputMode="decimal" min="0" step="any" value={garantie} onChange={(e) => setGarantie(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="garantie-retenue">Retenue ({symbole})</Label>
            <Input id="garantie-retenue" type="number" inputMode="decimal" min="0" step="any" value={retenue} onChange={(e) => setRetenue(e.target.value)} placeholder="0" data-testid="input-retenue" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="garantie-motif">Motif de la retenue</Label>
          <Textarea
            id="garantie-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : évier de la cuisine cassé, devis du plombier 150 $"
          />
          <p className="text-xs text-muted-foreground">
            Obligatoire dès qu’il y a une retenue. Le locataire le lira avant de valider, et pourra le contester dans ses réserves.
          </p>
        </div>
        <Button variant="outline" disabled={enregistrer.isPending} onClick={() => enregistrer.mutate()} data-testid="button-enregistrer-garantie">
          Enregistrer la garantie
        </Button>
        <BilanGarantie etat={etat} />
      </CardContent>
    </Card>
  );
}
