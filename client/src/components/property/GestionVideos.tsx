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
      toast({ title: 'Vidéo envoyée', description: 'Elle se prépare ; elle apparaîtra dans quelques minutes.' });
      onChangement();
    },
    onError: (e) => toast({ title: 'Vidéo refusée', description: messageErreur(e), variant: 'destructive' }),
    onSettled: () => setEnvoi(null),
  });

  const supprimer = useMutation({
    mutationFn: (id: number) => api.delete(`${routeApi}${bienId}/video/${id}/`),
    onSuccess: onChangement,
    onError: (e) => toast({ title: 'Erreur', description: messageErreur(e), variant: 'destructive' }),
  });

  const choisir = (fichier?: File) => {
    if (!fichier) return;
    if (fichier.size > VIDEO_TAILLE_MAX) {
      toast({ title: 'Vidéo trop lourde', description: 'Une vidéo fait au plus 100 Mo.', variant: 'destructive' });
      return;
    }
    setEnvoi(`${fichier.name} · ${poidsLisible(fichier.size)}`);
    envoyer.mutate(fichier);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Vidéos ({enPlace}/{VIDEOS_MAX})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {videos.map((video) => (
          <div key={video.id} className="flex items-center gap-3 rounded-md border p-2" data-testid={`video-${video.id}`}>
            <Film className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">
                {video.statut === 'prete'
                  ? ['Prête', dureeLisible(video.duree), poidsLisible(video.taille)].filter(Boolean).join(' · ')
                  : video.statut === 'en_traitement'
                    ? 'En préparation…'
                    : 'Échec de la préparation'}
              </p>
              {video.statut === 'erreur' && video.erreur && <p className="text-muted-foreground">{video.erreur}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Supprimer la vidéo"
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
              {envoyer.isPending ? `Envoi de ${envoi ?? 'la vidéo'}…` : 'Ajouter une vidéo'}
            </Button>
          </>
        )}
        <p className="text-sm text-muted-foreground">
          {VIDEO_DUREE_MAX} secondes au plus : le tour de la maison. VillaGo l’allège ensuite pour ceux qui la
          regardent ; sur la fiche, elle ne se lance jamais toute seule.
        </p>
      </CardContent>
    </Card>
  );
}
