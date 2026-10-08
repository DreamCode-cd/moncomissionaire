import { estPositif, formaterMontant } from '@/lib/prix';
import type { BienList } from '@shared/schema';

/**
 * Ce que coûtera la location, au-delà du loyer et de la garantie, annoncé
 * AVANT la demande de visite.
 *
 * Sur le terrain, le client découvre souvent la commission et les frais de
 * visite le jour même, devant la maison, quand il ne peut plus comparer.
 * Les afficher ici, c'est ce qui rend un commissionnaire VillaGo plus sûr
 * qu'un inconnu croisé au marché.
 */
export function CoutsLocation({ bien, compact = false }: { bien: BienList; compact?: boolean }) {
  const commission = bien.commission_locataire;
  const fraisVisite = bien.frais_visite_applicables;
  if (commission == null && !estPositif(fraisVisite)) {
    return null;
  }

  return (
    <ul
      className={compact ? 'text-sm space-y-1' : 'text-sm text-muted-foreground space-y-1 mt-1'}
      data-testid="couts-location"
    >
      {commission != null && (
        <li>
          {'Commission si vous louez : '}
          <span className="font-medium text-foreground">{formaterMontant(commission, bien.devise)}</span>
          {bien.commission_payee_par === 'moitie'
            ? ' (la moitié d’un mois de loyer, le bailleur paie l’autre moitié)'
            : ' (un mois de loyer, comme le prévoit la loi)'}
        </li>
      )}
      <li>
        {'Frais de visite : '}
        {estPositif(fraisVisite) ? (
          <>
            <span className="font-medium text-foreground">{formaterMontant(fraisVisite, bien.devise)}</span>
            {', une seule fois pour ce bien'}
          </>
        ) : (
          <span className="font-medium text-foreground">aucun</span>
        )}
      </li>
    </ul>
  );
}
