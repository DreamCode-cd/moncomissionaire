import type { VideoBien } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import { dureeLisible, poidsLisible } from '@/lib/annonce';
import { getDjangoImageUrl } from '@/lib/utils';

/**
 * Les vidéos d'une annonce (décision de David du 20/11/2026).
 *
 * Jamais de lecture ni de téléchargement automatiques (`preload="none"`) :
 * sur une 3G facturée, une vidéo qui se charge d'elle-même coûte à quelqu'un
 * qui n'a rien demandé. L'affiche, la durée et le poids d'abord ; le
 * visiteur lance s'il le veut.
 */
export function VideosBien({ videos }: { videos?: VideoBien[] }) {
  const pretes = (videos ?? []).filter((v) => v.statut === 'prete' && v.fichier);
  if (!pretes.length) return null;
  return (
    <>
      <Separator />
      <div data-testid="videos-bien">
        <h2 className="text-lg font-semibold mb-3">{pretes.length > 1 ? 'Vidéos' : 'Vidéo'}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {pretes.map((video) => {
            const details = [dureeLisible(video.duree), poidsLisible(video.taille)].filter(Boolean).join(' · ');
            return (
              <figure key={video.id} className="space-y-1">
                <video
                  controls
                  preload="none"
                  playsInline
                  poster={getDjangoImageUrl(video.affiche) ?? undefined}
                  src={getDjangoImageUrl(video.fichier) ?? undefined}
                  className="w-full rounded-lg bg-black aspect-video"
                />
                {details && <figcaption className="text-sm text-muted-foreground">{details}</figcaption>}
              </figure>
            );
          })}
        </div>
      </div>
    </>
  );
}
