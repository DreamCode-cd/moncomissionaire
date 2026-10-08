import { useMutation, useQuery } from '@tanstack/react-query';
import { messageErreur } from '@/lib/erreurs';
import { ArrowDown, ArrowUp, FileText, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { EtatChargement, EtatErreur } from '@/components/etats';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formaterDateCourte } from '@/lib/dates';
import { queryClient } from '@/lib/queryClient';
import type { PaginatedResponse } from '@shared/schema';

/**
 * Les pages légales, rédigées et publiées par l'équipe.
 *
 * Il n'en existait aucune : l'inscription faisait accepter des conditions
 * introuvables. Les brouillons de départ ne sont pas l'œuvre d'un juriste ;
 * ce que l'équipe technique ne savait pas est marqué « [à compléter] », et le
 * serveur refuse de publier tant qu'il en reste. Publier demande en plus de
 * confirmer que le texte a été relu.
 */

interface Section {
  section_number: string;
  title: string;
  content: string;
}

interface PageLegale {
  page_type: 'terms' | 'privacy' | 'cookies' | 'legal';
  page_type_display: string;
  title: string;
  introduction: string;
  sections: Section[];
  is_active: boolean;
  version: string;
  a_completer: boolean;
  modifiee_par: string | null;
  updated_at: string;
}

const CHEMIN = '/api/v1/administration/pages/';
const CHEMIN_JOURNAL = '/api/v1/administration/journal/';

/** Les erreurs arrivent déjà traduites en phrase par lib/erreurs. */
const messageLisible = (erreur: Error) => messageErreur(erreur);

export function PagesLegales() {
  const { data, isPending, error, refetch } = useQuery<PaginatedResponse<PageLegale>>({ queryKey: [CHEMIN] });
  const [enEdition, setEnEdition] = useState<PageLegale | null>(null);

  if (isPending) return <EtatChargement texte="Chargement des pages…" />;
  if (error) return <EtatErreur description={(error as Error).message} onReessayer={() => void refetch()} />;

  if (enEdition) {
    return <EditeurDePage page={enEdition} onFermer={() => setEnEdition(null)} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Les textes publiés s’affichent sur le site et sont liés depuis l’inscription. Faites-les relire par un juriste avant de les publier.
      </p>
      {(data?.results ?? []).map((page) => (
        <Card key={page.page_type} data-testid={`carte-page-${page.page_type}`}>
          <CardContent className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">{page.page_type_display}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {page.is_active ? (
                  <Badge variant="outline" className="border-transparent bg-statut-favorable-fond text-statut-favorable">
                    Publiée · v{page.version}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-transparent bg-statut-neutre-fond text-statut-neutre">
                    Brouillon · v{page.version}
                  </Badge>
                )}
                {page.a_completer && (
                  <Badge variant="outline" className="gap-1 border-transparent bg-statut-attente-fond text-statut-attente">
                    <TriangleAlert className="h-3 w-3" /> À compléter
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Modifiée le {formaterDateCourte(page.updated_at)}
                {page.modifiee_par ? ` par ${page.modifiee_par}` : ''}
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEnEdition(page)} data-testid={`modifier-page-${page.page_type}`}>
              <FileText className="mr-1 h-4 w-4" /> Ouvrir
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EditeurDePage({ page, onFermer }: { page: PageLegale; onFermer: () => void }) {
  const { toast } = useToast();
  const [titre, setTitre] = useState(page.title);
  const [introduction, setIntroduction] = useState(page.introduction);
  const [sections, setSections] = useState<Section[]>(page.sections);
  const [etat, setEtat] = useState(page);
  const [confirmation, setConfirmation] = useState(false);
  const [relu, setRelu] = useState(false);

  const modifiee =
    titre !== etat.title || introduction !== etat.introduction || JSON.stringify(sections) !== JSON.stringify(etat.sections);
  const trous = [titre, introduction, ...sections.flatMap((s) => [s.title, s.content])].some((t) =>
    t.includes('[à compléter'),
  );

  const rafraichir = (nouvelle: PageLegale) => {
    setEtat(nouvelle);
    void queryClient.invalidateQueries({ queryKey: [CHEMIN] });
    void queryClient.invalidateQueries({ queryKey: [CHEMIN_JOURNAL] });
  };
  const surErreur = (erreur: Error) =>
    toast({ title: 'Action refusée', description: messageLisible(erreur), variant: 'destructive' });

  const enregistrer = useMutation({
    mutationFn: () =>
      api.patch<PageLegale>(`${CHEMIN}${page.page_type}/`, { title: titre, introduction, sections }),
    onSuccess: (nouvelle) => {
      rafraichir(nouvelle);
      toast({
        title: 'Enregistré',
        description: nouvelle.is_active
          ? `Le texte publié passe en version ${nouvelle.version}.`
          : 'Le brouillon est enregistré, il n’est pas publié.',
      });
    },
    onError: surErreur,
  });
  const publier = useMutation({
    mutationFn: () => api.post<PageLegale>(`${CHEMIN}${page.page_type}/publier/`),
    onSuccess: (nouvelle) => {
      rafraichir(nouvelle);
      setConfirmation(false);
      toast({ title: 'Page publiée', description: `Version ${nouvelle.version}, visible sur le site.` });
    },
    onError: surErreur,
  });
  const retirer = useMutation({
    mutationFn: () => api.post<PageLegale>(`${CHEMIN}${page.page_type}/retirer/`),
    onSuccess: (nouvelle) => {
      rafraichir(nouvelle);
      toast({ title: 'Page retirée du site' });
    },
    onError: surErreur,
  });

  const modifierSection = (rang: number, champ: keyof Section, valeur: string) =>
    setSections((avant) => avant.map((s, i) => (i === rang ? { ...s, [champ]: valeur } : s)));
  const deplacer = (rang: number, sens: -1 | 1) =>
    setSections((avant) => {
      const copie = [...avant];
      const cible = rang + sens;
      if (cible < 0 || cible >= copie.length) return avant;
      [copie[rang], copie[cible]] = [copie[cible], copie[rang]];
      return copie;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onFermer}>← Toutes les pages</Button>
        <Badge variant="outline">{etat.is_active ? `Publiée · v${etat.version}` : `Brouillon · v${etat.version}`}</Badge>
      </div>

      {trous && (
        <p className="flex items-start gap-2 rounded-md bg-statut-attente-fond p-3 text-sm text-statut-attente">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Ce texte contient encore des passages « [à compléter] ». Il ne pourra pas être publié tant qu’ils restent.
        </p>
      )}

      <div className="space-y-1">
        <Label htmlFor="page-titre">Titre</Label>
        <Input id="page-titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="page-intro">Introduction</Label>
        <Textarea id="page-intro" rows={3} value={introduction} onChange={(e) => setIntroduction(e.target.value)} />
      </div>

      {sections.map((section, rang) => (
        <Card key={rang}>
          <CardContent className="space-y-2 p-3">
            <div className="flex gap-2">
              <Input
                className="w-16"
                value={section.section_number}
                onChange={(e) => modifierSection(rang, 'section_number', e.target.value)}
                aria-label="Numéro"
              />
              <Input
                value={section.title}
                onChange={(e) => modifierSection(rang, 'title', e.target.value)}
                aria-label="Titre de la section"
              />
            </div>
            <Textarea
              rows={6}
              value={section.content}
              onChange={(e) => modifierSection(rang, 'content', e.target.value)}
              aria-label="Contenu"
              className={section.content.includes('[à compléter') ? 'border-statut-attente' : undefined}
            />
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => deplacer(rang, -1)} disabled={rang === 0} aria-label="Monter">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deplacer(rang, 1)} disabled={rang === sections.length - 1} aria-label="Descendre">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSections((avant) => avant.filter((_, i) => i !== rang))}
                aria-label="Supprimer la section"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setSections((avant) => [...avant, { section_number: String(avant.length + 1), title: '', content: '' }])}
      >
        <Plus className="mr-1 h-4 w-4" /> Ajouter une section
      </Button>

      <div className="sticky bottom-16 flex gap-2 rounded-lg border border-border bg-background p-2 md:bottom-2">
        <Button className="flex-1" onClick={() => enregistrer.mutate()} disabled={!modifiee || enregistrer.isPending} data-testid="enregistrer-page">
          Enregistrer
        </Button>
        {etat.is_active ? (
          <Button variant="outline" onClick={() => retirer.mutate()} disabled={retirer.isPending}>
            Retirer du site
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setConfirmation(true)}
            disabled={modifiee || trous}
            title={modifiee ? 'Enregistrez d’abord vos modifications' : undefined}
            data-testid="publier-page"
          >
            Publier
          </Button>
        )}
      </div>

      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publier « {etat.title} » ?</DialogTitle>
            <DialogDescription>
              Le texte devient visible sur le site. S’il s’agit des conditions d’utilisation, chaque nouvel inscrit l’accepte dans cette version.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={relu} onCheckedChange={(v) => setRelu(v === true)} data-testid="case-relu" />
            <span>Ce texte a été relu, et ce qu’il affirme est exact.</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmation(false)}>Annuler</Button>
            <Button onClick={() => publier.mutate()} disabled={!relu || publier.isPending} data-testid="confirmer-publication">
              Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
