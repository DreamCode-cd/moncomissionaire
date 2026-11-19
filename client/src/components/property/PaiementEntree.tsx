import { Link } from 'wouter';
import type { BienList } from '@shared/schema';
import { estPositif, formaterMontant } from '@/lib/prix';

type BienPaiement = Pick<
  BienList,
  'devise' | 'prix_mensuel' | 'garantie' | 'garantie_mois' | 'commission_locataire' | 'commission_payee_par' | 'frais_visite_applicables'
>;

function lireNombre(valeur?: string | number | null): number | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const n = typeof valeur === 'number' ? valeur : Number.parseFloat(valeur);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ce que le client paiera, ligne à ligne, AVANT de demander une visite —
 * le même bloc que sur l'application mobile.
 *
 * Sur le terrain, la garantie et la commission se découvrent souvent devant
 * la maison, quand on ne peut plus comparer. La question qu'on se pose
 * vraiment, c'est « combien dois-je réunir pour entrer ? » : le total y
 * répond. Tous les montants d'un bien sont dans sa devise, ils s'additionnent.
 */
export function PaiementEntree({ bien }: { bien: BienPaiement }) {
  const loyer = lireNombre(bien.prix_mensuel);
  if (loyer === null) return null;

  const garantie = bien.garantie_mois ? (lireNombre(bien.garantie) ?? 0) : 0;
  // Nulle pour un bien publié par son propriétaire : pas d'intermédiaire.
  const commission = lireNombre(bien.commission_locataire);
  const total = loyer + garantie + (commission ?? 0);
  const frais = bien.frais_visite_applicables;

  return (
    <div className="space-y-2" data-testid="paiement-entree">
      <p className="text-sm font-semibold text-muted-foreground">Pour entrer dans la maison</p>
      <Ligne libelle="Premier mois de loyer" montant={formaterMontant(loyer, bien.devise)} />
      {bien.garantie_mois ? (
        // En mois de loyer, trois au plus : loi n° 15/025, article 18.
        <Ligne libelle={`Garantie, ${bien.garantie_mois} mois de loyer`} montant={formaterMontant(garantie, bien.devise)} />
      ) : (
        <Ligne libelle="Garantie" montant="aucune" />
      )}
      {commission !== null && (
        <Ligne
          libelle="Commission"
          montant={formaterMontant(commission, bien.devise)}
          note={
            bien.commission_payee_par === 'moitie'
              ? 'La moitié d’un mois de loyer ; le bailleur paie l’autre moitié.'
              : 'Un mois de loyer, comme le prévoit la loi. Seulement si vous louez.'
          }
        />
      )}
      <div className="flex items-baseline gap-4 border-t pt-2" data-testid="total-entree">
        <span className="flex-1 font-semibold">Total pour entrer</span>
        <span className="text-xl font-extrabold tabular-nums">{formaterMontant(total, bien.devise)}</span>
      </div>

      <p className="pt-3 text-sm font-semibold text-muted-foreground">Avant la visite</p>
      <Ligne
        libelle="Frais de visite"
        montant={estPositif(frais) ? formaterMontant(frais, bien.devise) : 'aucun'}
        note={estPositif(frais) ? 'Une seule fois pour ce bien, même si vous revenez.' : undefined}
      />

      {/* La question se pose ici, devant les montants : à qui, et quand ? */}
      <Link
        href="/comment-ca-marche"
        className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2"
        data-testid="lien-comment-ca-marche"
      >
        À qui payer, et quand ?
      </Link>
    </div>
  );
}

function Ligne({ libelle, montant, note }: { libelle: string; montant: string; note?: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-4">
        <span className="flex-1">{libelle}</span>
        <span className="font-semibold tabular-nums">{montant}</span>
      </div>
      {note && <p className="mt-0.5 max-w-[85%] text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
