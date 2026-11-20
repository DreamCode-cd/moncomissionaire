import { BadgeCheck, BedDouble, Droplet, Zap, type LucideIcon } from 'lucide-react';
import type { BienList } from '@shared/schema';
import { cn } from '@/lib/utils';
import {
  TEXTE_ETAT,
  etatCourant,
  etatEau,
  garantVerifie,
  libelleChambres,
  libelleCourant,
  libelleEau,
} from '@/lib/faits';
import { t } from '@/i18n';

interface Fait {
  icone: LucideIcon;
  /** Court : la ligne d'annonce est étroite. */
  texte: string;
  /** Ce que lit le lecteur d'écran, complet. */
  lu: string;
  couleur?: string;
  fort?: boolean;
}

type BienResume = Pick<BienList, 'nombre_chambres' | 'eau' | 'electricite' | 'commissionnaire_detail' | 'proprietaire'>;

/** Les faits d'une annonce : vérification, chambres, eau, courant. */
function faitsDe(bien: BienResume): Fait[] {
  const faits: Fait[] = [];
  const garant = garantVerifie(bien);
  if (garant) {
    faits.push({
      icone: BadgeCheck,
      texte: t('faits.verifie'),
      lu: garant === 'agence' ? t('faits.agenceVerifiee') : t('faits.commissionnaireVerifie'),
      couleur: TEXTE_ETAT.bon,
      fort: true,
    });
  }
  const chambres = libelleChambres(bien.nombre_chambres);
  if (chambres) faits.push({ icone: BedDouble, texte: chambres, lu: chambres });
  const eau = libelleEau(bien.eau);
  const etatE = etatEau(bien.eau);
  if (eau && etatE) faits.push({ icone: Droplet, texte: eau, lu: eau, couleur: TEXTE_ETAT[etatE] });
  const courant = libelleCourant(bien.electricite);
  const etatC = etatCourant(bien.electricite);
  if (courant && etatC) faits.push({ icone: Zap, texte: courant, lu: courant, couleur: TEXTE_ETAT[etatC] });
  return faits;
}

/**
 * Ce qui décide une visite, d'un coup d'œil — le même code que l'application
 * mobile. L'icône de l'eau et du courant prend la couleur de l'état : on
 * repère « Délestages » en ambre avant de l'avoir lu. Le texte reste dans la
 * couleur du corps, lisible au soleil.
 *
 * Avant : une icône de lit, un « 1 », une icône de baignoire, un « 1 ». Sur
 * téléphone, « 1 1 » ne disait rien, et l'eau et le courant manquaient.
 */
export function FaitsBien({ bien, className }: { bien: BienResume; className?: string }) {
  const faits = faitsDe(bien);
  if (faits.length === 0) return null;
  return (
    <ul className={cn('flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground', className)}>
      {faits.map((fait) => (
        <li key={fait.lu} className="inline-flex items-center gap-1" aria-label={fait.lu}>
          <fait.icone className={cn('h-4 w-4 shrink-0', fait.couleur)} aria-hidden />
          <span className={cn(fait.fort && ['font-semibold', fait.couleur])}>{fait.texte}</span>
        </li>
      ))}
    </ul>
  );
}
