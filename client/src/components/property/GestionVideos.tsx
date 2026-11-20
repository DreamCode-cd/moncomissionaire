import { useMutation } from '@tanstack/react-query';
import { Film, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import type { VideoBien } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { VIDEO_DUREE_MAX, VIDEO_TAILLE_MAX, VIDEOS_MAX, dureeLisible, poidsLisible } from '@/lib/annonce';
import { messageErreur } from '@/lib/erreurs';
import { t } from '@/i18n';

/**
 * Les vidéos d'une annonce, côté auteur (décision de David du 20/11/2026).
 *
 * L'envoi répond tout de suite ; le serveur réencode ensuite la vidéo (480p,
 * environ 5 Mo la minute) et la rend publique une fois prête. On dit donc
 * où en est chaque vidéo, et l'on relit l'annonce tant qu'une se prépare.
 */
export function GestionVideos({
  routeApi,
  bienId,
  videos,
  onChangement,
}: {
  routeApi: string;
  bienId: number | string;
  videos: VideoBien[];
  onChangement: () => void;
}) {
  const { toast } = useToast();
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const enPlace = videos.filter((v) => v.statut !== 'erreur').length;

  const envoyer = useMutation({
    mutationFn: async (fichier: File) => {
      const formulaire = new FormData();
      formulaire.append('video', fichier);
      return api.request(`${routeApi}${bienId}/add_video/`, { method: 'POST', body: formulaire, isFormData: true });
    },
    onSuccess: () => {
      toast({ title: t('videos.videoEnvoyee'), description: t('videos.elleSePrepareElle') });
      onChangement();
    },
    onError: (e) => toast({ title: t('videos.videoRefusee'), description: messageErreur(e), variant: 'destructive' }),
    onSettled: () => setEnvoi(null),
  });

  const supprimer = useMutation({
    mutationFn: (id: number) => api.delete(`${routeApi}${bienId}/video/${id}/`),
    onSuccess: onChangement,
    onError: (e) => toast({ title: t('videos.erreur'), description: messageErreur(e), variant: 'destructive' }),
  });

  const choisir = (fichier?: File) => {
    if (!fichier) return;
    if (fichier.size > VIDEO_TAILLE_MAX) {
      toast({ title: t('videos.videoTropLourde'), description: t('videos.videoFaitPlus100'), variant: 'destructive' });
      return;
    }
    setEnvoi(`${fichier.name} · ${poidsLisible(fichier.size)}`);
    envoyer.mutate(fichier);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t('videos.videosB', { a: enPlace, b: VIDEOS_MAX })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {videos.map((video) => (
          <div key={video.id} className="flex items-center gap-3 rounded-md border p-2" data-testid={`video-${video.id}`}>
            <Film className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">
                {video.statut === 'prete'
                  ? [t('reste.prete'), dureeLisible(video.duree), poidsLisible(video.taille)].filter(Boolean).join(' · ')
                  : video.statut === 'en_traitement'
                    ? t('videos.preparation')
                    : t('videos.echecPreparation')}
              </p>
              {video.statut === 'erreur' && video.erreur && <p className="text-muted-foreground">{video.erreur}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('videos.supprimerVideo')}
              disabled={supprimer.isPending}
              onClick={() => supprimer.mutate(video.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {enPlace < VIDEOS_MAX && (
          <>
            <input
              ref={champ}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                choisir(e.target.files?.[0]);
                e.target.value = '';
              }}
              data-testid="input-video"
            />
            <Button type="button" variant="outline" disabled={envoyer.isPending} onClick={() => champ.current?.click()}>
              {envoyer.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {envoyer.isPending ? t('videos.envoiDe', { nom: envoi ?? t('videos.laVideo') }) : t('videos.ajouterVideo')}
            </Button>
          </>
        )}
        <p className="text-sm text-muted-foreground">
          {t('reste.videoConsigne', { n: VIDEO_DUREE_MAX })}
        </p>
      </CardContent>
    </Card>
  );
}
