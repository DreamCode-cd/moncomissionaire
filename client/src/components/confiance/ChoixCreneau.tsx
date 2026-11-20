import { cn } from '@/lib/utils';
import { formaterHeure } from '@/lib/dates';
import { localeActive, t } from '@/i18n';

/*
 * Choisir un créneau de visite : un jour, puis une heure — le même
 * sélecteur que l'application mobile (`villagomobile/src/composants/
 * Creneau.tsx`).
 *
 * Avant, deux champs libres « jj/mm/aaaa » et « --:-- » : on pouvait
 * demander une visite à 2 h du matin, ou pour une heure déjà passée que le
 * serveur refusait ensuite.
 */

/** Les heures de visite proposées, de 8 h à 17 h. Même liste que le mobile. */
export const HEURES_VISITE = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// « sam. 21 nov. » / « Sat 21 Nov » : les noms courts viennent d'Intl, dans la
// langue de l'écran.
const jourCourt = (date: Date) => date.toLocaleDateString(localeActive(), { weekday: 'short' });
const moisCourt = (date: Date) => date.toLocaleDateString(localeActive(), { month: 'short' });

function versIso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const j = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${j}`;
}

function depuisIso(iso: string): Date {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a!, (m ?? 1) - 1, j ?? 1);
}

/** Le créneau (jour + heure, heure locale) est-il déjà passé ? Même règle que le serveur. */
export function creneauPasse(jour: string, heure: string): boolean {
  const [h, min] = heure.split(':').map(Number);
  const date = depuisIso(jour);
  date.setHours(h ?? 0, min ?? 0, 0, 0);
  return date.getTime() <= Date.now();
}

/** Les quatorze prochains jours : au-delà, la maison a toutes les chances
 *  d'être louée avant la visite. Passé 17 h, aujourd'hui n'est plus proposé. */
export function prochainsJours(nombre = 14): string[] {
  const date = new Date();
  if (creneauPasse(versIso(date), HEURES_VISITE[HEURES_VISITE.length - 1]!)) date.setDate(date.getDate() + 1);
  const jours: string[] = [];
  for (let i = 0; i < nombre; i += 1) {
    jours.push(versIso(date));
    date.setDate(date.getDate() + 1);
  }
  return jours;
}

/** « 16:00 » → « 16 h » ; « 10:30 » → « 10 h 30 ». */
export function heureLisible(heure: string): string {
  const [h, m] = heure.split(':');
  return formaterHeure(`${h}:${m ?? '00'}`);
}

/** « mardi 24 novembre », pour relire le créneau choisi. */
export function jourLisible(iso: string): string {
  return depuisIso(iso).toLocaleDateString(localeActive(), { weekday: 'long', day: 'numeric', month: 'long' });
}

const TUILE =
  'flex flex-col items-center justify-center rounded-lg border border-input bg-background text-foreground transition-colors ' +
  'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground';

export function ChoixCreneau({
  jour,
  heure: heureBrute,
  onJour,
  onHeure,
  marque,
  libelleMarque = t('creneau.demandeParClient'),
}: {
  jour: string | null;
  /** « 16:00 » ou « 16:00:00 », tel que l'API le renvoie. */
  heure: string | null;
  onJour: (iso: string) => void;
  onHeure: (heure: string | null) => void;
  /** Le créneau que le client a demandé (ou la visite qu'on déplace) : marqué d'un point. */
  marque?: { jour?: string | null; heure?: string | null } | null;
  libelleMarque?: string;
}) {
  const heure = heureBrute ? heureBrute.slice(0, 5) : null;
  const heureMarque = marque?.heure ? marque.heure.slice(0, 5) : null;
  // Un jour ou une heure hors grille (une ancienne demande à 10 h 30, une
  // visite fixée dans trois semaines) reste proposé plutôt que de disparaître.
  const jours = Array.from(new Set([...prochainsJours(), ...[jour, marque?.jour].filter((j): j is string => !!j)]))
    .filter((j) => !creneauPasse(j, '23:59'))
    .sort();
  const heures = Array.from(new Set([...HEURES_VISITE, ...[heure, heureMarque].filter((h): h is string => !!h)])).sort();
  const passees = jour ? heures.filter((h) => creneauPasse(jour, h)) : [];
  const groupes = [
    { titre: t('creneau.matin'), heures: heures.filter((h) => Number(h.slice(0, 2)) < 13) },
    { titre: t('creneau.apresMidi'), heures: heures.filter((h) => Number(h.slice(0, 2)) >= 13) },
  ].filter((g) => g.heures.length > 0);

  return (
    // min-w-0 : dans la grille d'un dialogue, la bande de jours élargissait
    // toute la fenêtre au lieu de défiler.
    <div className="min-w-0 space-y-4">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold">{t('creneau.quelJour')}</legend>
        {/* Une bande qui défile au doigt ou à la molette, comme sur le mobile. */}
        <div role="radiogroup" aria-label={t('creneau.jourVisite')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {jours.map((iso) => {
            const date = depuisIso(iso);
            return (
              <button
                key={iso}
                type="button"
                role="radio"
                aria-checked={iso === jour}
                aria-label={`${jourLisible(iso)}${iso === marque?.jour ? `, ${libelleMarque}` : ''}`}
                onClick={() => {
                  onJour(iso);
                  // L'heure choisie pour demain n'existe peut-être plus aujourd'hui.
                  if (heure && creneauPasse(iso, heure)) onHeure(null);
                }}
                className={cn(TUILE, 'relative h-[4.5rem] w-14 shrink-0')}
                data-testid={`jour-${iso}`}
              >
                {iso === marque?.jour && <Point />}
                <span className="text-xs">{jourCourt(date)}</span>
                <span className="text-xl font-extrabold tabular-nums leading-tight">{date.getDate()}</span>
                <span className="text-xs">{moisCourt(date)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t('creneau.quelleHeure')}</legend>
        <div role="radiogroup" aria-label={t('creneau.heureVisite')} className="space-y-2">
          {groupes.map((groupe) => (
            <div key={groupe.titre}>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{groupe.titre}</p>
              <div className="grid grid-cols-5 gap-2">
                {groupe.heures.map((h) => {
                  const passee = passees.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      role="radio"
                      aria-checked={h === heure}
                      disabled={passee || !jour}
                      aria-label={`${heureLisible(h)}${passee ? t('creneau.dejaPassee') : ''}${h === heureMarque ? `, ${libelleMarque}` : ''}`}
                      onClick={() => onHeure(h)}
                      className={cn(
                        TUILE,
                        'relative h-11 font-semibold tabular-nums disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground',
                      )}
                      data-testid={`heure-${h}`}
                    >
                      {h === heureMarque && <Point />}
                      {heureLisible(h)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!jour && <p className="text-sm text-muted-foreground">{t('creneau.choisirJourDabord')}</p>}
          {marque?.jour && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="relative h-2 w-2"><Point /></span> {libelleMarque[0]?.toUpperCase() + libelleMarque.slice(1)}
            </p>
          )}
        </div>
      </fieldset>
    </div>
  );
}

/** Le point qui marque le créneau demandé, en haut à droite de la tuile. */
function Point() {
  return <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-statut-attente" aria-hidden />;
}
