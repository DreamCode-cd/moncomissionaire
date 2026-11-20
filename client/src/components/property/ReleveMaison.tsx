import { BadgeCheck, CalendarCheck, CalendarX, Droplet, Users, Zap, type LucideIcon } from 'lucide-react';
import type { BienList } from '@shared/schema';
import { cn } from '@/lib/utils';
import {
  FOND_ETAT,
  TEXTE_ETAT,
  etatCourant,
  etatEau,
  garantVerifie,
  libelleCourant,
  libelleEau,
  type EtatFait,
} from '@/lib/faits';
import { t } from '@/i18n';
import { libelleChoixCourant, libelleChoixEau } from '@/lib/terrain';

type BienReleve = Pick<
  BienList,
  'eau' | 'eau_display' | 'electricite' | 'electricite_display' | 'statut_location' | 'commissionnaire_detail' | 'proprietaire'
>;

/**
 * Le relevé de la maison — le même que sur l'application mobile : les
 * questions qu'on pose à Lubumbashi avant même de regarder les photos. Y
 * a-t-il de l'eau ? du courant ? la maison est-elle libre ? qui en répond ?
 *
 * Un trait de couleur par case : vert, ambre, rouge. Avant, l'eau et le
 * courant s'affichaient en pastilles grises plus bas, après la description,
 * et « Délestages » avait l'air aussi rassurant que « Courant stable ».
 */
export function ReleveMaison({ bien }: { bien: BienReleve }) {
  const cases = [
    {
      cle: 'eau',
      titre: t('releve.eau'),
      icone: Droplet,
      etat: etatEau(bien.eau),
      valeur: libelleEau(bien.eau),
      detail: bien.eau ? libelleChoixEau(bien.eau) : undefined,
    },
    {
      cle: 'courant',
      titre: t('releve.courant'),
      icone: Zap,
      etat: etatCourant(bien.electricite),
      valeur: libelleCourant(bien.electricite),
      detail: bien.electricite ? libelleChoixCourant(bien.electricite) : undefined,
    },
  ].filter((c): c is typeof c & { etat: EtatFait; valeur: string } => !!c.etat && !!c.valeur);
  const lignes = lignesDeConfiance(bien);

  if (cases.length === 0 && lignes.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="releve-maison">
      {cases.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {cases.map((c) => (
            <div key={c.cle} className="flex gap-3" data-testid={`releve-${c.cle}`}>
              <span className={cn('w-1 shrink-0 rounded-full', FOND_ETAT[c.etat])} aria-hidden />
              <div className="min-w-0 space-y-0.5 py-0.5">
                <p className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                  <c.icone className={cn('h-4 w-4', TEXTE_ETAT[c.etat])} aria-hidden />
                  {c.titre}
                </p>
                <p className="font-semibold text-foreground">{c.valeur}</p>
                {/* Le libellé du serveur, quand il apprend autre chose que la
                    valeur (« Eau REGIDESO permanente ») ; pas quand il la
                    répète (« Forage ou puits dans la parcelle »). */}
                {apprendPlus(c.detail, c.valeur) && <p className="text-sm text-muted-foreground">{c.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {lignes.length > 0 && (
        <ul className="space-y-1.5">
          {lignes.map((ligne) => (
            <li key={ligne.texte} className="flex items-center gap-2">
              <ligne.icone className={cn('h-5 w-5 shrink-0', TEXTE_ETAT[ligne.etat])} aria-hidden />
              <span className={cn('font-semibold', ligne.etat === 'bon' ? 'text-foreground' : TEXTE_ETAT[ligne.etat])}>
                {ligne.texte}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function apprendPlus(detail?: string | null, valeur?: string | null): boolean {
  if (!detail || !valeur) return false;
  return !detail.toLowerCase().includes(valeur.toLowerCase());
}

function lignesDeConfiance(bien: BienReleve): { icone: LucideIcon; texte: string; etat: EtatFait }[] {
  const lignes: { icone: LucideIcon; texte: string; etat: EtatFait }[] = [];
  switch (bien.statut_location) {
    case 'disponible':
      lignes.push({ icone: CalendarCheck, texte: t('releve.libre'), etat: 'bon' });
      break;
    case 'en_visite':
      lignes.push({ icone: Users, texte: t('releve.libreAutresVisites'), etat: 'partiel' });
      break;
    case 'loue':
      lignes.push({ icone: CalendarX, texte: t('releve.dejaLoue'), etat: 'absent' });
      break;
    case 'indisponible':
      lignes.push({ icone: CalendarX, texte: t('releve.plusPropose'), etat: 'absent' });
      break;
  }
  // Seule garantie affichée : l'équipe a vu la pièce d'identité. Sans elle,
  // on ne marque pas l'annonce d'un défaut, la section du commissionnaire
  // le dit.
  const garant = garantVerifie(bien);
  if (garant) {
    lignes.push({
      icone: BadgeCheck,
      texte: garant === 'agence' ? t('releve.agenceVerifiee') : t('releve.commissionnaireVerifie'),
      etat: 'bon',
    });
  }
  return lignes;
}
