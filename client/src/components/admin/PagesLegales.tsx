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
import { t } from '@/i18n';

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
  /** Traduction anglaise : facultative, le français fait foi. */
  title_en?: string;
  content_en?: string;
}

interface PageLegale {
  page_type: 'terms' | 'privacy' | 'cookies' | 'legal';
  page_type_display: string;
  title: string;
  introduction: string;
  title_en?: string;
  introduction_en?: string;
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

  if (isPending) return <EtatChargement texte={t('pagesLegales.chargementPages')} />;
  if (error) return <EtatErreur description={(error as Error).message} onReessayer={() => void refetch()} />;

  if (enEdition) {
    return <EditeurDePage page={enEdition} onFermer={() => setEnEdition(null)} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {t('pagesLegales.textesPubliesSAffichent')}
      </p>
      {(data?.results ?? []).map((page) => (
        <Card key={page.page_type} data-testid={`carte-page-${page.page_type}`}>
          <CardContent className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">{t(`legal.${page.page_type}`)}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {page.is_active ? (
                  <Badge variant="outline" className="border-transparent bg-statut-favorable-fond text-statut-favorable">
                    {t('pagesLegales.publieeV', { a: page.version })}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-transparent bg-statut-neutre-fond text-statut-neutre">
                    {t('pagesLegales.brouillonV', { a: page.version })}
                  </Badge>
                )}
                {page.a_completer && (
                  <Badge variant="outline" className="gap-1 border-transparent bg-statut-attente-fond text-statut-attente">
                    <TriangleAlert className="h-3 w-3" /> {t('pagesLegales.completer')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('pagesLegales.modifiee', { a: formaterDateCourte(page.updated_at) })}
                {page.modifiee_par ? ` par ${page.modifiee_par}` : ''}
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEnEdition(page)} data-testid={`modifier-page-${page.page_type}`}>
              <FileText className="mr-1 h-4 w-4" /> {t('pagesLegales.ouvrir')}
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
  const [titreEn, setTitreEn] = useState(page.title_en ?? '');
  const [introductionEn, setIntroductionEn] = useState(page.introduction_en ?? '');
  const [sections, setSections] = useState<Section[]>(page.sections);
  const [etat, setEtat] = useState(page);
  const [confirmation, setConfirmation] = useState(false);
  const [relu, setRelu] = useState(false);

  const modifiee =
    titre !== etat.title ||
    introduction !== etat.introduction ||
    titreEn !== (etat.title_en ?? '') ||
    introductionEn !== (etat.introduction_en ?? '') ||
    JSON.stringify(sections) !== JSON.stringify(etat.sections);
  // Un trou dans la traduction anglaise bloque aussi la publication (serveur).
  const trous = [
    titre,
    introduction,
    titreEn,
    introductionEn,
    ...sections.flatMap((s) => [s.title, s.content, s.title_en ?? '', s.content_en ?? '']),
  ].some((texte) => texte.includes('[à compléter') || texte.includes('[to be completed'));

  const rafraichir = (nouvelle: PageLegale) => {
    setEtat(nouvelle);
    void queryClient.invalidateQueries({ queryKey: [CHEMIN] });
    void queryClient.invalidateQueries({ queryKey: [CHEMIN_JOURNAL] });
  };
  const surErreur = (erreur: Error) =>
    toast({ title: t('pagesLegales.actionRefusee'), description: messageLisible(erreur), variant: 'destructive' });

  const enregistrer = useMutation({
    mutationFn: () =>
      api.patch<PageLegale>(`${CHEMIN}${page.page_type}/`, {
        title: titre,
        introduction,
        title_en: titreEn,
        introduction_en: introductionEn,
        sections,
      }),
    onSuccess: (nouvelle) => {
      rafraichir(nouvelle);
      toast({
        title: t('pagesLegales.enregistre'),
        description: nouvelle.is_active
          ? t('pagesLegales.passeEnVersion', { version: nouvelle.version })
          : t('pagesLegales.brouillonEstEnregistreIl'),
      });
    },
    onError: surErreur,
  });
  const publier = useMutation({
    mutationFn: () => api.post<PageLegale>(`${CHEMIN}${page.page_type}/publier/`),
    onSuccess: (nouvelle) => {
      rafraichir(nouvelle);
      setConfirmation(false);
      toast({ title: t('pagesLegales.pagePubliee'), description: t('pagesLegales.versionVisible', { version: nouvelle.version }) });
    },
    onError: surErreur,
  });
  const retirer = useMutation({
    mutationFn: () => api.post<PageLegale>(`${CHEMIN}${page.page_type}/retirer/`),
    onSuccess: (nouvelle) => {
      rafraichir(nouvelle);
      toast({ title: t('pagesLegales.pageRetireeSite') });
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
        <Button variant="ghost" size="sm" onClick={onFermer}>{t('pagesLegales.toutesPages')}</Button>
        <Badge variant="outline">{etat.is_active ? t('reste.publieeV', { version: etat.version }) : t('reste.brouillonV', { version: etat.version })}</Badge>
      </div>

      {trous && (
        <p className="flex items-start gap-2 rounded-md bg-statut-attente-fond p-3 text-sm text-statut-attente">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {t('pagesLegales.ceTexteContientEncore')}
        </p>
      )}

      <div className="space-y-1">
        <Label htmlFor="page-titre">{t('pagesLegales.titre')}</Label>
        <Input id="page-titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="page-intro">{t('pagesLegales.introduction')}</Label>
        <Textarea id="page-intro" rows={3} value={introduction} onChange={(e) => setIntroduction(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="page-titre-en">{t('pagesLegales.titreAnglais')}</Label>
        <Input id="page-titre-en" lang="en" value={titreEn} onChange={(e) => setTitreEn(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="page-intro-en">{t('pagesLegales.introductionAnglais')}</Label>
        <Textarea id="page-intro-en" lang="en" rows={3} value={introductionEn} onChange={(e) => setIntroductionEn(e.target.value)} />
      </div>

      {sections.map((section, rang) => (
        <Card key={rang}>
          <CardContent className="space-y-2 p-3">
            <div className="flex gap-2">
              <Input
                className="w-16"
                value={section.section_number}
                onChange={(e) => modifierSection(rang, 'section_number', e.target.value)}
                aria-label={t('pagesLegales.numero')}
              />
              <Input
                value={section.title}
                onChange={(e) => modifierSection(rang, 'title', e.target.value)}
                aria-label={t('pagesLegales.titreSection')}
              />
            </div>
            <Textarea
              rows={6}
              value={section.content}
              onChange={(e) => modifierSection(rang, 'content', e.target.value)}
              aria-label={t('pagesLegales.contenu')}
              className={section.content.includes('[à compléter') ? 'border-statut-attente' : undefined}
            />
            <Input
              lang="en"
              value={section.title_en ?? ''}
              onChange={(e) => modifierSection(rang, 'title_en', e.target.value)}
              aria-label={t('pagesLegales.titreSectionAnglais')}
              placeholder={t('pagesLegales.titreSectionAnglais')}
            />
            <Textarea
              lang="en"
              rows={6}
              value={section.content_en ?? ''}
              onChange={(e) => modifierSection(rang, 'content_en', e.target.value)}
              aria-label={t('pagesLegales.contenuAnglais')}
              placeholder={t('pagesLegales.contenuAnglaisFrancaisFait')}
              className={(section.content_en ?? '').includes('[to be completed') ? 'border-statut-attente' : undefined}
            />
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => deplacer(rang, -1)} disabled={rang === 0} aria-label={t('pagesLegales.monter')}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deplacer(rang, 1)} disabled={rang === sections.length - 1} aria-label={t('pagesLegales.descendre')}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSections((avant) => avant.filter((_, i) => i !== rang))}
                aria-label={t('pagesLegales.supprimerSection')}
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
        onClick={() => setSections((avant) => [...avant, { section_number: String(avant.length + 1), title: '', content: '', title_en: '', content_en: '' }])}
      >
        <Plus className="mr-1 h-4 w-4" /> {t('pagesLegales.ajouterSection')}
      </Button>

      <div className="sticky bottom-16 flex gap-2 rounded-lg border border-border bg-background p-2 md:bottom-2">
        <Button className="flex-1" onClick={() => enregistrer.mutate()} disabled={!modifiee || enregistrer.isPending} data-testid="enregistrer-page">
          {t('pagesLegales.enregistrer')}
        </Button>
        {etat.is_active ? (
          <Button variant="outline" onClick={() => retirer.mutate()} disabled={retirer.isPending}>
            {t('pagesLegales.retirerSite')}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setConfirmation(true)}
            disabled={modifiee || trous}
            title={modifiee ? t('pagesLegales.enregistrezAbordVosModifications') : undefined}
            data-testid="publier-page"
          >
            {t('pagesLegales.publier')}
          </Button>
        )}
      </div>

      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pagesLegales.publierTitre', { titre: etat.title })}</DialogTitle>
            <DialogDescription>
              {t('pagesLegales.texteDevientVisibleSite')}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={relu} onCheckedChange={(v) => setRelu(v === true)} data-testid="case-relu" />
            <span>{t('pagesLegales.ceTexteEteRelu')}</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmation(false)}>{t('pagesLegales.annuler')}</Button>
            <Button onClick={() => publier.mutate()} disabled={!relu || publier.isPending} data-testid="confirmer-publication">
              {t('pagesLegales.publier')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
